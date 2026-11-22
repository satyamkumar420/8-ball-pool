// ============================================================
// Physics constants — friction, elasticity, velocity limits
// ============================================================

// ---- Friction coefficient (applied per frame to velocity) ----
// Each frame: velocity *= FRICTION
// Lower = balls stop faster. Higher = balls roll longer.
export const FRICTION = 0.990;

// ---- Cushion elasticity (energy retained on wall bounce) ----
// 1.0 = perfect bounce (no energy loss)
// 0.0 = ball sticks to wall
export const CUSHION_ELASTIC = 0.82;

// ---- Ball-to-ball elasticity ----
// Real pool balls are very elastic (~0.95)
export const BALL_ELASTIC = 0.965;

// ---- Max shot power (max velocity magnitude on cue strike) ----
export const MAX_SHOT_POWER = 52;

// ---- Min velocity threshold (below this → ball stops) ----
// Prevents balls from drifting indefinitely at sub-pixel speeds
export const MIN_VELOCITY = 0.05;

// ---- Max velocity cap (prevents tunneling through walls) ----
export const MAX_VELOCITY = 60;

// ---- Overlap correction factor ----
// When two balls overlap during collision, push them apart by this ratio
export const OVERLAP_CORRECTION = 0.5;

// ---- Physics timestep (for consistent simulation speed) ----
export const PHYSICS_FPS = 60;
export const PHYSICS_TIMESTEP = 1000 / PHYSICS_FPS; // ~16.67ms
