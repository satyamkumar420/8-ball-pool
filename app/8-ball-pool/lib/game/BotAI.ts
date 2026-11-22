import { IBall, IShot, BallType, Difficulty, IVec2D, GamePhase, ICueStick } from "@/lib/types";
import { POCKETS, PLAY_LEFT, PLAY_TOP, PLAY_RIGHT, PLAY_BOTTOM } from "@/lib/constants/table";
import { BALL_RADIUS } from "@/lib/constants/balls";
import { getBotConfig } from "@/lib/constants/difficulty";
import {
  distance,
  distanceSq,
  normalize,
  sub,
  toAngle,
  add,
  scale,
  dot,
} from "@/lib/physics/Vec2D";
import { getCueBall } from "./CueBall";
import { canPocketEightBall } from "./GameState";

// Define internal Bot states for human-like shot animations
export enum BotState {
  IDLE = "IDLE",
  THINKING = "THINKING",
  AIMING = "AIMING",
  POWERING = "POWERING",
  STRIKING = "STRIKING",
}

/**
 * Check if a straight-line path between two points is obstructed by any ball.
 * `ignoreIds` specifies ball IDs to exclude from check (usually cue ball and target ball).
 */
export function isPathClear(
  start: IVec2D,
  end: IVec2D,
  balls: IBall[],
  ignoreIds: number[]
): boolean {
  const lineVec = sub(end, start);
  const lineLenSq = distanceSq(start, end);
  if (lineLenSq === 0) return true;

  const lineLen = Math.sqrt(lineLenSq);
  const lineDir = { x: lineVec.x / lineLen, y: lineVec.y / lineLen };

  const checkRadius = BALL_RADIUS * 2 - 2; // Slight margin

  for (const ball of balls) {
    if (ball.isPocketed || ignoreIds.includes(ball.id)) continue;

    // Vector from start point to circle center
    const toBall = sub(ball.position, start);
    const proj = dot(toBall, lineDir);

    // If projection is negative or beyond line end, ball is outside line segment bounds
    if (proj < 0 || proj > lineLen) continue;

    // Perpendicular distance squared from ball to line
    const closestPoint = add(start, scale(lineDir, proj));
    const distSqToLine = distanceSq(ball.position, closestPoint);

    if (distSqToLine < checkRadius * checkRadius) {
      return false; // Obstructed
    }
  }

  return true;
}

/**
 * Calculate the best cue ball placement for the bot during ball-in-hand.
 */
