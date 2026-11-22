// ============================================================
// TypeScript declarations for YouTube Playables SDK (ytgame)
// Based on official SDK reference:
// https://developers.google.com/youtube/gaming/playables/reference/sdk
// ============================================================

/** The top-level YouTube Playables SDK object */
declare const ytgame: {
  readonly IN_PLAYABLES_ENV: boolean;
  readonly SDK_VERSION: string;

  readonly ads: {
    requestInterstitialAd(): Promise<void>;
    requestRewardedAd(rewardId: string): Promise<boolean>;
  };

  readonly engagement: {
    readonly ContentType: {
      PLAYABLE: "PLAYABLE";
      VIDEO: "VIDEO";
    };
    openYTContent(content: { id: string; contentType?: string }): Promise<void>;
    sendScore(score: { value: number }): Promise<void>;
  };

  readonly game: {
    firstFrameReady(): void;
    gameReady(): void;
    loadData(): Promise<string>;
    saveData(data: string): Promise<void>;
  };

  readonly health: {
    logError(): void;
    logWarning(): void;
  };

  readonly system: {
    getLanguage(): Promise<string>;
    isAudioEnabled(): boolean;
    onAudioEnabledChange(callback: (isAudioEnabled: boolean) => void): () => void;
    onPause(callback: () => void): () => void;
    onResume(callback: () => void): () => void;
  };
};
