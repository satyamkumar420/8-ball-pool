// ============================================================
// Friction & cushion (wall) bounce physics
// ============================================================

import { IBall, ICollisionEvent } from "@/lib/types";
import {
  FRICTION,
  CUSHION_ELASTIC,
  MIN_VELOCITY,
  MAX_VELOCITY,
} from "@/lib/constants/physics";
import {
  PLAY_LEFT,
  PLAY_TOP,
  PLAY_RIGHT,
  PLAY_BOTTOM,
} from "@/lib/constants/table";
import { magnitude } from "./Vec2D";
import { isNearPocket } from "./pocket";

/**
 * Apply friction to a single ball.
 * Reduces velocity each frame and stops ball if below threshold.
 * Mutates ball in-place for performance.
 */
export function applyFriction(ball: IBall): void {
  if (ball.isPocketed) return;

  ball.velocity.x *= FRICTION;
  ball.velocity.y *= FRICTION;

  // Stop ball if velocity is negligible
  const speed = magnitude(ball.velocity);
  if (speed < MIN_VELOCITY) {
    ball.velocity.x = 0;
    ball.velocity.y = 0;
    ball.isMoving = false;
  } else {
    ball.isMoving = true;

    // Clamp max velocity to prevent tunneling
    if (speed > MAX_VELOCITY) {
      const ratio = MAX_VELOCITY / speed;
      ball.velocity.x *= ratio;
      ball.velocity.y *= ratio;
    }
  }

  // Apply topspin/backspin force for the cue ball
  if (ball.id === 0 && ball.spinY && ball.shotDir && ball.isMoving) {
    // Calculate current alignment of velocity with initial shot direction
    const dotProduct = ball.velocity.x * ball.shotDir.x + ball.velocity.y * ball.shotDir.y;
    const hasHit = ball.hasHitBall;

    // If backspin would reverse the ball before hitting anything, kill spin instead
    if (ball.spinY < 0 && dotProduct < 0 && !hasHit) {
      ball.spinY = 0;
    } else {
      // Apply force along shot direction (only if it won't cause reversal)
      const forceMagnitude = ball.spinY * 0.15;
      ball.velocity.x += ball.shotDir.x * forceMagnitude;
      ball.velocity.y += ball.shotDir.y * forceMagnitude;

      // Decay spin Y
      ball.spinY *= 0.96;
    }

    if (Math.abs(ball.spinY) < 0.01) {
      ball.spinY = 0;
    }
  }
}

/**
 * Apply friction to all active balls.
 */
export function applyFrictionAll(balls: IBall[]): void {
  for (const ball of balls) {
    if (!ball.isPocketed && !ball.isSinking) {
      applyFriction(ball);
    }
  }
}

/**
 * Check and resolve cushion (wall) bounces for a single ball.
 * Reverses velocity component on wall contact and clamps position
 * inside the play area.
 *
 * Returns collision event if a bounce occurred (for sound).
 */
export function resolveCushionBounce(ball: IBall): ICollisionEvent | null {
  if (ball.isPocketed || ball.isSinking) return null;
  // Balls near pockets should fall in, not bounce off cushions
  if (isNearPocket(ball)) return null;

  const { position, velocity, radius } = ball;
  let bounced = false;
  let bounceSpeed = 0;

  const spinX = ball.spinX || 0;

  // Left cushion: active between y = 68 and y = 632
  if (position.x - radius <= PLAY_LEFT && position.y >= 68 && position.y <= 632) {
    position.x = PLAY_LEFT + radius;
    bounceSpeed = Math.abs(velocity.x);
    velocity.x = Math.abs(velocity.x) * CUSHION_ELASTIC;
    bounced = true;
    if (ball.id === 0 && spinX !== 0) {
      const effect = spinX * Math.max(1.5, bounceSpeed) * 0.45;
      velocity.y += effect;
      ball.spinX = spinX * 0.6;
    }
  }

  // Right cushion: active between y = 68 and y = 632
  if (position.x + radius >= PLAY_RIGHT && position.y >= 68 && position.y <= 632) {
    position.x = PLAY_RIGHT - radius;
    bounceSpeed = Math.max(bounceSpeed, Math.abs(velocity.x));
    velocity.x = -Math.abs(velocity.x) * CUSHION_ELASTIC;
    bounced = true;
    if (ball.id === 0 && spinX !== 0) {
      const effect = spinX * Math.max(1.5, bounceSpeed) * 0.45;
      velocity.y -= effect;
      ball.spinX = spinX * 0.6;
    }
  }

  // Top cushion: Split into Left segment (x from 68 to 672) and Right segment (x from 728 to 1332)
  if (position.y - radius <= PLAY_TOP) {
    const inLeftSeg = position.x >= 68 && position.x <= 672;
    const inRightSeg = position.x >= 728 && position.x <= 1332;
    if (inLeftSeg || inRightSeg) {
      position.y = PLAY_TOP + radius;
      bounceSpeed = Math.max(bounceSpeed, Math.abs(velocity.y));
      velocity.y = Math.abs(velocity.y) * CUSHION_ELASTIC;
      bounced = true;
      if (ball.id === 0 && spinX !== 0) {
        const effect = spinX * Math.max(1.5, bounceSpeed) * 0.45;
        velocity.x -= effect;
        ball.spinX = spinX * 0.6;
      }
    }
  }

  // Bottom cushion: Split into Left segment (x from 68 to 672) and Right segment (x from 728 to 1332)
  if (position.y + radius >= PLAY_BOTTOM) {
    const inLeftSeg = position.x >= 68 && position.x <= 672;
    const inRightSeg = position.x >= 728 && position.x <= 1332;
    if (inLeftSeg || inRightSeg) {
      position.y = PLAY_BOTTOM - radius;
      bounceSpeed = Math.max(bounceSpeed, Math.abs(velocity.y));
      velocity.y = -Math.abs(velocity.y) * CUSHION_ELASTIC;
      bounced = true;
      if (ball.id === 0 && spinX !== 0) {
        const effect = spinX * Math.max(1.5, bounceSpeed) * 0.45;
        velocity.x += effect;
        ball.spinX = spinX * 0.6;
      }
    }
  }

  if (!bounced) return null;

  return {
    type: "cushion",
    speed: bounceSpeed,
    ballId: ball.id,
  };
}

/**
 * Resolve cushion bounces for all active balls.
 * Returns array of cushion collision events (for sound effects).
 */
export function resolveCushionBounceAll(balls: IBall[]): ICollisionEvent[] {
  const events: ICollisionEvent[] = [];

  for (const ball of balls) {
    if (ball.isPocketed || ball.isSinking) continue;
    const event = resolveCushionBounce(ball);
    if (event) {
      events.push(event);
    }
  }

  return events;
}

/**
 * Check if all balls have stopped moving.
 */
export function allBallsStopped(balls: IBall[]): boolean {
  return balls.every(
    (ball) => ball.isPocketed || !ball.isMoving
  );
}
