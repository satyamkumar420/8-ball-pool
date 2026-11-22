"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { GameEngine } from "@/lib/engine/GameEngine";
import {
  IGameUIState,
  GamePhase,
  Player,
  Difficulty,
  GameResult,
  GameMode,
} from "@/lib/types";
import { MainMenu } from "../ui/MainMenu";
import { HUD } from "../ui/HUD";
import { PowerMeter } from "../ui/PowerMeter";
import { FoulBanner } from "../ui/FoulBanner";
import { WinModal } from "../ui/WinModal";
import { SoundToggle } from "../ui/SoundToggle";
import { SpinToggle } from "../ui/SpinToggle";
import { SpinModal } from "../ui/SpinModal";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { TutorialOverlay } from "../ui/TutorialOverlay";
import LoadingScreen from "../ui/LoadingScreen";
import { TUTORIAL_STEPS } from "@/lib/game/TutorialManager";

import { CANVAS_TOTAL_HEIGHT, TOTAL_GAME_WIDTH } from "@/lib/constants/table";

import { saveManager } from "@/lib/game/SaveManager";
import { soundManager } from "@/lib/game/SoundManager";

/**
 * GameCanvas — Central React container hosting the HTML5 Canvas, GameEngine lifecycle,
 * UI overlays, state sync, and YouTube Playables SDK integration.
 */
