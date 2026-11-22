// ============================================================
// Bot difficulty configurations — Easy / Medium / Hard
// ============================================================

import { Difficulty, IBotConfig } from "@/lib/types";

/**
 * Bot config per difficulty level.
 *
 * aimErrorDegrees — Max random angular deviation from perfect shot (degrees).
 *   Easy: very inaccurate, Hard: near-perfect.
 *
 * powerMin/Max — Normalized power range (0–1).
 *   Easy uses gentler shots, Hard uses optimal power.
 *
 * thinkingDelayMs — Artificial delay before bot takes shot.
 *   Adds realism — feels like the bot is "thinking".
 *
 * usesDefensivePlay — Whether bot considers safe/defensive shots
 *   when no good pocket shot is available.
 */
export const BOT_CONFIGS: Record<Difficulty, IBotConfig> = {
  [Difficulty.EASY]: {
    aimErrorDegrees: 15,
    powerMin: 0.25,
    powerMax: 0.55,
    thinkingDelayMs: 800,
    usesDefensivePlay: false,
    allowBankShots: false,
    allowComboShots: false,
    allowKickShots: false,
    evaluatePositionPlay: false,
    allowSpinControl: false,
  },

  [Difficulty.MEDIUM]: {
    aimErrorDegrees: 6,
    powerMin: 0.35,
    powerMax: 0.75,
    thinkingDelayMs: 1200,
    usesDefensivePlay: true,
    allowBankShots: true,
    allowComboShots: true,
    allowKickShots: true,
    evaluatePositionPlay: false,
    allowSpinControl: false,
  },

  [Difficulty.HARD]: {
    aimErrorDegrees: 1.5,
    powerMin: 0.45,
    powerMax: 0.95,
    thinkingDelayMs: 1800,
    usesDefensivePlay: true,
    allowBankShots: true,
    allowComboShots: true,
    allowKickShots: true,
    evaluatePositionPlay: true,
    allowSpinControl: true,
  },
};

/**
 * Get bot config for a given difficulty.
 */
export function getBotConfig(difficulty: Difficulty): IBotConfig {
  return BOT_CONFIGS[difficulty];
}

// ---- Display labels for UI ----
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  [Difficulty.EASY]: "Easy",
  [Difficulty.MEDIUM]: "Medium",
  [Difficulty.HARD]: "Hard",
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  [Difficulty.EASY]: "#4ade80",   // Green
  [Difficulty.MEDIUM]: "#facc15", // Yellow
  [Difficulty.HARD]: "#ef4444",   // Red
};
