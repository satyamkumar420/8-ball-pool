// ============================================================
// Shared TypeScript interfaces, types & enums for 8-Ball Billiards
// ============================================================

// ---- Vector ----
export interface IVec2D {
  x: number;
  y: number;
}

// ---- Ball Types ----
export enum BallType {
  CUE = "CUE",
  SOLID = "SOLID",
  STRIPE = "STRIPE",
  EIGHT = "EIGHT",
}

// ---- Ball State ----
export interface IBall {
  id: number; // 0 = cue, 1-7 = solid, 8 = eight, 9-15 = stripe
  type: BallType;
  position: IVec2D;
  velocity: IVec2D;
  radius: number;
  color: string;
  stripeColor?: string; // Only for STRIPE balls
  isPocketed: boolean;
  isMoving: boolean;
  angle: number; // 2D rotation angle in radians for visual spin/roll
  stickerDir?: { x: number; y: number; z: number }; // 3D unit vector for rolling visual
  isSinking?: boolean; // Animating into pocket
  sinkProgress?: number; // 0 to 1 animation progress
  sinkTarget?: IVec2D; // Target pocket center coordinates
  sinkStartPos?: IVec2D; // Initial position when sinking started
  isTubeBall?: boolean; // Is rolling in the tube
  tubeS?: number; // Distance along tube path
  tubeSpeed?: number; // Speed along tube path
  spinX?: number; // Left/right spin deflection factor, range [-1, 1]
  spinY?: number; // Top/back spin acceleration factor, range [-1, 1]
  shotDir?: IVec2D; // The initial shot direction vector to align spin force application
  hasHitBall?: boolean; // True if the cue ball hit another ball during this shot
}

// ---- Pocket ----
export interface IPocket {
  id: number; // 0-5
  position: IVec2D;
  radius: number;
}

// ---- Cushion / Wall segment ----
export interface ICushion {
  start: IVec2D;
  end: IVec2D;
}

// ---- Cue Stick ----
export interface ICueStick {
  angle: number; // Radians from cue ball center
  power: number; // 0 to 1 (normalized)
  isCharging: boolean;
  isVisible: boolean;
  pullBack: number; // Pixel offset for charge animation
}

// ---- Game States ----
export enum GamePhase {
  MENU = "MENU",
  RACK = "RACK",
  PLAYER_TURN = "PLAYER_TURN",
  PLAYER2_TURN = "PLAYER2_TURN",
  BOT_TURN = "BOT_TURN",
  BALLS_MOVING = "BALLS_MOVING",
  BALL_IN_HAND = "BALL_IN_HAND", // After foul — player places cue ball
  GAME_OVER = "GAME_OVER",
}

// ---- Turn Owner ----
export enum Player {
  HUMAN = "HUMAN",
  PLAYER2 = "PLAYER2",
  BOT = "BOT",
}

// ---- Foul Reason ----
export enum FoulReason {
  CUE_POCKETED = "CUE_POCKETED",
  NO_BALL_HIT = "NO_BALL_HIT",
  WRONG_BALL_FIRST = "WRONG_BALL_FIRST",
  EIGHT_BALL_EARLY = "EIGHT_BALL_EARLY",
  NO_CUSHION_TOUCH = "NO_CUSHION_TOUCH",
}

// ---- Game Over Result ----
export enum GameResult {
  PLAYER_WIN = "PLAYER_WIN",
  BOT_WIN = "BOT_WIN",
}

// ---- Difficulty ----
export enum Difficulty {
  EASY = "EASY",
  MEDIUM = "MEDIUM",
  HARD = "HARD",
}

// ---- Game Mode ----
export enum GameMode {
  SINGLE_PLAYER = "SINGLE_PLAYER",
  TWO_PLAYER = "TWO_PLAYER",
  TUTORIAL = "TUTORIAL",
}

