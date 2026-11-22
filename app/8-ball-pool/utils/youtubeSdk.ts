// ============================================================
// YouTube Playables SDK — TypeScript Wrapper
// Full API coverage with safe guards for non-Playables environments
// Reference: https://developers.google.com/youtube/gaming/playables/reference/sdk
// ============================================================

/**
 * Check if the YouTube Playables SDK is available on the page.
 * The SDK is loaded via `<script src="https://www.youtube.com/game_api/v1">`
 * and must be loaded BEFORE any game code runs.
 */
export function isSdkLoaded(): boolean {
  return typeof ytgame !== "undefined" && ytgame !== null;
}

/**
 * Check if the game is running inside the YouTube Playables environment.
 * Use this to decide whether to use Playables-specific APIs or fallbacks.
 */
export function isInPlayablesEnv(): boolean {
  return isSdkLoaded() && ytgame.IN_PLAYABLES_ENV === true;
}

// ============================================================
// Required Lifecycle APIs
// ============================================================

let firstFrameReadyCalled = false;
let gameReadyCalled = false;
let initStartTime = 0;
const GAME_READY_TIMEOUT_MS = 5000;

/**
 * Notify YouTube that the game has begun showing frames.
 * MUST be called BEFORE gameReady() and as early as possible.
 */
export function firstFrameReady(): void {
  if (firstFrameReadyCalled) return;
  if (!isSdkLoaded()) return;

  try {
    firstFrameReadyCalled = true;
    ytgame.game.firstFrameReady();
  } catch {
    // Silently fail outside Playables env
  }
}

/**
 * Notify YouTube that the game is ready for players to interact with.
 * MUST be called AFTER firstFrameReady() and within 5 seconds of init.
 */
export function gameReady(): void {
  if (gameReadyCalled) return;
  if (!firstFrameReadyCalled) return;
  if (!isSdkLoaded()) return;

  const elapsed = Date.now() - initStartTime;
  if (elapsed > GAME_READY_TIMEOUT_MS) {
    // Still call it, but log warning
    if (isInPlayablesEnv()) {
      ytgame.health.logWarning();
    }
  }

  try {
    gameReadyCalled = true;
    ytgame.game.gameReady();
  } catch {
    // Silently fail outside Playables env
  }
}

// ============================================================
// Cloud Save / Load (max 3 MiB)
// ============================================================

const MAX_SAVE_BYTES = 3 * 1024 * 1024;

/**
 * Validate that a string is within the 3 MiB size limit.
 */
function isSaveDataValid(data: string): boolean {
  return typeof data === "string" && data.length <= MAX_SAVE_BYTES;
}

/**
 * Load persisted game data from YouTube cloud storage.
 * Returns null if no data exists or if outside Playables env.
 */
