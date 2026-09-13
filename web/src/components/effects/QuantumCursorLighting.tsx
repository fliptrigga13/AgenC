import { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
}

interface SleekRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface StardustMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  size: number;
  color: string;
}

export function QuantumCursorLighting() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Smoothed cursor coordinates with inertial momentum
    let targetX = width / 2;
    let targetY = height / 2;
    let currentX = width / 2;
    let currentY = height / 2;
    let isPressed = false;
    let isHoveringInteractive = false;
    let animId: number;

    // Single sleek fluid light spline history
    const trail: Point[] = [];
    const MAX_TRAIL = 22;

    // Subtle liquid ripples & stardust motes on push
    const ripples: SleekRipple[] = [];
    const motes: StardustMote[] = [];

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handlePointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;

      const target = e.target as HTMLElement | null;
      if (target) {
        const isInteractive =
          target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.closest('button') !== null ||
          target.closest('a') !== null ||
          target.getAttribute('role') === 'button';
        isHoveringInteractive = isInteractive;
      }
    };

    const spawnPushRipple = (x: number, y: number) => {
      // Primary delicate golden liquid ripple
      ripples.push({
        x,
        y,
        radius: 6,
        maxRadius: 180,
        alpha: 0.8,
        color: '#FFAA33',
      });

      // Secondary whisper-thin cyan echo ring
      ripples.push({
        x,
        y,
        radius: 3,
        maxRadius: 130,
        alpha: 0.6,
        color: '#00E5FF',
      });

      // Few delicate stardust motes (soft, subtle dispersion)
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.4;
        const speed = Math.random() * 2.5 + 1.2;
        motes.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 0.85,
          decay: Math.random() * 0.02 + 0.015,
          size: Math.random() * 1.5 + 0.8,
          color: i % 2 === 0 ? '#FFAA33' : '#FFF3D6',
        });
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      isPressed = true;
      targetX = e.clientX;
      targetY = e.clientY;
      spawnPushRipple(e.clientX, e.clientY);
    };

    const handlePointerUp = () => {
      isPressed = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });

    const render = (time: number) => {
      // Silky smooth lerp (0.14 factor for liquid inertia)
      currentX += (targetX - currentX) * 0.14;
      currentY += (targetY - currentY) * 0.14;

      // Update CSS variables for subtle specular reflection on UI
      document.documentElement.style.setProperty('--cursor-x', `${currentX.toFixed(1)}px`);
      document.documentElement.style.setProperty('--cursor-y', `${currentY.toFixed(1)}px`);

      // Record point into sleek single trail
      trail.unshift({ x: currentX, y: currentY });
      if (trail.length > MAX_TRAIL) {
        trail.pop();
      }

      ctx.clearRect(0, 0, width, height);

      // ── 1. Super Classy Volumetric Lighting Spotlight ──
      const spotlightRadius = isPressed ? 320 : isHoveringInteractive ? 360 : 310;
      const spotGrad = ctx.createRadialGradient(
        currentX,
        currentY,
        0,
        currentX,
        currentY,
        spotlightRadius,
      );

      if (isPressed) {
        // Subtle concentrated solar warmth when pushed
        spotGrad.addColorStop(0, 'rgba(255, 235, 180, 0.22)');
        spotGrad.addColorStop(0.15, 'rgba(255, 160, 40, 0.14)');
        spotGrad.addColorStop(0.4, 'rgba(255, 100, 10, 0.06)');
        spotGrad.addColorStop(0.75, 'rgba(0, 229, 255, 0.015)');
        spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        // Soft satin champagne ambient illumination
        spotGrad.addColorStop(0, 'rgba(255, 190, 80, 0.11)');
        spotGrad.addColorStop(0.2, 'rgba(255, 130, 25, 0.055)');
        spotGrad.addColorStop(0.5, 'rgba(255, 80, 0, 0.022)');
        spotGrad.addColorStop(0.8, 'rgba(0, 229, 255, 0.008)');
        spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.arc(currentX, currentY, spotlightRadius, 0, Math.PI * 2);
      ctx.fill();

      // ── 2. Sleek Fluid Light Filament (Single Silk Spline) ──
      if (trail.length >= 3) {
        ctx.save();
        for (let i = 0; i < trail.length - 1; i++) {
          const p0 = trail[i];
          const p1 = trail[i + 1];
          const progress = i / trail.length; // 0 at head, 1 at tail
          const alpha = Math.max(0, (1 - progress) * (isPressed ? 0.75 : 0.5));
          const lineWidth = Math.max(0.4, 1.8 * (1 - progress));

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          const mx = (p0.x + p1.x) / 2;
          const my = (p0.y + p1.y) / 2;
          ctx.quadraticCurveTo(p0.x, p0.y, mx, my);

          ctx.strokeStyle = '#FFAA33';
          ctx.globalAlpha = alpha;
          ctx.lineWidth = lineWidth;
          ctx.shadowColor = '#FF8800';
          ctx.shadowBlur = 8 * (1 - progress);
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── 3. Concentric Liquid Light Ripples ("when pushed") ──
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 4.5;
        const progress = r.radius / r.maxRadius;
        r.alpha = Math.max(0, 1 - Math.pow(progress, 1.2));

        if (r.radius >= r.maxRadius || r.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = r.alpha * 0.5;
        ctx.lineWidth = Math.max(0.5, 1.6 * (1 - progress));
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      }

      // ── 4. Delicate Stardust Motes ──
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i];
        m.x += m.vx;
        m.y += m.vy;
        m.vx *= 0.92; // smooth drag
        m.vy *= 0.92;
        m.alpha -= m.decay;

        if (m.alpha <= 0) {
          motes.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size * m.alpha, 0, Math.PI * 2);
        ctx.fillStyle = m.color;
        ctx.globalAlpha = m.alpha * 0.7;
        ctx.shadowColor = m.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
      }

      // ── 5. Minimalist Luxury Precision Reticle ──
      ctx.save();
      const reticleRadius = isPressed ? 9 : isHoveringInteractive ? 16 : 12;
      const angle = time * 0.001; // slow, elegant rotation

      // Micro-fine precision outer hairline
      ctx.beginPath();
      ctx.arc(currentX, currentY, reticleRadius, angle, angle + Math.PI * 1.4);
      ctx.strokeStyle = '#FFAA33';
      ctx.globalAlpha = isPressed ? 0.75 : 0.5;
      ctx.lineWidth = 0.8;
      ctx.shadowColor = '#FFAA33';
      ctx.shadowBlur = 4;
      ctx.stroke();

      // Delicate opposite accent arc
      ctx.beginPath();
      ctx.arc(currentX, currentY, reticleRadius, angle + Math.PI * 1.6, angle + Math.PI * 1.9);
      ctx.strokeStyle = '#00E5FF';
      ctx.globalAlpha = isPressed ? 0.7 : 0.4;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // 4 Minimal Cardinal Precision Ticks
      const tickLength = 2;
      for (let j = 0; j < 4; j++) {
        const tickAngle = angle + (Math.PI / 2) * j;
        const x1 = currentX + Math.cos(tickAngle) * (reticleRadius + 2);
        const y1 = currentY + Math.sin(tickAngle) * (reticleRadius + 2);
        const x2 = currentX + Math.cos(tickAngle) * (reticleRadius + 2 + tickLength);
        const y2 = currentY + Math.sin(tickAngle) * (reticleRadius + 2 + tickLength);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(255, 210, 120, 0.4)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Central Golden Diamond Bead
      ctx.beginPath();
      ctx.arc(currentX, currentY, isPressed ? 2.2 : 1.4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.95;
      ctx.shadowColor = '#FFAA33';
      ctx.shadowBlur = 6;
      ctx.fill();

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-40 h-full w-full"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