export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const pendingGameRef = useRef<{
    difficulty: Difficulty;
    mode: GameMode;
    p1Name: string;
    p2Name: string;
  } | null>(null);

  const [uiState, setUiState] = useState<IGameUIState>({
    phase: GamePhase.MENU,
    currentPlayer: Player.HUMAN,
    playerBallType: null,
    botBallType: null,
    playerPocketed: [],
    botPocketed: [],
    allPocketed: [],
    scale: 1,
    foulReason: null,
    gameResult: null,
    gameMode: GameMode.SINGLE_PLAYER,
    player1Name: "Player 1",
    player2Name: "Player 2",
    difficulty: Difficulty.MEDIUM,
    isSoundMuted: false,
  });

  // Persistent stats from SaveManager for display
  const [persistentStats, setPersistentStats] = useState({
    winCount: 0,
    lossCount: 0,
    bestScore: 0,
    totalGamesPlayed: 0,
    highestDifficultyWon: Difficulty.EASY,
  });

  const [power, setPower] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Called when LoadingScreen completes progress animation
  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false);
    soundManager.startBgMusic();
  }, []);

  const [spin, setSpin] = useState({ x: 0, y: 0 });
  const [isSpinModalOpen, setIsSpinModalOpen] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [hasClickedSpinInTutorial, setHasClickedSpinInTutorial] = useState(false);

  // Initialize language deterministically as "en" for SSR / hydration matching
  const [language, setLanguage] = useState<string>("en");

  // Synchronize language state on mount and update when changed
  useEffect(() => {
    if (typeof window === "undefined") return;

    let initialLang = "en";
    try {
      const savedLanguage = localStorage?.getItem("8ballPoolLanguage");
      if (savedLanguage) {
        initialLang = savedLanguage;
      } else if (typeof navigator !== "undefined" && navigator.language) {
        const lower = navigator.language.toLowerCase();
        if (lower.startsWith("zh")) {
          initialLang = (lower.includes("hant") || lower.includes("tw") || lower.includes("hk")) ? "zh-Hant" : "zh-Hans";
        } else {
          const code = lower.split("-")[0];
          const supported = ["ar", "de", "en", "es", "fr", "hi", "id", "it", "ja", "ko", "ms", "nl", "pt", "ro", "ru", "th", "tr", "uk", "vi"];
          if (supported.includes(code)) {
            initialLang = code;
          }
        }
      }
    } catch {
      // localStorage not available
    }

    const rAF = requestAnimationFrame(() => {
      setLanguage(initialLang);
      window.dispatchEvent(
        new CustomEvent("languageChanged", { detail: { lang: initialLang } }),
      );
    });

    const handleLanguageChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.lang) {
        setLanguage(customEvent.detail.lang);
      }
    };

    window.addEventListener(
      "languageChanged",
      handleLanguageChange as EventListener,
    );
    return () => {
      cancelAnimationFrame(rAF);
      window.removeEventListener(
        "languageChanged",
        handleLanguageChange as EventListener,
      );
    };
  }, []);

  const handleChangeLanguage = (langCode: string) => {
    setLanguage(langCode);
    try {
      localStorage?.setItem("8ballPoolLanguage", langCode);
    } catch {
      // localStorage not available (YouTube Playables sandbox)
    }
    saveManager.set("language", langCode);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("languageChanged", { detail: { lang: langCode } }),
      );
    }
  };

  // Track last game result to save stats only once per game end
  const lastGameResultRef = useRef<GameResult | null>(null);

  // Sync state from GameEngine
  const handleUIStateChange = useCallback((newState: IGameUIState) => {
    // Reset UI spin indicator when the balls start moving
    if (newState.phase === GamePhase.BALLS_MOVING) {
      setSpin({ x: 0, y: 0 });
    }

    setUiState(() => {
      // Detect game ending to save stats
      const prevResult = lastGameResultRef.current;
      const newResult = newState.gameResult;

      if (newResult && !prevResult) {
        // Game just ended — save stats asynchronously
        const isTwoPlayerWin =
          newState.gameMode === GameMode.TWO_PLAYER &&
          (newResult === GameResult.PLAYER_WIN ||
            newResult === GameResult.BOT_WIN);
        const isWin = newResult === GameResult.PLAYER_WIN || isTwoPlayerWin;
        saveManager
          .recordGameResult(
            isWin,
            newState.difficulty,
            undefined,
            isTwoPlayerWin,
          )
          .then(() => {
            // Refresh stats for display
            const s = saveManager.getAll();
            setPersistentStats({
              winCount: s.winCount,
              lossCount: s.lossCount,
              bestScore: s.bestScore,
              totalGamesPlayed: s.totalGamesPlayed,
              highestDifficultyWon: s.highestDifficultyWon,
            });
          });
      }

      lastGameResultRef.current = newResult;
      return { ...newState };
    });
  }, []);

  // Initialize engine + YouTube SDK on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ─── 1. Load persistent settings & setup visibility listener ───
    const handleVisibilityChange = () => {
      if (document.hidden) {
        engineRef.current?.stop();
        soundManager.pauseBgMusic();
      } else {
        const phase = engineRef.current?.getPhase();
        if (phase === GamePhase.MENU) {
          soundManager.resumeBgMusic();
        } else if (phase && phase !== GamePhase.GAME_OVER) {
          engineRef.current?.resume();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const initSettings = async () => {
      const settings = await saveManager.init();
      setPersistentStats({
        winCount: settings.winCount,
        lossCount: settings.lossCount,
        bestScore: settings.bestScore,
        totalGamesPlayed: settings.totalGamesPlayed,
        highestDifficultyWon: settings.highestDifficultyWon,
      });

      if (settings.language) {
        setLanguage(settings.language);
        try {
          localStorage?.setItem("8ballPoolLanguage", settings.language);
        } catch {
          // localStorage unavailable
        }
        window.dispatchEvent(
          new CustomEvent("languageChanged", { detail: { lang: settings.language } }),
        );
      }

      if (engineRef.current) {
        engineRef.current.setSoundMuted(!settings.soundEnabled);
      }
    };

    initSettings();

    // ─── 4. Create Game Engine ───
    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    engine.setOnUIStateChange(handleUIStateChange);

    if (overlayCanvasRef.current) {
      engine.setOverlayCanvas(overlayCanvasRef.current);
    }

    // ─── 5. Note: gameReady() is now called in handleLoadingComplete when LoadingScreen finishes ───

    // Track charge loop for PowerMeter UI update
    let rAF = 0;
    const checkCharge = () => {
      if (engineRef.current) {
        const cueStick = (
          engineRef.current as unknown as {
            cueStick: { isCharging: boolean; pullBack: number; power: number };
          }
        ).cueStick;
        if (cueStick) {
          setIsCharging(cueStick.isCharging);
          setPower(cueStick.power);
        }
      }
      rAF = requestAnimationFrame(checkCharge);
    };
    checkCharge();

    // Window resize & orientation change handler
    const handleResize = () => {
      const portrait = typeof window !== "undefined" && window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
      engine.setIsRotated(portrait);
      engine.resizeCanvas();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      cancelAnimationFrame(rAF);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      engine.destroy();
      engineRef.current = null;
    };
  }, [handleUIStateChange]);

  // Resize canvas on phase transition
  const prevPhaseRef = useRef<GamePhase | null>(null);
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = uiState.phase;

    const isTransitioningMenu =
      prevPhase === GamePhase.MENU || uiState.phase === GamePhase.MENU;

    if (isTransitioningMenu && engineRef.current) {
      const portrait = typeof window !== "undefined" && window.innerHeight > window.innerWidth;
      engineRef.current.setIsRotated(portrait);
      requestAnimationFrame(() => {
        engineRef.current?.resizeCanvas();
      });
      setTimeout(() => {
        engineRef.current?.resizeCanvas();
      }, 60);
    }
  }, [uiState.phase]);

  const handleReturnToMenu = useCallback(() => {
    if (!engineRef.current) return;
    const s = saveManager.getAll();
    setPersistentStats({
      winCount: s.winCount,
      lossCount: s.lossCount,
      bestScore: s.bestScore,
      totalGamesPlayed: s.totalGamesPlayed,
      highestDifficultyWon: s.highestDifficultyWon,
    });
    engineRef.current.returnToMenu();
  }, []);

  const handleStartGameDirectly = useCallback(
    (
      difficulty: Difficulty,
      mode: GameMode,
      p1Name: string,
      p2Name: string,
    ) => {
      if (!engineRef.current) return;
      saveManager.set("lastPlayedDifficulty", difficulty);
      setUiState((prev) => ({
        ...prev,
        gameMode: mode,
        player1Name: p1Name,
        player2Name: p2Name,
      }));
      engineRef.current.startGame(difficulty, mode, p1Name, p2Name);
      const portrait = typeof window !== "undefined" && window.innerHeight > window.innerWidth;
      engineRef.current.setIsRotated(portrait);
      setTimeout(() => {
        engineRef.current?.resizeCanvas();
      }, 50);
    },
    [],
  );

  const proceedToGame = useCallback(async () => {
    // Persist completed tutorial status
    await saveManager.set("hasCompletedTutorial", true);

    if (pendingGameRef.current) {
      const { difficulty, mode, p1Name, p2Name } = pendingGameRef.current;
      pendingGameRef.current = null; // Clear pending game
      handleStartGameDirectly(difficulty, mode, p1Name, p2Name);
    } else {
      handleReturnToMenu();
    }
  }, [handleStartGameDirectly, handleReturnToMenu]);

  const handleStartGame = (
    difficulty: Difficulty,
    mode: GameMode,
    p1Name: string,
    p2Name: string,
  ) => {
    const hasCompleted = saveManager.get("hasCompletedTutorial");
    if (!hasCompleted) {
      pendingGameRef.current = { difficulty, mode, p1Name, p2Name };
      handleStartTutorial();
    } else {
      handleStartGameDirectly(difficulty, mode, p1Name, p2Name);
    }
  };

  const handleRestart = async () => {
    if (!engineRef.current) return;

    engineRef.current.startGame(
      uiState.difficulty,
      uiState.gameMode,
      uiState.player1Name,
      uiState.player2Name,
    );
    setTimeout(() => {
      engineRef.current?.resizeCanvas();
    }, 50);
  };

  const handleToggleSound = () => {
    if (!engineRef.current) return;
    engineRef.current.toggleSound();
    // Also persist the new sound state
    const muted = engineRef.current.getIsMuted();
    saveManager.set("soundEnabled", !muted);
  };

  const handleSpinChange = (x: number, y: number) => {
    setSpin({ x, y });
    if (engineRef.current) {
      engineRef.current.setSpin(x, y);
    }
  };

  const [isTutorialFinished, setIsTutorialFinished] = useState(false);

  const handleFinishTutorial = useCallback(() => {
    setIsTutorialFinished(true);
    setTimeout(() => {
      setIsTutorialFinished(false);
      proceedToGame();
    }, 2000);
  }, [proceedToGame]);

  const handleStartTutorial = () => {
    if (!engineRef.current) return;
    setIsTutorialFinished(false);
    setTutorialStepIndex(0);
    setHasClickedSpinInTutorial(false);
    const step = TUTORIAL_STEPS[0];
    setUiState((prev) => ({ ...prev, gameMode: GameMode.TUTORIAL }));
    engineRef.current.startTutorialStep(step);
    const portrait = typeof window !== "undefined" && window.innerHeight > window.innerWidth;
    engineRef.current.setIsRotated(portrait);
    setTimeout(() => {
      engineRef.current?.resizeCanvas();
    }, 50);
  };

  const handleNextTutorialStep = useCallback(() => {
    if (!engineRef.current) return;
    if (tutorialStepIndex < TUTORIAL_STEPS.length - 1) {
      const nextIdx = tutorialStepIndex + 1;
      setTutorialStepIndex(nextIdx);
      setHasClickedSpinInTutorial(false);
      engineRef.current.startTutorialStep(TUTORIAL_STEPS[nextIdx]);
    } else {
      handleFinishTutorial();
    }
  }, [tutorialStepIndex, handleFinishTutorial]);

  // Auto-progress tutorial step
  useEffect(() => {
    if (
      uiState.gameMode === GameMode.TUTORIAL &&
      uiState.isTutorialTaskComplete &&
      uiState.phase === GamePhase.PLAYER_TURN
    ) {
      if (tutorialStepIndex >= TUTORIAL_STEPS.length - 2) {
        // Final task step — trigger finished tutorial state & banner
        const timer = setTimeout(() => {
          handleFinishTutorial();
        }, 0);
        return () => clearTimeout(timer);
      } else {
        const delay = tutorialStepIndex === 0 ? 5000 : 1600;
        const timer = setTimeout(() => {
          handleNextTutorialStep();
        }, delay);
        return () => clearTimeout(timer);
      }
    }
  }, [
    uiState.isTutorialTaskComplete,
    uiState.phase,
    uiState.gameMode,
    tutorialStepIndex,
    handleFinishTutorial,
    handleNextTutorialStep,
  ]);

  const isMenu = uiState.phase === GamePhase.MENU;

  return (
    <div className="relative flex flex-col w-full h-screen bg-[#1B273A] overflow-hidden select-none">
      {/* Loading Screen — displayed until assets and progress complete */}
      {isLoading && <LoadingScreen onComplete={handleLoadingComplete} />}

      {/* Main Menu Screen — with persistent stats */}
      {isMenu && (
        <MainMenu
          onStartGame={handleStartGame}
          stats={persistentStats}
          language={language}
          onChangeLanguage={handleChangeLanguage}
        />
      )}

      {/* Active Gameplay HUD / Tutorial Header & Controls */}
      {!isMenu && (
        <>
          {/* Top Header bar — HUD or Tutorial Banner */}
          {uiState.gameMode === GameMode.TUTORIAL ? (
            <div className="w-full h-14 sm:h-16 md:h-20 relative shrink-0 z-30">
              <TutorialOverlay
                currentStep={TUTORIAL_STEPS[tutorialStepIndex]}
                isTaskCompleted={uiState.isTutorialTaskComplete}
                isFinished={isTutorialFinished}
                feedbackMessage={uiState.tutorialFeedbackMessage}
                isError={uiState.isTutorialError}
                onSkip={proceedToGame}
              />
            </div>
          ) : (
            <HUD
              uiState={uiState}
              onReturnToMenu={handleReturnToMenu}
              isPortrait={isPortrait}
            />
          )}

          {/* Win / Defeat Modal */}
          <WinModal
            result={uiState.gameResult}
            difficulty={uiState.difficulty}
            onRestart={handleRestart}
            onReturnToMenu={handleReturnToMenu}
            stats={persistentStats}
            gameMode={uiState.gameMode}
            player1Name={uiState.player1Name}
            player2Name={uiState.player2Name}
          />
        </>
      )}

      {/* HTML5 Canvas Container — takes remaining flex height */}
      <div
        className={`relative flex-1 flex items-center justify-center w-full min-w-0 overflow-hidden transition-all duration-300 ${
          isPortrait ? "p-0.5" : "p-1 sm:p-2"
        } ${
          isMenu
            ? "opacity-0 pointer-events-none absolute inset-0"
            : "opacity-100"
        }`}
      >
        {/* GameAreaWrapper containing the canvas — ALWAYS mounted */}
        <div
          id="game-area-wrapper"
          className={`relative flex items-center justify-start transition-transform duration-300 max-w-none overflow-hidden shrink-0 ${
            uiState.phase === GamePhase.BALL_IN_HAND
              ? "cursor-none"
              : "custom-game-cursor"
          }`}
          style={{
            width: `${TOTAL_GAME_WIDTH * uiState.scale}px`,
            height: `${CANVAS_TOTAL_HEIGHT * uiState.scale}px`,
            transform: isPortrait ? "rotate(-90deg)" : undefined,
          }}
        >
          {/* Main HTML5 Canvas */}
          <canvas
            ref={canvasRef}
            className={`rounded-2xl border border-slate-800/80 transition-transform duration-300 ${
              uiState.phase === GamePhase.BALL_IN_HAND
                ? "cursor-none"
                : "custom-game-cursor"
            }`}
          />

          {/* Transparent Overlay Canvas for Cue Stick rendering under sidebars/HUD */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 pointer-events-none z-20 bg-transparent rounded-2xl"
          />
        </div>

        {/* Left Edge Controls Container: SoundToggle + PowerMeter docked together so they never separate */}
        {!isMenu && (() => {
          const sidebarScale = isPortrait
            ? Math.min(0.95, Math.max(0.65, uiState.scale * 2.2))
            : Math.min(0.75, Math.max(0.46, uiState.scale * 1.6));

          return (
            <div
              className="absolute left-1 sm:left-2 top-1/2 z-30 flex flex-col items-start gap-1.5 sm:gap-2.5 origin-left transition-all duration-300 pointer-events-none left-controls-container"
              style={{
                transform: `translateY(-50%) scale(${sidebarScale})`,
              }}
            >
              {/* LanguageSwitcher: always active pointer events */}
              <div className="pointer-events-auto">
                <LanguageSwitcher
                  language={language}
                  onChangeLanguage={handleChangeLanguage}
                  variant="sidebar"
                  parentScale={sidebarScale}
                />
              </div>

            {/* SoundToggle: always active pointer events */}
            <div className="pointer-events-auto">
              <SoundToggle
                isMuted={uiState.isSoundMuted}
                onToggle={handleToggleSound}
              />
            </div>

            {/* SpinToggle: active pointer events, visible on human player turn or during/after spin tutorial step */}
            {(() => {
              const isTutorialSpinStep =
                uiState.gameMode === GameMode.TUTORIAL &&
                TUTORIAL_STEPS[tutorialStepIndex]?.highlightTarget === "SPIN_BUTTON" &&
                !uiState.isTutorialTaskComplete &&
                !hasClickedSpinInTutorial;

              const isVisible =
                uiState.gameMode === GameMode.TUTORIAL
                  ? (isTutorialSpinStep || tutorialStepIndex >= 4 || hasClickedSpinInTutorial)
                  : ((uiState.currentPlayer === Player.HUMAN &&
                      uiState.phase === GamePhase.PLAYER_TURN) ||
                     (uiState.currentPlayer === Player.PLAYER2 &&
                      uiState.phase === GamePhase.PLAYER2_TURN));

              return (
                <div
                  className={`pointer-events-auto transition-opacity duration-300 ${
                    isVisible ? "opacity-100 z-40" : "opacity-0 pointer-events-none"
                  }`}
                >
                  <SpinToggle
                    spinX={spin.x}
                    spinY={spin.y}
                    onClick={() => {
                      if (uiState.gameMode === GameMode.TUTORIAL) {
                        setHasClickedSpinInTutorial(true);
                      }
                      setIsSpinModalOpen(true);
                    }}
                    isHighlighted={isTutorialSpinStep}
                  />
                </div>
              );
            })()}

            {/* PowerMeter: always in layout to prevent vertical jumping, but visually hidden when not human turn */}
            {(() => {
              const isTutorialPowerStep =
                uiState.gameMode === GameMode.TUTORIAL &&
                TUTORIAL_STEPS[tutorialStepIndex]?.highlightTarget === "POWER_METER" &&
                !uiState.isTutorialTaskComplete;

              return (
                <div
                  className={`pointer-events-auto transition-opacity duration-300 ${
                    (uiState.currentPlayer === Player.HUMAN &&
                      uiState.phase === GamePhase.PLAYER_TURN) ||
                    (uiState.currentPlayer === Player.PLAYER2 &&
                      uiState.phase === GamePhase.PLAYER2_TURN)
                      ? "opacity-100"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  <PowerMeter
                    power={power}
                    isCharging={isCharging}
                    isVisible={true}
                    scale={1}
                    isHighlighted={isTutorialPowerStep && !isCharging}
                    onChargeStart={() => {
                      engineRef.current?.startPowerCharge();
                    }}
                    onChargeUpdate={(p) => {
                      engineRef.current?.updatePowerCharge(p);
                    }}
                    onChargeRelease={() => {
                      engineRef.current?.firePowerShot();
                    }}
                  />
                </div>
              );
            })()}
          </div>
        );
      })()}
      </div>

      {/* Game Notifications Banner Overlay (hidden when game ends so only WinModal shows) */}
      {!isMenu &&
        !uiState.gameResult &&
        uiState.phase !== GamePhase.GAME_OVER && (
          <FoulBanner
            foulReason={uiState.foulReason}
            phase={uiState.phase}
            currentPlayer={uiState.currentPlayer}
            gameResult={uiState.gameResult}
            gameMode={uiState.gameMode}
            player1Name={uiState.player1Name}
            player2Name={uiState.player2Name}
            playerBallType={uiState.playerBallType}
            botBallType={uiState.botBallType}
          />
        )}

      {/* Cue Ball Spin Modal */}
      <SpinModal
        isOpen={isSpinModalOpen}
        spinX={spin.x}
        spinY={spin.y}
        onChange={handleSpinChange}
        onClose={() => setIsSpinModalOpen(false)}
      />
    </div>
  );
};
