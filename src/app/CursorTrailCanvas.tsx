"use client";

import { useEffect, useRef } from "react";

type ParticleKind = "orb" | "spark" | "diamond";

type TrailParticle = {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  vx: number;
  vy: number;
  age: number;
  lifetime: number;
  size: number;
  rotation: number;
  spin: number;
  alpha: number;
  kind: ParticleKind;
  retiring: boolean;
  retireAge: number;
};

type TrailPoint = {
  x: number;
  y: number;
  age: number;
  lifetime: number;
};

type CursorTrailCanvasProps = {
  enabled: boolean;
  colour: string;
  glow: number;
  size: number;
  density: number;
  speed: number;
  lifetime: number;
  mode: "viewport" | "container";
  className?: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function colourChannels(value: string): [number, number, number] {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return [255, 126, 70];
  let hex = match[1] ?? "ff7e46";
  if (hex.length === 3) hex = hex.split("").map((character) => character + character).join("");
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function rgba(channels: [number, number, number], alpha: number) {
  return "rgba(" + channels[0] + "," + channels[1] + "," + channels[2] + "," + clamp(alpha, 0, 1) + ")";
}

function midpoint(a: TrailPoint, b: TrailPoint): [number, number] {
  return [(a.x + b.x) * 0.5, (a.y + b.y) * 0.5];
}

export default function CursorTrailCanvas({
  enabled,
  colour,
  glow,
  size,
  density,
  speed,
  lifetime,
  mode,
  className = "",
}: CursorTrailCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    const particles: TrailParticle[] = [];
    const retiringParticles: TrailParticle[] = [];
    const trailPoints: TrailPoint[] = [];
    const channels = colourChannels(colour);

    let frameId: number | null = null;
    let lastFrameAt = performance.now();
    let lastPointer: { x: number; y: number } | null = null;
    let lastPointerMoveAt = 0;
    let spacingRemainder = 0;
    let canvasWidth = 1;
    let canvasHeight = 1;
    let pixelRatio = 1;
    let disposed = false;

    const densityValue = clamp(density, 20, 250);
    const sizeScale = clamp(size, 40, 350) / 100;
    const motionScale = clamp(speed, 40, 300) / 100;
    const particleLifetime = clamp(lifetime, 300, 15000);
    const maxParticles = clamp(Math.round(155 + densityValue * 0.78 + particleLifetime / 125), 180, 440);
    const spacing = clamp(8.2 - densityValue * 0.021, 2.8, 7.8);
    const glowScale = clamp(glow, 0, 200) / 100;
    const ribbonWidth = clamp(1.45 * sizeScale, 0.8, 4.2);
    const ribbonLifetime = clamp(350 / motionScale, 150, 380);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvasWidth = Math.max(1, rect.width);
      canvasHeight = Math.max(1, rect.height);
      pixelRatio = Math.min(1.65, Math.max(1, window.devicePixelRatio || 1));
      const backingWidth = Math.max(1, Math.round(canvasWidth * pixelRatio));
      const backingHeight = Math.max(1, Math.round(canvasHeight * pixelRatio));

      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
      }

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const retireOldestParticle = () => {
      const oldest = particles.shift();
      if (!oldest) return;
      oldest.retiring = true;
      oldest.retireAge = 0;
      retiringParticles.push(oldest);

      // Retiring particles only live for 135 ms, so this list stays bounded even at high density.
      while (retiringParticles.length > 112) retiringParticles.shift();
    };

    const createParticle = (
      x: number,
      y: number,
      directionX: number,
      directionY: number,
      satellite = false,
    ): TrailParticle => {
      const directionLength = Math.hypot(directionX, directionY) || 1;
      const jitter = satellite ? 5.5 : 2.6;
      const random = Math.random();
      const kind: ParticleKind = satellite
        ? "orb"
        : random < 0.47 ? "orb" : random < 0.82 ? "spark" : "diamond";
      const inheritedMotion = satellite ? 0.22 : 0.34;
      const particleX = x + (Math.random() - 0.5) * jitter;
      const particleY = y + (Math.random() - 0.5) * jitter;

      return {
        x: particleX,
        y: particleY,
        previousX: particleX,
        previousY: particleY,
        vx: -(directionX / directionLength) * motionScale * inheritedMotion + (Math.random() - 0.5) * (satellite ? 1.1 : 1.45),
        vy: -(directionY / directionLength) * motionScale * inheritedMotion - Math.random() * (satellite ? 0.28 : 0.62),
        age: 0,
        lifetime: particleLifetime * (satellite ? 0.28 + Math.random() * 0.42 : 0.46 + Math.random() * 0.64),
        size: (satellite ? 0.7 + Math.random() * 1.6 : 1.25 + Math.random() * 3.4) * sizeScale,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * (1.1 + motionScale * 1.8),
        alpha: satellite ? 0.35 + Math.random() * 0.4 : 0.54 + Math.random() * 0.44,
        kind,
        retiring: false,
        retireAge: 0,
      };
    };

    const emitParticle = (
      x: number,
      y: number,
      directionX: number,
      directionY: number,
      satellite = false,
    ) => {
      if (particles.length >= maxParticles) retireOldestParticle();
      particles.push(createParticle(x, y, directionX, directionY, satellite));

      if (!satellite) {
        const satelliteChance = clamp((densityValue - 32) / 430, 0, 0.49);
        if (Math.random() < satelliteChance) {
          if (particles.length >= maxParticles) retireOldestParticle();
          particles.push(createParticle(
            x + (Math.random() - 0.5) * 7,
            y + (Math.random() - 0.5) * 7,
            directionX,
            directionY,
            true,
          ));
        }
      }
    };

    const addTrailPoint = (x: number, y: number) => {
      trailPoints.push({ x, y, age: 0, lifetime: ribbonLifetime });
      if (trailPoints.length > 145) trailPoints.shift();
    };

    const movePointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        lastPointer = null;
        spacingRemainder = 0;
        return;
      }

      lastPointerMoveAt = performance.now();

      if (!lastPointer) {
        lastPointer = { x, y };
        emitParticle(x, y, 0, 0);
        addTrailPoint(x, y);
        scheduleFrame();
        return;
      }

      const startX = lastPointer.x;
      const startY = lastPointer.y;
      const dx = x - startX;
      const dy = y - startY;
      const distance = Math.hypot(dx, dy);

      if (distance <= 0.08) return;

      const totalDistance = spacingRemainder + distance;
      const fullSampleCount = Math.floor(totalDistance / spacing);
      const sampleCount = Math.min(120, fullSampleCount);

      for (let index = 1; index <= sampleCount; index += 1) {
        const travelled = fullSampleCount > 120
          ? (distance * index) / sampleCount
          : spacing - spacingRemainder + (index - 1) * spacing;
        const progress = clamp(travelled / distance, 0, 1);
        const sampleX = startX + dx * progress;
        const sampleY = startY + dy * progress;
        emitParticle(sampleX, sampleY, dx, dy);
        addTrailPoint(sampleX, sampleY);
      }

      spacingRemainder = totalDistance % spacing;
      lastPointer = { x, y };
      scheduleFrame();
    };

    const drawSpark = (x: number, y: number, radius: number, rotation: number) => {
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.beginPath();
      context.moveTo(0, -radius);
      context.quadraticCurveTo(radius * 0.08, -radius * 0.08, radius * 0.83, 0);
      context.quadraticCurveTo(radius * 0.08, radius * 0.08, 0, radius);
      context.quadraticCurveTo(-radius * 0.08, radius * 0.08, -radius * 0.83, 0);
      context.quadraticCurveTo(-radius * 0.08, -radius * 0.08, 0, -radius);
      context.closePath();
      context.fill();
      context.restore();
    };

    const drawRibbon = () => {
      if (trailPoints.length < 2) return;

      context.save();
      context.globalCompositeOperation = "source-over";
      context.lineCap = "round";
      context.lineJoin = "round";

      for (let index = 1; index < trailPoints.length; index += 1) {
        const previous = trailPoints[index - 1];
        const current = trailPoints[index];
        const next = trailPoints[index + 1] ?? current;
        if (!previous || !current || !next) continue;

        const [startX, startY] = midpoint(previous, current);
        const [endX, endY] = midpoint(current, next);
        const age = (previous.age + current.age) * 0.5;
        const ageLimit = (previous.lifetime + current.lifetime) * 0.5;
        const fade = Math.pow(clamp(1 - age / ageLimit, 0, 1), 1.6);
        const lead = 0.18 + 0.82 * (index / (trailPoints.length - 1));

        context.beginPath();
        context.moveTo(startX, startY);
        context.quadraticCurveTo(current.x, current.y, endX, endY);

        context.strokeStyle = colour;
        context.globalAlpha = fade * lead * 0.18;
        context.lineWidth = ribbonWidth * 4.5;
        context.shadowColor = colour;
        context.shadowBlur = Math.min(34, 5 + glowScale * 17);
        context.stroke();

        context.globalAlpha = fade * lead * 0.38;
        context.lineWidth = ribbonWidth * 1.45;
        context.shadowBlur = Math.min(18, 2 + glowScale * 8);
        context.stroke();

        context.globalAlpha = fade * lead * 0.29;
        context.strokeStyle = "rgba(255,255,255,0.92)";
        context.lineWidth = Math.max(0.55, ribbonWidth * 0.32);
        context.shadowBlur = Math.min(10, glowScale * 4);
        context.stroke();
      }

      context.restore();
    };

    const render = (now: number) => {
      frameId = null;
      if (disposed) return;

      const delta = clamp((now - lastFrameAt) / 1000, 0, 0.04);
      const deltaMs = delta * 1000;
      lastFrameAt = now;

      context.clearRect(0, 0, canvasWidth, canvasHeight);

      for (let index = trailPoints.length - 1; index >= 0; index -= 1) {
        const point = trailPoints[index];
        if (!point) continue;
        point.age += deltaMs;
        if (point.age >= point.lifetime) trailPoints.splice(index, 1);
      }

      drawRibbon();

      context.save();
      context.globalCompositeOperation = "lighter";

      const drawParticle = (particle: TrailParticle, retirementAlpha: number) => {
        const progress = clamp(particle.age / particle.lifetime, 0, 1);
        const fadeIn = clamp(progress / 0.12, 0, 1);
        const fadeOut = Math.pow(1 - progress, 1.65);
        const alpha = fadeIn * fadeOut * particle.alpha * retirementAlpha;
        if (alpha <= 0.004) return;

        const pulse = 0.84 + Math.sin(progress * Math.PI) * 0.32;
        const radius = Math.max(0.55, particle.size * pulse);
        const streak = Math.hypot(particle.x - particle.previousX, particle.y - particle.previousY);

        context.save();
        context.globalAlpha = alpha * 0.54;
        context.strokeStyle = colour;
        context.lineWidth = Math.max(0.5, radius * 0.5);
        context.shadowColor = colour;
        context.shadowBlur = Math.min(20, 3 + glowScale * 10);
        context.beginPath();
        context.moveTo(particle.previousX, particle.previousY);
        context.lineTo(particle.x, particle.y);
        context.stroke();

        context.globalAlpha = alpha;
        context.fillStyle = colour;
        context.shadowColor = colour;
        context.shadowBlur = Math.min(28, 2 + glowScale * 16);

        if (particle.kind === "orb") {
          context.beginPath();
          context.arc(particle.x, particle.y, Math.max(0.65, radius * 0.62), 0, Math.PI * 2);
          context.fill();
          context.globalAlpha = alpha * 0.78;
          context.shadowBlur = 0;
          context.fillStyle = "#ffffff";
          context.beginPath();
          context.arc(particle.x, particle.y, Math.max(0.35, radius * 0.19), 0, Math.PI * 2);
          context.fill();
        } else if (particle.kind === "diamond") {
          context.translate(particle.x, particle.y);
          context.rotate(particle.rotation);
          context.beginPath();
          context.moveTo(0, -radius);
          context.lineTo(radius * 0.64, 0);
          context.lineTo(0, radius);
          context.lineTo(-radius * 0.64, 0);
          context.closePath();
          context.fill();
        } else {
          drawSpark(particle.x, particle.y, Math.max(1.2, radius), particle.rotation);
          context.globalAlpha = alpha * 0.72;
          context.fillStyle = "#ffffff";
          context.shadowBlur = 0;
          context.beginPath();
          context.arc(particle.x, particle.y, Math.max(0.3, radius * 0.12), 0, Math.PI * 2);
          context.fill();
        }

        context.restore();
      };

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        if (!particle) continue;

        particle.age += deltaMs;
        if (particle.age >= particle.lifetime) {
          particles.splice(index, 1);
          continue;
        }

        particle.previousX = particle.x;
        particle.previousY = particle.y;
        particle.x += particle.vx * delta * 60;
        particle.y += particle.vy * delta * 60;
        particle.vx *= Math.pow(0.984, delta * 60);
        particle.vy = particle.vy * Math.pow(0.987, delta * 60) + 0.012 * motionScale * delta * 60;
        particle.rotation += particle.spin * delta;
        drawParticle(particle, 1);
      }

      for (let index = retiringParticles.length - 1; index >= 0; index -= 1) {
        const particle = retiringParticles[index];
        if (!particle) continue;

        particle.age += deltaMs;
        particle.retireAge += deltaMs;
        if (particle.retireAge >= 135 || particle.age >= particle.lifetime) {
          retiringParticles.splice(index, 1);
          continue;
        }

        particle.previousX = particle.x;
        particle.previousY = particle.y;
        particle.x += particle.vx * delta * 60;
        particle.y += particle.vy * delta * 60;
        particle.vx *= Math.pow(0.984, delta * 60);
        particle.vy = particle.vy * Math.pow(0.987, delta * 60) + 0.012 * motionScale * delta * 60;
        particle.rotation += particle.spin * delta;
        drawParticle(particle, Math.pow(clamp(1 - particle.retireAge / 135, 0, 1), 1.8));
      }

      context.restore();
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";

      const headAge = now - lastPointerMoveAt;
      if (lastPointer && headAge < 120) {
        const headAlpha = (1 - headAge / 120) * 0.15;
        const radius = 4 + glowScale * 4;
        const gradient = context.createRadialGradient(lastPointer.x, lastPointer.y, 0, lastPointer.x, lastPointer.y, radius);
        gradient.addColorStop(0, rgba(channels, headAlpha));
        gradient.addColorStop(1, rgba(channels, 0));
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(lastPointer.x, lastPointer.y, radius, 0, Math.PI * 2);
        context.fill();
      }

      if (particles.length > 0 || retiringParticles.length > 0 || trailPoints.length > 1 || (lastPointer && headAge < 120)) {
        scheduleFrame();
      }
    };

    function scheduleFrame() {
      if (frameId === null && !disposed) frameId = window.requestAnimationFrame(render);
    }

    resize();
    const handleBlur = () => {
      lastPointer = null;
      spacingRemainder = 0;
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", movePointer, { passive: true });
    window.addEventListener("blur", handleBlur, { passive: true });

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", movePointer);
      window.removeEventListener("blur", handleBlur);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      context.clearRect(0, 0, canvasWidth, canvasHeight);
    };
  }, [enabled, colour, glow, size, density, speed, lifetime, mode]);

  const layerClass = mode === "viewport"
    ? "pixlo-cursor-trail-layer"
    : "pixlo-cursor-trail-layer preview-cursor-trail-layer";

  return (
    <canvas
      ref={canvasRef}
      className={(layerClass + " " + className).trim()}
      aria-hidden="true"
    />
  );
}
