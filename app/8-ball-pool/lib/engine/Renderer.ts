// ============================================================
// Renderer — Draws table, pockets, and balls on canvas
// Split into focused drawing modules for maintainability
// ============================================================

import { IBall, BallType } from "@/lib/types";
import { BALL_VISUALS } from "@/lib/constants/balls";
import {
  TABLE_WIDTH,
  TABLE_HEIGHT,
  RAIL_WIDTH,
  PLAY_LEFT,
  PLAY_TOP,
  PLAY_RIGHT,
  PLAY_BOTTOM,
  POCKETS,
  POCKET_VISUAL_RADIUS,
  TABLE_FELT_COLOR,
  TABLE_FELT_SHADOW,
  TABLE_RAIL_SHADOW,
  DIAMOND_COLOR,
  CANVAS_PADDING,
} from "@/lib/constants/table";

// ---- Diamond marker positions (decorative dots on rails) ----
function getDiamondPositions(): { x: number; y: number }[] {
  const diamonds: { x: number; y: number }[] = [];
  const segW = (PLAY_RIGHT - PLAY_LEFT) / 4;
  const segH = (PLAY_BOTTOM - PLAY_TOP) / 2;

  // Top & bottom rail diamonds
  for (let i = 1; i <= 3; i++) {
    diamonds.push({ x: PLAY_LEFT + segW * i, y: PLAY_TOP - RAIL_WIDTH / 2 });
    diamonds.push({ x: PLAY_LEFT + segW * i, y: PLAY_BOTTOM + RAIL_WIDTH / 2 });
  }
  // Left & right rail diamonds
  for (let i = 1; i <= 1; i++) {
    diamonds.push({ x: PLAY_LEFT - RAIL_WIDTH / 2, y: PLAY_TOP + segH * i });
    diamonds.push({ x: PLAY_RIGHT + RAIL_WIDTH / 2, y: PLAY_TOP + segH * i });
  }

  return diamonds;
}

const DIAMOND_POSITIONS = getDiamondPositions();

/**
 * Draw the complete pool table (rails, felt, pockets, diamonds).
 */