export function calculateBotPlacement(balls: IBall[], botBallType: BallType | null): IVec2D {
  const activeBalls = balls.filter((b) => !b.isPocketed && b.id !== 0);
  let targetBalls: IBall[] = [];

  if (!botBallType) {
    targetBalls = activeBalls.filter(
      (b) => b.type === BallType.SOLID || b.type === BallType.STRIPE
    );
  } else if (canPocketEightBall(balls, botBallType)) {
    targetBalls = activeBalls.filter((b) => b.id === 8);
  } else {
    targetBalls = activeBalls.filter((b) => b.type === botBallType);
  }

  if (targetBalls.length === 0) {
    // Default to table center
    return { x: (PLAY_LEFT + PLAY_RIGHT) / 2, y: (PLAY_TOP + PLAY_BOTTOM) / 2 };
  }

  // Find the target ball that is closest to any pocket and has a clear path
  let bestTarget: IBall | null = null;
  let bestPocketDist = Infinity;
  let bestPocket: { position: IVec2D } | null = null;

  for (const b of targetBalls) {
    for (const pocket of POCKETS) {
      if (isPathClear(b.position, pocket.position, balls, [0, b.id])) {
        const d = distanceSq(b.position, pocket.position);
        if (d < bestPocketDist) {
          bestPocketDist = d;
          bestTarget = b;
          bestPocket = pocket;
        }
      }
    }
  }

  if (bestTarget && bestPocket) {
    // Place the cue ball on the line extending away from the pocket through the target ball.
    // Ideal distance from target ball: 180px
    const toPocket = sub(bestPocket.position, bestTarget.position);
    const dirAwayFromPocket = normalize({ x: -toPocket.x, y: -toPocket.y });
    const idealPos = add(bestTarget.position, scale(dirAwayFromPocket, 180));
    
    return {
      x: Math.max(PLAY_LEFT + BALL_RADIUS * 2, Math.min(PLAY_RIGHT - BALL_RADIUS * 2, idealPos.x)),
      y: Math.max(PLAY_TOP + BALL_RADIUS * 2, Math.min(PLAY_BOTTOM - BALL_RADIUS * 2, idealPos.y)),
    };
  }

  // If no clear pocket shot, pick the closest target to the center and place 180px away towards center
  let closestToCenter = targetBalls[0];
  let centerDist = Infinity;
  const tableCenter = { x: (PLAY_LEFT + PLAY_RIGHT) / 2, y: (PLAY_TOP + PLAY_BOTTOM) / 2 };
  
  for (const b of targetBalls) {
    const d = distanceSq(b.position, tableCenter);
    if (d < centerDist) {
      centerDist = d;
      closestToCenter = b;
    }
  }

  const toCenter = normalize(sub(tableCenter, closestToCenter.position));
  const fallbackPos = add(closestToCenter.position, scale(toCenter, 180));
  return {
    x: Math.max(PLAY_LEFT + BALL_RADIUS * 2, Math.min(PLAY_RIGHT - BALL_RADIUS * 2, fallbackPos.x)),
    y: Math.max(PLAY_TOP + BALL_RADIUS * 2, Math.min(PLAY_BOTTOM - BALL_RADIUS * 2, fallbackPos.y)),
  };
}

/**
 * Evaluate next-ball shape (position play bonus) for Pro/Hard difficulty.
 * Predicts resting cue ball position using the 90-degree tangent line rule post-impact.
 */
function evaluatePositionPlayBonus(
  aimPoint: IVec2D,
  aimDir: IVec2D,
  targetBall: IBall,
  targetBalls: IBall[],
  balls: IBall[]
): number {
  const tangentDir = { x: -aimDir.y, y: aimDir.x };
  const cueRestPoint = add(aimPoint, scale(tangentDir, 150));

  const otherTargets = targetBalls.filter((b) => b.id !== targetBall.id);
  if (otherTargets.length === 0) return 0;

  let bestNextScore = 0;
  for (const nextBall of otherTargets) {
    for (const pocket of POCKETS) {
      if (isPathClear(nextBall.position, pocket.position, balls, [0, nextBall.id])) {
        const nextPocketDir = normalize(sub(pocket.position, nextBall.position));
        const nextAimPoint = sub(nextBall.position, scale(nextPocketDir, BALL_RADIUS * 2));
        if (isPathClear(cueRestPoint, nextAimPoint, balls, [0, nextBall.id])) {
          const nextDist = distance(cueRestPoint, nextAimPoint);
          const bonus = Math.max(0, 30 - nextDist * 0.03);
          if (bonus > bestNextScore) bestNextScore = bonus;
        }
      }
    }
  }

  return bestNextScore;
}

interface ICandidateShot {
  angle: number;
  score: number;
  totalDistance: number;
  distToAimPoint: number;
  type: "DIRECT" | "BANK" | "COMBO" | "KICK" | "DEFENSIVE";
  targetBall?: IBall;
  aimDir?: IVec2D;
  spinX?: number;
  spinY?: number;
}

/**
 * Evaluate optimal top/back spin (English) for cue ball position control.
 */
