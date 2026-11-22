// ============================================================
// TutorialManager — Manages 8-Ball Billiards step-by-step tutorial sequence
// Defines tutorial steps, ball layouts, action goals, and visual highlights
// ============================================================

import { IBall, ITutorialStep, BallType } from "@/lib/types";
import { BALL_RADIUS, BALL_VISUALS } from "@/lib/constants/balls";
import { createInitialBalls } from "@/lib/game/Rack";

export const TUTORIAL_STEPS: ITutorialStep[] = [
  {
    id: 1,
    actionHint: "Welcome to 8-Ball Billiards! Learn aiming, power control, ball placement, and cue spin.",
    highlightTarget: "TABLE",
    setupType: "RACK",
    allowShooting: false,
    requireTask: false,
  },
  {
    id: 2,
    actionHint: "Power Shot: Aim at Ball 3, pull back the Power Meter / Cue Stick on the left, and release to shoot!",
    highlightTarget: "POWER_METER",
    setupType: "DIRECT_POT",
    allowShooting: true,
    requireTask: true,
  },
  {
    id: 3,
    actionHint: "Ball Selection: Pot Solid balls (1-7) while avoiding scratching the Cue Ball into pockets.",
    highlightTarget: "TABLE",
    setupType: "BALL_TYPES",
    allowShooting: true,
    requireTask: true,
  },
  {
    id: 4,
    actionHint: "Ball-in-Hand: Drag & place the Cue Ball anywhere on table, then pot Ball 4!",
    highlightTarget: "BALL_IN_HAND",
    setupType: "FOUL_DEMO",
    allowShooting: true,
    allowBallInHandPlacement: true,
    requireTask: true,
  },
  {
    id: 5,
    actionHint: "Cue Spin: Tap the Spin icon on the left to set Cue Spin, then strike Ball 1!",
    highlightTarget: "SPIN_BUTTON",
    setupType: "SPIN_DEMO",
    allowShooting: true,
    requireTask: true,
  },
  {
    id: 6,
    actionHint: "8-Ball Victory: Clear your assigned balls, then pot the Black 8-Ball to win!",
    highlightTarget: "TABLE",
    setupType: "EIGHT_BALL",
    allowShooting: true,
    requireTask: true,
  },
  {
    id: 7,
    actionHint: "Great Job! Take free practice shots or click 'Skip' to start your first match!",
    highlightTarget: "TABLE",
    setupType: "FREE_PRACTICE",
    allowShooting: true,
    requireTask: false,
  },
];

/**
 * Creates preset ball layouts for specific tutorial step demonstrations.
 */
