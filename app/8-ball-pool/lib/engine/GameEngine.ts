// ============================================================
// GameEngine — Main game loop and state orchestrator
// Manages rAF loop, physics, rendering, and state transitions
// ============================================================

import {
  IBall,
  ICueStick,
  ICollisionEvent,
  IGameUIState,
  IShot,
  GamePhase,
  Player,
  Difficulty,
  BallType,
  FoulReason,
  GameResult,
  SoundKey,
  GameMode,
  ITutorialStep,
} from "@/lib/types";
import { CANVAS_TOTAL_WIDTH, CANVAS_TOTAL_HEIGHT, PLAY_LEFT, PLAY_RIGHT, PLAY_TOP, PLAY_BOTTOM, CANVAS_PADDING } from "@/lib/constants/table";
import { BALL_RADIUS } from "@/lib/constants/balls";
import { PHYSICS_TIMESTEP } from "@/lib/constants/physics";
import { createInitialBalls } from "@/lib/game/Rack";
import { getTutorialStepBalls } from "@/lib/game/TutorialManager";
import { validateTutorialStep } from "@/lib/game/TutorialValidator";
import {
  createCueStick,
  aimAt,
  startCharge,
  updateCharge,
  releaseShot,
  shotToVelocity,
  setCueVisible,
  CUE_OFFSET_MAX,
} from "@/lib/game/CueStick";
import { applyShot } from "@/lib/game/Ball";
import { getCueBall, isValidPlacement, findNearestValidPlacement } from "@/lib/game/CueBall";
import { physicsStep } from "@/lib/game/Table";
import { allBallsStopped } from "@/lib/physics/friction";
import { drawTable, drawBalls, drawTubeBalls } from "./Renderer";
import { drawCueStick, drawAimLine, drawBallInHand, clearCanvas } from "./CueRenderer";
import { InputHandler } from "./InputHandler";
import {
  evaluateFouls,
  assignCategoryOnOpenTable,
  shouldSwitchTurn,
  evaluateEightBallWin,
} from "@/lib/game/GameState";
import { BotController, calculateBotPlacement } from "@/lib/game/BotAI";
import { soundManager } from "@/lib/game/SoundManager";

/** Callback to sync game state with React UI */
export type OnUIStateChange = (state: IGameUIState) => void;
/** Callback for collision events (sound effects) */
export type OnCollisionEvents = (events: ICollisionEvent[]) => void;

/**
 * GameEngine — The heart of the game.
 * Orchestrates the game loop, physics, rendering, and input.
 */
export class GameEngine {
  // Canvas
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayCtx: CanvasRenderingContext2D | null = null;
  private scale: number = 1;
  private dpr: number = 2;
  private tableCacheCanvas: HTMLCanvasElement | null = null;
  private isTableCacheValid: boolean = false;

  // Game state
  private balls: IBall[] = [];
  private cueStick: ICueStick;
  private phase: GamePhase = GamePhase.MENU;
  private currentPlayer: Player = Player.HUMAN;
  private difficulty: Difficulty = Difficulty.MEDIUM;
  private playerBallType: BallType | null = null;
  private botBallType: BallType | null = null;
  private playerPocketed: number[] = [];
  private botPocketed: number[] = [];
  private allPocketed: number[] = [];
  private foulReason: FoulReason | null = null;
  private gameMode: GameMode = GameMode.SINGLE_PLAYER;
  private player1Name: string = "Player 1";
  private player2Name: string = "Player 2";
  private gameResult: GameResult | null = null;
  private isSoundMuted: boolean = false;

  // Shot tracking (for foul detection)
  private firstHitBallId: number | null = null;
  private shotPocketedBalls: number[] = [];
  private cuePocketed: boolean = false;
  private isBreakShot: boolean = true;
  private cushionHitAfterContact: boolean = false;

  // Cue ball spin (English) offsets
  private spinX: number = 0;
  private spinY: number = 0;
  private isTutorialTaskComplete: boolean = false;
  private currentTutorialStep: ITutorialStep | null = null;
  private hasUsedSpinThisStep: boolean = false;
  private cuePlacedWithBallInHandThisStep: boolean = false;
  private tutorialFeedbackMessage: string | null = null;
  private isTutorialError: boolean = false;

  // Input and AI controllers
  private input: InputHandler;
  private botController = new BotController();

  // Loop
  private animFrameId: number = 0;
  private isRunning: boolean = false;
  private lastFrameTime: number = 0;
  private accumulator: number = 0;

  // Callbacks
  private onUIStateChange: OnUIStateChange | null = null;
  private onCollisionEvents: OnCollisionEvents | null = null;

  // Ball-in-hand
  private ballInHandPos = { x: 0, y: 0 };
  private ballInHandValid = false;
  private resizeObserver: ResizeObserver | null = null;
  private botPlacementTimer: NodeJS.Timeout | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D canvas context");
    this.ctx = ctx;

    this.cueStick = createCueStick();
    this.input = new InputHandler(canvas);

    this.resizeCanvas();

