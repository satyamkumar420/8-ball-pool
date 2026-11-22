// ============================================================
// CueBall — Cue ball specific logic (ball-in-hand, reset)
// ============================================================

import { IBall, IVec2D } from "@/lib/types";
import { BALL_RADIUS } from "@/lib/constants/balls";
import {
  HEAD_STRING_X,
  PLAY_BOTTOM,
  PLAY_LEFT,
  PLAY_RIGHT,
  PLAY_TOP,
} from "@/lib/constants/table";
import { distance } from "@/lib/physics/Vec2D";
import { findBall, getActiveBalls, resetBall } from "./Ball";

/**
 * Get the cue ball from the balls array.
 */
export function getCueBall(balls: IBall[]): IBall {
  const cue = findBall(balls, 0);
  if (!cue) throw new Error("Cue ball (id=0) not found in balls array");
  return cue;
}

/**
 * Reset cue ball to head spot after a foul (ball-in-hand).
 */
export function resetCueBall(balls: IBall[], position: IVec2D): void {
  const cue = getCueBall(balls);
  resetBall(cue, position);
}

/**
 * Validate ball-in-hand placement position.
 * Rules:
 * 1. Must be inside the playable area
 * 2. Must not overlap any other active ball
 * 3. After break foul: must be behind head string (left quarter)
 *    After other fouls: can be placed anywhere on table
 */
export function isValidPlacement(
  position: IVec2D,
  balls: IBall[],
  behindHeadString: boolean = false
): boolean {
  const margin = BALL_RADIUS;

  // Must be inside play area with margin
  if (
    position.x - margin < PLAY_LEFT ||
    position.x + margin > PLAY_RIGHT ||
    position.y - margin < PLAY_TOP ||
    position.y + margin > PLAY_BOTTOM
  ) {
    return false;
  }

  // If behind head string restriction applies
  if (behindHeadString && position.x > HEAD_STRING_X) {
    return false;
  }

  // Must not overlap any active ball (except cue ball itself)
  const activeBalls = getActiveBalls(balls).filter((b) => b.id !== 0);
  const minDist = BALL_RADIUS * 2 + 2; // Small extra gap

  for (const ball of activeBalls) {
    if (distance(position, ball.position) < minDist) {
      return false;
    }
  }

  return true;
}

/**
 * Find nearest valid placement position to the given target.
 * Spirals outward from target position until a valid spot is found.
 * Fallback safety for edge cases where placement seems impossible.
 */
export function findNearestValidPlacement(
  target: IVec2D,
  balls: IBall[],
  behindHeadString: boolean = false
): IVec2D {
  // Try target first
  if (isValidPlacement(target, balls, behindHeadString)) {
    return { x: target.x, y: target.y };
  }

  // Spiral search outward
  const step = BALL_RADIUS;
  for (let radius = step; radius < 400; radius += step) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const candidate: IVec2D = {
        x: target.x + Math.cos(angle) * radius,
        y: target.y + Math.sin(angle) * radius,
      };
      if (isValidPlacement(candidate, balls, behindHeadString)) {
        return candidate;
      }
    }
  }

  // Absolute fallback — should never reach here
  return { x: PLAY_LEFT + 100, y: (PLAY_TOP + PLAY_BOTTOM) / 2 };
}