function evaluateSpinControl(
  cueBallPos: IVec2D,
  aimPoint: IVec2D,
  targetBall: IBall,
  targetBalls: IBall[],
  balls: IBall[]
): { spinX: number; spinY: number; spinBonus: number } {
  const otherTargets = targetBalls.filter((b) => b.id !== targetBall.id);
  if (otherTargets.length === 0) return { spinX: 0, spinY: 0, spinBonus: 0 };

  const shotDir = normalize(sub(aimPoint, cueBallPos));
  const tangentDir = { x: -shotDir.y, y: shotDir.x };

  // Candidate spin options: Topspin (+0.75), Backspin (-0.75), Stun/No spin (0)
  const spinOptions = [
    { spinY: 0.75, offset: scale(shotDir, 120) },  // Topspin rolls forward 120px
    { spinY: -0.75, offset: scale(shotDir, -100) }, // Backspin draws back 100px
    { spinY: 0, offset: { x: 0, y: 0 } },            // Natural tangent split
  ];

  let bestSpinY = 0;
  let maxBonus = 0;

  const baseCueRest = add(aimPoint, scale(tangentDir, 120));

  for (const option of spinOptions) {
    const predictedRestPos = add(baseCueRest, option.offset);
    
    // Check table boundaries
    if (
      predictedRestPos.x < PLAY_LEFT + BALL_RADIUS ||
      predictedRestPos.x > PLAY_RIGHT - BALL_RADIUS ||
      predictedRestPos.y < PLAY_TOP + BALL_RADIUS ||
      predictedRestPos.y > PLAY_BOTTOM - BALL_RADIUS
    ) {
      continue;
    }

    for (const nextBall of otherTargets) {
      for (const pocket of POCKETS) {
        if (isPathClear(nextBall.position, pocket.position, balls, [0, nextBall.id])) {
          const nextPocketDir = normalize(sub(pocket.position, nextBall.position));
          const nextAimPoint = sub(nextBall.position, scale(nextPocketDir, BALL_RADIUS * 2));
          if (isPathClear(predictedRestPos, nextAimPoint, balls, [0, nextBall.id])) {
            const nextDist = distance(predictedRestPos, nextAimPoint);
            const bonus = Math.max(0, 35 - nextDist * 0.03);
            if (bonus > maxBonus) {
              maxBonus = bonus;
              bestSpinY = option.spinY;
            }
          }
        }
      }
    }
  }

  return { spinX: 0, spinY: bestSpinY, spinBonus: maxBonus };
}

/**
 * Evaluate single-cushion bank shots for target balls into pockets.
 */
function calculateBankShots(
  cueBall: IBall,
  targetBalls: IBall[],
  balls: IBall[]
): ICandidateShot[] {
  const candidates: ICandidateShot[] = [];

  for (const targetBall of targetBalls) {
    for (const pocket of POCKETS) {
      const cushions = [
        { axis: "x" as const, val: PLAY_LEFT, min: PLAY_TOP + 40, max: PLAY_BOTTOM - 40 },
        { axis: "x" as const, val: PLAY_RIGHT, min: PLAY_TOP + 40, max: PLAY_BOTTOM - 40 },
        { axis: "y" as const, val: PLAY_TOP, min: PLAY_LEFT + 40, max: PLAY_RIGHT - 40 },
        { axis: "y" as const, val: PLAY_BOTTOM, min: PLAY_LEFT + 40, max: PLAY_RIGHT - 40 },
      ];

      for (const cushion of cushions) {
        let mirrorP: IVec2D;
        if (cushion.axis === "x") {
          mirrorP = { x: 2 * cushion.val - pocket.position.x, y: pocket.position.y };
        } else {
          mirrorP = { x: pocket.position.x, y: 2 * cushion.val - pocket.position.y };
        }

        const toMirror = sub(mirrorP, targetBall.position);
        if (cushion.axis === "x" && toMirror.x === 0) continue;
        if (cushion.axis === "y" && toMirror.y === 0) continue;

        const t = cushion.axis === "x" 
          ? (cushion.val - targetBall.position.x) / toMirror.x
          : (cushion.val - targetBall.position.y) / toMirror.y;

        if (t <= 0 || t >= 1) continue;

        const R: IVec2D = {
          x: targetBall.position.x + toMirror.x * t,
          y: targetBall.position.y + toMirror.y * t,
        };

        const checkCoord = cushion.axis === "x" ? R.y : R.x;
        if (checkCoord < cushion.min || checkCoord > cushion.max) continue;

        if (!isPathClear(targetBall.position, R, balls, [0, targetBall.id])) continue;
        if (!isPathClear(R, pocket.position, balls, [0, targetBall.id])) continue;

        const bounceDir = normalize(sub(R, targetBall.position));
        const aimPoint = sub(targetBall.position, scale(bounceDir, BALL_RADIUS * 2));

        if (!isPathClear(cueBall.position, aimPoint, balls, [0, targetBall.id])) continue;

        const toAimPoint = sub(aimPoint, cueBall.position);
        const distToAim = distance(cueBall.position, aimPoint);
        const aimDir = normalize(toAimPoint);

        const cutCosine = dot(aimDir, bounceDir);
        if (cutCosine <= 0.25) continue;

        const distTargetToR = distance(targetBall.position, R);
        const distRToPocket = distance(R, pocket.position);
        const totalDist = distToAim + distTargetToR + distRToPocket;

        const score = cutCosine * 70 - totalDist * 0.04;

        candidates.push({
          angle: toAngle(toAimPoint),
          score,
          totalDistance: totalDist,
          distToAimPoint: distToAim,
          type: "BANK",
        });
      }
    }
  }

  return candidates;
}

