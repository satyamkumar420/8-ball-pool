// ============================================================
// Pocket detection — checks if balls fall into any pocket
// ============================================================

import { IBall, ICollisionEvent } from "@/lib/types";
import { POCKETS } from "@/lib/constants/table";
import { distanceSq } from "./Vec2D";

/**
 * Check if a single ball has fallen into any pocket.
 * Uses squared distance for performance (avoids sqrt).
 *
 * If pocketed:
 * - Sets ball.isPocketed = true
 * - Stops ball movement
 * - Returns collision event (for pocket sound)
 *
 * Returns null if ball is not in any pocket.
 */
export function checkPocket(ball: IBall): ICollisionEvent | null {
  if (ball.isPocketed || ball.isSinking) return null;

  for (const pocket of POCKETS) {
    const dSq = distanceSq(ball.position, pocket.position);
    const radiusSum = pocket.radius + ball.radius * 0.7; // Ball gets captured as soon as it enters pocket mouth zone

    if (dSq < radiusSum * radiusSum) {
      ball.isSinking = true;
      ball.sinkProgress = 0;
      ball.sinkTarget = { x: pocket.position.x, y: pocket.position.y };
      ball.sinkStartPos = { x: ball.position.x, y: ball.position.y };
      ball.isMoving = true;
      ball.velocity.x = 0;
      ball.velocity.y = 0;

      return {
        type: "pocket",
        speed: 1, // Pocket sound is constant volume
        ballId: ball.id,
      };
    }
  }

  return null;
}

/**
 * Check pocket detection for all active balls.
 * Returns array of pocket events (which balls were pocketed this frame).
 */
export function checkPocketAll(balls: IBall[]): ICollisionEvent[] {
  const events: ICollisionEvent[] = [];

  for (const ball of balls) {
    if (ball.isPocketed) continue;
    const event = checkPocket(ball);
    if (event) {
      events.push(event);
    }
  }

  return events;
}

/**
 * Check if a specific pocket region should prevent cushion bounce.
 * Balls near pockets should NOT bounce off cushions — they should
 * fall into the pocket instead.
 *
 * Returns true if the ball is near enough to any pocket to skip
 * cushion collision.
 */
export function isNearPocket(ball: IBall): boolean {
  for (const pocket of POCKETS) {
    // Use same radius as pocket detection to eliminate deadzone
    const pocketInfluenceRadius = pocket.radius + ball.radius * 0.7 + 2;
    const dSq = distanceSq(ball.position, pocket.position);
    if (dSq < pocketInfluenceRadius * pocketInfluenceRadius) {
      return true;
    }
  }

  return false;
}
