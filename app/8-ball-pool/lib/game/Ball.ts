// ============================================================
// Ball entity — utility functions for ball state management
// ============================================================

import { BallType, IBall, IVec2D } from "@/lib/types";
import { BALL_RADIUS, BALL_VISUALS } from "@/lib/constants/balls";
import { MIN_VELOCITY } from "@/lib/constants/physics";

/**
 * Create a single ball from its ID.
 * Looks up visual config (color, type) from BALL_VISUALS.
 */
export function createBall(id: number, position: IVec2D): IBall {
  const visual = BALL_VISUALS[id];
  const tiltAngle = Math.random() * 0.5;
  const spinAngle = Math.random() * Math.PI * 2;
  return {
    id,
    type: visual.type,
    position: { x: position.x, y: position.y },
    velocity: { x: 0, y: 0 },
    radius: BALL_RADIUS,
    color: visual.color,
    stripeColor: visual.type === BallType.STRIPE ? "#ffffff" : undefined,
    isPocketed: false,
    isMoving: false,
    angle: 0,
    stickerDir: {
      x: Math.sin(tiltAngle) * Math.cos(spinAngle),
      y: Math.sin(tiltAngle) * Math.sin(spinAngle),
      z: Math.cos(tiltAngle),
    },
  };
}

/**
 * Update ball position based on current velocity.
 * Should be called once per physics frame.
 */
export function updateBallPosition(ball: IBall, dt: number = 1.0): void {
  if (ball.isPocketed) return;

  if (ball.isSinking && ball.sinkTarget) {
    // Increment progress (takes ~33 frames at 60fps, scaled by dt for sub-stepping)
    ball.sinkProgress = (ball.sinkProgress || 0) + 0.03 * dt;
    const progress = ball.sinkProgress;

    const startPos = ball.sinkStartPos || { x: ball.position.x, y: ball.position.y };
    const target = ball.sinkTarget;
    
    // Swirling spiral & rattling animation into pocket hole
    const startDx = startPos.x - target.x;
    const startDy = startPos.y - target.y;
    const startDist = Math.sqrt(startDx * startDx + startDy * startDy);
    const startAngle = Math.atan2(startDy, startDx);

    // Spiraling orbit: 1.8 full turns (3.6 * Math.PI) while radius contracts into hole center
    const currentAngle = startAngle + progress * Math.PI * 3.6;
    
    // Decaying rattling wobble along the rim
    const wobble = Math.sin(progress * Math.PI * 10) * 2.5 * (1 - progress);
    const currentRadius = Math.max(0, startDist * (1 - Math.pow(progress, 0.7)) + wobble);

    let posX = target.x + Math.cos(currentAngle) * currentRadius;
    let posY = target.y + Math.sin(currentAngle) * currentRadius;

    // Enforce pocket mouth boundary caps so the spiral stays 100% inside pocket opening and never steps onto outer wooden rails
    if (target.x >= 1350) posX = Math.min(1362, posX); // Top-Right / Bottom-Right pockets
    if (target.x <= 50) posX = Math.max(38, posX);     // Top-Left / Bottom-Left pockets
    if (target.y <= 50) posY = Math.max(38, posY);     // Top pockets
    if (target.y >= 650) posY = Math.min(662, posY);   // Bottom pockets

    ball.position.x = posX;
    ball.position.y = posY;

    // Continue spinning the ball visual while it rolls/falls
    ball.angle = (ball.angle + 0.18 * dt) % (Math.PI * 2);
    if (!ball.stickerDir) ball.stickerDir = { x: 0, y: 0, z: 1 };
    const s = ball.stickerDir;
    const rx = 0.707;
    const ry = 0.707;
    const theta = 0.18 * dt;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const cx = ry * s.z;
    const cy = -rx * s.z;
    const cz = rx * s.y - ry * s.x;
    const dot = rx * s.x + ry * s.y;
    const nx = s.x * cosT + cx * sinT + rx * dot * (1 - cosT);
    const ny = s.y * cosT + cy * sinT + ry * dot * (1 - cosT);
    const nz = s.z * cosT + cz * sinT;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) {
      ball.stickerDir = { x: nx / len, y: ny / len, z: nz / len };
    }
    ball.isMoving = true;

    if (ball.sinkProgress >= 1) {
      ball.sinkProgress = 1;
      ball.isSinking = false;
      ball.isPocketed = true;
      ball.isMoving = false;
      ball.velocity = { x: 0, y: 0 };
      ball.position = { x: -100, y: -100 }; // Off-screen cleanup
    }
    return;
  }

  const dx = ball.velocity.x * dt;
  const dy = ball.velocity.y * dt;
  const speed = Math.sqrt(dx * dx + dy * dy); // Distance traveled this substep

  ball.position.x += dx;
  ball.position.y += dy;

  // The ball stops moving only when its full unscaled velocity drops below the minimum
  const fullSpeed = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);
  ball.isMoving = fullSpeed > MIN_VELOCITY;

  if (ball.isMoving) {
    // Increment rotation angle based on distance traveled relative to radius
    ball.angle = (ball.angle + speed / ball.radius) % (Math.PI * 2);

    // 3D rotation update for rolling visual
    if (!ball.stickerDir) {
      const tiltAngle = Math.random() * 0.5;
      const spinAngle = Math.random() * Math.PI * 2;
      ball.stickerDir = {
        x: Math.sin(tiltAngle) * Math.cos(spinAngle),
        y: Math.sin(tiltAngle) * Math.sin(spinAngle),
        z: Math.cos(tiltAngle),
      };
    }

    const s = ball.stickerDir;
    // Handle very small speeds to avoid division by zero
    if (speed > 0.0001) {
      const rx = -dy / speed;
      const ry = dx / speed;
      const theta = speed / ball.radius;

      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      // Cross product u x s (since uz = 0)
      const cx = ry * s.z;
      const cy = -rx * s.z;
      const cz = rx * s.y - ry * s.x;

      // Dot product u . s
      const dot = rx * s.x + ry * s.y;

      const nx = s.x * cosT + cx * sinT + rx * dot * (1 - cosT);
      const ny = s.y * cosT + cy * sinT + ry * dot * (1 - cosT);
      const nz = s.z * cosT + cz * sinT;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len > 0) {
        ball.stickerDir = { x: nx / len, y: ny / len, z: nz / len };
      }
    }
  }
}

