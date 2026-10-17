"use client";

import { useEffect, useRef } from "react";

type ParticleKind = "spark" | "diamond" | "dot";

type TrailParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  lifetime: number;
  size: number;
  rotation: number;
  spin: number;
  alpha: number;
  kind: ParticleKind;
  colour: string;
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
    let frameId: number | null = null;
    let lastFrameAt = performance.now();
    let lastPointer: { x: number; y: number } | null = null;
    let spacingRemainder = 0;
    const trailPoints: Array<{ x: number; y: number; age: number; lifetime: number }> = [];
    let canvasWidth = 1;
    let canvasHeight = 1;
    let pixelRatio = 1;
    let disposed = false;

    const particleDensity = clamp(density, 20, 250);
    const particleSize = clamp(size, 50, 350) / 100;
    const motion = clamp(speed, 50, 300) / 100;
    const particleLifetime = clamp(lifetime, 300, 15000);
    const maxParticles = clamp(Math.round(150 + particleDensity * 0.62), 160, 310);
    const spacing = clamp(10.5 - particleDensity * 0.032, 2.8, 9.5);
    const glowRadius = clamp(glow, 0, 200) / 100;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvasWidth = Math.max(1, rect.width);
      canvasHeight = Math.max(1, rect.height);
      pixelRatio = Math.min(1.75, Math.max(1, window.devicePixelRatio || 1));
      const backingWidth = Math.max(1, Math.round(canvasWidth * pixelRatio));
      const backingHeight = Math.max(1, Math.round(canvasHeight * pixelRatio));
      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const addParticle = (x: number, y: number, satellite = false): void => {
      const jitter = satellite ? 5 : 2.8;
      const isDot = Math.random() < (satellite ? 0.76 : 0.34);
      const kind: ParticleKind = isDot
        ? "dot"
        : Math.random() < 0.78 ? "spark" : "diamond";
      const lifeScale = 0.72 + Math.random() * 0.52;
      const particle: TrailParticle = {
        x: x + (Math.random() - 0.5) * jitter,
        y: y + (Math.random() - 0.5) * jitter,
        vx: (Math.random() - 0.5) * (0.28 + motion * 0.72),
        vy: (-0.22 - Math.random() * 0.7) * motion,
        age: 0,
        lifetime: particleLifetime * lifeScale,
        size: (satellite ? 1.2 + Math.random() * 2.2 : 2.1 + Math.random() * 4.4) * particleSize,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * (0.8 + motion * 1.2),
        alpha: 0.62 + Math.random() * 0.38,
        kind,
        colour,
      };

      if (particles.length >= maxParticles) {
        const overflow = particles.length - maxParticles + 1;
        for (let index = 0; index < overflow; index += 1) {
          const oldest = particles[index];
          if (oldest) oldest.age = Math.max(oldest.age, oldest.lifetime * 0.82);
        }
      }
      particles.push(particle);

      if (!satellite && particleDensity > 72 && Math.random() < Math.min(0.45, (particleDensity - 72) / 360)) {
        addParticle(x + (Math.random() - 0.5) * 9, y + (Math.random() - 0.5) * 9, true);
      }
    };

    const addTrailPoint = (x: number, y: number) => {
      trailPoints.push({ x, y, age: 0, lifetime: clamp(240 / motion, 120, 300) });
      if (trailPoints.length > 100) trailPoints.splice(0, trailPoints.length - 100);
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

      if (!lastPointer) {
        lastPointer = { x, y };
        addParticle(x, y);
        addTrailPoint(x, y);
        scheduleFrame();
        return;
      }

      const dx = x - lastPointer.x;
      const dy = y - lastPointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0.1) {
        const totalDistance = spacingRemainder + distance;
        const fullSampleCount = Math.floor(totalDistance / spacing);
        const sampleCount = Math.min(90, fullSampleCount);
        for (let index = 1; index <= sampleCount; index += 1) {
          const travelled = fullSampleCount > 90
            ? (distance * index) / sampleCount
            : spacing - spacingRemainder + (index - 1) * spacing;
          const progress = clamp(travelled / distance, 0, 1);
          const sampleX = lastPointer.x + dx * progress;
          const sampleY = lastPointer.y + dy * progress;
          addParticle(sampleX, sampleY);
          addTrailPoint(sampleX, sampleY);
        }
        spacingRemainder = totalDistance % spacing;
        if (distance > 26 && Math.random() < 0.7) {
          addParticle(x, y, true);
          addTrailPoint(x, y);
        }
        lastPointer = { x, y };
        scheduleFrame();
      }
    };

    const drawSpark = (x: number, y: number, radius: number, rotation: number) => {
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.beginPath();
      context.moveTo(0, -radius);
      context.quadraticCurveTo(radius * 0.1, -radius * 0.12, radius, 0);
      context.quadraticCurveTo(radius * 0.12, radius * 0.12, 0, radius);
      context.quadraticCurveTo(-radius * 0.12, radius * 0.12, -radius, 0);
      context.quadraticCurveTo(-radius * 0.12, -radius * 0.12, 0, -radius);
      context.closePath();
      context.fill();
      context.restore();
    };

    const render = (now: number) => {
      frameId = null;
      if (disposed) return;
      const delta = clamp((now - lastFrameAt) / 1000, 0, 0.04);
      lastFrameAt = now;
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      context.globalCompositeOperation = "lighter";

      for (let index = trailPoints.length - 1; index >= 0; index -= 1) {
        const point = trailPoints[index];
        if (!point) continue;
        point.age += delta * 1000;
        if (point.age >= point.lifetime) trailPoints.splice(index, 1);
      }

      if (trailPoints.length > 1) {
        const first = trailPoints[0];
        const last = trailPoints[trailPoints.length - 1];
        if (first && last) {
          const oldFade = Math.pow(1 - first.age / first.lifetime, 1.5);
          const alphaColour = (alpha: number) => {
            const hex = /^#[0-9a-f]{6}$/i.test(colour) ? colour.slice(1) : "ff9b52";
            const red = Number.parseInt(hex.slice(0, 2), 16);
            const green = Number.parseInt(hex.slice(2, 4), 16);
            const blue = Number.parseInt(hex.slice(4, 6), 16);
            return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
          };
          const ribbon = context.createLinearGradient(first.x, first.y, last.x, last.y);
          ribbon.addColorStop(0, alphaColour(0));
          ribbon.addColorStop(0.34, alphaColour(0.16 * oldFade));
          ribbon.addColorStop(1, alphaColour(0.56));
          context.save();
          context.globalAlpha = 1;
          context.strokeStyle = ribbon;
          context.lineWidth = clamp(particleSize * 1.65, 0.8, 3.5);
          context.lineCap = "round";
          context.lineJoin = "round";
          context.shadowColor = colour;
          context.shadowBlur = Math.min(24, glowRadius * 12);
          context.beginPath();
          context.moveTo(first.x, first.y);
          for (let index = 1; index < trailPoints.length; index += 1) {
            const point = trailPoints[index];
            if (point) context.lineTo(point.x, point.y);
          }
          context.stroke();
          context.restore();
        }
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        if (!particle) continue;
        particle.age += delta * 1000;
        if (particle.age >= particle.lifetime) {
          particles.splice(index, 1);
          continue;
        }

        particle.x += particle.vx * delta * 60;
        particle.y += particle.vy * delta * 60;
        particle.vy += 0.018 * motion;
        particle.rotation += particle.spin * delta;
        const progress = particle.age / particle.lifetime;
        const fadeIn = clamp(progress / 0.09, 0, 1);
        const alpha = fadeIn * Math.pow(1 - progress, 1.35) * particle.alpha;
        const pulse = 0.78 + Math.sin(progress * Math.PI) * 0.22;
        const radius = particle.size * (0.5 + Math.sin(progress * Math.PI) * 0.54) * pulse;

        context.save();
        context.globalAlpha = alpha;
        context.fillStyle = particle.colour;
        context.shadowColor = particle.colour;
        context.shadowBlur = Math.min(28, 2 + glowRadius * 17) * (particle.kind === "dot" ? 0.8 : 1);
        if (particle.kind === "dot") {
          context.beginPath();
          context.arc(particle.x, particle.y, Math.max(0.6, radius * 0.46), 0, Math.PI * 2);
          context.fill();
        } else if (particle.kind === "diamond") {
          context.translate(particle.x, particle.y);
          context.rotate(particle.rotation);
          context.fillRect(-radius * 0.43, -radius * 0.43, radius * 0.86, radius * 0.86);
        } else {
          drawSpark(particle.x, particle.y, Math.max(1, radius), particle.rotation);
          context.globalAlpha = alpha * 0.68;
          context.shadowBlur = 0;
          context.fillStyle = "#ffffff";
          context.beginPath();
          context.arc(particle.x, particle.y, Math.max(0.35, radius * 0.12), 0, Math.PI * 2);
          context.fill();
        }
        context.restore();
      }

      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      if (particles.length > 0 || trailPoints.length > 1) scheduleFrame();
    };

    function scheduleFrame() {
      if (frameId === null && !disposed) frameId = window.requestAnimationFrame(render);
    }

    resize();
    const handleBlur = () => { lastPointer = null; spacingRemainder = 0; };
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
      className={`${layerClass} ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