/**
 * Evaluate single-cushion kick shots (Cue Ball -> Cushion -> Target Ball -> Pocket or Legal Contact).
 */
function calculateKickShots(
  cueBall: IBall,
  targetBalls: IBall[],
  balls: IBall[]
): ICandidateShot[] {
  const candidates: ICandidateShot[] = [];

  const cushions = [
    { axis: "x" as const, val: PLAY_LEFT, min: PLAY_TOP + 40, max: PLAY_BOTTOM - 40 },
    { axis: "x" as const, val: PLAY_RIGHT, min: PLAY_TOP + 40, max: PLAY_BOTTOM - 40 },
    { axis: "y" as const, val: PLAY_TOP, min: PLAY_LEFT + 40, max: PLAY_RIGHT - 40 },
    { axis: "y" as const, val: PLAY_BOTTOM, min: PLAY_LEFT + 40, max: PLAY_RIGHT - 40 },
  ];

  for (const targetBall of targetBalls) {
    for (const cushion of cushions) {
      let mirrorTarget: IVec2D;
      if (cushion.axis === "x") {
        mirrorTarget = { x: 2 * cushion.val - targetBall.position.x, y: targetBall.position.y };
      } else {
        mirrorTarget = { x: targetBall.position.x, y: 2 * cushion.val - targetBall.position.y };
      }

      const toMirror = sub(mirrorTarget, cueBall.position);
      if (cushion.axis === "x" && toMirror.x === 0) continue;
      if (cushion.axis === "y" && toMirror.y === 0) continue;

      const t = cushion.axis === "x"
        ? (cushion.val - cueBall.position.x) / toMirror.x
        : (cushion.val - cueBall.position.y) / toMirror.y;

      if (t <= 0 || t >= 1) continue;

      const R: IVec2D = {
        x: cueBall.position.x + toMirror.x * t,
        y: cueBall.position.y + toMirror.y * t,
      };

      const checkCoord = cushion.axis === "x" ? R.y : R.x;
      if (checkCoord < cushion.min || checkCoord > cushion.max) continue;

      // Path from cue ball to cushion bounce point R must be clear
      if (!isPathClear(cueBall.position, R, balls, [0])) continue;
      // Path from R to target ball must be clear
      if (!isPathClear(R, targetBall.position, balls, [0, targetBall.id])) continue;

      const distCueToR = distance(cueBall.position, R);
      const distRToTarget = distance(R, targetBall.position);
      const totalDist = distCueToR + distRToTarget;

      const kickDir = normalize(sub(targetBall.position, R));
      let bestPocketScore = 0;

      for (const pocket of POCKETS) {
        if (isPathClear(targetBall.position, pocket.position, balls, [0, targetBall.id])) {
          const pocketDir = normalize(sub(pocket.position, targetBall.position));
          const cutCosine = dot(kickDir, pocketDir);
          if (cutCosine > 0.3) {
            const pScore = cutCosine * 50;
            if (pScore > bestPocketScore) bestPocketScore = pScore;
          }
        }
      }

      const score = bestPocketScore > 0 
        ? bestPocketScore + 20 - totalDist * 0.03
        : 15 - totalDist * 0.03;

      const toR = sub(R, cueBall.position);

      candidates.push({
        angle: toAngle(toR),
        score,
        totalDistance: totalDist,
        distToAimPoint: distCueToR,
        type: "KICK",
        targetBall,
      });
    }
  }

  return candidates;
}

