// ============================================================
// Table — game-level table utilities and queries
// Uses constants from lib/constants/table.ts
// ============================================================

import { IBall, ICollisionEvent, IVec2D } from "@/lib/types";
import {
  PLAY_LEFT,
  PLAY_TOP,
  PLAY_RIGHT,
  PLAY_BOTTOM,
  POCKETS,
} from "@/lib/constants/table";
import { distance } from "@/lib/physics/Vec2D";
import { updateAllBallPositions } from "./Ball";
import { applyFrictionAll, resolveCushionBounceAll } from "@/lib/physics/friction";
import { resolveAllCollisions, clampBallsInBounds } from "@/lib/physics/collision";
import { checkPocketAll } from "@/lib/physics/pocket";

/**
 * Check if a point is inside the playable area.
 */
export function isInsidePlayArea(point: IVec2D): boolean {
  return (
    point.x >= PLAY_LEFT &&
    point.x <= PLAY_RIGHT &&
    point.y >= PLAY_TOP &&
    point.y <= PLAY_BOTTOM
  );
}

/**
 * Get the closest pocket to a given position.
 * Returns pocket index and distance.
 */
export function getClosestPocket(position: IVec2D): { pocketId: number; dist: number } {
  let closestId = 0;
  let closestDist = Infinity;

  for (const pocket of POCKETS) {
    const d = distance(position, pocket.position);
    if (d < closestDist) {
      closestDist = d;
      closestId = pocket.id;
    }
  }

  return { pocketId: closestId, dist: closestDist };
}

/**
 * Run one complete physics step for all balls on the table.
 * Order matters:
 * 1. Move balls (apply velocity to position)
 * 2. Ball-to-ball collision resolution (before pockets — balls must collide first)
 * 3. Check pocket detection (before cushion — balls near pockets should fall in)
 * 4. Cushion bounce (skip balls near pockets)
 * 5. Apply friction (slow down all balls)
 *
 * Returns all collision events from this frame (for sound effects).
 */
export function physicsStep(balls: IBall[]): ICollisionEvent[] {
  const events: ICollisionEvent[] = [];

  // Run 8 substeps per frame for CCD (Continuous Collision Detection) equivalent.
  // This prevents high-speed balls from tunneling (bypassing) other balls or cushions.
  const SUBSTEPS = 8;
  const dt = 1.0 / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    // 1. Move all balls by a fraction of their velocity
    updateAllBallPositions(balls, dt);

    // 2. Ball-to-ball collisions (before pockets — so a cue ball near a pocket
    //    can still collide with a target ball before being marked as sinking)
    const collisionEvents = resolveAllCollisions(balls);
    events.push(...collisionEvents);

    // 3. Pocket detection (after collisions — balls that just collided can now fall in)
    const pocketEvents = checkPocketAll(balls);
    events.push(...pocketEvents);

    // 4. Cushion bounce
    const activeBalls = balls.filter((b) => !b.isPocketed && !b.isSinking);
    const cushionEvents = resolveCushionBounceAll(activeBalls);
    events.push(...cushionEvents);

    // 4.5 Safety clamp — prevent balls from escaping table bounds
    clampBallsInBounds(balls);
  }

  // 5. Apply friction (slow down all balls)
  // Applied once per frame to maintain consistent deceleration rate
  applyFrictionAll(balls);

  return events;
}