export function drawTable(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.translate(CANVAS_PADDING, CANVAS_PADDING);

  // Outer table body (dark wood shadow)
  ctx.fillStyle = TABLE_RAIL_SHADOW;
  roundRect(ctx, -8, -8, TABLE_WIDTH + 16, TABLE_HEIGHT + 16, 18);
  ctx.fill();

  // Premium Rich Mahogany Wood Rail with wood-grain linear gradient for HD look
  const woodGrad = ctx.createLinearGradient(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
  woodGrad.addColorStop(0, "#2c1505");   // Dark walnut base
  woodGrad.addColorStop(0.15, "#4e240b"); // Warm mahogany
  woodGrad.addColorStop(0.3, "#633211");  // Rich reddish wood-grain highlight
  woodGrad.addColorStop(0.5, "#4e240b"); // Warm mahogany
  woodGrad.addColorStop(0.7, "#6b3714");  // Light golden mahogany grain
  woodGrad.addColorStop(0.85, "#321807"); // Dark walnut grain transition
  woodGrad.addColorStop(1, "#1d0e04");    // Deep walnut finish
  
  ctx.fillStyle = woodGrad;
  roundRect(ctx, 0, 0, TABLE_WIDTH, TABLE_HEIGHT, 14);
  ctx.fill();

  // Draw warm wood grain lacquer highlight stroke around outer rim to give it a 3D bevel edge
  ctx.strokeStyle = "rgba(180, 120, 80, 0.45)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Deep charcoal/walnut shadow inner stroke next to felt cushion boundary
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(PLAY_LEFT - 1, PLAY_TOP - 1, (PLAY_RIGHT - PLAY_LEFT) + 2, (PLAY_BOTTOM - PLAY_TOP) + 2);

  // Billiard green felt playing surface with premium centered lamp glow gradient
  const feltGrad = ctx.createRadialGradient(
    TABLE_WIDTH / 2, TABLE_HEIGHT / 2, 80,
    TABLE_WIDTH / 2, TABLE_HEIGHT / 2, TABLE_WIDTH * 0.55
  );
  feltGrad.addColorStop(0, "#2ea44f");   // Bright emerald-green glow in center
  feltGrad.addColorStop(0.35, TABLE_FELT_COLOR); // Vibrant green mid-tone
  feltGrad.addColorStop(0.75, TABLE_FELT_SHADOW); // Dark green towards cushions
  feltGrad.addColorStop(1, "#083518");    // Deep green backing shadows
  ctx.fillStyle = feltGrad;
  ctx.fillRect(PLAY_LEFT, PLAY_TOP, PLAY_RIGHT - PLAY_LEFT, PLAY_BOTTOM - PLAY_TOP);

  // Draw sloped 3D cushions
  drawCushions(ctx);

  // Diamond markers on rails
  for (const d of DIAMOND_POSITIONS) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = DIAMOND_COLOR;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Head string line (solid white line at 1/4 mark matching screenshots)
  const headX = PLAY_LEFT + (PLAY_RIGHT - PLAY_LEFT) * 0.25;
  ctx.beginPath();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 1.2;
  ctx.moveTo(headX, PLAY_TOP + 3);
  ctx.lineTo(headX, PLAY_BOTTOM - 3);
  ctx.stroke();

  // Pockets
  drawPockets(ctx);

  // Ball Return Tube
  drawTube(ctx);

  ctx.restore();
}

/**
 * Draw the 6 sloped 3D cushion segments along the table rails.
 */
function drawCushions(ctx: CanvasRenderingContext2D): void {
  const slopedColor = "#125c2f"; // Forest green cushion face
  const noseColor = "#083218";   // Cushion nose shadow line

  const drawCushionSeg = (
    pts: { x: number; y: number }[],
    noseStart: { x: number; y: number },
    noseEnd: { x: number; y: number }
  ) => {
    // 1. Sloped cushion cloth face
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = slopedColor;
    ctx.fill();

    // 3D Lighting highlight overlay
    const grad = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[2].x, pts[2].y);
    grad.addColorStop(0, "rgba(255,255,255,0.06)");
    grad.addColorStop(1, "rgba(0,0,0,0.18)");
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. Cushion nose edge (facing the playable area)
    ctx.beginPath();
    ctx.moveTo(noseStart.x, noseStart.y);
    ctx.lineTo(noseEnd.x, noseEnd.y);
    ctx.strokeStyle = noseColor;
    ctx.lineWidth = 3.5;
    ctx.stroke();
  };

  // Top-Left Cushion
  drawCushionSeg(
    [{ x: 42, y: 22 }, { x: 68, y: 40 }, { x: 672, y: 40 }, { x: 690, y: 22 }],
    { x: 68, y: 40 },
    { x: 672, y: 40 }
  );

  // Top-Right Cushion
  drawCushionSeg(
    [{ x: 710, y: 22 }, { x: 728, y: 40 }, { x: 1332, y: 40 }, { x: 1358, y: 22 }],
    { x: 728, y: 40 },
    { x: 1332, y: 40 }
  );

  // Bottom-Left Cushion
  drawCushionSeg(
    [{ x: 42, y: 678 }, { x: 68, y: 660 }, { x: 672, y: 660 }, { x: 690, y: 678 }],
    { x: 68, y: 660 },
    { x: 672, y: 660 }
  );

  // Bottom-Right Cushion
  drawCushionSeg(
    [{ x: 710, y: 678 }, { x: 728, y: 660 }, { x: 1332, y: 660 }, { x: 1358, y: 678 }],
    { x: 728, y: 660 },
    { x: 1332, y: 660 }
  );

  // Left Cushion
  drawCushionSeg(
    [{ x: 22, y: 42 }, { x: 40, y: 68 }, { x: 40, y: 632 }, { x: 22, y: 658 }],
    { x: 40, y: 68 },
    { x: 40, y: 632 }
  );

  // Right Cushion
  drawCushionSeg(
    [{ x: 1378, y: 42 }, { x: 1360, y: 68 }, { x: 1360, y: 632 }, { x: 1378, y: 658 }],
    { x: 1360, y: 68 },
    { x: 1360, y: 632 }
  );
}

