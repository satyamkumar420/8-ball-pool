// ============================================================
// SaveManager — LocalStorage Manager
// Handles browser LocalStorage persistence for game settings, stats, and preferences.
// ============================================================

import { IGameSettings, Difficulty } from "@/lib/types";

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
   * Initialize the SaveManager from localStorage.
   */
  async init(): Promise<IGameSettings> {
    if (this.initialized) return this.settings;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const local = this.loadFromLocalStorage();
      if (local) {
        this.settings = { ...DEFAULT_SETTINGS, ...local };
      }
      this.initialized = true;
      this.saveToLocalStorage();
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
  }

  // ============================================================
  // Storage
  // ============================================================

  private async persist(): Promise<void> {
    this.saveToLocalStorage();
  }

  /**
   * Parse a JSON string into Partial<IGameSettings>.
   * Returns null if parsing fails.
   */
  private parseSettings(raw: string): Partial<IGameSettings> | null {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
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
      if (this.settings.language) {
        localStorage.setItem("8ballPoolLanguage", this.settings.language);
      }
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
