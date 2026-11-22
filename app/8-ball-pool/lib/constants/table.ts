// ============================================================
// Table dimensions, pocket positions, and cushion boundaries
// ============================================================

import { IPocket, IVec2D } from "@/lib/types";

// ---- Logical table dimensions (all game math uses these) ----
export const TABLE_WIDTH = 1400;
export const TABLE_HEIGHT = 700;

// ---- Table border / rail thickness ----
export const RAIL_WIDTH = 40;

// ---- Playable area (inside the cushions) ----
export const PLAY_LEFT = RAIL_WIDTH;
export const PLAY_TOP = RAIL_WIDTH;
export const PLAY_RIGHT = TABLE_WIDTH - RAIL_WIDTH;
export const PLAY_BOTTOM = TABLE_HEIGHT - RAIL_WIDTH;
export const PLAY_WIDTH = PLAY_RIGHT - PLAY_LEFT;
export const PLAY_HEIGHT = PLAY_BOTTOM - PLAY_TOP;

// ---- Pocket mouth radius (visual) ----
export const POCKET_VISUAL_RADIUS = 32;

// ---- Pocket detection radius (slightly larger for forgiving gameplay) ----
export const POCKET_DETECT_RADIUS = 30;

// ---- Pocket positions (center of each pocket hole) ----
// 6 pockets: 4 corners + 2 side centers
export const POCKETS: IPocket[] = [
  // Top-left corner
  { id: 0, position: { x: PLAY_LEFT, y: PLAY_TOP }, radius: POCKET_DETECT_RADIUS },
  // Top-center
  { id: 1, position: { x: TABLE_WIDTH / 2, y: PLAY_TOP - 4 }, radius: POCKET_DETECT_RADIUS - 4 },
  // Top-right corner
  { id: 2, position: { x: PLAY_RIGHT, y: PLAY_TOP }, radius: POCKET_DETECT_RADIUS },
  // Bottom-left corner
  { id: 3, position: { x: PLAY_LEFT, y: PLAY_BOTTOM }, radius: POCKET_DETECT_RADIUS },
  // Bottom-center
  { id: 4, position: { x: TABLE_WIDTH / 2, y: PLAY_BOTTOM + 4 }, radius: POCKET_DETECT_RADIUS - 4 },
  // Bottom-right corner
  { id: 5, position: { x: PLAY_RIGHT, y: PLAY_BOTTOM }, radius: POCKET_DETECT_RADIUS },
];

// ---- Head string (break line) position — 1/4 from left ----
export const HEAD_STRING_X = PLAY_LEFT + PLAY_WIDTH * 0.25;

// ---- Foot spot (rack position) — 3/4 from left ----
export const FOOT_SPOT: IVec2D = {
  x: PLAY_LEFT + PLAY_WIDTH * 0.75,
  y: TABLE_HEIGHT / 2,
};

// ---- Head spot (cue ball initial position) ----
export const HEAD_SPOT: IVec2D = {
  x: HEAD_STRING_X,
  y: TABLE_HEIGHT / 2,
};

// ---- Canvas padding (space around table for visuals) ----
export const CANVAS_PADDING = 250;
export const CANVAS_TOTAL_WIDTH = TABLE_WIDTH + CANVAS_PADDING * 2;
export const CANVAS_TOTAL_HEIGHT = TABLE_HEIGHT + CANVAS_PADDING * 2;

// ---- Total Game Width (without Ball Tube) ----
export const TOTAL_GAME_WIDTH = CANVAS_TOTAL_WIDTH;


// ---- Visual colors ----
export const TABLE_FELT_COLOR = "#1b7a3e"; // Premium billiard green felt
export const TABLE_FELT_SHADOW = "#0f5228";
export const TABLE_RAIL_COLOR = "#4a240b"; // Rich mahogany wood rails
export const TABLE_RAIL_SHADOW = "#1d0e04"; // Deep walnut wood backing shadow
export const POCKET_COLOR = "#08090a";
export const DIAMOND_COLOR = "#ffffff"; // Crisp white diamonds from image