/**
 * Update positions for all active balls.
 */
export function updateAllBallPositions(balls: IBall[], dt: number = 1.0): void {
  for (const ball of balls) {
    updateBallPosition(ball, dt);
  }
}

/**
 * Apply a velocity (shot) to a ball.
 */
export function applyShot(ball: IBall, velocity: IVec2D): void {
  ball.velocity.x = velocity.x;
  ball.velocity.y = velocity.y;
  ball.isMoving = true;
}

/**
 * Reset a ball to a given position with zero velocity.
 */
export function resetBall(ball: IBall, position: IVec2D): void {
  ball.position.x = position.x;
  ball.position.y = position.y;
  ball.velocity.x = 0;
  ball.velocity.y = 0;
  ball.isPocketed = false;
  ball.isMoving = false;
}

/**
 * Get all active (non-pocketed) balls.
 */
export function getActiveBalls(balls: IBall[]): IBall[] {
  return balls.filter((b) => !b.isPocketed);
}

/**
 * Get all pocketed balls of a specific type.
 */
export function getPocketedByType(balls: IBall[], type: BallType): IBall[] {
  return balls.filter((b) => b.isPocketed && b.type === type);
}

/**
 * Check if all balls of a type have been pocketed.
 */
export function allPocketed(balls: IBall[], type: BallType): boolean {
  return balls
    .filter((b) => b.type === type)
    .every((b) => b.isPocketed);
}

/**
 * Find ball by ID. Returns undefined if not found.
 */
export function findBall(balls: IBall[], id: number): IBall | undefined {
  return balls.find((b) => b.id === id);
}
