// ============================================================
// Ball definitions — radius, colors, types
// ============================================================

import { BallType } from "@/lib/types";

// ---- Ball radius (all balls are identical size) ----
export const BALL_RADIUS = 22.5;
export const BALL_DIAMETER = BALL_RADIUS * 2;

// ---- Ball visual config per ID ----
// id 0 = cue, 1-7 = solids, 8 = eight, 9-15 = stripes
export interface BallVisual {
  id: number;
  type: BallType;
  color: string;
  label: string; // Number label on ball
}

export const BALL_VISUALS: BallVisual[] = [
  // Cue ball
  { id: 0, type: BallType.CUE, color: "#ffffff", label: "" },

  // Solids (1–7)
  { id: 1, type: BallType.SOLID, color: "#f5d442", label: "1" }, // Yellow
  { id: 2, type: BallType.SOLID, color: "#1a3fc7", label: "2" }, // Blue
  { id: 3, type: BallType.SOLID, color: "#d4312a", label: "3" }, // Red
  { id: 4, type: BallType.SOLID, color: "#4a1a6b", label: "4" }, // Purple
  { id: 5, type: BallType.SOLID, color: "#e8751a", label: "5" }, // Orange
  { id: 6, type: BallType.SOLID, color: "#1a7a3a", label: "6" }, // Green
  { id: 7, type: BallType.SOLID, color: "#8b1a2a", label: "7" }, // Burgundy / Maroon

  // Eight ball
  { id: 8, type: BallType.EIGHT, color: "#111111", label: "8" }, // Black

  // Stripes (9–15) — same colors as 1–7 but with white stripe
  { id: 9, type: BallType.STRIPE, color: "#f5d442", label: "9" },
  { id: 10, type: BallType.STRIPE, color: "#1a3fc7", label: "10" },
  { id: 11, type: BallType.STRIPE, color: "#d4312a", label: "11" },
  { id: 12, type: BallType.STRIPE, color: "#4a1a6b", label: "12" },
  { id: 13, type: BallType.STRIPE, color: "#e8751a", label: "13" },
  { id: 14, type: BallType.STRIPE, color: "#1a7a3a", label: "14" },
  { id: 15, type: BallType.STRIPE, color: "#8b1a2a", label: "15" },
];
