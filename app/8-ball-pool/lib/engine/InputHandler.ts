// ============================================================
// InputHandler — Mouse + Touch input for aiming and shooting
// Bridges DOM events → game actions
// ============================================================

import { IVec2D } from "@/lib/types";
import { CANVAS_PADDING, CANVAS_TOTAL_WIDTH, CANVAS_TOTAL_HEIGHT } from "@/lib/constants/table";

/** Input state that the GameEngine reads each frame */
export interface InputState {
  /** Current pointer position in game (logical) coordinates */
  pointerPos: IVec2D;
  /** Position where the pointer went down (drag start) */
  dragStartPos: IVec2D | null;
  /** Is pointer currently held down */
  isPointerDown: boolean;
  /** Was pointer just released this frame (consume once) */
  wasReleased: boolean;
  /** Was pointer just clicked (for ball-in-hand placement) */
  wasClicked: boolean;
}

/**
 * InputHandler manages canvas pointer events (mouse + touch).
 * Converts screen coordinates → logical game coordinates.
 * GameEngine reads the InputState each frame.
 */
export class InputHandler {
  private canvas: HTMLCanvasElement;
  private scale: number = 1;
  public state: InputState;

  // Bound handlers (needed for removeEventListener)
  private handlePointerDown: (e: PointerEvent) => void;
  private handlePointerMove: (e: PointerEvent) => void;
  private handlePointerUp: (e: PointerEvent) => void;
  private handleContextMenu: (e: Event) => void;

  private isRotated: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.state = {
      pointerPos: { x: 0, y: 0 },
      dragStartPos: null,
      isPointerDown: false,
      wasReleased: false,
      wasClicked: false,
    };

    // Bind event handlers
    this.handlePointerDown = this.onPointerDown.bind(this);
    this.handlePointerMove = this.onPointerMove.bind(this);
    this.handlePointerUp = this.onPointerUp.bind(this);
    this.handleContextMenu = (e: Event) => e.preventDefault();

    this.attachListeners();
  }

  /** Set the current canvas scale factor (for coordinate conversion) */
  setScale(scale: number): void {
    this.scale = scale;
  }

  /** Enable/disable 90-degree clockwise visual rotation coordinate mapping */
  setRotated(rotated: boolean): void {
    this.isRotated = rotated;
  }

  /** Convert screen (pixel) coords → logical game coords */
  private screenToGame(e: PointerEvent): IVec2D {
    const rect = this.canvas.getBoundingClientRect();
    if (this.isRotated) {
      // Bounding box center coordinates
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      // Inverse -90-deg rotation (dx, dy screen relative to center)
      const canvasX_rel = -dy / this.scale;
      const canvasY_rel = dx / this.scale;

      // Translate back to top-left logical coordinates relative to canvas center
      // width and height in logical coords are CANVAS_TOTAL_WIDTH and CANVAS_TOTAL_HEIGHT
      const logicalWidth = CANVAS_TOTAL_WIDTH;
      const logicalHeight = CANVAS_TOTAL_HEIGHT;

      const gameX = canvasX_rel + logicalWidth / 2 - CANVAS_PADDING;
      const gameY = canvasY_rel + logicalHeight / 2 - CANVAS_PADDING;

      return { x: gameX, y: gameY };
    } else {
      return {
        x: (e.clientX - rect.left) / this.scale - CANVAS_PADDING,
        y: (e.clientY - rect.top) / this.scale - CANVAS_PADDING,
      };
    }
  }

  private onPointerDown(e: PointerEvent): void {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);

    const pos = this.screenToGame(e);
    this.state.pointerPos = pos;
    this.state.dragStartPos = { x: pos.x, y: pos.y };
    // Only register isPointerDown (for canvas charging) if it's NOT a touch event.
    // Touch events on canvas will only rotate/aim the cue stick. Charging is done via PowerMeter.
    this.state.isPointerDown = e.pointerType !== "touch";
    this.state.wasReleased = false;
    this.state.wasClicked = false;
  }

  private onPointerMove(e: PointerEvent): void {
    e.preventDefault();
    this.state.pointerPos = this.screenToGame(e);
  }

  private onPointerUp(e: PointerEvent): void {
    e.preventDefault();

    const pos = this.screenToGame(e);
    this.state.pointerPos = pos;

    // Detect click (minimal drag distance)
    if (this.state.dragStartPos) {
      const dx = pos.x - this.state.dragStartPos.x;
      const dy = pos.y - this.state.dragStartPos.y;
      const dragDist = Math.sqrt(dx * dx + dy * dy);
      this.state.wasClicked = dragDist < 5; // Less than 5px = click, not drag
    }

    this.state.isPointerDown = false;
    this.state.wasReleased = true;
    this.state.dragStartPos = null;
  }

  /** Consume the wasReleased flag (read once per frame, then clear) */
  consumeRelease(): boolean {
    if (this.state.wasReleased) {
      this.state.wasReleased = false;
      return true;
    }
    return false;
  }

  /** Consume the wasClicked flag */
  consumeClick(): boolean {
    if (this.state.wasClicked) {
      this.state.wasClicked = false;
      return true;
    }
    return false;
  }

  private attachListeners(): void {
    const opts: AddEventListenerOptions = { passive: false };
    this.canvas.addEventListener("pointerdown", this.handlePointerDown, opts);
    this.canvas.addEventListener("pointermove", this.handlePointerMove, opts);
    this.canvas.addEventListener("pointerup", this.handlePointerUp, opts);
    this.canvas.addEventListener("pointercancel", this.handlePointerUp, opts);
    this.canvas.addEventListener("contextmenu", this.handleContextMenu);

    // Touch-action CSS to prevent browser scroll/zoom on canvas
    this.canvas.style.touchAction = "none";
  }

  /** Remove all event listeners (cleanup on unmount) */
  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointercancel", this.handlePointerUp);
    this.canvas.removeEventListener("contextmenu", this.handleContextMenu);
  }
}
