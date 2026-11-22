// ============================================================
// CueRenderer — Draws cue stick, aim guideline, and ball-in-hand
// Split from Renderer.ts for maintainability
// ============================================================

import { IBall, ICueStick, IVec2D, BallType } from "@/lib/types";
import { canPocketEightBall } from "@/lib/game/GameState";
import { CUE_LENGTH, CUE_OFFSET_MIN } from "@/lib/game/CueStick";
import {
  PLAY_LEFT,
  PLAY_TOP,
  PLAY_RIGHT,
  PLAY_BOTTOM,
  CANVAS_PADDING,
} from "@/lib/constants/table";
import { BALL_RADIUS } from "@/lib/constants/balls";
import { distance, fromAngle } from "@/lib/physics/Vec2D";

/**
 * Draw the cue stick rotated around the cue ball.
 */
export function drawCueStick(
  ctx: CanvasRenderingContext2D,
  cueBallPos: IVec2D,
  cueStick: ICueStick,
): void {
  if (!cueStick.isVisible) return;

  ctx.save();
  ctx.translate(CANVAS_PADDING, CANVAS_PADDING);

  const { x, y } = cueBallPos;
  const angle = cueStick.angle;
  const pullBack = cueStick.pullBack;

  // Total offset from cue ball center (tip distance)
  const tipOffset = CUE_OFFSET_MIN + pullBack + BALL_RADIUS;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI); // Cue points opposite to aim direction

  // Scale the cue stick to make it bigger (1.4x), pivoting around its tip
  ctx.translate(tipOffset, 0);
  ctx.scale(1.4, 1.4);
  ctx.translate(-tipOffset, 0);

  const bodyStart = tipOffset;
  const bodyEnd = tipOffset + CUE_LENGTH;
  const totalLen = CUE_LENGTH;

  // Tapered dimensions
  const wTipHalf = 2.5; // ~5.0px total tip thickness
  const wButtHalf = 6.2; // ~12.4px total butt thickness

  // Helper to get thickness at any point along the stick's length
  const getW = (dist: number) =>
    wTipHalf + (wButtHalf - wTipHalf) * ((dist - bodyStart) / totalLen);

  // 1. Draw unified manual multi-layered vector shadow for smooth HD look (avoids pixelated browser shadow blurs)
  const drawManualShadow = () => {
    const drawShadowLayer = (
      dx: number,
      dy: number,
      extraW: number,
      opacity: number,
    ) => {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.beginPath();
      // Draw tapered shape matching the cue contour but expanded by extraW
      const wTip = wTipHalf + extraW;
      const wButt = wButtHalf + extraW;
      ctx.moveTo(bodyStart + 4, -wTip);
      ctx.quadraticCurveTo(bodyStart - 2 - extraW, 0, bodyStart + 4, wTip);
      ctx.lineTo(bodyEnd - 3, wButt);
      ctx.quadraticCurveTo(bodyEnd + 2 + extraW, 0, bodyEnd - 3, -wButt);
      ctx.closePath();
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
      ctx.fill();
      ctx.restore();
    };

    // Layer 1: Soft wide ambient shadow
    drawShadowLayer(3.0, 6.0, 2.5, 0.08);
    // Layer 2: Medium shadow
    drawShadowLayer(2.0, 4.0, 1.2, 0.18);
    // Layer 3: Sharp core shadow close to cue stick
    drawShadowLayer(1.0, 2.2, 0.2, 0.35);
  };

  drawManualShadow();

  // Helper to shade a segment with vector-stroke highlights that follow the exact taper slope
  const drawHDShading = (
    startDist: number,
    endDist: number,
    materialType: "wood" | "metal" | "dark-wood" | "leather" | "linen",
  ) => {
    const wStart = getW(startDist);
    const wEnd = getW(endDist);

    ctx.save();

    // Clip to segment boundaries so strokes stay inside the tapered shape
    ctx.beginPath();
    ctx.moveTo(startDist, -wStart);
    ctx.lineTo(endDist, -wEnd);
    ctx.lineTo(endDist, wEnd);
    ctx.lineTo(startDist, wStart);
    ctx.closePath();
    ctx.clip();

    // 1. Draw top-edge rim shadow (to give roundness on top)
    ctx.beginPath();
    ctx.moveTo(startDist, -wStart);
    ctx.lineTo(endDist, -wEnd);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
    ctx.lineWidth = (wStart + wEnd) * 0.35;
    ctx.stroke();

    // 2. Draw core shadow (underneath center)
    const shadowOpacity =
      materialType === "metal"
        ? 0.45
        : materialType === "dark-wood"
          ? 0.55
          : 0.32;
    ctx.beginPath();
    ctx.moveTo(startDist, wStart * 0.45);
    ctx.lineTo(endDist, wEnd * 0.45);
    ctx.strokeStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
    ctx.lineWidth = (wStart + wEnd) * 0.45;
    ctx.stroke();

    // 3. Draw green ambient bounce light at the bottom edge (felt reflection)
    const bounceOpacity =
      materialType === "metal" ? 0.35 : materialType === "wood" ? 0.22 : 0.28;
    ctx.beginPath();
    ctx.moveTo(startDist, wStart * 0.9);
    ctx.lineTo(endDist, wEnd * 0.9);
    ctx.strokeStyle = `rgba(46, 164, 79, ${bounceOpacity})`;
    ctx.lineWidth = (wStart + wEnd) * 0.18;
    ctx.stroke();

    // 4. Draw main specular highlight line (gloss beam)
    const specOpacity =
      materialType === "metal"
        ? 0.8
        : materialType === "wood"
          ? 0.55
          : materialType === "dark-wood"
            ? 0.5
            : 0.25;
    const specWidth = materialType === "metal" ? 0.15 : 0.22;
    ctx.beginPath();
    ctx.moveTo(startDist, -wStart * 0.38);
    ctx.lineTo(endDist, -wEnd * 0.38);
    ctx.strokeStyle = `rgba(255, 255, 255, ${specOpacity})`;
    ctx.lineWidth = (wStart + wEnd) * specWidth;
    ctx.stroke();

    ctx.restore();
  };

  // Helper to draw a basic tapered solid segment
  const drawTaperedBlock = (
    startDist: number,
    endDist: number,
    color: string,
  ) => {
    const wStart = getW(startDist);
    const wEnd = getW(endDist);
    ctx.beginPath();
    ctx.moveTo(startDist, -wStart);
    ctx.lineTo(endDist, -wEnd);
    ctx.lineTo(endDist, wEnd);
    ctx.lineTo(startDist, wStart);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  // Helper to draw decorative diamond inlays on ebony wood sections
  const drawDiamondInlay = (
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    color: string,
  ) => {
    ctx.beginPath();
    ctx.moveTo(centerX - width / 2, centerY);
    ctx.lineTo(centerX, centerY - height / 2);
    ctx.lineTo(centerX + width / 2, centerY);
    ctx.lineTo(centerX, centerY + height / 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  };

  // Helper to draw veneer points at the collar base
  const drawVeneerPoints = (startDist: number, endDist: number) => {
    const wCollar = getW(startDist);

    const drawSinglePoint = (
      tipX: number,
      baseTopY: number,
      baseBottomY: number,
      color: string,
    ) => {
      ctx.beginPath();
      ctx.moveTo(startDist, baseTopY);
      ctx.lineTo(tipX, (baseTopY + baseBottomY) / 2);
      ctx.lineTo(startDist, baseBottomY);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    // Gold borders for contrast
    drawSinglePoint(endDist - 5, -wCollar, -wCollar * 0.3, "#d4af37");
    drawSinglePoint(endDist - 12, -wCollar * 0.45, wCollar * 0.45, "#d4af37");
    drawSinglePoint(endDist - 5, wCollar * 0.3, wCollar, "#d4af37");

    // Inner ebony fill
    drawSinglePoint(endDist, -wCollar * 0.95, -wCollar * 0.35, "#111111");
    drawSinglePoint(endDist - 7, -wCollar * 0.38, wCollar * 0.38, "#111111");
    drawSinglePoint(endDist, wCollar * 0.35, wCollar * 0.95, "#111111");
  };

  // 2. Render all cue stick segments

  // Segment A: Rounded leather tip
  const wTipStart = getW(bodyStart);
  ctx.beginPath();
  ctx.moveTo(bodyStart + 4, -wTipStart);
  ctx.quadraticCurveTo(bodyStart - 2.5, 0, bodyStart + 4, wTipStart);
  ctx.lineTo(bodyStart + 4, wTipStart);
  ctx.closePath();
  ctx.fillStyle = "#3e2723"; // Rich brown leather
  ctx.fill();
  drawHDShading(bodyStart, bodyStart + 4, "leather");

  // Segment B: Ivory ferrule
  drawTaperedBlock(bodyStart + 4, bodyStart + 15, "#fbfbf8");
  drawHDShading(bodyStart + 4, bodyStart + 15, "metal");

  // Segment C: Aged maple shaft
  const shaftStart = bodyStart + 15;
  const shaftEnd = bodyStart + 185;
  drawTaperedBlock(shaftStart, shaftEnd, "#edd3a4");

  // Draw natural wavy wood grain lines inside the shaft
  const wShaftStart = getW(shaftStart);
  ctx.strokeStyle = "rgba(180, 140, 100, 0.25)";
  ctx.lineWidth = 0.8;
  // Grain line 1
  ctx.beginPath();
  ctx.moveTo(shaftStart, -wShaftStart * 0.4);
  ctx.bezierCurveTo(
    shaftStart + 60,
    -wShaftStart * 0.1,
    shaftStart + 110,
    -wShaftStart * 0.5,
    shaftEnd,
    -getW(shaftEnd) * 0.3,
  );
  ctx.stroke();
  // Grain line 2
  ctx.beginPath();
  ctx.moveTo(shaftStart + 20, wShaftStart * 0.2);
  ctx.bezierCurveTo(
    shaftStart + 80,
    wShaftStart * 0.5,
    shaftStart + 130,
    wShaftStart * 0.1,
    shaftEnd,
    getW(shaftEnd) * 0.4,
  );
  ctx.stroke();

  // Draw decorative veneer points extending from joint collar into shaft
  drawVeneerPoints(shaftEnd, shaftStart + 120);

  // Apply 3D wood shading overlay to shaft
  drawHDShading(shaftStart, shaftEnd, "wood");

  // Segment D: Joint Collars and Spacers
  // Phenolic black collar ring
  drawTaperedBlock(bodyStart + 185, bodyStart + 188, "#111111");
  drawHDShading(bodyStart + 185, bodyStart + 188, "dark-wood");

  // Polished chrome collar
  const chromeCollarStart = bodyStart + 188;
  const chromeCollarEnd = bodyStart + 197;
  drawTaperedBlock(chromeCollarStart, chromeCollarEnd, "#e5e7eb");
  drawHDShading(chromeCollarStart, chromeCollarEnd, "metal");

  // Brass collar accent ring
  const brassStart = bodyStart + 197;
  const brassEnd = bodyStart + 200;
  drawTaperedBlock(brassStart, brassEnd, "#d4af37"); // Gold color
  drawHDShading(brassStart, brassEnd, "metal");

  // Segment E: Ebony forearm with mother-of-pearl diamond inlays
  const forearmStart = bodyStart + 200;
  const forearmEnd = bodyStart + 230;
  drawTaperedBlock(forearmStart, forearmEnd, "#111111");
  drawDiamondInlay(forearmStart + 15, 0, 7, 3, "#fbfbf8");
  drawHDShading(forearmStart, forearmEnd, "dark-wood");

  // Segment F: Irish Linen textured grip
  const wrapStart = bodyStart + 230;
  const wrapEnd = bodyStart + 315;
  const wWrapStart = getW(wrapStart);
  const wWrapEnd = getW(wrapEnd);

  // Charcoal black base wrap
  drawTaperedBlock(wrapStart, wrapEnd, "#161616");

  ctx.save();
  // Clip to wrap boundaries
  ctx.beginPath();
  ctx.moveTo(wrapStart, -wWrapStart);
  ctx.lineTo(wrapEnd, -wWrapEnd);
  ctx.lineTo(wrapEnd, wWrapEnd);
  ctx.lineTo(wrapStart, wWrapStart);
  ctx.closePath();
  ctx.clip();

  // Draw fine diagonal thread wrap highlights
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 0.65;
  for (let wx = wrapStart - 5; wx < wrapEnd + 5; wx += 2.8) {
    const wAtX = getW(wx);
    ctx.beginPath();
    ctx.moveTo(wx, -wAtX);
    ctx.lineTo(wx + 2.5, wAtX);
    ctx.stroke();
  }
  // Alternate dark threads to simulate woven pattern
  ctx.strokeStyle = "rgba(0, 0, 0, 0.28)";
  for (let wx = wrapStart - 5; wx < wrapEnd + 5; wx += 3.5) {
    const wAtX = getW(wx);
    ctx.beginPath();
    ctx.moveTo(wx, wAtX);
    ctx.lineTo(wx + 2.5, -wAtX);
    ctx.stroke();
  }
  ctx.restore();
  drawHDShading(wrapStart, wrapEnd, "linen");

  // Segment G: Ebony butt sleeve with silver accent rings and pearl diamonds
  const sleeveStart = bodyStart + 315;
  const sleeveEnd = bodyStart + 342;
  drawTaperedBlock(sleeveStart, sleeveEnd, "#111111");

  // Silver accent spacer rings
  drawTaperedBlock(sleeveStart, sleeveStart + 2, "#d1d5db");
  drawHDShading(sleeveStart, sleeveStart + 2, "metal");
  drawTaperedBlock(sleeveEnd - 2, sleeveEnd, "#d1d5db");
  drawHDShading(sleeveEnd - 2, sleeveEnd, "metal");

  // Mother-of-pearl diamond inlays
  const wSleeveCenter = getW(sleeveStart + 13.5);
  drawDiamondInlay(sleeveStart + 13.5, -wSleeveCenter * 0.4, 5, 2.5, "#fbfbf8");
  drawDiamondInlay(sleeveStart + 13.5, wSleeveCenter * 0.4, 5, 2.5, "#fbfbf8");

  drawHDShading(sleeveStart, sleeveEnd, "dark-wood");

  // Segment H: Ivory butt cap
  drawTaperedBlock(bodyStart + 342, bodyStart + 347, "#fbfbf8");
  drawHDShading(bodyStart + 342, bodyStart + 347, "metal");

  // Segment I: Rounded rubber bumper at the end
  const wBumperStart = getW(bodyStart + 347);
  const wBumperEnd = getW(bodyEnd);
  ctx.beginPath();
  ctx.moveTo(bodyEnd - 3, -wBumperEnd);
  ctx.lineTo(bodyStart + 347, -wBumperStart);
  ctx.lineTo(bodyStart + 347, wBumperStart);
  ctx.lineTo(bodyEnd - 3, wBumperEnd);
  ctx.quadraticCurveTo(bodyEnd + 2.5, 0, bodyEnd - 3, -wBumperEnd);
  ctx.closePath();
  ctx.fillStyle = "#151515"; // Matte rubber bumper
  ctx.fill();
  drawHDShading(bodyStart + 347, bodyEnd, "leather");

  ctx.restore();
  ctx.restore();
}

/**
 * Draw aiming guideline — dotted line from cue ball in shot direction.
 * Extends until hitting a wall or another ball.
 */
export function drawAimLine(
  ctx: CanvasRenderingContext2D,
  cueBallPos: IVec2D,
  cueStick: ICueStick,
  balls: IBall[],
  playerBallType: BallType | null,
): void {
  if (!cueStick.isVisible) return;

  ctx.save();
  ctx.translate(CANVAS_PADDING, CANVAS_PADDING);

  const dir = fromAngle(cueStick.angle);
  const startX = cueBallPos.x + dir.x * (BALL_RADIUS + 2);
  const startY = cueBallPos.y + dir.y * (BALL_RADIUS + 2);

  // Find how far the line can go (hit wall or ball)
  const maxDist = findAimLineEnd(cueBallPos, dir, balls);

  const endX = cueBallPos.x + dir.x * maxDist;
  const endY = cueBallPos.y + dir.y * maxDist;

  // Wrong ball detection
  let isWrongBall = false;
  const activeBalls = balls.filter((b) => !b.isPocketed && b.id !== 0);
  let hitBall: IBall | null = null;
  let hitBallDist = BALL_RADIUS * 2 + 1;
  for (const ball of activeBalls) {
    const dist = distance({ x: endX, y: endY }, ball.position);
    if (dist < hitBallDist) {
      hitBallDist = dist;
      hitBall = ball;
    }
  }

  if (hitBall) {
    if (playerBallType === null) {
      // Open table: hitting 8-ball is a foul
      if (hitBall.type === BallType.EIGHT) {
        isWrongBall = true;
      }
    } else {
      const onEightBall = canPocketEightBall(balls, playerBallType);
      if (onEightBall) {
        // Must hit 8-ball first
        if (hitBall.type !== BallType.EIGHT) {
          isWrongBall = true;
        }
      } else {
        // Must hit own category ball first
        if (hitBall.type !== playerBallType) {
          isWrongBall = true;
        }
      }
    }
  }

  // Solid white guideline (or red if aiming at wrong ball) matching the screenshots
  ctx.beginPath();
  ctx.strokeStyle = isWrongBall
    ? "rgba(239, 68, 68, 0.8)"
    : "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 3.0;
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  if (hitBall) {
    // Draw post-collision trajectories (matching user's reference image)
    const C1 = { x: endX, y: endY };
    const C2 = hitBall.position;
    const nx = C2.x - C1.x;
    const ny = C2.y - C1.y;
    const hitDist = Math.sqrt(nx * nx + ny * ny);

    if (hitDist > 0) {
      const unx = nx / hitDist; // Unit normal
      const uny = ny / hitDist;

      // 1. Target Ball Path (moves along normal vector)
      const targetPathLen = 80;
      const targetEndX = C2.x + unx * targetPathLen;
      const targetEndY = C2.y + uny * targetPathLen;

      ctx.beginPath();
      ctx.strokeStyle = isWrongBall
        ? "rgba(239, 68, 68, 0.75)"
        : "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 3.0;
      ctx.moveTo(C2.x, C2.y);
      ctx.lineTo(targetEndX, targetEndY);
      ctx.stroke();

      // 2. Cue Ball Deflection Path (moves along tangent vector)
      const dotProduct = dir.x * unx + dir.y * uny;
      const tx = dir.x - dotProduct * unx;
      const ty = dir.y - dotProduct * uny;
      const tLen = Math.sqrt(tx * tx + ty * ty);

      if (tLen > 0.05) {
        const utx = tx / tLen; // Unit tangent
        const uty = ty / tLen;
        const cuePathLen = 80;
        const cueEndX = C1.x + utx * cuePathLen;
        const cueEndY = C1.y + uty * cuePathLen;

        ctx.beginPath();
        ctx.strokeStyle = isWrongBall
          ? "rgba(239, 68, 68, 0.75)"
          : "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 3.0;
        ctx.moveTo(C1.x, C1.y);
        ctx.lineTo(cueEndX, cueEndY);
        ctx.stroke();
      }
    }
  }

  // Ghost ball preview (bold target circle where cue ball would arrive)
  ctx.beginPath();
  ctx.arc(endX, endY, BALL_RADIUS, 0, Math.PI * 2);
  ctx.strokeStyle = isWrongBall
    ? "rgba(239, 68, 68, 0.95)"
    : "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 3.2;
  ctx.stroke();

  ctx.restore();
}

/**
 * Calculate how far the aim line should extend before hitting something.
 */
function findAimLineEnd(
  cueBallPos: IVec2D,
  dir: IVec2D,
  balls: IBall[],
): number {
  const step = 2;
  const maxSteps = 800;
  let minDist = maxSteps * step;

  // Check against walls
  if (dir.x > 0) {
    const d = (PLAY_RIGHT - BALL_RADIUS - cueBallPos.x) / dir.x;
    if (d > 0) minDist = Math.min(minDist, d);
  } else if (dir.x < 0) {
    const d = (PLAY_LEFT + BALL_RADIUS - cueBallPos.x) / dir.x;
    if (d > 0) minDist = Math.min(minDist, d);
  }
  if (dir.y > 0) {
    const d = (PLAY_BOTTOM - BALL_RADIUS - cueBallPos.y) / dir.y;
    if (d > 0) minDist = Math.min(minDist, d);
  } else if (dir.y < 0) {
    const d = (PLAY_TOP + BALL_RADIUS - cueBallPos.y) / dir.y;
    if (d > 0) minDist = Math.min(minDist, d);
  }

  // Check against other balls (ray-circle intersection)
  const activeBalls = balls.filter((b) => !b.isPocketed && b.id !== 0);
  for (const ball of activeBalls) {
    // Only check balls that are in the direction of the shot
    const toBall = {
      x: ball.position.x - cueBallPos.x,
      y: ball.position.y - cueBallPos.y,
    };
    const dotProduct = toBall.x * dir.x + toBall.y * dir.y;
    if (dotProduct <= 0) continue; // Aiming away from this ball

    const distCentersSq = toBall.x * toBall.x + toBall.y * toBall.y;
    const collisionRadius = BALL_RADIUS * 2;

    // For overlapping/touching balls aimed towards, project cue ball center
    // to the correct contact point along the aim direction
    if (distCentersSq <= collisionRadius * collisionRadius) {
      // Calculate where along the aim ray the cue ball center should be
      // so that it's exactly collisionRadius away from the target center.
      // Use the closest-approach formula: project toBall onto dir to find
      // the point on the ray nearest to the target center.
      const projDist = toBall.x * dir.x + toBall.y * dir.y; // Already checked > 0
      const perpDistSq = distCentersSq - projDist * projDist;
      const insideSq =
        collisionRadius * collisionRadius - Math.max(0, perpDistSq);
      if (insideSq > 0) {
        // Ghost ball position = projection distance minus the chord half-length
        const contactDist = projDist - Math.sqrt(insideSq);
        if (contactDist >= 0 && contactDist < minDist) {
          minDist = contactDist;
        } else if (contactDist < 0) {
          // Ball is so close/overlapping that contact is behind us — use projection distance
          // Place ghost ball at the closest sensible position
          const altDist = Math.max(
            0,
            projDist - Math.sqrt(Math.max(0, insideSq)),
          );
          if (altDist < minDist) {
            minDist = altDist;
          }
        }
      }
      continue;
    }

    const dist = rayCircleIntersect(
      cueBallPos,
      dir,
      ball.position,
      collisionRadius,
    );
    if (dist !== null && dist >= 0 && dist < minDist) {
      minDist = dist;
    }
  }

  return minDist;
}

/**
 * Ray-circle intersection test.
 * Returns distance along ray to intersection point, or null.
 */
function rayCircleIntersect(
  origin: IVec2D,
  dir: IVec2D,
  center: IVec2D,
  radius: number,
): number | null {
  const dx = origin.x - center.x;
  const dy = origin.y - center.y;

  const a = dir.x * dir.x + dir.y * dir.y;
  const b = 2 * (dx * dir.x + dy * dir.y);
  const c = dx * dx + dy * dy - radius * radius;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);

  // Return nearest positive intersection
  if (t1 > 0) return t1;
  if (t2 > 0) return t2;
  return null;
}

// Cache for the hand images to avoid recreate/re-parse latency on every frame
let baseHandImage: HTMLImageElement | null = null;
let cachedHandCanvasValid: HTMLCanvasElement | null = null;
let cachedHandCanvasInvalid: HTMLCanvasElement | null = null;
let isImageLoading = false;

function processHandImage(
  image: HTMLImageElement,
  isInvalid: boolean,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.drawImage(image, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Key out black background. Using < 20 threshold.
    if (r < 20 && g < 20 && b < 20) {
      data[i + 3] = 0; // Transparent
    } else if (isInvalid) {
      // Grayscale to red tint for invalid placement
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = Math.min(255, gray * 2.0); // High red
      data[i + 1] = Math.max(0, gray * 0.3); // Low green
      data[i + 2] = Math.max(0, gray * 0.3); // Low blue
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function initHandImages(): void {
  if (typeof window === "undefined" || baseHandImage || isImageLoading) return;
  isImageLoading = true;

  const img = new Image();
  img.src = "./hand_grabbing.jpg";
  img.onload = () => {
    cachedHandCanvasValid = processHandImage(img, false);
    cachedHandCanvasInvalid = processHandImage(img, true);
    baseHandImage = img;
    isImageLoading = false;
  };
  img.onerror = () => {
    // Image load failed (e.g. file:// CORS) — fallback to plain placement circle
    isImageLoading = false;
  };
}

/**
 * Draw ball-in-hand placement indicator.
 * Semi-transparent cue ball follows the mouse/touch position.
 */
export function drawBallInHand(
  ctx: CanvasRenderingContext2D,
  position: IVec2D,
  isValid: boolean,
): void {
  ctx.save();
  ctx.translate(CANVAS_PADDING, CANVAS_PADDING);

  const { x, y } = position;

  // Placement circle (green = valid, red = invalid)
  ctx.beginPath();
  ctx.arc(x, y, BALL_RADIUS + 10, 0, Math.PI * 2);
  ctx.strokeStyle = isValid
    ? "rgba(74, 222, 128, 0.65)"
    : "rgba(239, 68, 68, 0.65)";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw the 3D hand image on top of the cue ball
  if (typeof window !== "undefined") {
    initHandImages();
  }

  const handCanvas = isValid ? cachedHandCanvasValid : cachedHandCanvasInvalid;
  if (handCanvas) {
    // The C-shape grip center is roughly at (0.38, 0.46) relative to image size.
    // Drawn at size S = 130, this corresponds to offsets:
    // offsetX = 0.38 * 130 = 49.4
    // offsetY = 0.46 * 130 = 59.8
    const S = 130;
    const offsetX = 0.38 * S;
    const offsetY = 0.46 * S;
    ctx.drawImage(handCanvas, x - offsetX, y - offsetY, S, S);
  } else {
    // Fallback while loading
    ctx.beginPath();
    ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Clear the entire canvas.
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);

  // Dark background matching page background
  ctx.fillStyle = "#1B273A";
  ctx.fillRect(0, 0, width, height);
}