export async function loadData(): Promise<string | null> {
  if (!isSdkLoaded() || !ytgame.game?.loadData) return null;

  try {
    const rawData = await ytgame.game.loadData();
    if (typeof rawData === "string" && rawData.length > 0) {
      return rawData;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save game data to YouTube cloud storage.
 * Silently fails if outside Playables env or data exceeds 3 MiB.
 */
export async function saveData(data: string): Promise<boolean> {
  if (!isSdkLoaded() || !ytgame.game?.saveData) return false;
  if (!isSaveDataValid(data)) return false;

  try {
    await ytgame.game.saveData(data);
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Pause / Resume
// ============================================================

let pauseCallback: (() => void) | null = null;
let resumeCallback: (() => void) | null = null;
let pauseUnsubscribe: (() => void) | null = null;
let resumeUnsubscribe: (() => void) | null = null;

/**
 * Register a callback for when YouTube pauses the game.
 * Returns an unsubscribe function.
 */
export function onPause(callback: () => void): () => void {
  pauseCallback = callback;

  if (isSdkLoaded() && ytgame.system?.onPause) {
    pauseUnsubscribe = ytgame.system.onPause(() => {
      pauseCallback?.();
    });
  }

  return () => {
    pauseCallback = null;
    pauseUnsubscribe?.();
    pauseUnsubscribe = null;
  };
}

/**
 * Register a callback for when YouTube resumes the game.
 * Returns an unsubscribe function.
 */
export function onResume(callback: () => void): () => void {
  resumeCallback = callback;

  if (isSdkLoaded() && ytgame.system?.onResume) {
    resumeUnsubscribe = ytgame.system.onResume(() => {
      resumeCallback?.();
    });
  }

  return () => {
    resumeCallback = null;
    resumeUnsubscribe?.();
    resumeUnsubscribe = null;
  };
}

// ============================================================
// Audio
// ============================================================

let audioEnabledState = true;
let audioStateQueried = false;
let audioUnsubscribe: (() => void) | null = null;

/**
 * Get the current audio enabled state from YouTube settings.
 * Queries ytgame.system.isAudioEnabled() once and caches the result to prevent bridge spam.
 * Subsequent updates come automatically via onAudioEnabledChange event listener.
 * Falls back to `true` outside Playables env.
 */
export function isAudioEnabled(forceRefresh: boolean = false): boolean {
  if (isSdkLoaded() && ytgame.system?.isAudioEnabled && (!audioStateQueried || forceRefresh)) {
    try {
      audioEnabledState = ytgame.system.isAudioEnabled();
      audioStateQueried = true;
    } catch {
      // keep current state
    }
  }
  return audioEnabledState;
}

/**
 * Register a callback for when YouTube audio settings change.
 * The callback receives the new audio enabled state.
 * Returns an unsubscribe function.
 */
export function onAudioEnabledChange(
  callback: (isEnabled: boolean) => void
): () => void {
  if (isSdkLoaded() && ytgame.system?.onAudioEnabledChange) {
    audioUnsubscribe = ytgame.system.onAudioEnabledChange((enabled) => {
      audioEnabledState = enabled;
      audioStateQueried = true;
      callback(enabled);
    });
  }

  return () => {
    audioUnsubscribe?.();
    audioUnsubscribe = null;
  };
}

// ============================================================
// Language
// ============================================================

/**
 * Get the user's language from YouTube settings.
 * Returns a BCP-47 language tag (e.g., "en-US", "hi", "zh-Hans").
 * Falls back to "en" outside Playables env.
 */
export async function getLanguage(): Promise<string> {
  if (isSdkLoaded() && ytgame.system?.getLanguage) {
    try {
      return await ytgame.system.getLanguage();
    } catch {
      return "en";
    }
  }
  return "en";
}

// ============================================================
// Engagement (Scores)
// ============================================================

/**
 * Send a score to YouTube for leaderboard display.
 * Score must be a positive integer.
 */
export async function sendScore(score: number): Promise<boolean> {
  if (!isSdkLoaded() || !ytgame.engagement?.sendScore) return false;

  const value = Number.isFinite(score) ? Math.floor(score) : 0;
  if (value < 0) return false;

  try {
    await ytgame.engagement.sendScore({ value });
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Ads
// ============================================================

/**
 * Request an interstitial ad from YouTube.
 * Returns true if the ad was successfully requested.
 */
export async function requestInterstitialAd(): Promise<boolean> {
  if (!isSdkLoaded() || !ytgame.ads?.requestInterstitialAd) return false;

  try {
    await ytgame.ads.requestInterstitialAd();
    return true;
  } catch {
    return false;
  }
}

/**
 * Request a rewarded ad from YouTube.
 * Returns true if the user earned the reward.
 */
export async function requestRewardedAd(
  rewardId: string
): Promise<boolean> {
  if (!isSdkLoaded() || !ytgame.ads?.requestRewardedAd) return false;

  try {
    return await ytgame.ads.requestRewardedAd(rewardId);
  } catch {
    return false;
  }
}

// ============================================================
// Health (Logging)
// ============================================================

/** Log an error to YouTube Playables console */
export function logError(): void {
  if (isSdkLoaded() && ytgame.health?.logError) {
    ytgame.health.logError();
  }
}

/** Log a warning to YouTube Playables console */
export function logWarning(): void {
  if (isSdkLoaded() && ytgame.health?.logWarning) {
    ytgame.health.logWarning();
  }
}

// ============================================================
// SDK Initialization (convenience)
// ============================================================

export interface YouTubeSdkCallbacks {
  onAudioEnabledChanged?: (enabled: boolean) => void;
  onPause?: () => void;
  onResume?: () => void;
}

/**
 * Initialize the YouTube Playables SDK integration.
 * Call this as early as possible in the app lifecycle.
 *
 * This function:
 * 1. Records init time for gameReady timeout tracking
 * 2. Calls firstFrameReady() to signal rendering has started
 * 3. Registers pause/resume/audio callbacks
 *
 * @param callbacks - Optional callbacks for SDK events
 * @returns The stored game settings if available, or null
 */
export async function initYouTubeSdk(
  callbacks: YouTubeSdkCallbacks = {}
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  initStartTime = Date.now();

  // Signal first frame as early as possible
  firstFrameReady();

  // Get initial audio state and notify
  const initialAudio = isAudioEnabled(true);
  callbacks.onAudioEnabledChanged?.(initialAudio);

  // Register system callbacks
  onPause(() => callbacks.onPause?.());
  onResume(() => callbacks.onResume?.());
  onAudioEnabledChange((enabled) => callbacks.onAudioEnabledChanged?.(enabled));

  return true;
}

/**
 * Signal that the game is fully interactable.
 * Must be called within 5 seconds of init.
 */
export function notifyGameReady(): void {
  gameReady();
}

/**
 * Check if firstFrameReady has been called
 */
export function hasFirstFrameBeenCalled(): boolean {
  return firstFrameReadyCalled;
}

/**
 * Check if gameReady has been called
 */
export function hasGameReadyBeenCalled(): boolean {
  return gameReadyCalled;
}

/**
 * Get the SDK version string
 */
export function getSdkVersion(): string | null {
  if (!isSdkLoaded()) return null;
  return ytgame.SDK_VERSION || null;
}
