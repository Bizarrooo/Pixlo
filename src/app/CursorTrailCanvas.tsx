"use client";

import { useEffect, useRef } from "react";

type ParticleKind = "orb" | "spark" | "diamond";
type Particle = {
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
};
type TrailPoint = { x: number; y: number; age: number; lifetime: number };
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

function channelsFromColour(value: string): [number, number, number] {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return [255, 126, 70];
  let hex = match[1] ?? "ff7e46";
  if (hex.length === 3) hex = hex.split("").map((part) => part + part).join("");
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function rgba([red, green, blue]: [number, number, number], alpha: number) {
  return "rgba(" + red + "," + green + "," + blue + "," + clamp(alpha, 0, 1) + ")";
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
    const context = canvas?.getContext("2d", { alpha: true, desynchronized: true });
    if (!canvas || !context) return;

    const particles: Particle[] = [];
    const trailPoints: TrailPoint[] = [];
    const retiring: Particle[] = [];
    const colourRGB = channelsFromColour(colour);

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
    const spacing = clamp(9.5 - densityValue * 0.021, 4.2, 9);
    const maxParticles = clamp(Math.round(100 + densityValue * 0.42), 110, 210);
    const glowScale = clamp(glow, 0, 200) / 100;
    const trailLifetime = clamp(310 / Math.max(0.65, motionScale), 155, 340);
    const maxTrailPoints = 78;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvasWidth = Math.max(1, rect.width);
      canvasHeight = Math.max(1, rect.height);
      // A capped backing scale avoids spending several times more work on retina displays.
      pixelRatio = Math.min(1.25, Math.max(1, window.devicePixelRatio || 1));
      const width = Math.max(1, Math.round(canvasWidth * pixelRatio));
      const height = Math.max(1, Math.round(canvasHeight * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const addPoint = (x: number, y: number) => {
      trailPoints.push({ x, y, age: 0, lifetime: trailLifetime });
      if (trailPoints.length > maxTrailPoints) trailPoints.shift();
    };

    const createParticle = (x: number, y: number, dx: number, dy: number, tiny = false): Particle => {
      const length = Math.hypot(dx, dy) || 1;
      const r = Math.random();
      return {
        x: x + (Math.random() - 0.5) * (tiny ? 4 : 2.5),
        y: y + (Math.random() - 0.5) * (tiny ? 4 : 2.5),
        vx: -(dx / length) * motionScale * (tiny ? 0.16 : 0.28) + (Math.random() - 0.5) * (tiny ? 0.55 : 1.05),
        vy: -(dy / length) * motionScale * (tiny ? 0.16 : 0.28) - Math.random() * 0.45,
        age: 0,
        lifetime: particleLifetime * (tiny ? 0.28 + Math.random() * 0.4 : 0.48 + Math.random() * 0.52),
        size: (tiny ? 0.6 + Math.random() * 1.1 : 1.25 + Math.random() * 2.7) * sizeScale,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * (0.8 + motionScale),
        alpha: tiny ? 0.3 + Math.random() * 0.34 : 0.55 + Math.random() * 0.4,
        kind: tiny ? "orb" : r < 0.53 ? "orb" : r < 0.82 ? "spark" : "diamond",
      };
    };

    const addParticle = (x: number, y: number, dx: number, dy: number) => {
      if (particles.length >= maxParticles) {
        const oldest = particles.shift();
        if (oldest) {
          // Recycle the oldest particles over a short fade; never stall spawning at the cap.
          oldest.age = Math.max(oldest.age, oldest.lifetime - 115);
          retiring.push(oldest);
          if (retiring.length > 28) retiring.shift();
        }
      }
      particles.push(createParticle(x, y, dx, dy));
      const satelliteChance = clamp((densityValue - 45) / 520, 0, 0.38);
      if (Math.random() < satelliteChance) {
        if (particles.length >= maxParticles) {
          const oldest = particles.shift();
          if (oldest) {
            oldest.age = Math.max(oldest.age, oldest.lifetime - 115);
            retiring.push(oldest);
            if (retiring.length > 28) retiring.shift();
          }
        }
        particles.push(createParticle(x + (Math.random() - 0.5) * 5, y + (Math.random() - 0.5) * 5, dx, dy, true));
      }
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
        addParticle(x, y, 0, 0);
        addPoint(x, y);
        scheduleFrame();
        return;
      }

      const fromX = lastPointer.x;
      const fromY = lastPointer.y;
      const dx = x - fromX;
      const dy = y - fromY;
      const distance = Math.hypot(dx, dy);
      if (distance < 0.1) return;

      const total = spacingRemainder + distance;
      const fullCount = Math.floor(total / spacing);
      const count = Math.min(36, fullCount);
      for (let index = 1; index <= count; index += 1) {
        const travelled = fullCount > 36 ? (distance * index) / count : spacing - spacingRemainder + (index - 1) * spacing;
        const t = clamp(travelled / distance, 0, 1);
        const px = fromX + dx * t;
        const py = fromY + dy * t;
        addParticle(px, py, dx, dy);
        addPoint(px, py);
      }
      spacingRemainder = total % spacing;
      lastPointer = { x, y };
      scheduleFrame();
    };

    const drawRibbon = () => {
      if (trailPoints.length < 2) return;
      const first = trailPoints[0];
      const last = trailPoints[trailPoints.length - 1];
      if (!first || !last) return;

      const gradient = context.createLinearGradient(first.x, first.y, last.x, last.y);
      gradient.addColorStop(0, rgba(colourRGB, 0));
      gradient.addColorStop(0.3, rgba(colourRGB, 0.14));
      gradient.addColorStop(0.74, rgba(colourRGB, 0.32));
      gradient.addColorStop(1, rgba(colourRGB, 0.78));

      context.save();
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = gradient;
      context.lineWidth = clamp(sizeScale * 2.4, 1.1, 4.2);
      context.shadowColor = colour;
      context.shadowBlur = Math.min(8, glowScale * 4.5);
      context.beginPath();
      context.moveTo(first.x, first.y);
      for (let index = 1; index < trailPoints.length; index += 1) {
        const point = trailPoints[index];
        if (point) context.lineTo(point.x, point.y);
      }
      context.stroke();
      context.shadowBlur = 0;
      context.strokeStyle = "rgba(255,255,255,0.34)";
      context.lineWidth = Math.max(0.45, sizeScale * 0.52);
      context.stroke();
      context.restore();
    };

    const drawParticleGroups = () => {
      const alphaBuckets = 5;
      const orbPaths = Array.from({ length: alphaBuckets }, () => new Path2D());
      const sparkPaths = Array.from({ length: alphaBuckets }, () => new Path2D());
      const diamondPaths = Array.from({ length: alphaBuckets }, () => new Path2D());
      const corePath = new Path2D();

      const addShape = (particle: Particle, retiringAlpha = 1) => {
        const progress = clamp(particle.age / particle.lifetime, 0, 1);
        const fadeIn = clamp(progress / 0.1, 0, 1);
        const alpha = fadeIn * Math.pow(1 - progress, 1.55) * particle.alpha * retiringAlpha;
        if (alpha < 0.025) return;
        const bucket = clamp(Math.floor(alpha * alphaBuckets), 0, alphaBuckets - 1);
        const radius = Math.max(0.55, particle.size * (0.82 + Math.sin(progress * Math.PI) * 0.22));

        if (particle.kind === "orb") {
          const path = orbPaths[bucket];
          if (!path) return;
          path.moveTo(particle.x + radius, particle.y);
          path.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
          corePath.moveTo(particle.x + radius * 0.3, particle.y);
          corePath.arc(particle.x, particle.y, Math.max(0.25, radius * 0.3), 0, Math.PI * 2);
        } else if (particle.kind === "diamond") {
          const path = diamondPaths[bucket];
          if (!path) return;
          const c = Math.cos(particle.rotation);
          const s = Math.sin(particle.rotation);
          const points: [number, number][] = [
            [0, -radius], [radius * 0.62, 0], [0, radius], [-radius * 0.62, 0],
          ];
          points.forEach(([px, py], index) => {
            const rx = particle.x + px * c - py * s;
            const ry = particle.y + px * s + py * c;
            if (index === 0) path.moveTo(rx, ry);
            else path.lineTo(rx, ry);
          });
          path.closePath();
        } else {
          const path = sparkPaths[bucket];
          if (!path) return;
          const c = Math.cos(particle.rotation);
          const s = Math.sin(particle.rotation);
          const points: [number, number][] = [
            [0, -radius], [radius * 0.22, -radius * 0.22], [radius, 0],
            [radius * 0.22, radius * 0.22], [0, radius], [-radius * 0.22, radius * 0.22],
            [-radius, 0], [-radius * 0.22, -radius * 0.22],
          ];
          points.forEach(([px, py], index) => {
            const rx = particle.x + px * c - py * s;
            const ry = particle.y + px * s + py * c;
            if (index === 0) path.moveTo(rx, ry);
            else path.lineTo(rx, ry);
          });
          path.closePath();
        }
      };

      particles.forEach((particle) => addShape(particle));
      retiring.forEach((particle) => {
        const fade = clamp(1 - (particle.age - (particle.lifetime - 115)) / 115, 0, 1);
        addShape(particle, fade);
      });

      context.save();
      context.globalCompositeOperation = "lighter";
      context.fillStyle = colour;
      context.shadowColor = colour;
      context.shadowBlur = Math.min(7, 1.5 + glowScale * 3.5);
      for (let bucket = 0; bucket < alphaBuckets; bucket += 1) {
        context.globalAlpha = (bucket + 1) / alphaBuckets;
        const orbPath = orbPaths[bucket];
        const sparkPath = sparkPaths[bucket];
        const diamondPath = diamondPaths[bucket];
        if (orbPath) context.fill(orbPath);
        if (sparkPath) context.fill(sparkPath);
        if (diamondPath) context.fill(diamondPath);
      }
      context.shadowBlur = 0;
      context.fillStyle = "#ffffff";
      context.globalAlpha = 0.48;
      context.fill(corePath);
      context.restore();
    };

    const render = (now: number) => {
      frameId = null;
      if (disposed) return;
      const deltaMs = clamp(now - lastFrameAt, 0, 34);
      const delta = deltaMs / 1000;
      lastFrameAt = now;

      context.clearRect(0, 0, canvasWidth, canvasHeight);

      for (let index = trailPoints.length - 1; index >= 0; index -= 1) {
        const point = trailPoints[index];
        if (!point) continue;
        point.age += deltaMs;
        if (point.age >= point.lifetime) trailPoints.splice(index, 1);
      }
      drawRibbon();

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        if (!particle) continue;
        particle.age += deltaMs;
        if (particle.age >= particle.lifetime) {
          particles.splice(index, 1);
          continue;
        }
        particle.x += particle.vx * delta * 60;
        particle.y += particle.vy * delta * 60;
        particle.vx *= Math.pow(0.986, delta * 60);
        particle.vy = particle.vy * Math.pow(0.987, delta * 60) + 0.006 * motionScale * delta * 60;
        particle.rotation += particle.spin * delta;
      }

      for (let index = retiring.length - 1; index >= 0; index -= 1) {
        const particle = retiring[index];
        if (!particle) continue;
        particle.age += deltaMs;
        if (particle.age >= particle.lifetime) {
          retiring.splice(index, 1);
          continue;
        }
        particle.x += particle.vx * delta * 60;
        particle.y += particle.vy * delta * 60;
        particle.vx *= Math.pow(0.986, delta * 60);
        particle.vy = particle.vy * Math.pow(0.987, delta * 60) + 0.006 * motionScale * delta * 60;
        particle.rotation += particle.spin * delta;
      }

      drawParticleGroups();

      const movingRecently = now - lastPointerMoveAt < 90 && lastPointer !== null;
      if (movingRecently && lastPointer) {
        const radius = 4 + glowScale * 2.5;
        const gradient = context.createRadialGradient(lastPointer.x, lastPointer.y, 0, lastPointer.x, lastPointer.y, radius);
        gradient.addColorStop(0, rgba(colourRGB, 0.16));
        gradient.addColorStop(1, rgba(colourRGB, 0));
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(lastPointer.x, lastPointer.y, radius, 0, Math.PI * 2);
        context.fill();
      }

      if (particles.length > 0 || retiring.length > 0 || trailPoints.length > 1 || movingRecently) scheduleFrame();
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

  return <canvas ref={canvasRef} className={(layerClass + " " + className).trim()} aria-hidden="true" />;
}
