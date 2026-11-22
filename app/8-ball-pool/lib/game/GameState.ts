// ============================================================
// GameState — Rules Engine & Turn Evaluation for 8-Ball Billiards
// Evaluates fouls, ball assignments, win conditions, and turns
// ============================================================

import {
  IBall,
  BallType,
  FoulReason,
  Player,
  GameResult,
} from "@/lib/types";
import { allPocketed } from "./Ball";

/**
 * Check if a player is legally allowed to pocket the 8-ball.
 * True only when all of the player's category balls (SOLIDS/STRIPES) are pocketed.
 */
export function canPocketEightBall(balls: IBall[], playerType: BallType | null): boolean {
  if (!playerType || playerType === BallType.EIGHT || playerType === BallType.CUE) {
    return false;
  }
  return allPocketed(balls, playerType);
}

/**
 * Evaluate all foul rules for a completed shot.
 */
export function evaluateFouls(
  cuePocketed: boolean,
  firstHitBallId: number | null,
  shotPocketedBalls: number[],
  balls: IBall[],
  currentPlayerType: BallType | null,
  cushionHitAfterContact: boolean,
  isBreakShot: boolean
): FoulReason | null {
  // 1. Cue ball pocketed (Scratch)
  if (cuePocketed) {
    return FoulReason.CUE_POCKETED;
  }

  // 2. No ball hit by cue ball
  if (firstHitBallId === null) {
    return FoulReason.NO_BALL_HIT;
  }

  // 3. Early 8-ball pocketed (when not allowed)
  const eightPocketed = shotPocketedBalls.includes(8);
  if (eightPocketed && !canPocketEightBall(balls, currentPlayerType)) {
    return FoulReason.EIGHT_BALL_EARLY;
  }

  // 4. Wrong ball hit first
  const firstHitBall = balls.find((b) => b.id === firstHitBallId);
  if (firstHitBall) {
    // If table is open (no category assigned yet)
    if (!currentPlayerType) {
      // Must hit solid or stripe first, hitting 8-ball first when table is open is a foul
      if (firstHitBall.type === BallType.EIGHT) {
        return FoulReason.WRONG_BALL_FIRST;
      }
    } else {
      // Category assigned: must hit own category ball first OR 8-ball when on 8-ball
      if (canPocketEightBall(balls, currentPlayerType)) {
        if (firstHitBall.type !== BallType.EIGHT && firstHitBall.type !== currentPlayerType) {
          return FoulReason.WRONG_BALL_FIRST;
        }
      } else {
        if (firstHitBall.type !== currentPlayerType) {
          return FoulReason.WRONG_BALL_FIRST;
        }
      }
    }
  }

  // 5. Cushion Contact Foul (Rail Foul)
  // According to standard rules, after a contact is made with a legal target ball:
  // At least one ball (cue ball or any object ball) must contact a cushion OR a ball must be pocketed.
  // We exempt the break shot to avoid over-complicating/frustrating casual play.
  if (!isBreakShot && shotPocketedBalls.length === 0 && !cushionHitAfterContact) {
    return FoulReason.NO_CUSHION_TOUCH;
  }

  return null;
}

/**
 * Assign ball categories (SOLIDS / STRIPES) when a player legally pockets the first ball on an open table.
 */
export function assignCategoryOnOpenTable(
  shotPocketedBalls: number[],
  balls: IBall[],
  currentPlayer: Player,
  foulReason: FoulReason | null
): { playerBallType: BallType | null; botBallType: BallType | null } | null {
  // Can't assign on a foul or if no balls pocketed
  if (foulReason || shotPocketedBalls.length === 0) return null;

  // Find first legally pocketed object ball (not cue, not 8-ball)
  for (const ballId of shotPocketedBalls) {
    const ball = balls.find((b) => b.id === ballId);
    if (ball && ball.type !== BallType.EIGHT && ball.type !== BallType.CUE) {
      if (currentPlayer === Player.HUMAN) {
        return {
          playerBallType: ball.type,
          botBallType: ball.type === BallType.SOLID ? BallType.STRIPE : BallType.SOLID,
        };
      } else {
        return {
          botBallType: ball.type,
          playerBallType: ball.type === BallType.SOLID ? BallType.STRIPE : BallType.SOLID,
        };
      }
    }
  }

  return null;
}

/**
 * Determine if the current player continues their turn or if it switches.
 */
export function shouldSwitchTurn(
  shotPocketedBalls: number[],
  balls: IBall[],
  currentPlayer: Player,
  playerBallType: BallType | null,
  botBallType: BallType | null,
  foulReason: FoulReason | null
): boolean {
  // Always switch turn on foul
  if (foulReason) return true;

  // Check if current player pocketed at least one of their own balls
  const ownType = currentPlayer === Player.HUMAN ? playerBallType : botBallType;

  const pocketedOwnBall = shotPocketedBalls.some((id) => {
    const ball = balls.find((b) => b.id === id);
    if (!ball) return false;
    // On open table, any solid/stripe pocketed legally continues turn
    return ownType ? ball.type === ownType : (ball.type === BallType.SOLID || ball.type === BallType.STRIPE);
  });

  // Switch if no own ball pocketed
  return !pocketedOwnBall;
}

/**
 * Check if the game is over (8-ball pocketed) and determine the winner.
 */
export function evaluateEightBallWin(
  shotPocketedBalls: number[],
  balls: IBall[],
  currentPlayer: Player,
  playerBallType: BallType | null,
  botBallType: BallType | null,
  foulReason: FoulReason | null
): GameResult | null {
  const eightPocketed = shotPocketedBalls.includes(8);
  if (!eightPocketed) return null;

  const ownType = currentPlayer === Player.HUMAN ? playerBallType : botBallType;

  // In 8-ball billiards, pocketing the 8-ball on the same shot as any of your remaining category target balls
  // is illegal and results in a loss. Thus, all target balls of ownType must have been pocketed BEFORE this shot.
  // We check this by verifying if all target balls are currently pocketed AND none of them were pocketed during this shot.
  const hasOwnCategoryBallsPocketedInThisShot = shotPocketedBalls.some((id) => {
    const ball = balls.find((b) => b.id === id);
    return ball && ball.type === ownType;
  });
  const ownCategoryBallsAllPocketed = ownType ? allPocketed(balls, ownType) : false;
  const canLegallyPocket = ownCategoryBallsAllPocketed && !hasOwnCategoryBallsPocketedInThisShot;

  // If pocketed on foul or early when not all own balls cleared -> LOSS for current player
  if (foulReason || !canLegallyPocket) {
    return currentPlayer === Player.HUMAN ? GameResult.BOT_WIN : GameResult.PLAYER_WIN;
  }

  // Legal 8-ball pocket -> WIN for current player
  return currentPlayer === Player.HUMAN ? GameResult.PLAYER_WIN : GameResult.BOT_WIN;
}
