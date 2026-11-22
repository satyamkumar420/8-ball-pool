// ============================================================
// SaveManager — Dual Storage Manager
// Handles Cloud (YouTube Playables SDK) + LocalStorage persistence
// for game settings, stats, and preferences.
//
// Storage strategy:
// 1. Always write to localStorage (fast, works everywhere)
// 2. Also write to YouTube cloud when in Playables environment
// 3. On load: try cloud first, fall back to localStorage
// ============================================================

import { IGameSettings, Difficulty } from "@/lib/types";
import * as yt from "@/utils/youtubeSdk";

const LOCAL_STORAGE_KEY = "8ballpool_settings";

const DEFAULT_SETTINGS: IGameSettings = {
  soundEnabled: true,
  language: "en",
  bestScore: 0,
  winCount: 0,
  lossCount: 0,
  totalGamesPlayed: 0,
  lastPlayedDifficulty: Difficulty.MEDIUM,
  highestDifficultyWon: Difficulty.EASY,
  hasCompletedTutorial: false,
};

/**
 * Difficulty ranking for comparison.
 * Higher index = harder difficulty.
 */
const DIFFICULTY_RANK: Record<Difficulty, number> = {
  [Difficulty.EASY]: 0,
  [Difficulty.MEDIUM]: 1,
  [Difficulty.HARD]: 2,
};

/**
 * SaveManager singleton — handles all persistent game data.
 */