// ---- Tutorial Step Definition ----
export interface ITutorialStep {
  id: number;
  actionHint: string;
  highlightTarget?: "CUE_STICK" | "POWER_METER" | "SPIN_BUTTON" | "BALL_IN_HAND" | "POCKET" | "TABLE";
  setupType: "RACK" | "DIRECT_POT" | "SPIN_DEMO" | "BALL_TYPES" | "FOUL_DEMO" | "EIGHT_BALL" | "FREE_PRACTICE";
  allowShooting: boolean;
  allowBallInHandPlacement?: boolean;
  requireTask?: boolean;
}


// ---- Bot Config (per difficulty) ----
export interface IBotConfig {
  aimErrorDegrees: number; // Max random deviation in degrees
  powerMin: number; // Min normalized power (0–1)
  powerMax: number; // Max normalized power (0–1)
  thinkingDelayMs: number; // Delay before bot shoots (ms)
  usesDefensivePlay: boolean; // Whether bot considers safe shots
  allowBankShots?: boolean; // Whether bot can calculate cushion bank shots
  allowComboShots?: boolean; // Whether bot can calculate 2-ball combination shots
  allowKickShots?: boolean; // Whether bot can calculate cushion-first kick shots
  evaluatePositionPlay?: boolean; // Whether bot evaluates shape/next-ball cue position
  allowSpinControl?: boolean; // Whether bot uses topspin/backspin/english control
}

// ---- Shot Data (from input or bot) ----
export interface IShot {
  angle: number; // Radians
  power: number; // 0 to 1 (normalized)
  spinX?: number; // Normalized horizontal spin [-1, 1]
  spinY?: number; // Normalized vertical spin [-1, 1]
}

// ---- Game State Snapshot (for React UI sync) ----
export interface IGameUIState {
  phase: GamePhase;
  currentPlayer: Player;
  playerBallType: BallType | null; // null = not assigned yet
  botBallType: BallType | null;
  playerPocketed: number[]; // Ball IDs pocketed by player
  botPocketed: number[]; // Ball IDs pocketed by bot
  allPocketed: number[]; // All ball IDs pocketed in order (for tube UI)
  scale: number; // Current canvas scale factor for HTML overlay sizing
  gameMode: GameMode;
  player1Name: string;
  player2Name: string;
  foulReason: FoulReason | null;
  gameResult: GameResult | null;
  difficulty: Difficulty;
  isSoundMuted: boolean;
  isTutorialTaskComplete?: boolean;
  tutorialFeedbackMessage?: string | null;
  isTutorialError?: boolean;
}

// ---- Sound Keys ----
export enum SoundKey {
  BALL_HIT = "ball_hit",
  CUSHION_HIT = "cushion_hit",
  POCKET = "pocket",
  CUE_STRIKE = "cue_strike",
  FOUL = "foul",
  WIN = "win",
  LOSE = "lose",
  TRAY = "tray",
  WELCOME = "welcome",
  CLICK = "click",
  TURN_ALERT = "turn_alert",
}

// ---- Collision Event (for sound volume scaling) ----
export interface ICollisionEvent {
  type: "ball" | "cushion" | "pocket";
  speed: number; // Collision speed for volume calculation
  ballId: number;
  targetBallId?: number; // Other ball involved in collision (if type === "ball")
}

// ---- Persistent Game Settings (cloud + local storage) ----
export interface IGameSettings {
  soundEnabled: boolean;
  language: string; // BCP-47 language tag (e.g., "en", "hi", "zh-Hans")
  bestScore: number; // Highest win score (games won in a row or total)
  winCount: number; // Total number of games won
  lossCount: number; // Total number of games lost
  totalGamesPlayed: number; // Total games played
  lastPlayedDifficulty: Difficulty; // Last selected difficulty
  highestDifficultyWon: Difficulty; // Highest difficulty the player has won at
  hasCompletedTutorial?: boolean; // Whether the user has completed/skipped the tutorial
}
