// ============================================================
// Rack — Initial triangle ball placement generator
// ============================================================

import { BallType, IBall } from "@/lib/types";
import { BALL_DIAMETER, BALL_RADIUS, BALL_VISUALS } from "@/lib/constants/balls";
import { FOOT_SPOT, HEAD_SPOT } from "@/lib/constants/table";

// ---- Standard 8-ball rack order ----
// Row-by-row ball IDs for standard triangle rack
// 8-ball MUST be in the center (row 2, position 1)
// Mix of solids and stripes for visual balance
const RACK_ORDER = [
  [1],                    // Row 0: apex (1 ball)
  [9, 2],                 // Row 1: (2 balls)
  [3, 8, 10],             // Row 2: 8-ball in center (3 balls)
  [11, 4, 5, 12],         // Row 3: (4 balls)
  [13, 6, 14, 7, 15],     // Row 4: base (5 balls)
];

/**
 * Create a single IBall from a ball ID and position.
 */
function makeBall(id: number, x: number, y: number): IBall {
  const visual = BALL_VISUALS[id];
  const tiltAngle = Math.random() * 0.5;
  const spinAngle = Math.random() * Math.PI * 2;
  return {
    id,
    type: visual.type,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    radius: BALL_RADIUS,
    color: visual.color,
    stripeColor: visual.type === BallType.STRIPE ? "#ffffff" : undefined,
    isPocketed: false,
    isMoving: false,
    angle: Math.random() * Math.PI * 2,
    stickerDir: {
      x: Math.sin(tiltAngle) * Math.cos(spinAngle),
      y: Math.sin(tiltAngle) * Math.sin(spinAngle),
      z: Math.cos(tiltAngle),
    },
  };
}

/**
 * Generate all 16 balls in their initial positions.
 *
 * Layout:
 * - Cue ball at HEAD_SPOT (1/4 from left)
 * - 15 object balls in triangle at FOOT_SPOT (3/4 from left)
 *   Triangle apex faces the cue ball, expands to the right.
 *
 * Geometry:
 * - Rows are offset by cos(30°) × ball_diameter horizontally
 * - Each row is vertically centered, balls spaced by diameter
 */
export function createInitialBalls(): IBall[] {
  const balls: IBall[] = [];

  // Cue ball at head spot
  balls.push(makeBall(0, HEAD_SPOT.x, HEAD_SPOT.y));

  // Triangle rack
  const spacing = BALL_DIAMETER + 0.5; // Tiny gap to avoid overlap glitch on break
  const rowOffsetX = spacing * Math.cos(Math.PI / 6); // ~28.6px horizontal gap

  for (let row = 0; row < RACK_ORDER.length; row++) {
    const ballIds = RACK_ORDER[row];
    const rowX = FOOT_SPOT.x + row * rowOffsetX;

    // Center the row vertically around FOOT_SPOT.y
    const totalRowHeight = (ballIds.length - 1) * spacing;
    const startY = FOOT_SPOT.y - totalRowHeight / 2;

    for (let col = 0; col < ballIds.length; col++) {
      const ballId = ballIds[col];
      const ballY = startY + col * spacing;
      balls.push(makeBall(ballId, rowX, ballY));
    }
  }

  return balls;
}

/**
 * Shuffle the rack order (randomize ball positions in triangle).
 * Keeps 8-ball in center (row 2, pos 1) as per official rules.
 * Returns a new shuffled RACK_ORDER.
 */
export function createShuffledRack(): number[][] {
  // Collect all ball IDs except 8
  const allIds = RACK_ORDER.flat().filter((id) => id !== 8);

  // Fisher-Yates shuffle
  for (let i = allIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
  }

  // Rebuild rack with 8-ball fixed in center
  let idx = 0;
  const shuffled: number[][] = [];

  for (let row = 0; row < RACK_ORDER.length; row++) {
    const rowBalls: number[] = [];
    for (let col = 0; col < RACK_ORDER[row].length; col++) {
      if (row === 2 && col === 1) {
        rowBalls.push(8); // 8-ball always center
      } else {
        rowBalls.push(allIds[idx++]);
      }
    }
    shuffled.push(rowBalls);
  }

  return shuffled;
}