export class SaveManager {
  private settings: IGameSettings;
  private initialized = false;
  private initPromise: Promise<IGameSettings> | null = null;
  private persistTimeout: ReturnType<typeof setTimeout> | null = null;
  private isPersisting = false;

  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    // Synchronously load localStorage on instantiation if running in browser
    if (typeof window !== "undefined") {
      const local = this.loadFromLocalStorage();
      if (local) {
        this.settings = { ...DEFAULT_SETTINGS, ...local };
      }
    }
  }

  // ============================================================
  // Initialization
  // ============================================================

  /**
   * Initialize the SaveManager:
   * 1. Load settings from cloud (YouTube SDK) and localStorage
   * 2. Sync language from YouTube system if available
   * 3. Sync audio state from YouTube system if available
   *
   * Call this once on app startup (after firstFrameReady).
   */
  async init(): Promise<IGameSettings> {
    if (this.initialized) return this.settings;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      // Step 1: Load persisted settings (smart merged from in-memory, local & cloud)
      const local = this.loadFromLocalStorage();
      let cloudSettings: Partial<IGameSettings> | null = null;

      if (yt.isSdkLoaded()) {
        try {
          const cloudData = await yt.loadData();
          if (cloudData && typeof cloudData === "string") {
            cloudSettings = this.parseSettings(cloudData);
          }
        } catch {
          // Cloud load failed
        }
      }

      // Merge current in-memory settings, local storage, and cloud storage
      const merged = this.mergeSettings(
        this.mergeSettings(this.settings, local),
        cloudSettings
      );
      this.settings = merged;

      // Step 2: Sync language from YouTube system ONLY if no saved language preference exists
      const hasSavedLanguage = Boolean(cloudSettings?.language || local?.language);
      if (!hasSavedLanguage && yt.isSdkLoaded()) {
        try {
          const lang = await yt.getLanguage();
          if (lang) {
            this.settings.language = lang;
          }
        } catch {
          // Keep existing language setting
        }
      }

      // Step 3: Sync audio state
      if (yt.isSdkLoaded()) {
        const audioEnabled = yt.isAudioEnabled();
        this.settings.soundEnabled = audioEnabled;
      }

      this.initialized = true;

      // Persist merged state to both local and cloud storage
      await this.persist();
      const initialScore = Math.max(this.settings.winCount || 0, this.settings.bestScore || 0, 0);
      yt.sendScore(Math.floor(initialScore)).catch(() => {});

      return this.settings;
    })();

    return this.initPromise;
  }

  // ============================================================
  // Read
  // ============================================================

  /** Get all current settings */
  getAll(): IGameSettings {
    return { ...this.settings };
  }

  /** Get a specific setting value */
  get<K extends keyof IGameSettings>(key: K): IGameSettings[K] {
    return this.settings[key];
  }

  /** Check if initialized */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ============================================================
  // Write
  // ============================================================

  /**
   * Update a single setting and persist to storage.
   */
  async set<K extends keyof IGameSettings>(
    key: K,
    value: IGameSettings[K]
  ): Promise<void> {
    this.settings[key] = value;
    await this.persist();
  }

  /**
   * Update multiple settings at once and persist.
   */
  async update(partial: Partial<IGameSettings>): Promise<void> {
    this.settings = { ...this.settings, ...partial };
    await this.persist();
  }

  /**
   * Reset all settings to defaults and persist.
   */
  async reset(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS };
    await this.persist();
  }

  // ============================================================
  // Stats Tracking
  // ============================================================

  /**
   * Record a game result and update stats accordingly.
   * Call this when a game ends.
   *
   * @param isWin - Whether the player won
   * @param difficulty - The difficulty the game was played on
   * @param score - The player's score (optional)
   */
  async recordGameResult(
    isWin: boolean,
    difficulty: Difficulty,
    score?: number,
    isTwoPlayerWin: boolean = false
  ): Promise<void> {
    this.settings.totalGamesPlayed++;

    if (isWin || isTwoPlayerWin) {
      this.settings.winCount++;

      // Update highest difficulty won
      const currentRank = DIFFICULTY_RANK[this.settings.highestDifficultyWon] ?? 0;
      const newRank = DIFFICULTY_RANK[difficulty] ?? 0;
      if (newRank > currentRank) {
        this.settings.highestDifficultyWon = difficulty;
      }

      // Update best score or increment by 1 when won (including two-player wins)
      if (score !== undefined && score > this.settings.bestScore) {
        this.settings.bestScore = score;
      } else {
        this.settings.bestScore = (this.settings.bestScore || 0) + 1;
      }
    } else {
      this.settings.lossCount++;
    }

    this.settings.lastPlayedDifficulty = difficulty;

    await this.persist();

    // Send updated best score / win count to YouTube leaderboard
    const scoreToSend = Math.max(this.settings.winCount, this.settings.bestScore, 0);
    yt.sendScore(Math.floor(scoreToSend)).catch(() => {});
  }

  // ============================================================
  // Storage
  // ============================================================

  /**
   * Persist settings to both localStorage and YouTube cloud.
   * Debounces cloud saving to prevent rate limiting / throttling from YouTube SDK.
   */
  private async persist(): Promise<void> {
    // 1. Always save to LocalStorage synchronously and instantly
    this.saveToLocalStorage();

    if (!yt.isSdkLoaded()) return;

    // 2. Clear existing debounce timeout
    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout);
    }

    // 3. If currently saving, queue retry after a brief delay
    if (this.isPersisting) {
      this.persistTimeout = setTimeout(() => this.persist(), 200);
      return;
    }

    this.persistTimeout = setTimeout(async () => {
      this.isPersisting = true;

      // 4. CRITICAL: Wait for loadData (init) to complete successfully before saveData
      if (this.initPromise) {
        await this.initPromise;
      }

      try {
        await yt.saveData(JSON.stringify(this.settings));
      } catch {
        // Silently fail if cloud unavailable or rate-limited
      } finally {
        this.isPersisting = false;
      }
    }, 300); // 300ms debounce
  }

  /**
   * Load settings from YouTube cloud and localStorage, and smartly merge them with current memory state.
   */
  private async loadFromStorage(): Promise<IGameSettings> {
    const localSettings = this.loadFromLocalStorage();
    let cloudSettings: Partial<IGameSettings> | null = null;

    if (yt.isSdkLoaded()) {
      try {
        const cloudData = await yt.loadData();
        if (cloudData && typeof cloudData === "string") {
          cloudSettings = this.parseSettings(cloudData);
        }
      } catch {
        // Cloud load failed
      }
    }

    return this.mergeSettings(localSettings, cloudSettings);
  }

  /**
   * Smartly merge in-memory, local, and cloud settings.
   * Ensures boolean flags like hasCompletedTutorial are preserved if set to true in any layer.
   */
  private mergeSettings(
    local: Partial<IGameSettings> | null,
    cloud: Partial<IGameSettings> | null
  ): IGameSettings {
    const memory = this.settings;

    const hasCompletedTutorial = Boolean(
      memory?.hasCompletedTutorial ||
      local?.hasCompletedTutorial ||
      cloud?.hasCompletedTutorial
    );

    const localRank = local?.highestDifficultyWon ? (DIFFICULTY_RANK[local.highestDifficultyWon] ?? 0) : 0;
    const cloudRank = cloud?.highestDifficultyWon ? (DIFFICULTY_RANK[cloud.highestDifficultyWon] ?? 0) : 0;
    const memoryRank = memory?.highestDifficultyWon ? (DIFFICULTY_RANK[memory.highestDifficultyWon] ?? 0) : 0;
    const maxRank = Math.max(localRank, cloudRank, memoryRank);

    let highestDifficultyWon = memory?.highestDifficultyWon || DEFAULT_SETTINGS.highestDifficultyWon;
    if (maxRank === 2) highestDifficultyWon = Difficulty.HARD;
    else if (maxRank === 1) highestDifficultyWon = Difficulty.MEDIUM;
    else if (maxRank === 0) highestDifficultyWon = Difficulty.EASY;

    return {
      soundEnabled: cloud?.soundEnabled ?? local?.soundEnabled ?? memory?.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled,
      language: cloud?.language || local?.language || memory?.language || DEFAULT_SETTINGS.language,
      bestScore: Math.max(memory?.bestScore || 0, local?.bestScore || 0, cloud?.bestScore || 0),
      winCount: Math.max(memory?.winCount || 0, local?.winCount || 0, cloud?.winCount || 0),
      lossCount: Math.max(memory?.lossCount || 0, local?.lossCount || 0, cloud?.lossCount || 0),
      totalGamesPlayed: Math.max(memory?.totalGamesPlayed || 0, local?.totalGamesPlayed || 0, cloud?.totalGamesPlayed || 0),
      lastPlayedDifficulty:
        cloud?.lastPlayedDifficulty || local?.lastPlayedDifficulty || memory?.lastPlayedDifficulty || DEFAULT_SETTINGS.lastPlayedDifficulty,
      highestDifficultyWon,
      hasCompletedTutorial,
    };
  }

  /**
   * Parse a JSON string into Partial<IGameSettings>.
   * Returns null if parsing fails.
   */
  private parseSettings(raw: string): Partial<IGameSettings> | null {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        // Validate essential fields exist
        const validated: Partial<IGameSettings> = {};
        if (typeof parsed.soundEnabled === "boolean") validated.soundEnabled = parsed.soundEnabled;
        if (typeof parsed.language === "string") validated.language = parsed.language;
        if (typeof parsed.bestScore === "number") validated.bestScore = parsed.bestScore;
        if (typeof parsed.winCount === "number") validated.winCount = parsed.winCount;
        if (typeof parsed.lossCount === "number") validated.lossCount = parsed.lossCount;
        if (typeof parsed.totalGamesPlayed === "number") validated.totalGamesPlayed = parsed.totalGamesPlayed;
        if (parsed.lastPlayedDifficulty && Object.values(Difficulty).includes(parsed.lastPlayedDifficulty)) {
          validated.lastPlayedDifficulty = parsed.lastPlayedDifficulty;
        }
        if (parsed.highestDifficultyWon && Object.values(Difficulty).includes(parsed.highestDifficultyWon)) {
          validated.highestDifficultyWon = parsed.highestDifficultyWon;
        }
        if (typeof parsed.hasCompletedTutorial === "boolean") {
          validated.hasCompletedTutorial = parsed.hasCompletedTutorial;
        } else if (parsed.hasCompletedTutorial === "true" || parsed.hasCompletedTutorial === 1) {
          validated.hasCompletedTutorial = true;
        } else if (parsed.hasCompletedTutorial === "false" || parsed.hasCompletedTutorial === 0) {
          validated.hasCompletedTutorial = false;
        }
        return validated;
      }
    } catch {
      // Invalid JSON
    }
    return null;
  }

  // ============================================================
  // LocalStorage
  // ============================================================

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // localStorage might be full or unavailable
    }
  }

  private loadFromLocalStorage(): Partial<IGameSettings> | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        return this.parseSettings(raw);
      }
    } catch {
      // localStorage unavailable
    }
    return null;
  }
}

/** Singleton instance for app-wide use */
export const saveManager = new SaveManager();
