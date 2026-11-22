"use client";

import React, { useEffect, useState, useRef } from "react";
import { FoulReason, GamePhase, Player, GameResult, BallType, SoundKey } from "@/lib/types";
import { useTranslations } from "next-intl";
import { soundManager } from "../../lib/game/SoundManager";

interface FoulBannerProps {
  foulReason: FoulReason | null;
  phase: GamePhase;
  currentPlayer: Player;
  gameResult: GameResult | null;
  gameMode?: string;
  player1Name?: string;
  player2Name?: string;
  playerBallType?: BallType | null;
  botBallType?: BallType | null;
}

/**
 * FoulBanner — Responsive notification overlay that displays large central splash cards
 * for temporary events (fouls, turn changes) and persistent floating top pill badges
 * for Ball-in-Hand alerts, featuring a translucent bg-black/20 card background and 3D beveled text.
 */
export const FoulBanner: React.FC<FoulBannerProps> = ({
  foulReason,
  phase,
  currentPlayer,
  gameResult,
  gameMode,
  player1Name = "Player 1",
  player2Name = "Player 2",
  playerBallType = null,
  botBallType = null,
}) => {
  const t = useTranslations("Pool8Ball");
  const [notification, setNotification] = useState<{
    text: string;
    subtext?: string;
    type: "foul" | "turn" | "ball-in-hand";
    textColor: string;
    textShadow: string;
    borderColor: string;
    shadowGlow: string;
    persistent: boolean;
  } | null>(null);

  const [active, setActive] = useState(false);
  const prevPlayerRef = useRef<Player>(currentPlayer);
  const prevPhaseRef = useRef<GamePhase>(phase);
  const prevPlayerBallTypeRef = useRef<BallType | null>(playerBallType);
  const prevBotBallTypeRef = useRef<BallType | null>(botBallType);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstMountRef = useRef(true);
  const prevGameModeRef = useRef<string | undefined>(gameMode);

  // Helper to trigger a temporary notification with auto fadeout
  const triggerTempNotification = (
    text: string,
    subtext: string,
    type: "foul" | "turn",
    textColor: string,
    textShadow: string,
    borderColor: string,
    shadowGlow: string,
    duration: number = 1800,
  ) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    setNotification({
      text,
      subtext,
      type,
      textColor,
      textShadow,
      borderColor,
      shadowGlow,
      persistent: false,
    });
    setActive(true);

    timerRef.current = setTimeout(() => {
      setActive(false);
      // Wait for fadeout animation before clearing state
      timerRef.current = setTimeout(() => {
        setNotification(null);
      }, 500);
    }, duration);
  };

  useEffect(() => {
    const rAF = requestAnimationFrame(() => {
      // 0. If game is over or result is decided, suppress and close any banner immediately so only WinModal shows
      if (gameResult !== null || phase === GamePhase.GAME_OVER) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setActive(false);
        setNotification(null);
        return;
      }

      // 0b. Game Started notification on first mount OR when transitioning from TUTORIAL mode to active gameplay
      const transitionedFromTutorial = prevGameModeRef.current === "TUTORIAL" && gameMode !== "TUTORIAL";
      prevGameModeRef.current = gameMode;

      if (isFirstMountRef.current || transitionedFromTutorial) {
        isFirstMountRef.current = false;
        if (gameMode !== "TUTORIAL") {
          triggerTempNotification(
            t("gameStarted"),
            t("letsPlay"),
            "turn",
            "#38bdf8", // Sky blue
            "0 1px 0 #0284c7, 0 2px 0 #0369a1, 0 3px 0 #075985, 0 4px 1px #0c4a6e, 0 6px 12px rgba(0,0,0,0.6)",
            "border-sky-500/35",
            "shadow-sky-950/20",
            2000
          );
          prevPlayerRef.current = currentPlayer;
          prevPhaseRef.current = phase;
          return;
        }
      }

      // 1. Detect FoulReason trigger
      if (foulReason) {
        let foulText = t("foul");
        let foulSub = t("opponentBallInHand");

        switch (foulReason) {
          case FoulReason.CUE_POCKETED:
            foulText = t("scratch");
            foulSub = t("cuePocketed");
            break;
          case FoulReason.NO_BALL_HIT:
            foulText = t("noBallHit");
            foulSub = t("noBallHitSub");
            break;
          case FoulReason.WRONG_BALL_FIRST:
            foulText = t("wrongBallFirst");
            foulSub = t("wrongBallFirstSub");
            break;
          case FoulReason.EIGHT_BALL_EARLY:
            foulText = t("eightBallEarly");
            foulSub = t("eightBallEarlySub");
            break;
          case FoulReason.NO_CUSHION_TOUCH:
            foulText = t("noCushionTouch");
            foulSub = t("noCushionTouchSub");
            break;
        }

        triggerTempNotification(
          foulText,
          foulSub,
          "foul",
          "#f87171", // light red
          "0 1px 0 #dc2626, 0 2px 0 #b91c1c, 0 3px 0 #991b1b, 0 4px 1px #450a0a, 0 6px 12px rgba(0,0,0,0.6)",
          "border-rose-500/35",
          "shadow-rose-950/20",
          3000,
        );

        prevPlayerRef.current = currentPlayer;
        prevPhaseRef.current = phase;
        return;
      }

      // 2. Detect Ball in Hand (only if not currently showing a temporary foul alert)
      if (phase === GamePhase.BALL_IN_HAND && gameMode !== "TUTORIAL") {
        if (timerRef.current) clearTimeout(timerRef.current);

        const isHuman = currentPlayer === Player.HUMAN;
        setNotification({
          text: isHuman ? t("ballInHand") : t("alexaBallInHand"),
          subtext: isHuman
            ? t("ballInHandSub")
            : t("alexaBallInHandSub"),
          type: "ball-in-hand",
          textColor: isHuman ? "#fbbf24" : "#22d3ee", // amber / cyan
          textShadow: isHuman
            ? "0 1px 0 #d97706, 0 2px 0 #b45309, 0 3px 0 #78350f, 0 4px 6px rgba(0,0,0,0.5)"
            : "0 1px 0 #0891b2, 0 2px 0 #0e7490, 0 3px 0 #155e75, 0 4px 6px rgba(0,0,0,0.5)",
          borderColor: isHuman ? "border-amber-500/30" : "border-cyan-500/30",
          shadowGlow: isHuman ? "shadow-amber-950/15" : "shadow-cyan-950/15",
          persistent: true,
        });
        setActive(true);

        prevPlayerRef.current = currentPlayer;
        prevPhaseRef.current = phase;
        return;
      }

      // 3. Detect Turn Transitions
      const phaseChanged = phase !== prevPhaseRef.current;
      const playerChanged = currentPlayer !== prevPlayerRef.current;

      const isTurnPhase =
        phase === GamePhase.PLAYER_TURN ||
        phase === GamePhase.PLAYER2_TURN ||
        phase === GamePhase.BOT_TURN;

      if ((phaseChanged || playerChanged) && isTurnPhase && gameMode !== "TUTORIAL") {
        soundManager.play(SoundKey.TURN_ALERT, 1.0);
        if (phase === GamePhase.PLAYER_TURN) {
          let titleText = gameMode === "TWO_PLAYER" ? t("playerTurn", { playerName: player1Name.toUpperCase() }) : t("yourTurn");
          let subtext = t("turnSub");
          const justAssigned = playerBallType !== null && prevPlayerBallTypeRef.current === null;
          if (justAssigned) {
            const typeName = playerBallType === BallType.SOLID ? t("solids") : t("stripes");
            titleText = gameMode === "TWO_PLAYER" ? t("isAssigned", { playerName: player1Name.toUpperCase(), typeName }) : t("youAreAssigned", { typeName });
            subtext = ""; // Remove subtitle when showing assignment
          }

          triggerTempNotification(
            titleText,
            subtext,
            "turn",
            "#34d399", // light emerald
            "0 1px 0 #059669, 0 2px 0 #047857, 0 3px 0 #065f46, 0 4px 1px #022c22, 0 6px 12px rgba(0,0,0,0.6)",
            "border-emerald-500/35",
            "shadow-emerald-950/20",
            1800,
          );
        } else if (phase === GamePhase.BOT_TURN || phase === GamePhase.PLAYER2_TURN) {
          let titleText = gameMode === "TWO_PLAYER" ? t("playerTurn", { playerName: player2Name.toUpperCase() }) : t("playerTurn", { playerName: t("alexa").toUpperCase() });
          let subtext = gameMode === "TWO_PLAYER" ? t("turnSub") : t("alexaPlanning");
          const justAssigned = botBallType !== null && prevBotBallTypeRef.current === null;
          if (justAssigned) {
            const typeName = botBallType === BallType.SOLID ? t("solids") : t("stripes");
            titleText = gameMode === "TWO_PLAYER" ? t("isAssigned", { playerName: player2Name.toUpperCase(), typeName }) : t("isAssigned", { playerName: t("alexa").toUpperCase(), typeName });
            subtext = ""; // Remove subtitle when showing assignment
          }

          triggerTempNotification(
            titleText,
            subtext,
            "turn",
            "#60a5fa", // light blue
            "0 1px 0 #2563eb, 0 2px 0 #1d4ed8, 0 3px 0 #1e40af, 0 4px 1px #172554, 0 6px 12px rgba(0,0,0,0.6)",
            "border-blue-500/35",
            "shadow-blue-950/20",
            1800,
          );
        }
      } else if (phaseChanged && !isTurnPhase) {
        setActive(false);
        setNotification(null);
      }

      prevPlayerRef.current = currentPlayer;
      prevPhaseRef.current = phase;
      prevPlayerBallTypeRef.current = playerBallType;
      prevBotBallTypeRef.current = botBallType;
    });

    return () => cancelAnimationFrame(rAF);
  }, [foulReason, phase, currentPlayer, gameResult, gameMode, player1Name, player2Name, playerBallType, botBallType, t]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!notification || gameResult !== null || phase === GamePhase.GAME_OVER) return null;

  const isBallInHand = notification.type === "ball-in-hand";

  return (
    <div
      className={`fixed z-50 flex flex-col items-center justify-center text-center transition-all duration-500 ease-out border backdrop-blur-md select-none pointer-events-none bg-black/20 ${
        isBallInHand
          ? "top-14 sm:top-16 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full border-white/10 scale-100 w-fit max-w-[90vw] animate-pulse"
          : "top-14 sm:top-16 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl border-2 w-fit max-w-[90vw]"
      } ${notification.borderColor} ${notification.shadowGlow} ${
        active
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 -translate-y-8 scale-95"
      }`}
    >
      <h2
        className={`font-black font-display tracking-widest uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] whitespace-nowrap ${
          isBallInHand
            ? "text-xs sm:text-sm font-extrabold tracking-wide"
            : "text-lg sm:text-2xl leading-tight mb-0.5"
        }`}
        style={{
          color: notification.textColor,
          textShadow: notification.textShadow,
        }}
      >
        {notification.text}
      </h2>
      {notification.subtext && (
        <p
          className={`text-slate-200 font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] whitespace-nowrap ${
            isBallInHand
              ? "text-[10px] sm:text-xs opacity-90 mt-0.5 overflow-hidden text-ellipsis"
              : "text-[10px] sm:text-xs opacity-90 mt-0.5"
          }`}
        >
          {notification.subtext}
        </p>
      )}
    </div>
  );
};