    if (typeof ResizeObserver !== "undefined" && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.resizeCanvas();
      });
      this.resizeObserver.observe(this.canvas.parentElement);
    }
  }

  // ---- Public API ----

  /** Set callback for UI state changes */
  setOnUIStateChange(cb: OnUIStateChange): void {
    this.onUIStateChange = cb;
  }

  /** Set callback for collision events */
  setOnCollisionEvents(cb: OnCollisionEvents): void {
    this.onCollisionEvents = cb;
  }

  /** Set overlay canvas for drawing active cue stick & guide lines above UI */
  setOverlayCanvas(canvas: HTMLCanvasElement): void {
    this.overlayCanvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D overlay context");
    this.overlayCtx = ctx;
    this.resizeCanvas();
  }

  /** Start a new game with given difficulty and mode */
  startGame(difficulty: Difficulty, mode: GameMode = GameMode.SINGLE_PLAYER, p1Name: string = "Player 1", p2Name: string = "Player 2"): void {
    if (this.botPlacementTimer) {
      clearTimeout(this.botPlacementTimer);
      this.botPlacementTimer = null;
    }
    this.difficulty = difficulty;
    this.gameMode = mode;
    this.player1Name = p1Name;
    this.player2Name = p2Name;
    this.balls = createInitialBalls();
    this.cueStick = createCueStick();
    this.phase = GamePhase.PLAYER_TURN;
    this.currentPlayer = Player.HUMAN;
    this.playerBallType = null;
    this.botBallType = null;
    this.playerPocketed = [];
    this.botPocketed = [];
    this.allPocketed = [];
    this.foulReason = null;
    this.gameResult = null;
    this.firstHitBallId = null;
    this.shotPocketedBalls = [];
    this.cuePocketed = false;
    this.isBreakShot = true;
    this.cushionHitAfterContact = false;

    setCueVisible(this.cueStick, true);
    soundManager.stopBgMusic();
    this.resizeCanvas();
    this.emitUIState();

    if (!this.isRunning) {
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.accumulator = 0;
      this.loop();
    }
  }

  /** Start a specific tutorial step with preset ball layout */
  startTutorialStep(step: ITutorialStep): void {
    if (this.botPlacementTimer) {
      clearTimeout(this.botPlacementTimer);
      this.botPlacementTimer = null;
    }
    this.gameMode = GameMode.TUTORIAL;
    this.currentTutorialStep = step;
    this.hasUsedSpinThisStep = false;
    this.cuePlacedWithBallInHandThisStep = false;
    this.tutorialFeedbackMessage = null;
    this.isTutorialError = false;
    this.balls = getTutorialStepBalls(step.setupType);
    this.cueStick = createCueStick();
    this.currentPlayer = Player.HUMAN;
    this.playerBallType = BallType.SOLID;
    this.botBallType = BallType.STRIPE;
    this.playerPocketed = [];
    this.botPocketed = [];
    this.allPocketed = [];
    this.foulReason = null;
    this.gameResult = null;
    this.firstHitBallId = null;
    this.shotPocketedBalls = [];
    this.cuePocketed = false;
    this.isBreakShot = false;
    this.cushionHitAfterContact = false;
    this.isTutorialTaskComplete = step.requireTask === false;

    if (step.allowBallInHandPlacement) {
      this.phase = GamePhase.BALL_IN_HAND;
      const cueBall = getCueBall(this.balls);
      if (cueBall) {
        this.ballInHandPos = { x: cueBall.position.x, y: cueBall.position.y };
        this.ballInHandValid = true;
      }
    } else {
      this.phase = GamePhase.PLAYER_TURN;
    }

    // Aim cue stick directly at the target object ball for instant easy aiming
    const cueBall = getCueBall(this.balls);
    const targetBall = this.balls.find((b) => b.id !== 0 && !b.isPocketed);
    if (cueBall && targetBall) {
      aimAt(this.cueStick, cueBall.position, targetBall.position);
    }

    setCueVisible(this.cueStick, step.allowShooting);
    soundManager.stopBgMusic();
    this.resizeCanvas();
    this.emitUIState();

    if (!this.isRunning) {
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.accumulator = 0;
      this.loop();
    }
  }

  /** Stop the game loop */
  stop(): void {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
    if (this.botPlacementTimer) {
      clearTimeout(this.botPlacementTimer);
      this.botPlacementTimer = null;
    }
  }

  /** Return to main menu */
  returnToMenu(): void {
    this.stop();
    soundManager.startBgMusic();
    this.phase = GamePhase.MENU;
    this.gameResult = null;
    this.foulReason = null;
    this.emitUIState();
  }

  private isRotated: boolean = false;

  /** Set rotated mode for portrait screen layouts */
  setIsRotated(rotated: boolean): void {
    this.isRotated = rotated;
    this.input.setRotated(rotated);
    this.resizeCanvas();
  }

  resizeCanvas(): void {
    let parent = this.canvas.parentElement;
    if (!parent) return;

    if (parent.id === "game-area-wrapper") {
      parent = parent.parentElement || parent;
    }

    // Get padding-free content box dimensions
    const computedStyle = window.getComputedStyle(parent);
    const paddingLeft = parseFloat(computedStyle.paddingLeft || "0");
    const paddingRight = parseFloat(computedStyle.paddingRight || "0");
    const paddingTop = parseFloat(computedStyle.paddingTop || "0");
    const paddingBottom = parseFloat(computedStyle.paddingBottom || "0");

    const maxW = Math.max(0, parent.clientWidth - paddingLeft - paddingRight);
    const maxH = Math.max(0, parent.clientHeight - paddingTop - paddingBottom);

    // Maximize board size based on total canvas bounds
    if (this.isRotated) {
      this.scale = Math.min(
        0.95,
        maxW / CANVAS_TOTAL_HEIGHT,
        maxH / CANVAS_TOTAL_WIDTH
      );
    } else {
      this.scale = Math.min(
        0.95,
        maxW / CANVAS_TOTAL_WIDTH,
        maxH / CANVAS_TOTAL_HEIGHT
      );
    }

    const baseDpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    // Cap effective devicePixelRatio between 1.5 and 2.5 so balls and numbers are crystal clear
    // without taxing mobile GPUs with excessive pixel counts (preventing fill-rate bottleneck).
    this.dpr = Math.min(Math.max(baseDpr, 1.5), 2.5);
    this.canvas.width = CANVAS_TOTAL_WIDTH * this.scale * this.dpr;
    this.canvas.height = CANVAS_TOTAL_HEIGHT * this.scale * this.dpr;
    this.canvas.style.width = `${CANVAS_TOTAL_WIDTH * this.scale}px`;
    this.canvas.style.height = `${CANVAS_TOTAL_HEIGHT * this.scale}px`;

    // Ensure high quality vector scaling is enabled on context resize
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";

    if (this.overlayCanvas) {
      this.overlayCanvas.width = CANVAS_TOTAL_WIDTH * this.scale * this.dpr;
      this.overlayCanvas.height = CANVAS_TOTAL_HEIGHT * this.scale * this.dpr;
      this.overlayCanvas.style.width = `${CANVAS_TOTAL_WIDTH * this.scale}px`;
      this.overlayCanvas.style.height = `${CANVAS_TOTAL_HEIGHT * this.scale}px`;
      if (this.overlayCtx) {
        this.overlayCtx.imageSmoothingEnabled = true;
        this.overlayCtx.imageSmoothingQuality = "high";
      }
    }

    this.isTableCacheValid = false;
    this.input.setScale(this.scale);
    this.emitUIState();
  }

  /** Toggle sound mute */
  toggleSound(): void {
    this.isSoundMuted = !this.isSoundMuted;
    soundManager.setMuted(this.isSoundMuted);
    this.emitUIState();
  }

  /** Set mute state directly (used by SDK audio sync) */
  setSoundMuted(muted: boolean): void {
    this.isSoundMuted = muted;
    soundManager.setMuted(muted);
    this.emitUIState();
  }

  /** Get current sound muted state */
  getIsMuted(): boolean {
    return this.isSoundMuted;
  }

  /** Set active spin for the next shot */
  setSpin(spinX: number, spinY: number): void {
    this.spinX = spinX;
    this.spinY = spinY;
    if (this.gameMode === GameMode.TUTORIAL) {
      if (spinX !== 0 || spinY !== 0) {
        this.hasUsedSpinThisStep = true;
      }
      this.emitUIState();
    }
  }

  /** Start charging the cue stick power (called by UI power meter) */
  startPowerCharge(): void {
    const isHumanTurn =
      (this.currentPlayer === Player.HUMAN && this.phase === GamePhase.PLAYER_TURN) ||
      (this.currentPlayer === Player.PLAYER2 && this.phase === GamePhase.PLAYER2_TURN);
    if (!isHumanTurn) return;

    startCharge(this.cueStick);
  }

  /** Update cue stick charge power (value 0 to 1) */
  updatePowerCharge(power: number): void {
    if (!this.cueStick.isCharging) return;
    this.cueStick.power = Math.min(1, Math.max(0, power));
    this.cueStick.pullBack = this.cueStick.power * CUE_OFFSET_MAX;
  }

  /** Release shot power (fire cue stick) */
  firePowerShot(): void {
    if (!this.cueStick.isCharging) return;
    const shot = releaseShot(this.cueStick);
    if (shot) {
      this.executeShot(shot);
    }
  }

  /** Resume the game loop after a pause */
  resume(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.accumulator = 0;
      this.loop();
    }
  }

  /** Cleanup on unmount */
  destroy(): void {
    this.stop();
    this.input.destroy();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  // ---- Game Loop ----

  private loop = (currentTime?: number): void => {
    if (!this.isRunning) return;

    const now = typeof currentTime === "number" ? currentTime : performance.now();
    let frameTime = this.lastFrameTime > 0 ? now - this.lastFrameTime : PHYSICS_TIMESTEP;
    this.lastFrameTime = now;

    // Prevent spiral of death on background tabs or severe stutter (cap frame time to 250ms max)
    if (frameTime > 250) {
      frameTime = 250;
    }
    if (frameTime < 0 || isNaN(frameTime)) {
      frameTime = 0;
    }

    if (this.phase === GamePhase.BALLS_MOVING) {
      this.accumulator += frameTime;
      // Fixed timestep substepping (PHYSICS_TIMESTEP = ~16.67ms) ensures physical consistency
      // across all display refresh rates (30Hz, 60Hz, 90Hz, 120Hz).
      while (this.accumulator >= PHYSICS_TIMESTEP) {
        this.updateBallsMoving();
        this.accumulator -= PHYSICS_TIMESTEP;
        if (this.phase !== GamePhase.BALLS_MOVING) {
          break;
        }
      }
    } else {
      // For menu, player turn, ball in hand, and bot turn, run once per animation frame
      // so aiming and drag controls remain instantaneous at native screen refresh rate.
      this.update();
      this.accumulator = 0;
    }

    // Transition newly pocketed object balls to the return tube
    for (const ball of this.balls) {
      if (ball.id !== 0 && ball.isPocketed && !ball.isTubeBall && ball.position.x === -100) {
        ball.isTubeBall = true;
        ball.tubeS = 0;
        ball.tubeSpeed = 4;
        const startPos = this.getTubePathPoint(0);
        ball.position = { x: startPos.x, y: startPos.y };
      }
    }

    // Update positions and rolling animations of all balls inside the tube
    this.updateTubeBalls();

    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  // ---- Update (per frame) ----

  private update(): void {
    switch (this.phase) {
      case GamePhase.PLAYER_TURN:
      case GamePhase.PLAYER2_TURN:
        this.updatePlayerTurn();
        break;

      case GamePhase.BALLS_MOVING:
        this.updateBallsMoving();
        break;

      case GamePhase.BALL_IN_HAND:
        this.updateBallInHand();
        break;

      case GamePhase.BOT_TURN:
        this.botController.update(this, this.cueStick);
        break;

      default:
        break;
    }
  }

  private updatePlayerTurn(): void {
    const cueBall = getCueBall(this.balls);
    const { pointerPos, isPointerDown, dragStartPos } = this.input.state;

    if (isPointerDown && dragStartPos) {
      // Charging shot
      if (!this.cueStick.isCharging) {
        startCharge(this.cueStick);
      }
      updateCharge(this.cueStick, cueBall.position, dragStartPos, pointerPos);
    } else if (!this.cueStick.isCharging) {
      // Only update aim direction when not charging
      aimAt(this.cueStick, cueBall.position, pointerPos);
    }

    // Check for shot release
    if (this.input.consumeRelease()) {
      const shot = releaseShot(this.cueStick);
      if (shot) {
        this.executeShot(shot);
      }
    }
  }

  private updateBallsMoving(): void {
    // Run physics
    const events = physicsStep(this.balls);

    // Track collision events
    if (events.length > 0) {
      this.onCollisionEvents?.(events);
      soundManager.handleCollisionEvents(events);

      // Track pocketed balls this shot
      for (const event of events) {
        if (event.type === "pocket") {
          if (event.ballId === 0) {
            this.cuePocketed = true;
          } else {
            this.shotPocketedBalls.push(event.ballId);
          }
        }
        // Track first ball hit by cue ball
        if (event.type === "ball") {
          const isCueInvolved = event.ballId === 0 || event.targetBallId === 0;
          if (isCueInvolved) {
            const cueBall = getCueBall(this.balls);
            if (cueBall) {
              cueBall.hasHitBall = true;
            }
          }
          if (this.firstHitBallId === null) {
            if (event.ballId === 0 && event.targetBallId !== undefined) {
              this.firstHitBallId = event.targetBallId;
            } else if (event.targetBallId === 0) {
              this.firstHitBallId = event.ballId;
            }
          }
        }
        // Track cushion hit after contact
        if (event.type === "cushion") {
          if (this.firstHitBallId !== null) {
            this.cushionHitAfterContact = true;
          }
        }
      }
    }

    // Calculate maximum speed of rolling balls for dynamic rolling sound (ludkana)
    let maxSpeed = 0;
    for (const ball of this.balls) {
      if (!ball.isPocketed && ball.velocity) {
        const speed = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);
        if (speed > maxSpeed) {
          maxSpeed = speed;
        }
      }
    }
    soundManager.updateRollingSound(maxSpeed);

    // Check if all balls stopped
    if (allBallsStopped(this.balls)) {
      soundManager.updateRollingSound(0); // Ensure rolling sound stops when balls are completely stopped
      this.evaluateShot();
    }
  }

  private updateBallInHand(): void {
    // In SINGLE_PLAYER mode, the bot handles its own placement.
    if (this.currentPlayer === Player.BOT && this.gameMode === GameMode.SINGLE_PLAYER) {
      return;
    }
    const { pointerPos } = this.input.state;

    // Clamp the pointer coordinates inside the playable table cushions with ball margin
    const clampedPos = {
      x: Math.max(PLAY_LEFT + BALL_RADIUS, Math.min(PLAY_RIGHT - BALL_RADIUS, pointerPos.x)),
      y: Math.max(PLAY_TOP + BALL_RADIUS, Math.min(PLAY_BOTTOM - BALL_RADIUS, pointerPos.y)),
    };

    this.ballInHandPos = clampedPos;

    // Validate placement
    this.ballInHandValid = isValidPlacement(clampedPos, this.balls, false);

    // Update cue ball position dynamically during dragging so it follows the hand
    const cueBall = getCueBall(this.balls);
    if (cueBall) {
      cueBall.position = { x: clampedPos.x, y: clampedPos.y };
      cueBall.isPocketed = false;
      cueBall.velocity = { x: 0, y: 0 };
      cueBall.isMoving = false;
    }

    // Place on click
    if (this.input.consumeClick() && this.ballInHandValid) {
      if (this.gameMode === GameMode.TUTORIAL) {
        this.cuePlacedWithBallInHandThisStep = true;
      }
      // Clear foul reason since placement resolves the foul state
      this.foulReason = null;

      // Transition to appropriate player's turn
      
      // If it's a foul but it was bot's turn (in single player), BotAI handles it. But for local multiplayer, it's BALL_IN_HAND.
      if (this.gameMode === GameMode.TUTORIAL || (this.currentPlayer !== Player.BOT && this.gameMode === GameMode.SINGLE_PLAYER)) {
        this.phase = GamePhase.PLAYER_TURN;
      } else if (this.gameMode === GameMode.TWO_PLAYER) {
        this.phase = this.currentPlayer === Player.HUMAN ? GamePhase.PLAYER_TURN : GamePhase.PLAYER2_TURN;
      } else {
        this.phase = GamePhase.BOT_TURN;
      }

      setCueVisible(this.cueStick, this.currentPlayer === Player.HUMAN || this.currentPlayer === Player.PLAYER2);
      this.emitUIState();
    }
  }

  // ---- Shot Execution ----

  private executeShot(shot: IShot): void {
    const cueBall = getCueBall(this.balls);
    const velocity = shotToVelocity(shot);

    // Apply break shot energy boost for balanced rack scatter
    if (this.isBreakShot && shot.power > 0.3) {
      const breakMultiplier = 1.0 + shot.power * 0.20; // Up to 1.20x extra impulse on opening break
      velocity.x *= breakMultiplier;
      velocity.y *= breakMultiplier;
    }

    applyShot(cueBall, velocity);
    soundManager.play(SoundKey.CUE_STRIKE, Math.min(1.0, shot.power));

    // Assign spin parameters to cue ball
    if (cueBall) {
      cueBall.spinX = shot.spinX !== undefined ? shot.spinX : this.spinX;
      cueBall.spinY = shot.spinY !== undefined ? shot.spinY : this.spinY;
      
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      if (speed > 0) {
        cueBall.shotDir = { x: velocity.x / speed, y: velocity.y / speed };
      } else {
        cueBall.shotDir = { x: 0, y: 0 };
      }
      cueBall.hasHitBall = false;
    }

    // Reset shot tracking
    this.firstHitBallId = null;
    this.shotPocketedBalls = [];
    this.cuePocketed = false;
    this.cushionHitAfterContact = false;
    this.foulReason = null;

    // Reset spin in the engine state so next shot starts fresh
    this.spinX = 0;
    this.spinY = 0;

    // Transition to balls moving
    this.phase = GamePhase.BALLS_MOVING;
    setCueVisible(this.cueStick, false);
    this.emitUIState();
  }

  /** Execute a shot from bot AI */
  executeBotShot(shot: IShot): void {
    this.executeShot(shot);
  }

  // ---- Shot Evaluation (after balls stop) ----

  private evaluateShot(): void {
    if (this.gameMode === GameMode.TUTORIAL && this.currentTutorialStep) {
      this.currentPlayer = Player.HUMAN;

      const validation = validateTutorialStep(this.currentTutorialStep, {
        firstHitBallId: this.firstHitBallId,
        shotPocketedBalls: this.shotPocketedBalls,
        cuePocketed: this.cuePocketed,
        hasUsedSpin: this.hasUsedSpinThisStep,
        cuePlacedWithBallInHand: this.cuePlacedWithBallInHandThisStep,
      });

      this.tutorialFeedbackMessage = validation.message;

      if (validation.success) {
        this.isTutorialTaskComplete = true;
        this.isTutorialError = false;
        soundManager.play(SoundKey.WIN, 1.0);
        this.phase = GamePhase.PLAYER_TURN;
        setCueVisible(this.cueStick, true);
        this.emitUIState();
      } else {
        this.isTutorialTaskComplete = false;
        this.isTutorialError = true;
        soundManager.play(SoundKey.FOUL, 1.0);

        // Reset step layout after short delay so user can try again
        setTimeout(() => {
          if (this.gameMode === GameMode.TUTORIAL && this.currentTutorialStep) {
            this.balls = getTutorialStepBalls(this.currentTutorialStep.setupType);
            this.firstHitBallId = null;
            this.shotPocketedBalls = [];
            this.cuePocketed = false;
            this.hasUsedSpinThisStep = false;
            this.cuePlacedWithBallInHandThisStep = false;
            this.tutorialFeedbackMessage = null;
            this.isTutorialError = false;

            if (this.currentTutorialStep.allowBallInHandPlacement) {
              this.phase = GamePhase.BALL_IN_HAND;
              const cueBall = getCueBall(this.balls);
              if (cueBall) {
                this.ballInHandPos = { x: cueBall.position.x, y: cueBall.position.y };
                this.ballInHandValid = true;
              }
            } else {
              this.phase = GamePhase.PLAYER_TURN;
            }
            setCueVisible(this.cueStick, this.currentTutorialStep.allowShooting);
            this.emitUIState();
          }
        }, 1800);

        this.phase = GamePhase.PLAYER_TURN;
        setCueVisible(this.cueStick, false);
        this.emitUIState();
      }
      return;
    }

    const currentType =
      this.currentPlayer === Player.HUMAN ? this.playerBallType : this.botBallType;

    // 1. Check all foul rules via GameState engine
    this.foulReason = evaluateFouls(
      this.cuePocketed,
      this.firstHitBallId,
      this.shotPocketedBalls,
      this.balls,
      currentType,
      this.cushionHitAfterContact,
      this.isBreakShot
    );

    // 2. Check 8-ball win/loss condition
    if (this.shotPocketedBalls.includes(8)) {
      this.gameResult = evaluateEightBallWin(
        this.shotPocketedBalls,
        this.balls,
        this.currentPlayer,
        this.playerBallType,
        this.botBallType,
        this.foulReason
      );
      if (this.gameResult !== null) {
        this.phase = GamePhase.GAME_OVER;
        setCueVisible(this.cueStick, false);
        soundManager.play(SoundKey.WIN);
        this.emitUIState();
        return;
      }
    }

    // 3. Assign category (SOLID / STRIPE) on open table if first legal ball pocketed
    //    Per WPA rules, table stays open after the break shot — assignment happens on subsequent shots
    if (!this.playerBallType && !this.isBreakShot) {
      const assigned = assignCategoryOnOpenTable(
        this.shotPocketedBalls,
        this.balls,
        this.currentPlayer,
        this.foulReason
      );
      if (assigned) {
        this.playerBallType = assigned.playerBallType;
        this.botBallType = assigned.botBallType;
      }
    }

    // Clear break shot flag after first shot evaluation
    this.isBreakShot = false;

    // 4. Track pocketed balls in player/bot UI tallies
    for (const ballId of this.shotPocketedBalls) {
      const ball = this.balls.find((b) => b.id === ballId);
      if (ball) {
        if (this.playerBallType) {
          if (ball.type === this.playerBallType) {
            this.playerPocketed.push(ballId);
          } else if (ball.type === this.botBallType) {
            this.botPocketed.push(ballId);
          } else {
            // Fallback (8-ball, cue ball, etc.)
            if (this.currentPlayer === Player.HUMAN) {
              this.playerPocketed.push(ballId);
            } else {
              this.botPocketed.push(ballId);
            }
          }
        } else {
          // Open table: assign to who pocketed it
          if (this.currentPlayer === Player.HUMAN) {
            this.playerPocketed.push(ballId);
          } else {
            this.botPocketed.push(ballId);
          }
        }
      }
      this.allPocketed.push(ballId);
    }

    // 5. Determine if turn should switch to opponent
    const switchTurn = shouldSwitchTurn(
      this.shotPocketedBalls,
      this.balls,
      this.currentPlayer,
      this.playerBallType,
      this.botBallType,
      this.foulReason
    );

    const nextPlayer = switchTurn
      ? (this.currentPlayer === Player.HUMAN ? (this.gameMode === GameMode.TWO_PLAYER ? Player.PLAYER2 : Player.BOT) : Player.HUMAN)
      : this.currentPlayer;

    // 6. Set next game phase based on foul or normal turn
    if (this.foulReason) {
      this.phase = GamePhase.BALL_IN_HAND;
      soundManager.play(SoundKey.FOUL);
      
      this.currentPlayer = nextPlayer;

      if (this.currentPlayer === Player.BOT) {
        // Smart bot placement based on table state
        const targetPos = calculateBotPlacement(this.balls, this.botBallType);
        const placement = findNearestValidPlacement(targetPos, this.balls, false);
        const cueBall = getCueBall(this.balls);
        cueBall.position = placement;
        cueBall.isPocketed = false;
        cueBall.velocity = { x: 0, y: 0 };
        cueBall.isMoving = false;

        this.ballInHandPos = placement;
        this.ballInHandValid = true;

        if (this.botPlacementTimer) {
          clearTimeout(this.botPlacementTimer);
        }
        this.botPlacementTimer = setTimeout(() => {
          if (this.phase === GamePhase.BALL_IN_HAND && this.currentPlayer === Player.BOT) {
            this.foulReason = null; // Clear foul reason for AI placement
            this.phase = GamePhase.BOT_TURN;
            setCueVisible(this.cueStick, false);
            this.emitUIState();
          }
        }, 1200);
      } else {
        // Initialize cue ball at pointer position immediately for human player
        const cueBall = getCueBall(this.balls);
        const { pointerPos } = this.input.state;
        const startPos = pointerPos ? {
          x: Math.max(PLAY_LEFT + BALL_RADIUS, Math.min(PLAY_RIGHT - BALL_RADIUS, pointerPos.x)),
          y: Math.max(PLAY_TOP + BALL_RADIUS, Math.min(PLAY_BOTTOM - BALL_RADIUS, pointerPos.y)),
        } : { x: 350, y: 350 };
        
        const placement = findNearestValidPlacement(startPos, this.balls, false);
        cueBall.position = placement;
        cueBall.isPocketed = false;
        cueBall.velocity = { x: 0, y: 0 };
        cueBall.isMoving = false;
        
        this.ballInHandPos = placement;
        this.ballInHandValid = true;
      }
    } else {
      this.currentPlayer = nextPlayer;
      this.phase = this.currentPlayer === Player.HUMAN 
        ? GamePhase.PLAYER_TURN 
        : (this.gameMode === GameMode.TWO_PLAYER ? GamePhase.PLAYER2_TURN : GamePhase.BOT_TURN);
    }

    const cueBall = getCueBall(this.balls);
    if (cueBall) {
      cueBall.spinX = 0;
      cueBall.spinY = 0;
      cueBall.shotDir = undefined;
      cueBall.hasHitBall = false;
    }

    setCueVisible(this.cueStick, this.phase === GamePhase.PLAYER_TURN || this.phase === GamePhase.PLAYER2_TURN);
    this.emitUIState();
  }

  // ---- Rendering ----

  private updateTableCache(): void {
    if (typeof document === "undefined") return;

    if (!this.tableCacheCanvas) {
      this.tableCacheCanvas = document.createElement("canvas");
    }

    this.tableCacheCanvas.width = this.canvas.width;
    this.tableCacheCanvas.height = this.canvas.height;

    const cacheCtx = this.tableCacheCanvas.getContext("2d");
    if (!cacheCtx) return;

    cacheCtx.save();
    cacheCtx.scale(this.scale * this.dpr, this.scale * this.dpr);
    clearCanvas(cacheCtx, CANVAS_TOTAL_WIDTH, CANVAS_TOTAL_HEIGHT);
    drawTable(cacheCtx);
    cacheCtx.restore();

    this.isTableCacheValid = true;
  }

  private render(): void {
    // 1. Draw cached static table & dynamic balls on the main game canvas
    if (!this.tableCacheCanvas || !this.isTableCacheValid) {
      this.updateTableCache();
    }

    if (this.tableCacheCanvas && this.isTableCacheValid) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(this.tableCacheCanvas, 0, 0);
    } else {
      this.ctx.save();
      this.ctx.scale(this.scale * this.dpr, this.scale * this.dpr);
      clearCanvas(this.ctx, CANVAS_TOTAL_WIDTH, CANVAS_TOTAL_HEIGHT);
      drawTable(this.ctx);
      this.ctx.restore();
    }

    this.ctx.save();
    this.ctx.scale(this.scale * this.dpr, this.scale * this.dpr);
    drawBalls(this.ctx, this.balls, this.scale);
    drawTubeBalls(this.ctx, this.balls, this.scale);
    this.ctx.restore();

    // 2. Draw cue stick & overlays on the overlay canvas (so they render on top of sidebars/HUD)
    const targetCtx = this.overlayCtx || this.ctx;
    if (this.overlayCtx && this.overlayCanvas) {
      this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }

    targetCtx.save();
    targetCtx.scale(this.scale * this.dpr, this.scale * this.dpr);

    // Cue stick and aim line (visible during active turns)
    if (this.phase === GamePhase.PLAYER_TURN || this.phase === GamePhase.PLAYER2_TURN || this.phase === GamePhase.BOT_TURN) {
      const cueBall = getCueBall(this.balls);
      if (this.phase === GamePhase.PLAYER_TURN || this.phase === GamePhase.PLAYER2_TURN) {
        // Use the correct ball type for the active player
        const activePlayerBallType = this.currentPlayer === Player.HUMAN
          ? this.playerBallType
          : this.botBallType;
        drawAimLine(targetCtx, cueBall.position, this.cueStick, this.balls, activePlayerBallType);
      }
      drawCueStick(targetCtx, cueBall.position, this.cueStick);
    }

    // Ball-in-hand indicator
    if (this.phase === GamePhase.BALL_IN_HAND) {
      if (this.currentPlayer === Player.HUMAN || this.currentPlayer === Player.PLAYER2) {
        drawBallInHand(targetCtx, this.ballInHandPos, this.ballInHandValid);
      } else {
        // Draw a glowing target ring around the bot's automatically placed cue ball position
        targetCtx.save();
        targetCtx.translate(CANVAS_PADDING, CANVAS_PADDING); // Fix offset!
        targetCtx.beginPath();
        targetCtx.arc(this.ballInHandPos.x, this.ballInHandPos.y, BALL_RADIUS * 1.8, 0, Math.PI * 2);
        targetCtx.strokeStyle = "rgba(6, 182, 212, 0.85)"; // Cyan neon glow
        targetCtx.lineWidth = 3;
        targetCtx.setLineDash([4, 4]); // Dashed glowing ring
        targetCtx.stroke();
        targetCtx.restore();
      }
    }

    targetCtx.restore();
  }

  // ---- UI State Sync ----

  private emitUIState(): void {
    if (!this.onUIStateChange) return;

    if (this.phase === GamePhase.PLAYER_TURN || this.phase === GamePhase.PLAYER2_TURN || this.phase === GamePhase.BOT_TURN) {
      this.foulReason = null;
    }

    this.onUIStateChange({
      phase: this.phase,
      currentPlayer: this.currentPlayer,
      playerBallType: this.playerBallType,
      botBallType: this.botBallType,
      playerPocketed: [...this.playerPocketed],
      botPocketed: [...this.botPocketed],
      allPocketed: [...this.allPocketed],
      scale: this.scale,
      foulReason: this.foulReason,
      gameResult: this.gameResult,
      difficulty: this.difficulty,
      gameMode: this.gameMode,
      player1Name: this.player1Name,
      player2Name: this.player2Name,
      isSoundMuted: this.isSoundMuted,
      isTutorialTaskComplete: this.isTutorialTaskComplete,
      tutorialFeedbackMessage: this.tutorialFeedbackMessage,
      isTutorialError: this.isTutorialError,
    });
  }

  // ---- Getters for BotAI integration ----

  getBalls(): IBall[] { return this.balls; }
  getPhase(): GamePhase { return this.phase; }
  getCurrentPlayer(): Player { return this.currentPlayer; }
  getPlayerBallType(): BallType | null { return this.playerBallType; }
  getBotBallType(): BallType | null { return this.botBallType; }
  getDifficulty(): Difficulty { return this.difficulty; }

  /** Set phase (used by BotAI to transition) */
  setPhase(phase: GamePhase): void {
    this.phase = phase;
    this.emitUIState();
  }

  // ---- Ball Return Tube Physics and Math ----

  private getTubePathPoint(s: number): { x: number; y: number; tx: number; ty: number } {
    const L1 = 35;
    const L2 = 39.27;

    if (s < L1) {
      // Segment 1: Horizontal straight line from table border (1400) to 1435
      return {
        x: 1400 + s,
        y: 40,
        tx: 1,
        ty: 0
      };
    } else if (s < L1 + L2) {
      // Segment 2: Top-right curve (arc center at 1435, 65, radius 25)
      const t = s - L1;
      const theta = -Math.PI / 2 + (t / 25);
      return {
        x: 1435 + 25 * Math.cos(theta),
        y: 65 + 25 * Math.sin(theta),
        tx: -Math.sin(theta),
        ty: Math.cos(theta)
      };
    } else {
      // Segment 3: Vertical straight down at x = 1460
      const t = s - L1 - L2;
      return {
        x: 1460,
        y: 65 + t,
        tx: 0,
        ty: 1
      };
    }
  }

  private rotateTubeBallSticker(ball: IBall, tx: number, ty: number, speed: number): void {
    const theta = speed / ball.radius;
    if (Math.abs(theta) < 0.0001) return;

    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    // Rotation axis: u = (-ty, tx, 0)
    const ux = -ty;
    const uy = tx;

    if (!ball.stickerDir) {
      ball.stickerDir = { x: 0, y: 0, z: 1 };
    }
    const sVec = ball.stickerDir;

    // Cross product u x sVec
    const cx = uy * sVec.z;
    const cy = -ux * sVec.z;
    const cz = ux * sVec.y - uy * sVec.x;

    // Dot product u . sVec
    const dot = ux * sVec.x + uy * sVec.y;

    // Rodrigues' rotation formula
    const nx = sVec.x * cosT + cx * sinT + ux * dot * (1 - cosT);
    const ny = sVec.y * cosT + cy * sinT + uy * dot * (1 - cosT);
    const nz = sVec.z * cosT + cz * sinT;

    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) {
      ball.stickerDir = { x: nx / len, y: ny / len, z: nz / len };
    }
    ball.angle = (ball.angle + theta) % (Math.PI * 2);
  }

  private updateTubeBalls(): void {
    // Get all object balls in the tube, sorted by their progress along the tube 'tubeS'
    const tubeBalls = this.balls.filter(b => b.isTubeBall);
    if (tubeBalls.length === 0) return;

    // Sort by tubeS descending (leading ball first)
    tubeBalls.sort((a, b) => (b.tubeS || 0) - (a.tubeS || 0));

    const PATH_LENGTH = 689.27; // S_max
    
    // Use a fixed ball diameter of 45px inside the tube channel.
    // This ensures all 15 object balls always fit perfectly inside the tube without overlapping or overflowing.
    const BALL_DIA = 45;

    const g = 0.3; // Gravity acceleration
    const friction = 0.008; // Friction in tube

    for (let i = 0; i < tubeBalls.length; i++) {
      const ball = tubeBalls[i];
      let s = ball.tubeS || 0;
      let speed = ball.tubeSpeed || 0;

      // Determine unit tangent vector at s to get the slope (gravity direction)
      const point = this.getTubePathPoint(s);
      const tangentY = point.ty;

      // Accelerate due to gravity and decelerate due to friction
      const accel = g * tangentY - friction * speed;
      speed += accel;

      // Cap speed
      const MAX_SPEED = 10;
      if (speed > MAX_SPEED) speed = MAX_SPEED;
      if (speed < -MAX_SPEED) speed = -MAX_SPEED;

      // Update position along path
      s += speed;

      // Stopper / Collision with ball in front
      let limit = PATH_LENGTH; // Stopper position for leading ball (nestles into the bottom cap)
      if (i > 0) {
        // Must stop behind the ball in front of it
        const frontBall = tubeBalls[i - 1];
        limit = (frontBall.tubeS || 0) - BALL_DIA;
      }

      if (s >= limit) {
        s = limit;
        // Elastic bounce when hitting the stopper or the ball in front
        if (speed > 0.5) {
          speed = -speed * 0.25; // Bounce back slightly
        } else {
          speed = 0;
        }
      }

      // Update ball properties
      ball.tubeS = s;
      ball.tubeSpeed = speed;

      // Update 2D position based on path
      ball.position = { x: point.x, y: point.y };

      // Update 3D rolling visual
      this.rotateTubeBallSticker(ball, point.tx, point.ty, speed);
    }
  }
}