/**
 * Evaluate 2-ball combination shots (Primary Ball -> Secondary Ball -> Pocket).
 */
function calculateComboShots(
  cueBall: IBall,
  targetBalls: IBall[],
  activeBalls: IBall[],
  balls: IBall[]
): ICandidateShot[] {
  const candidates: ICandidateShot[] = [];

  for (const primaryBall of targetBalls) {
    for (const secondaryBall of activeBalls) {
      if (primaryBall.id === secondaryBall.id || secondaryBall.id === 0) continue;

      for (const pocket of POCKETS) {
        const toPocket = sub(pocket.position, secondaryBall.position);
        const distBToPocket = distance(secondaryBall.position, pocket.position);
        const pocketDir = normalize(toPocket);

        const aimPointB = sub(secondaryBall.position, scale(pocketDir, BALL_RADIUS * 2));
        const toAimPointB = sub(aimPointB, primaryBall.position);
        const distAToB = distance(primaryBall.position, aimPointB);
        const dirAToB = normalize(toAimPointB);

        const aimPointA = sub(primaryBall.position, scale(dirAToB, BALL_RADIUS * 2));
        const toAimPointA = sub(aimPointA, cueBall.position);
        const distToAimA = distance(cueBall.position, aimPointA);
        const dirCueToA = normalize(toAimPointA);

        const cut1 = dot(dirCueToA, dirAToB);
        const cut2 = dot(dirAToB, pocketDir);
        if (cut1 <= 0.3 || cut2 <= 0.3) continue;

        if (!isPathClear(cueBall.position, aimPointA, balls, [0, primaryBall.id])) continue;
        if (!isPathClear(primaryBall.position, aimPointB, balls, [0, primaryBall.id, secondaryBall.id])) continue;
        if (!isPathClear(secondaryBall.position, pocket.position, balls, [0, secondaryBall.id])) continue;

        const totalDist = distToAimA + distAToB + distBToPocket;
        const score = cut1 * cut2 * 75 - totalDist * 0.04;

        candidates.push({
          angle: toAngle(toAimPointA),
          score,
          totalDistance: totalDist,
          distToAimPoint: distToAimA,
          type: "COMBO",
        });
      }
    }
  }

  return candidates;
}

/**
 * Calculate an intentional defensive snooker shot.
 */
function calculateDefensiveShot(
  cueBall: IBall,
  targetBalls: IBall[],
  activeBalls: IBall[],
  balls: IBall[],
  botBallType: BallType | null
): ICandidateShot | null {
  const opponentBalls = activeBalls.filter((b) => 
    botBallType ? b.type !== botBallType && b.id !== 8 : false
  );

  let bestSafeShot: ICandidateShot | null = null;
  let bestSafetyScore = -Infinity;

  for (const targetBall of targetBalls) {
    if (!isPathClear(cueBall.position, targetBall.position, balls, [0, targetBall.id])) continue;

    const toTarget = sub(targetBall.position, cueBall.position);
    const distToTarget = distance(cueBall.position, targetBall.position);
    const angleToTarget = toAngle(toTarget);

    let safetyScore = 30; // Base safety score

    if (opponentBalls.length > 0) {
      for (const oppBall of opponentBalls) {
        const dCueToOpp = distanceSq(cueBall.position, oppBall.position);
        if (dCueToOpp < 250 * 250) {
          safetyScore += 15;
        }
      }
    }

    if (safetyScore > bestSafetyScore) {
      bestSafetyScore = safetyScore;
      bestSafeShot = {
        angle: angleToTarget,
        score: safetyScore,
        totalDistance: distToTarget,
        distToAimPoint: distToTarget,
        type: "DEFENSIVE",
        targetBall,
      };
    }
  }

  return bestSafeShot;
}

