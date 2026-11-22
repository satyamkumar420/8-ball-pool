"use client";

import React, { useEffect, useRef } from "react";

/**
 * Confetti — A lightweight, high-performance canvas-based celebration particle system.
 * Spawns an initial burst of colorful shapes from both bottom corners, then maintains
 * a gentle stream of falling confetti.
 */
export const Confetti: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    // Resize canvas to cover whole viewport
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Particle definition
    interface Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
      oscillationSpeed: number;
      oscillationDelta: number;
    }

    const colors = [
      "#f43f5e", // Rose
      "#10b981", // Emerald
      "#3b82f6", // Blue
      "#eab308", // Yellow
      "#a855f7", // Purple
      "#ec4899", // Pink
      "#06b6d4", // Cyan
      "#f97316", // Orange
    ];
    const particles: Particle[] = [];

    // Helper to generate a particle with custom speeds
    const createParticle = (x: number, y: number): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 4;
      return {
        x,
        y,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 4 - 2,
        oscillationSpeed: Math.random() * 0.05 + 0.02,
        oscillationDelta: Math.random() * Math.PI * 2,
      };
    };

    // Spawn initial bursts from bottom-left and bottom-right corners
    for (let i = 0; i < 65; i++) {
      // Bottom-left burst (shooting up and right)
      const p1 = createParticle(0, canvas.height);
      p1.speedX = Math.random() * 11 + 6;
      p1.speedY = -(Math.random() * 16 + 12);
      particles.push(p1);

      // Bottom-right burst (shooting up and left)
      const p2 = createParticle(canvas.width, canvas.height);
      p2.speedX = -(Math.random() * 11 + 6);
      p2.speedY = -(Math.random() * 16 + 12);
      particles.push(p2);
    }

    const startTime = performance.now();

    // Animation loop
    const animate = (currentTime?: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = typeof currentTime === "number" ? currentTime : performance.now();
      const elapsed = now - startTime;

      // Maintain a gentle rainfall of new particles only for the first 3 seconds of celebration
      if (elapsed < 3000 && particles.length < 120) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -15,
          size: Math.random() * 7 + 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          speedX: Math.random() * 2 - 1,
          speedY: Math.random() * 3 + 2,
          rotation: Math.random() * 360,
          rotationSpeed: Math.random() * 4 - 2,
          oscillationSpeed: Math.random() * 0.05 + 0.02,
          oscillationDelta: Math.random() * Math.PI * 2,
        });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Apply physics
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += 0.22; // Gravity
        p.speedX *= 0.98; // Drag

        // Rotation & horizontal sway (oscillation)
        p.rotation += p.rotationSpeed;
        p.oscillationDelta += p.oscillationSpeed;
        p.x += Math.sin(p.oscillationDelta) * 0.45;

        // Draw particle shape
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (i % 3 === 0) {
          // Circular confetti
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (i % 3 === 1) {
          // Triangular confetti
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
        } else {
          // Rectangular confetti
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        }

        ctx.restore();

        // Remove out-of-bounds particles
        if (p.y > canvas.height + 20 || p.x < -20 || p.x > canvas.width + 20) {
          particles.splice(i, 1);
        }
      }

      // If the celebration spawning duration passed and all particles have fallen off screen, stop the loop cleanly
      if (elapsed >= 3000 && particles.length === 0) {
        return;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-99 w-full h-full"
    />
  );
};