export function getTutorialStepBalls(setupType: ITutorialStep["setupType"]): IBall[] {
  switch (setupType) {
    case "RACK":
      return createInitialBalls();

    case "DIRECT_POT": {
      // Cue ball aligned directly with Ball 3 and Bottom-Right Corner Pocket (1360, 660)
      const cuePos = { x: 380, y: 230 };
      const ball3Pos = { x: 1220, y: 600 }; // Right in front of corner hole!
      const ball10Pos = { x: 800, y: 150 };

      return [
        {
          id: 0,
          type: BallType.CUE,
          position: cuePos,
          velocity: { x: 0, y: 0 },
          radius: BALL_RADIUS,
          color: "#ffffff",
          isPocketed: false,
          isMoving: false,
          angle: 0,
        },
        {
          id: 3,
          type: BallType.SOLID,
          position: ball3Pos,
          velocity: { x: 0, y: 0 },
          radius: BALL_RADIUS,
          color: BALL_VISUALS[3].color,
          isPocketed: false,
          isMoving: false,
          angle: 0,
        },
        {
          id: 10,
          type: BallType.STRIPE,
          position: ball10Pos,
          velocity: { x: 0, y: 0 },
          radius: BALL_RADIUS,
          color: BALL_VISUALS[10].color,
          isPocketed: false,
          isMoving: false,
          angle: 0,
        },
      ];
    }

    case "SPIN_DEMO": {
      // Cue ball facing Ball 1 in center table for draw/backspin demonstration
      const cuePos = { x: 450, y: 350 };
      const ball1Pos = { x: 750, y: 350 };

      return [
        {
          id: 0,
          type: BallType.CUE,
          position: cuePos,
          velocity: { x: 0, y: 0 },
          radius: BALL_RADIUS,
          color: "#ffffff",
          isPocketed: false,
          isMoving: false,
          angle: 0,
        },
        {
          id: 1,
          type: BallType.SOLID,
          position: ball1Pos,
          velocity: { x: 0, y: 0 },
          radius: BALL_RADIUS,
          color: BALL_VISUALS[1].color,
          isPocketed: false,
          isMoving: false,
          angle: 0,
        },
      ];
    }

    case "BALL_TYPES": {
      // Solid Ball 2 placed right in front of Bottom-Right Corner Hole (1360, 660)
      // Stripe Ball 9 placed right in front of Top-Right Corner Hole (1360, 40)
      return [
        {
          id: 0,
          type: BallType.CUE,
          position: { x: 380, y: 230 },
          velocity: { x: 0, y: 0 },
          radius: BALL_RADIUS,
          color: "#ffffff",
          isPocketed: false,
          isMoving: false,
          angle: 0,
        },
        {
          id: 2,
          type: BallType.SOLID,
          position: { x: 1220, y: 600 }, // Right in front of bottom-right corner hole!
          velocity: { x: 0, y: 0 },
          radius: BALL_RADIUS,
          color: BALL_VISUALS[2].color,
          isPocketed: false,
          isMoving: false,
          angle: 0,
        },
        {
          id: 9,
          type: BallType.STRIPE,
          position: { x: 1220, y: 100 }, // Right in front of top-right corner hole!
          velocity: { x: 0, y: 0 },
          radius: BALL_RADIUS,
          color: BALL_VISUALS[9].color,
          isPocketed: false,
          isMoving: false,
          angle: 0,
        },
        {
          id: 5,
          type: BallType.SOLID,
          position: { x: 600, y: 150 },
          velocity: { x: 0, y: 0 },
          radius: BALL_RADIUS,
          color: BALL_VISUALS[5].color,
          isPocketed: false,
          isMoving: false,
          angle: 0,
        },
        {
          id: 8,
          type: BallType.EIGHT,
          position: { x: 250, y: 550 },
          velocity: { x: 0, y: 0 },
          radius: BALL_RADIUS,
          color: BALL_VISUALS[8].color,
          isPocketed: false,
          isMoving: false,
          angle: 0,
        },
      ];
    }

    case "FOUL_DEMO": {
      // Ball 4 placed right in front of Bottom-Right Corner Hole (1360, 660)
      return [
        {
          id: 0,
          type: BallType.CUE,
          position: { x: 380, y: 230 },
          velocity: { x: 0, y: 0 },
          radius: BALL_RADIUS,
          color: "#ffffff",
          isPocketed: false,
          isMoving: false,
          angle: 0,
        },
        {
          id: 4,
          type: BallType.SOLID,
          position: { x: 1220, y: 600 }, // Right in front of corner hole!
          velocity: { x: 0, y: 0 },
          radius: BALL_RADIUS,
          color: BALL_VISUALS[4].color,
          isPocketed: false,
          isMoving: false,
          angle: 0,
        },
      ];
    }

    case "EIGHT_BALL": {
      // 8-Ball placed right in front of Bottom-Right Corner Hole (1360, 660)
      return [
        {
          id: 0,
          type: BallType.CUE,
          position: { x: 380, y: 230 },
          velocity: { x: 0, y: 0 },
          radius: BALL_RADIUS,
          color: "#ffffff",
          isPocketed: false,
          isMoving: false,
          angle: 0,
        },
        {
          id: 8,
          type: BallType.EIGHT,
          position: { x: 1220, y: 600 }, // Right in front of corner hole!
          velocity: { x: 0, y: 0 },
          radius: BALL_RADIUS,
          color: BALL_VISUALS[8].color,
          isPocketed: false,
          isMoving: false,
          angle: 0,
        },
      ];
    }

    case "FREE_PRACTICE":
    default:
      return createInitialBalls();
  }
}