/**
 * Draw the 6 pocket holes — realistic style matching reference image.
 * Corner pockets: dark hole + curved chrome arc from rail interior.
 * Side pockets: dark hole + two angled flat chrome brackets.
 */
function drawPockets(ctx: CanvasRenderingContext2D): void {
  for (const pocket of POCKETS) {
    const { x, y } = pocket.position;

    ctx.save();

    // ids 1 and 4 are side/center pockets (slightly smaller opening)
    const isSidePocket = pocket.id === 1 || pocket.id === 4;
    // Side pockets use a slightly smaller visual radius to look right
    const r = isSidePocket ? POCKET_VISUAL_RADIUS - 4 : POCKET_VISUAL_RADIUS;

    if (isSidePocket) {
      drawSidePocket(ctx, x, y, r, pocket.id);
    } else {
      drawCornerPocket(ctx, x, y, r, pocket.id);
    }

    ctx.restore();
  }
}

/**
 * Corner pocket — dark circular hole + 3D metallic chrome outer plate cover.
 */
function drawCornerPocket(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  r: number,
  id: number
): void {
  // Determine rotation based on pocket id
  // 0: top-left (0)
  // 2: top-right (PI / 2)
  // 5: bottom-right (PI)
  // 3: bottom-left (PI * 1.5)
  let angle = 0;
  if (id === 2) angle = Math.PI / 2;
  else if (id === 5) angle = Math.PI;
  else if (id === 3) angle = Math.PI * 1.5;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // 1. Draw Plate Drop Shadow (cast on rails and felt)
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 3;

  // Plate path
  const drawPlatePath = (c: CanvasRenderingContext2D) => {
    c.beginPath();
    c.moveTo(-40, 2);
    c.lineTo(-40, -25);
    c.arcTo(-40, -40, -25, -40, 15); // Rounded corner outer rail edge
    c.lineTo(2, -40);
    c.lineTo(2, -18);  // Top rail vertical cut
    c.lineTo(28, 0);   // Slanted cushion edge
    c.arc(0, 0, 28, 0, Math.PI / 2, false); // Arc along the pocket mouth
    c.lineTo(-18, 2);  // Left cushion slanted edge
    c.closePath();
  };

  drawPlatePath(ctx);
  // Fill with a brushed metallic/chrome gradient
  // Center is at 0, 0. Outer edge is around 58.
  const chromeGrad = ctx.createRadialGradient(0, 0, 18, 0, 0, 58);
  chromeGrad.addColorStop(0, "#1e293b");    // Dark throat area
  chromeGrad.addColorStop(0.35, "#334155"); // Slate metal
  chromeGrad.addColorStop(0.65, "#64748b"); // Brushed silver
  chromeGrad.addColorStop(0.8, "#e2e8f0");  // Chrome highlights
  chromeGrad.addColorStop(0.92, "#cbd5e1"); // Silver midtone
  chromeGrad.addColorStop(1, "#475569");    // Darker silver outer bevel
  ctx.fillStyle = chromeGrad;
  ctx.fill();
  ctx.restore(); // restores shadow settings

  // 2. Beveled highlight border (stroke)
  ctx.save();
  drawPlatePath(ctx);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Subtle dark inner stroke for separation from wood rails
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();

  // 3. Draw a dark leather pocket throat/liner inside the metal plate
  ctx.beginPath();
  ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = "#111827"; // Very dark slate grey pocket liner
  ctx.fill();

  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 4. Draw the actual pitch-black pocket hole
  ctx.beginPath();
  ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
  ctx.fillStyle = "#040506";
  ctx.fill();

  // 5. Pocket inner depth shadow (radial gradient for 3D look)
  const depthGrad = ctx.createRadialGradient(-r * 0.28, -r * 0.28, 0, 0, 0, r);
  depthGrad.addColorStop(0, "rgba(75, 85, 99, 0.8)"); // Light gray reflection deep inside
  depthGrad.addColorStop(0.4, "rgba(17, 24, 39, 1)");  // Darker gray
  depthGrad.addColorStop(1, "rgba(0, 0, 0, 1)");        // Absolute black
  ctx.beginPath();
  ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
  ctx.fillStyle = depthGrad;
  ctx.fill();

  // 6. Shiny chrome rim around the pocket hole
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1.0;
  ctx.stroke();

  ctx.restore();
}

