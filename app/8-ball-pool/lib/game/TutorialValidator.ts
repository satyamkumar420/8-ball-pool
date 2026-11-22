// ============================================================
// TutorialValidator — Decoupled validator for Tutorial Step Tasks
// Evaluates shot results against specific tutorial goals
// ============================================================

import { ITutorialStep } from "@/lib/types";

export interface ITutorialShotResult {
  firstHitBallId: number | null;
  shotPocketedBalls: number[];
  cuePocketed: boolean;
  hasUsedSpin: boolean;
  cuePlacedWithBallInHand: boolean;
}

export interface ITutorialValidationOutcome {
  success: boolean;
  message: string;
}

/**
 * Validates whether the user's shot fulfilled the requirement for a specific tutorial step.
 */
export function validateTutorialStep(
  step: ITutorialStep,
  result: ITutorialShotResult
): ITutorialValidationOutcome {
  // Steps that don't require task completion automatically pass
  if (!step.requireTask) {
    return { success: true, message: step.id === 1 ? "Welcome to Tutorial!" : "Good Job!" };
  }

  switch (step.id) {
    case 2: {
      // Step 2: Power Meter & Pocketing — Ball 3 MUST be pocketed
      if (result.cuePocketed) {
        return { success: false, message: "Scratch! Pull back carefully and pocket Ball 3." };
      }
      if (result.shotPocketedBalls.includes(3)) {
        return { success: true, message: "Awesome Shot! Ball 3 Pocketed!" };
      }
      return { success: false, message: "Ball 3 wasn't pocketed. Line up your shot and charge enough power!" };
    }

    case 3: {
      // Step 3: Suits & Game Objective — Must pocket at least 1 suit ball (Solids: 2, 5 or Stripes: 9, 14)
      if (result.cuePocketed) {
        return { success: false, message: "Scratch! Aim for a Solid or Stripe ball." };
      }
      const suitBalls = [2, 5, 9, 14];
      const pocketedSuitBall = result.shotPocketedBalls.some((id) => suitBalls.includes(id));
      if (pocketedSuitBall) {
        return { success: true, message: "Excellent! You pocketed a suit ball!" };
      }
      return { success: false, message: "No suit ball pocketed. Line up a shot into any pocket!" };
    }

    case 4: {
      // Step 4: Fouls & Ball-in-Hand — Must place cue ball and hit/pocket Ball 4
      if (result.cuePocketed) {
        return { success: false, message: "Scratch! Place the cue ball with Ball-in-Hand and hit Ball 4." };
      }
      if (result.firstHitBallId === 4 || result.shotPocketedBalls.includes(4)) {
        return { success: true, message: "Well Done! Ball-in-Hand gives you complete table control!" };
      }
      return { success: false, message: "Place the cue ball closer to Ball 4 and strike it!" };
    }

    case 5: {
      // Step 5: Cue Ball Spin (English) — Must set spin and hit Ball 1
      if (result.cuePocketed) {
        return { success: false, message: "Scratch! Set spin and hit Ball 1 cleanly." };
      }
      if (!result.hasUsedSpin) {
        return { success: false, message: "Spin not applied! Tap the Spin button on the left to set spin before shooting." };
      }
      if (result.firstHitBallId === 1) {
        return { success: true, message: "Perfect Spin Control! Notice how cue ball reaction changed." };
      }
      return { success: false, message: "Set spin and strike Ball 1 to complete!" };
    }

    case 6: {
      // Step 6: Sinking 8-Ball — Must pocket 8-Ball without scratching
      if (result.cuePocketed) {
        return { success: false, message: "Scratch with 8-Ball is an instant loss! Try again carefully." };
      }
      if (result.shotPocketedBalls.includes(8)) {
        return { success: true, message: "Tutorial Complete" };
      }
      return { success: false, message: "The 8-Ball wasn't pocketed. Take aim at the corner pocket!" };
    }

    case 7:
    default:
      return { success: true, message: "Tutorial Complete" };
  }
}