/**
 * Calculate the best shot for the bot given current table state and difficulty.
 */
export function calculateShot(
  balls: IBall[],
  botBallType: BallType | null,
  difficulty: Difficulty
): IShot | null {
  const cueBall = getCueBall(balls);
  const activeBalls = balls.filter((b) => !b.isPocketed && b.id !== 0);
  const botConfig = getBotConfig(difficulty);

  // 1. Determine targetable balls
  let targetBalls: IBall[] = [];

  if (!botBallType) {
    // Open table: can target any SOLID or STRIPE (not 8-ball)
    targetBalls = activeBalls.filter(
      (b) => b.type === BallType.SOLID || b.type === BallType.STRIPE
    );
  } else if (canPocketEightBall(balls, botBallType)) {
    // All own balls cleared: target ONLY 8-ball
    targetBalls = activeBalls.filter((b) => b.id === 8);
  } else {
    // Target own category balls
    targetBalls = activeBalls.filter((b) => b.type === botBallType);
  }

  if (targetBalls.length === 0) return null;

  const candidates: ICandidateShot[] = [];

  // 2. Evaluate Direct Pocket Shots
  for (const targetBall of targetBalls) {
    for (const pocket of POCKETS) {
      const toPocket = sub(pocket.position, targetBall.position);
      const distToPocket = distance(targetBall.position, pocket.position);
      const pocketDir = normalize(toPocket);

      const aimPoint = sub(targetBall.position, scale(pocketDir, BALL_RADIUS * 2));
      const toAimPoint = sub(aimPoint, cueBall.position);
      const distToAimPoint = distance(cueBall.position, aimPoint);
      const aimDir = normalize(toAimPoint);

      const cutCosine = dot(aimDir, pocketDir);

      // Ignore impossible cut angles (> 80 degrees)
      if (cutCosine <= 0.17) continue;

      const isPocketPathClear = isPathClear(targetBall.position, pocket.position, balls, [
        0,
        targetBall.id,
      ]);
      const isAimPathClear = isPathClear(cueBall.position, aimPoint, balls, [
        0,
        targetBall.id,
      ]);

      if (!isPocketPathClear || !isAimPathClear) continue;

      // Base score formula
      let score = cutCosine * 100 - (distToPocket + distToAimPoint) * 0.04;
      let calculatedSpinX = 0;
      let calculatedSpinY = 0;

      // Spin & Position Play evaluation for Hard/Pro difficulty
      if (botConfig.evaluatePositionPlay) {
        score += evaluatePositionPlayBonus(aimPoint, aimDir, targetBall, targetBalls, balls);
      }

      if (botConfig.allowSpinControl) {
        const spinResult = evaluateSpinControl(cueBall.position, aimPoint, targetBall, targetBalls, balls);
        score += spinResult.spinBonus;
        calculatedSpinX = spinResult.spinX;
        calculatedSpinY = spinResult.spinY;
      }

      candidates.push({
        angle: toAngle(toAimPoint),
        score,
        totalDistance: distToPocket + distToAimPoint,
        distToAimPoint,
        type: "DIRECT",
        spinX: calculatedSpinX,
        spinY: calculatedSpinY,
      });
    }
  }

  // 3. Evaluate Cushion Bank Shots if enabled for difficulty
  if (botConfig.allowBankShots) {
    const bankCandidates = calculateBankShots(cueBall, targetBalls, balls);
    candidates.push(...bankCandidates);
  }

  // 4. Evaluate 2-Ball Combination Shots if enabled for difficulty
  if (botConfig.allowComboShots) {
    const comboCandidates = calculateComboShots(cueBall, targetBalls, activeBalls, balls);
    candidates.push(...comboCandidates);
  }

  // 5. Evaluate Kick Shots (cushion first) if enabled for difficulty
  if (botConfig.allowKickShots) {
    const kickCandidates = calculateKickShots(cueBall, targetBalls, balls);
    candidates.push(...kickCandidates);
  }

  // 6. Evaluate Intentional Defensive Play if enabled and no strong pot exists
  if (botConfig.usesDefensivePlay) {
    const defCandidate = calculateDefensiveShot(cueBall, targetBalls, activeBalls, balls, botBallType);
    if (defCandidate) {
      candidates.push(defCandidate);
    }
  }

  // 7. Select Best Candidate Shot
  let bestCandidate: ICandidateShot | null = null;
  for (const c of candidates) {
    if (!bestCandidate || c.score > bestCandidate.score) {
      bestCandidate = c;
    }
  }

  // 8. Execute Fallback Shot if no candidate shot found
  if (!bestCandidate) {
    let bestVisibleBall: IBall | null = null;
    let minDistVisible = Infinity;

    for (const b of targetBalls) {
      if (isPathClear(cueBall.position, b.position, balls, [0, b.id])) {
        const d = distanceSq(cueBall.position, b.position);
        if (d < minDistVisible) {
          minDistVisible = d;
          bestVisibleBall = b;
        }
      }
    }

    if (bestVisibleBall) {
      const angleToBall = toAngle(sub(bestVisibleBall.position, cueBall.position));
      const safePower = botConfig.usesDefensivePlay
        ? Math.max(botConfig.powerMin, 0.28)
        : (botConfig.powerMin + botConfig.powerMax) / 2;
      return {
        angle: angleToBall,
        power: safePower,
      };
    } else {
      let closestBall = targetBalls[0];
      let minDist = Infinity;
      for (const b of targetBalls) {
        const d = distanceSq(cueBall.position, b.position);
        if (d < minDist) {
          minDist = d;
          closestBall = b;
        }
      }
      const angleToBall = toAngle(sub(closestBall.position, cueBall.position));
      return {
        angle: angleToBall,
        power: botConfig.powerMax * 0.85,
      };
    }
  }

  // 9. Apply difficulty inaccuracies and power calculation for chosen candidate
  const aimErrorRad = (botConfig.aimErrorDegrees * Math.PI) / 180;
  
  let maxHitDeviation = Math.PI / 2;
  if (bestCandidate.distToAimPoint > BALL_RADIUS * 2) {
    maxHitDeviation = Math.asin((BALL_RADIUS * 2) / bestCandidate.distToAimPoint);
  }
  
  const maxAllowedDeviation = Math.min(aimErrorRad, maxHitDeviation * 0.9);
  const randomDeviation = (Math.random() - 0.5) * 2 * maxAllowedDeviation;
  const finalAngle = bestCandidate.angle + randomDeviation;

  let rawPower = Math.min(0.9, Math.max(0.35, bestCandidate.totalDistance / 1100));

  // If defensive or kick shot, moderate the power for controlled resting ball position
  if (bestCandidate.type === "DEFENSIVE") {
    rawPower = Math.max(botConfig.powerMin, 0.32);
  } else if (bestCandidate.type === "KICK") {
    rawPower = Math.min(0.85, rawPower * 1.15); // Kick shots require slightly extra impulse off cushion
  }

  const finalPower = Math.min(
    botConfig.powerMax,
    Math.max(botConfig.powerMin, rawPower)
  );

  return {
    angle: finalAngle,
    power: finalPower,
    spinX: bestCandidate.spinX,
    spinY: bestCandidate.spinY,
  };
}