/**
 * Side pocket — dark hole + 3D metallic chrome bracket cover.
 */
function drawSidePocket(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  r: number,
  id: number
): void {
  // Determine rotation based on pocket id
  // 1: top-center (0)
  // 4: bottom-center (PI)
  let angle = 0;
  if (id === 4) angle = Math.PI;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // 1. Draw Plate Drop Shadow
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  // Plate path
  const drawPlatePath = (c: CanvasRenderingContext2D) => {
    c.beginPath();
    c.moveTo(-45, -14);
    c.lineTo(-45, -36); // Left edge going up outer rail
    c.lineTo(45, -36);  // Outer rail edge
    c.lineTo(45, -14);  // Right edge going down
    c.lineTo(10, -14);  // Right rail cut
    c.lineTo(28, 4);    // Right cushion nose
    c.arc(0, 0, 28, 0.1419, Math.PI - 0.1419, true); // Top half pocket mouth curve
    c.lineTo(-28, 4);   // Left cushion nose
    c.lineTo(-10, -14); // Left rail cut
    c.closePath();
  };

  drawPlatePath(ctx);
  // Fill with brushed chrome gradient
  const chromeGrad = ctx.createRadialGradient(0, -10, 10, 0, -10, 48);
  chromeGrad.addColorStop(0, "#1e293b");
  chromeGrad.addColorStop(0.35, "#334155");
  chromeGrad.addColorStop(0.65, "#64748b");
  chromeGrad.addColorStop(0.8, "#e2e8f0");
  chromeGrad.addColorStop(0.92, "#cbd5e1");
  chromeGrad.addColorStop(1, "#475569");
  ctx.fillStyle = chromeGrad;
  ctx.fill();
  ctx.restore();

  // 2. Beveled highlight border (stroke)
  ctx.save();
  drawPlatePath(ctx);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Subtle dark inner stroke
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();

  // 3. Draw leather lining throat/liner inside the side pocket
  ctx.beginPath();
  ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = "#111827"; // Very dark slate grey liner
  ctx.fill();

  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 4. Pitch-black hole
  ctx.beginPath();
  ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
  ctx.fillStyle = "#040506";
  ctx.fill();

  // 5. Inner concave depth gradient
  const depthGrad = ctx.createRadialGradient(-r * 0.28, -r * 0.28, 0, 0, 0, r);
  depthGrad.addColorStop(0, "rgba(75, 85, 99, 0.8)");
  depthGrad.addColorStop(0.4, "rgba(17, 24, 39, 1)");
  depthGrad.addColorStop(1, "rgba(0, 0, 0, 1)");
  ctx.beginPath();
  ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
  ctx.fillStyle = depthGrad;
  ctx.fill();

  // 6. Shiny chrome rim around the pocket hole
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1.0;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw all active (non-pocketed) balls with premium 3D appearance.
 */
export function drawBalls(ctx: CanvasRenderingContext2D, balls: IBall[], boardScale: number = 1.0): void {
  ctx.save();
  ctx.translate(CANVAS_PADDING, CANVAS_PADDING);

  let cueBall: IBall | null = null;

  for (const ball of balls) {
    if (ball.isPocketed) continue;
    if (ball.id === 0) {
      cueBall = ball;
      continue;
    }
    drawSingleBall(ctx, ball, boardScale);
  }

  if (cueBall) {
    drawSingleBall(ctx, cueBall, boardScale);
  }

  ctx.restore();
}

/**
 * Predefined 3D spherical gradient stops for each ball color/ID.
 * Provides specular highlights, body tone, and ambient rim shadow.
 */
function getBallShaderColors(id: number, baseColor: string): { light: string; mid: string; dark: string } {
  // All stripe balls (9-15) and cue ball (0) have a white base sphere body
  if (id === 0 || id >= 9) {
    return { light: "#ffffff", mid: "#eceef1", dark: "#c5cbd3" }; // Pearl white base
  }
  
  switch (id) {
    case 1: return { light: "#fffa9e", mid: "#f5d442", dark: "#9c7c00" }; // Yellow
    case 2: return { light: "#60a5fa", mid: "#1a3fc7", dark: "#0b1d6e" }; // Blue
    case 3: return { light: "#f87171", mid: "#d4312a", dark: "#6f0906" }; // Red
    case 4: return { light: "#c084fc", mid: "#4a1a6b", dark: "#200336" }; // Purple
    case 5: return { light: "#fb923c", mid: "#e8751a", dark: "#7c3500" }; // Orange
    case 6: return { light: "#4ade80", mid: "#1a7a3a", dark: "#063d17" }; // Green
    case 7: return { light: "#e879f9", mid: "#8b1a2a", dark: "#3d020a" }; // Burgundy
    case 8: return { light: "#52525b", mid: "#111111", dark: "#020202" }; // Black (8-ball)
    default: return { light: "#ffffff", mid: baseColor, dark: "#000000" };
  }
}

/**
 * Draw a single ball with shadow, color, stripe, number, and gloss.
 */
function drawSingleBall(ctx: CanvasRenderingContext2D, ball: IBall, boardScale: number = 1.0): void {
  const { x, y } = ball.position;
  const isSinking = ball.isSinking;
  const progress = ball.sinkProgress || 0;
  
  // When board scale decreases (< 0.88 on mobile/smaller screens), dynamically boost the visual draw radius
  // so that balls don't shrink too much and retain high visual presence and quality.
  // Skip this boost for tube balls so they fit cleanly inside the visual return tube width and capacity.
  const visualScaleBoost = (boardScale < 0.88 && !ball.isTubeBall)
    ? Math.min(1.20, Math.pow(0.88 / boardScale, 0.38))
    : 1.0;
  const baseRadius = isSinking ? ball.radius * (1 - progress) : ball.radius;
  const r = baseRadius * visualScaleBoost;

  if (isSinking) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress);
  }

  // 1. Realistic soft ambient drop shadow on felt (radial falloff with direction)
  const shadowGrad = ctx.createRadialGradient(
    x + 1.5, y + 3, 0,
    x + 3.5, y + 6, r * 1.3
  );
  shadowGrad.addColorStop(0, "rgba(0,0,0,0.45)");
  shadowGrad.addColorStop(0.35, "rgba(0,0,0,0.20)");
  shadowGrad.addColorStop(1, "rgba(0,0,0,0)");
  
  ctx.beginPath();
  ctx.arc(x + 3.5, y + 6, r * 1.3, 0, Math.PI * 2);
  ctx.fillStyle = shadowGrad;
  ctx.fill();

  // 2. Main ball body - 3D Spherical Radial Gradient
  const shader = getBallShaderColors(ball.id, ball.color);
  const ballGrad = ctx.createRadialGradient(
    x - r * 0.25, y - r * 0.25, r * 0.05,
    x, y, r
  );
  ballGrad.addColorStop(0, shader.light);
  ballGrad.addColorStop(0.7, shader.mid);
  ballGrad.addColorStop(1, shader.dark);

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = ballGrad;
  ctx.fill();

  // Save context, translate to ball center, and project offset based on the 3D unit vector
  ctx.save();
  ctx.translate(x, y);

  const s = ball.stickerDir || { x: 0, y: 0, z: 1 };
  const offsetX = s.x * r * 0.3;
  const offsetY = s.y * r * 0.3;

  if (ball.id === 0) {
    // Cue Ball: Draw a single premium red dot on one side (projected dynamically)
    const dotRadius = r * 0.18;
    ctx.beginPath();
    ctx.arc(offsetX, offsetY, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#e11d48"; // Premium red dot
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    // 1. Draw the stripe band (centered at 0, 0 and rotated for spin)
    ctx.save();
    ctx.rotate(ball.angle);
    if (ball.type === BallType.STRIPE) {
      drawStripe(ctx, 0, 0, r, ball.color);
    }
    ctx.restore();

    // 2. Draw the number label sticker (shifted by 3D rolling offset, rotated for spin)
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.rotate(ball.angle);
    drawBallNumber(ctx, ball, 0, 0, r);
    ctx.restore();
  }

  // Restore context to undo translation/rotation before highlight/gloss mapping
  ctx.restore();

  // 2.5 Spherical Shading Overlay (to give true 3D depth to flat stripes and number stickers)
  // This darkens the edges of the ball heavily to create a spherical illusion over all layers
  const shadingGrad = ctx.createRadialGradient(
    x - r * 0.25, y - r * 0.25, r * 0.15,
    x, y, r * 0.98
  );
  shadingGrad.addColorStop(0, "rgba(255, 255, 255, 0.15)");
  shadingGrad.addColorStop(0.5, "rgba(0, 0, 0, 0.0)");
  shadingGrad.addColorStop(0.85, "rgba(0, 0, 0, 0.30)");
  shadingGrad.addColorStop(1, "rgba(0, 0, 0, 0.60)");

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = shadingGrad;
  ctx.fill();

  // 3. Specular Gloss Highlights (Double layered for phenolic glass shine)
  // Layer 3A: Soft wide diffuse light reflection
  const glossGrad = ctx.createRadialGradient(
    x - r * 0.35, y - r * 0.35, r * 0.05,
    x, y, r
  );
  glossGrad.addColorStop(0, "rgba(255,255,255,0.5)");
  glossGrad.addColorStop(0.35, "rgba(255,255,255,0.06)");
  glossGrad.addColorStop(1, "rgba(0,0,0,0.18)");
  
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = glossGrad;
  ctx.fill();

  // Layer 3B: High-contrast sharp specular light bulb reflection dot
  ctx.beginPath();
  ctx.arc(x - r * 0.38, y - r * 0.38, r * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fill();

  // Subtle dark outer stroke rim for crisp edge contrast
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // 4. Progressive darkening overlay as it sinks into the pocket
  if (isSinking) {
    ctx.beginPath();
    ctx.arc(x, y, r + 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 0, 0, ${progress * 0.9})`;
    ctx.fill();
  }

  if (isSinking) {
    ctx.restore();
  }
}

/**
 * Draw colored stripe band across the middle of a stripe ball.
 */
function drawStripe(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  color: string
): void {
  ctx.save();
  // Clip to ball circle
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  // Colored horizontal band
  const bandHeight = r * 0.9;
  ctx.fillStyle = color;
  ctx.fillRect(x - r, y - bandHeight / 2, r * 2, bandHeight);

  ctx.restore();
}

/**
 * Draw the number label on a ball.
 */
function drawBallNumber(
  ctx: CanvasRenderingContext2D,
  ball: IBall,
  x: number, y: number, r: number
): void {
  const visual = BALL_VISUALS[ball.id];
  if (!visual || !visual.label) return;

  // White circle background for number with subtle 3D border
  const circleR = r * 0.47;
  ctx.beginPath();
  ctx.arc(x, y, circleR, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  
  // Add a very subtle inner shadow / border for the number circle to make it look inset
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = Math.max(0.6, r * 0.03);
  ctx.stroke();

  // Number text
  ctx.fillStyle = "#111111";
  ctx.font = `900 ${(r * 0.72).toFixed(2)}px "Outfit", "Inter", "Roboto", system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(visual.label, x, y + 0.5);
}

/**
 * Draw a rounded rectangle (utility).
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

/**
 * Draw the animated ball return tube on the right side of the table rail.
 */
function drawTube(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  // Create the tube path:
  // Segment 1: Horizontal entry from (1400, 40) to (1435, 40)
  // Segment 2: Top-right curve centered at (1435, 65) with radius 25
  // Segment 3: Vertical straight down from x = 1460, y = 65 to y = 680
  
  const createPath = (c: CanvasRenderingContext2D) => {
    c.beginPath();
    c.moveTo(1400, 40);
    c.lineTo(1435, 40);
    c.arc(1435, 65, 25, -Math.PI / 2, 0, false);
    c.lineTo(1460, 680);
  };

  const drawBottomCap = (c: CanvasRenderingContext2D, radius: number, color: string) => {
    c.beginPath();
    c.arc(1460, 680, radius, 0, Math.PI, false);
    c.fillStyle = color;
    c.fill();
  };

  const bgColor = "#080c14"; // Deep dark charcoal black for tube interior

  // 1. Draw outer orange wall (width 64)
  createPath(ctx);
  ctx.strokeStyle = "#e58b13";
  ctx.lineWidth = 64;
  ctx.lineCap = "butt";
  ctx.stroke();
  drawBottomCap(ctx, 32, "#e58b13");

  // 2. Clear center of orange wall to create rails (width 58, leaves 3px orange rail)
  createPath(ctx);
  ctx.strokeStyle = bgColor;
  ctx.lineWidth = 58;
  ctx.lineCap = "butt";
  ctx.stroke();
  drawBottomCap(ctx, 29, bgColor);

  // 3. Draw inner brown rails (width 52, leaves 3px gap)
  createPath(ctx);
  ctx.strokeStyle = "#4a2a06";
  ctx.lineWidth = 52;
  ctx.lineCap = "butt";
  ctx.stroke();
  drawBottomCap(ctx, 26, "#4a2a06");

  // 4. Clear center of brown rails to create inner channel (width 46, leaves 3px brown rail)
  createPath(ctx);
  ctx.strokeStyle = bgColor;
  ctx.lineWidth = 46;
  ctx.lineCap = "butt";
  ctx.stroke();
  drawBottomCap(ctx, 23, bgColor);

  // 5. Draw ladder rungs connecting the rails on the left and right sides
  ctx.strokeStyle = "#4a2a06";
  ctx.lineWidth = 2.5;
  for (let ry = 657.5; ry >= 70; ry -= 45) {
    // Left side rungs
    ctx.beginPath();
    ctx.moveTo(1460 - 32, ry);
    ctx.lineTo(1460 - 23, ry);
    ctx.stroke();

    // Right side rungs
    ctx.beginPath();
    ctx.moveTo(1460 + 23, ry);
    ctx.lineTo(1460 + 32, ry);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw all balls currently rolling or stacked in the ball tube.
 */
export function drawTubeBalls(
  ctx: CanvasRenderingContext2D,
  balls: IBall[],
  boardScale: number = 1.0
): void {
  ctx.save();
  ctx.translate(CANVAS_PADDING, CANVAS_PADDING);

  for (const ball of balls) {
    if (ball.isTubeBall) {
      drawSingleBall(ctx, ball, boardScale);
    }
  }

  ctx.restore();
}
