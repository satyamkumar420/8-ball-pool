// ============================================================
// Ball-to-ball elastic collision detection & resolution
// Uses 2D elastic collision math with equal-mass assumption
// ============================================================

import { IBall, ICollisionEvent } from "@/lib/types";
import { BALL_ELASTIC, OVERLAP_CORRECTION } from "@/lib/constants/physics";
import { distance, magnitude, sub } from "./Vec2D";
import { PLAY_LEFT, PLAY_TOP, PLAY_RIGHT, PLAY_BOTTOM } from "@/lib/constants/table";
import { isNearPocket } from "./pocket";

/**
 * Check if two balls are overlapping (collision detected).
 */
export function areBallsColliding(a: IBall, b: IBall): boolean {
  const dist = distance(a.position, b.position);
  return dist < a.radius + b.radius;
}

/**
 * Resolve elastic collision between two equal-mass balls.
 * Mutates both balls' velocities and positions in-place for performance.
 *
 * Physics:
 * 1. Calculate collision normal (unit vector between centers)
 * 2. Calculate relative velocity along normal
 * 3. If balls are separating (dot < 0), skip
 * 4. Apply 1D elastic collision along normal axis
 * 5. Push balls apart to remove overlap
 *
 * Returns collision event (for sound effects) or null if no resolution needed.
 */
export function resolveCollision(a: IBall, b: IBall): ICollisionEvent | null {
  const delta = sub(b.position, a.position);
  const dist = magnitude(delta);
  const minDist = a.radius + b.radius;

  // No collision
  if (dist >= minDist || dist === 0) return null;

  // Collision normal (a → b direction)
  const nx = delta.x / dist;
  const ny = delta.y / dist;

  // Separate overlapping balls to prevent sticking / passing through
  const overlap = minDist - dist;
  if (overlap > 0) {
    const correction = overlap * OVERLAP_CORRECTION;
    a.position.x -= correction * nx;
    a.position.y -= correction * ny;
    b.position.x += correction * nx;
    b.position.y += correction * ny;
  }

  // Relative velocity (a relative to b along collision normal)
  const relVel = sub(a.velocity, b.velocity);
  const relSpeed = relVel.x * nx + relVel.y * ny;

  // Balls are already separating — skip impulse application
  if (relSpeed <= 0) return null;

  // Impulse scalar for equal-mass elastic collision
  // For equal masses: impulse = relSpeed * elasticity
  const impulse = relSpeed * BALL_ELASTIC;

  // Apply impulse to both balls
  a.velocity.x -= impulse * nx;
  a.velocity.y -= impulse * ny;
  b.velocity.x += impulse * nx;
  b.velocity.y += impulse * ny;

  return {
    type: "ball",
    speed: relSpeed,
    ballId: a.id,
    targetBallId: b.id,
  };
}

/**
 * Run collision detection and resolution for all active ball pairs.
 * Uses a multi-iteration solver to properly resolve clustered / chain collisions.
 * Returns array of collision events (for sound effects).
 */
export function resolveAllCollisions(balls: IBall[]): ICollisionEvent[] {
  const events: ICollisionEvent[] = [];
  const activeBalls = balls.filter((b) => !b.isPocketed && !b.isSinking);

  // Run up to 3 solver iterations per substep for chain collisions
  const SOLVER_ITERATIONS = 3;
  for (let iter = 0; iter < SOLVER_ITERATIONS; iter++) {
    let resolvedAny = false;
    for (let i = 0; i < activeBalls.length; i++) {
      for (let j = i + 1; j < activeBalls.length; j++) {
        const event = resolveCollision(activeBalls[i], activeBalls[j]);
        if (event) {
          if (iter === 0) {
            events.push(event);
          }
          resolvedAny = true;
        }
      }
    }
    if (!resolvedAny) break;
  }

  return events;
}

/**
 * Clamp all active balls inside the playable area.
 * Safety net to prevent balls from escaping table bounds
 * due to overlap correction or edge cases.
 */
export function clampBallsInBounds(balls: IBall[]): void {
  for (const ball of balls) {
    if (ball.isPocketed || ball.isSinking) continue;
    
    if (isNearPocket(ball)) {
      // Allow freedom to roll into pocket throat, but strictly cap position at outer rail boundaries
      const maxExt = 8;
      ball.position.x = Math.max(PLAY_LEFT - maxExt, Math.min(PLAY_RIGHT + maxExt, ball.position.x));
      ball.position.y = Math.max(PLAY_TOP - maxExt, Math.min(PLAY_BOTTOM + maxExt, ball.position.y));
      continue;
    }

    const r = ball.radius;
    ball.position.x = Math.max(PLAY_LEFT + r, Math.min(PLAY_RIGHT - r, ball.position.x));
    ball.position.y = Math.max(PLAY_TOP + r, Math.min(PLAY_BOTTOM - r, ball.position.y));
  }
}

/**
 * Track which ball the cue ball hit first in a shot.
 * Used for foul detection (wrong ball first).
 */
export function getFirstHitBallId(
  cueBall: IBall,
  balls: IBall[]
): number | null {
  let closestDist = Infinity;
  let closestId: number | null = null;

  for (const ball of balls) {
    if (ball.id === 0 || ball.isPocketed) continue;

    const dist = distance(cueBall.position, ball.position);
    if (dist < cueBall.radius + ball.radius && dist < closestDist) {
      closestDist = dist;
      closestId = ball.id;
    }
  }

  return closestId;
}
