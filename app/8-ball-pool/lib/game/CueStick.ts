// ============================================================
// CueStick — Cue stick state, aiming, and shot calculation
// ============================================================

import { ICueStick, IShot, IVec2D } from "@/lib/types";
import { MAX_SHOT_POWER } from "@/lib/constants/physics";
import { fromAngle, scale, sub, toAngle } from "@/lib/physics/Vec2D";

// ---- Visual constants ----
export const CUE_LENGTH = 350;        // Cue stick length in px
export const CUE_WIDTH = 6;           // Cue stick width in px
export const CUE_TIP_LENGTH = 12;     // White tip at the front
export const CUE_OFFSET_MIN = 10;     // Min distance from cue ball (resting)
export const CUE_OFFSET_MAX = 120;    // Max pullback distance (full power)

/**
 * Create initial cue stick state.
 */
export function createCueStick(): ICueStick {
  return {
    angle: Math.PI, // Pointing left (toward rack) initially
    power: 0,
    isCharging: false,
    isVisible: false,
    pullBack: 0,
  };
}

/**
 * Update cue stick angle to aim toward a target point.
 * In this control scheme, the stick sits on the cursor side and fires towards the cue ball (opposite to targetPos).
 */
export function aimAt(cueStick: ICueStick, cueBallPos: IVec2D, targetPos: IVec2D): void {
  const delta = sub(targetPos, cueBallPos);
  cueStick.angle = toAngle(delta) + Math.PI; // Invert angle so it points away from the cursor
}

/**
 * Start charging the shot (mouse/touch down).
 */
export function startCharge(cueStick: ICueStick): void {
  cueStick.isCharging = true;
  cueStick.power = 0;
  cueStick.pullBack = 0;
}

/**
 * Update charge power based on drag distance.
 * Power is normalized (0 to 1).
 * pullBack is the visual offset for the cue stick animation.
 */
export function updateCharge(
  cueStick: ICueStick,
  cueBallPos: IVec2D,
  dragStartPos: IVec2D,
  currentPos: IVec2D
): void {
  if (!cueStick.isCharging) return;

  // Calculate drag distance (how far user pulled back)
  const dragDelta = sub(dragStartPos, currentPos);

  // Project drag onto cue direction (dragging away from the ball increases power)
  const cueDir = fromAngle(cueStick.angle);
  const pullDistance = (dragDelta.x * cueDir.x + dragDelta.y * cueDir.y);

  // Clamp to valid range
  const clampedPull = Math.max(0, Math.min(pullDistance, CUE_OFFSET_MAX));

  cueStick.pullBack = clampedPull;
  cueStick.power = clampedPull / CUE_OFFSET_MAX; // Normalize 0–1
}

/**
 * Release the shot (mouse/touch up).
 * Returns the shot data (angle + power) or null if power was too low.
 */
export function releaseShot(cueStick: ICueStick): IShot | null {
  if (!cueStick.isCharging) return null;

  const power = cueStick.power;
  const angle = cueStick.angle;

  // Reset cue stick state
  cueStick.isCharging = false;
  cueStick.pullBack = 0;
  cueStick.power = 0;

  // Minimum power threshold — ignore accidental taps
  if (power < 0.02) return null;

  return { angle, power };
}

/**
 * Calculate the velocity vector for a shot.
 * Converts normalized power (0–1) + angle → velocity vector.
 */
export function shotToVelocity(shot: IShot): IVec2D {
  const speed = shot.power * MAX_SHOT_POWER;
  return scale(fromAngle(shot.angle), speed);
}

/**
 * Show/hide the cue stick.
 */
export function setCueVisible(cueStick: ICueStick, visible: boolean): void {
  cueStick.isVisible = visible;
}

/**
 * Get the cue tip position (for rendering).
 * Cue tip is offset from cue ball center in the opposite direction of aim.
 */
export function getCueTipPosition(cueBallPos: IVec2D, cueStick: ICueStick): IVec2D {
  const offset = CUE_OFFSET_MIN + cueStick.pullBack;
  const oppositeDir = fromAngle(cueStick.angle + Math.PI);
  return {
    x: cueBallPos.x + oppositeDir.x * offset,
    y: cueBallPos.y + oppositeDir.y * offset,
  };
}
