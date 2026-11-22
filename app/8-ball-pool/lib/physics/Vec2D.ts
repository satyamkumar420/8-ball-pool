// ============================================================
// Vec2D — 2D Vector utility functions (pure, immutable)
// Operates on IVec2D { x, y } interface
// ============================================================

import { IVec2D } from "@/lib/types";

/** Create a new vector */
export function vec(x: number, y: number): IVec2D {
  return { x, y };
}

/** Zero vector */
export function zero(): IVec2D {
  return { x: 0, y: 0 };
}

/** Add two vectors: a + b */
export function add(a: IVec2D, b: IVec2D): IVec2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Subtract two vectors: a - b */
export function sub(a: IVec2D, b: IVec2D): IVec2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Scale vector by scalar */
export function scale(v: IVec2D, s: number): IVec2D {
  return { x: v.x * s, y: v.y * s };
}

/** Dot product of two vectors */
export function dot(a: IVec2D, b: IVec2D): number {
  return a.x * b.x + a.y * b.y;
}

/** Magnitude (length) of vector */
export function magnitude(v: IVec2D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/** Squared magnitude (avoids sqrt — faster for comparisons) */
export function magnitudeSq(v: IVec2D): number {
  return v.x * v.x + v.y * v.y;
}

/** Normalize vector to unit length. Returns zero vector if magnitude is 0 */
export function normalize(v: IVec2D): IVec2D {
  const mag = magnitude(v);
  if (mag === 0) return zero();
  return { x: v.x / mag, y: v.y / mag };
}

/** Distance between two points */
export function distance(a: IVec2D, b: IVec2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Squared distance (avoids sqrt — faster for radius checks) */
export function distanceSq(a: IVec2D, b: IVec2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

/** Create unit vector from angle (radians) */
export function fromAngle(angle: number): IVec2D {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

/** Get angle of vector (radians, atan2) */
export function toAngle(v: IVec2D): number {
  return Math.atan2(v.y, v.x);
}

/** Negate vector: -v */
export function negate(v: IVec2D): IVec2D {
  return { x: -v.x, y: -v.y };
}

/** Linear interpolation between two vectors */
export function lerp(a: IVec2D, b: IVec2D, t: number): IVec2D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/** Reflect vector off a surface with given normal */
export function reflect(v: IVec2D, normal: IVec2D): IVec2D {
  const d = 2 * dot(v, normal);
  return { x: v.x - d * normal.x, y: v.y - d * normal.y };
}

/** Clamp vector magnitude to a max value */
export function clampMagnitude(v: IVec2D, maxMag: number): IVec2D {
  const mag = magnitude(v);
  if (mag <= maxMag) return v;
  const ratio = maxMag / mag;
  return { x: v.x * ratio, y: v.y * ratio };
}