/**
 * Controller class to manage realistic "thinking" and "aiming" animations before bot shoots.
 */
export class BotController {
  private state: BotState = BotState.IDLE;
  private thinkingStartTime: number | null = null;
  private animProgress: number = 0;
  private shot: IShot | null = null;
  private startAngle: number = 0;
  private targetAngle: number = 0;
  private targetPullBack: number = 0;
  private currentPullBack: number = 0;

  /**
   * Called every frame during BOT_TURN.
   * Runs the cue stick aiming, pullback, and strike animation loop, then executes the physics shot.
   * Returns true when bot shot has been triggered.
   */
  update(
    engine: {
      getPhase: () => GamePhase;
      getBalls: () => IBall[];
      getBotBallType: () => BallType | null;
      getDifficulty: () => Difficulty;
      executeBotShot: (shot: IShot) => void;
    },
    cueStick: ICueStick
  ): boolean {
    if (engine.getPhase() !== GamePhase.BOT_TURN) {
      this.state = BotState.IDLE;
      this.thinkingStartTime = null;
      return false;
    }

    const botConfig = getBotConfig(engine.getDifficulty());

    switch (this.state) {
      case BotState.IDLE:
        // Transition to thinking state
        this.state = BotState.THINKING;
        this.thinkingStartTime = performance.now();
        cueStick.isVisible = false;
        cueStick.pullBack = 0;
        return false;

      case BotState.THINKING: {
        const elapsed = performance.now() - (this.thinkingStartTime || 0);
        if (elapsed >= botConfig.thinkingDelayMs * 0.4) {
          // Calculate the target shot
          this.shot = calculateShot(
            engine.getBalls(),
            engine.getBotBallType(),
            engine.getDifficulty()
          );

          if (!this.shot) {
            this.state = BotState.IDLE;
            return false;
          }

          // Setup aiming animation
          cueStick.isVisible = true;
          this.startAngle = cueStick.angle;

          // Normalize angle difference to avoid spinning the long way
          let diff = this.shot.angle - this.startAngle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          this.targetAngle = this.startAngle + diff;

          this.animProgress = 0;
          this.state = BotState.AIMING;
        }
        return false;
      }

      case BotState.AIMING:
        // Aiming takes about 0.8 seconds (increments by ~0.02 per frame)
        this.animProgress += 0.025;
        if (this.animProgress >= 1) {
          this.animProgress = 1;
        }

        // Interpolate angle
        cueStick.angle = this.startAngle + (this.targetAngle - this.startAngle) * this.animProgress;

        if (this.animProgress >= 1) {
          this.state = BotState.POWERING;
          this.animProgress = 0;
          // Max pullback is 120 pixels (CUE_OFFSET_MAX)
          this.targetPullBack = (this.shot?.power || 0.5) * 120;
        }
        return false;

      case BotState.POWERING:
        // Pulling back takes about 0.5 seconds (increments by ~0.035 per frame)
        this.animProgress += 0.035;
        if (this.animProgress >= 1) {
          this.animProgress = 1;
        }

        cueStick.pullBack = this.targetPullBack * this.animProgress;
        
        // Show Bot charging power in the HUD PowerMeter
        cueStick.isCharging = true;
        cueStick.power = cueStick.pullBack / 120;

        if (this.animProgress >= 1) {
          this.state = BotState.STRIKING;
          this.animProgress = 0;
          this.currentPullBack = cueStick.pullBack;
        }
        return false;

      case BotState.STRIKING:
        // Fast strike animation (slams forward in ~0.08 seconds)
        this.animProgress += 0.22;
        if (this.animProgress >= 1) {
          this.animProgress = 1;
        }

        // Slam forward, going slightly past resting (-5px) for realistic follow-through impact
        cueStick.pullBack = this.currentPullBack * (1 - this.animProgress) - (5 * this.animProgress);
        cueStick.power = Math.max(0, cueStick.pullBack / 120);

        if (this.animProgress >= 1) {
          // Trigger physics shot in the engine
          if (this.shot) {
            engine.executeBotShot(this.shot);
          }
          cueStick.isVisible = false;
          cueStick.pullBack = 0;
          cueStick.isCharging = false;
          cueStick.power = 0;
          this.state = BotState.IDLE;
          return true;
        }
        return false;
    }

    return false;
  }
}
