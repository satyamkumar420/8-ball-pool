"use client";

import React from "react";
import { GameResult, Difficulty } from "@/lib/types";
import { RefreshCw } from "lucide-react";
import { Confetti } from "./Confetti";
import { useTranslations } from "next-intl";

interface WinModalProps {
  result: GameResult | null;
  difficulty: Difficulty;
  onRestart: () => void;
  onReturnToMenu: () => void;
  stats?: {
    winCount: number;
    lossCount: number;
    bestScore: number;
    totalGamesPlayed: number;
    highestDifficultyWon: Difficulty;
  };
  gameMode?: string;
  player1Name?: string;
  player2Name?: string;
}

/**
 * Custom Animated Victory Trophy SVG Icon
 */
const VictoryIcon: React.FC = () => (
  <svg
    viewBox="0 0 100 100"
    className="w-full h-full drop-shadow-[0_0_15px_rgba(245,158,11,0.6)] select-none"
  >
    <defs>
      <radialGradient id="winGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FDE047" stopOpacity="0.8" />
        <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#B45309" stopOpacity="0" />
      </radialGradient>

      <linearGradient id="goldTrophyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="35%" stopColor="#F59E0B" />
        <stop offset="70%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#92400E" />
      </linearGradient>

      <linearGradient id="goldShinyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#FDE047" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.9" />
      </linearGradient>

      <linearGradient id="darkGoldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>

      <style>{`
        @keyframes trophyFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(2deg); }
        }
        @keyframes sparklePulse {
          0%, 100% { transform: scale(0.6); opacity: 0.3; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes rayRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-trophy-float {
          animation: trophyFloat 3s ease-in-out infinite;
          transform-origin: center center;
        }
        .animate-sparkle-1 {
          animation: sparklePulse 1.8s ease-in-out infinite;
          transform-origin: 22px 28px;
        }
        .animate-sparkle-2 {
          animation: sparklePulse 2.2s ease-in-out infinite 0.6s;
          transform-origin: 78px 28px;
        }
        .animate-sparkle-3 {
          animation: sparklePulse 1.5s ease-in-out infinite 0.3s;
          transform-origin: 50px 18px;
        }
        .animate-ray-spin {
          animation: rayRotate 12s linear infinite;
          transform-origin: 50px 50px;
        }
      `}</style>
    </defs>

    {/* Radiant Background Sunburst Rays */}
    <g className="animate-ray-spin" opacity="0.4">
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={i}
          x1="50"
          y1="50"
          x2={50 + 42 * Math.cos((i * Math.PI) / 4)}
          y2={50 + 42 * Math.sin((i * Math.PI) / 4)}
          stroke="#FDE047"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
      ))}
    </g>

    {/* Ambient Glow Aura */}
    <circle cx="50" cy="50" r="38" fill="url(#winGlow)" />

    <g className="animate-trophy-float">
      {/* Outer Trophy Handles */}
      <path
        d="M 28 26 C 16 26, 16 48, 30 48 L 34 48 C 34 58, 42 64, 50 64 C 58 64, 66 58, 66 48 L 70 48 C 84 48, 84 26, 72 26 Z"
        fill="url(#goldTrophyGrad)"
      />
      {/* Inner Handle Cutouts */}
      <path
        d="M 28 32 C 22 32, 22 42, 31 42 L 32 42 C 32 38, 30 34, 28 32 Z"
        fill="#0b1320"
      />
      <path
        d="M 72 32 C 78 32, 78 42, 69 42 L 68 42 C 68 38, 70 34, 72 32 Z"
        fill="#0b1320"
      />

      {/* Main Cup Body */}
      <path
        d="M 32 24 L 68 24 L 62 52 C 57 60, 43 60, 38 52 Z"
        fill="url(#goldShinyGrad)"
      />

      {/* Cup Rim Highlight */}
      <ellipse cx="50" cy="24" rx="18" ry="4" fill="#FEF08A" />

      {/* Pedestal Stem & Base */}
      <path d="M 46 60 L 54 60 L 55 72 L 45 72 Z" fill="url(#goldTrophyGrad)" />
      <path d="M 33 72 L 67 72 L 70 82 L 30 82 Z" fill="url(#darkGoldGrad)" />
      <rect x="34" y="80" width="32" height="3" fill="#FDE047" rx="1.5" />

      {/* Center Trophy Star Emblem */}
      <polygon
        points="50,30 52.5,36.5 59.5,36.5 54,40.5 56,47 50,43 44,47 46,40.5 40.5,36.5 47.5,36.5"
        fill="#FFFFFF"
      />
    </g>

    {/* Sparkle Stars */}
    <polygon
      points="22,28 23.5,31 27,31 24,33 25,36 22,34 19,36 20,33 17,31 20.5,31"
      fill="#FFFFFF"
      className="animate-sparkle-1"
    />
    <polygon
      points="78,28 79.5,31 83,31 80,33 81,36 78,34 75,36 76,33 73,31 76.5,31"
      fill="#FFFFFF"
      className="animate-sparkle-2"
    />
    <polygon
      points="50,14 51.5,17 55,17 52,19 53,22 50,20 47,22 48,19 45,17 48.5,17"
      fill="#FDE047"
      className="animate-sparkle-3"
    />
  </svg>
);

/**
 * Custom Animated Defeat Expressive SVG Icon
 */
const DefeatIcon: React.FC = () => (
  <svg
    viewBox="0 0 100 100"
    className="w-full h-full drop-shadow-[0_0_15px_rgba(244,63,94,0.6)] select-none"
  >
    <defs>
      <radialGradient id="defeatGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.6" />
        <stop offset="70%" stopColor="#E11D48" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#881337" stopOpacity="0" />
      </radialGradient>

      <linearGradient id="roseRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDA4AF" />
        <stop offset="50%" stopColor="#F43F5E" />
        <stop offset="100%" stopColor="#9F1239" />
      </linearGradient>

      <linearGradient id="tearGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>

      <style>{`
        @keyframes defeatSway {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(3px) rotate(-3deg); }
        }
        @keyframes tearDrop {
          0% { transform: translateY(0px); opacity: 0; }
          30% { opacity: 0.9; }
          80% { transform: translateY(14px); opacity: 1; }
          100% { transform: translateY(18px); opacity: 0; }
        }
        @keyframes ringPulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        .animate-defeat-sway {
          animation: defeatSway 3.2s ease-in-out infinite;
          transform-origin: center center;
        }
        .animate-tear-anim {
          animation: tearDrop 2.2s ease-in-out infinite 0.5s;
        }
        .animate-ring-pulse {
          animation: ringPulse 2s ease-in-out infinite;
          transform-origin: 50px 50px;
        }
      `}</style>
    </defs>

    {/* Ambient Glow Aura */}
    <circle cx="50" cy="50" r="42" fill="url(#defeatGlow)" />

    {/* Outer Neon Ring */}
    <circle
      cx="50"
      cy="50"
      r="40"
      fill="#0f172a"
      stroke="url(#roseRingGrad)"
      strokeWidth="4"
      className="animate-ring-pulse"
    />

    <g className="animate-defeat-sway">
      {/* Slanted Sad Eyebrows */}
      <path
        d="M 28 35 L 42 41"
        stroke="#FDA4AF"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M 72 35 L 58 41"
        stroke="#FDA4AF"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Eyes */}
      <ellipse cx="36" cy="48" rx="4.5" ry="5.5" fill="#F43F5E" />
      <ellipse cx="64" cy="48" rx="4.5" ry="5.5" fill="#F43F5E" />
      <circle cx="34.5" cy="46" r="1.5" fill="#FFFFFF" />
      <circle cx="62.5" cy="46" r="1.5" fill="#FFFFFF" />

      {/* Animated Dripping Teardrop (Left Eye) */}
      <g className="animate-tear-anim">
        <path
          d="M 33 54 C 31 54 29 57 29 59 C 29 62 31 63 33 63 C 35 63 37 62 37 59 C 37 57 35 54 33 54 Z"
          fill="url(#tearGrad)"
        />
      </g>

      {/* Downward Sad Curved Mouth */}
      <path
        d="M 32 72 Q 50 56 68 72"
        fill="none"
        stroke="#F43F5E"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Slight Tear Stain under Eye */}
      <path
        d="M 36 54 C 36 58 35 60 33 62"
        stroke="rgba(56, 189, 248, 0.4)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  </svg>
);

/**
 * WinModal — Stunning celebration / defeat overlay modal with restart and main menu navigation.
 */
export const WinModal: React.FC<WinModalProps> = ({
  result,
  difficulty,
  onRestart,
  onReturnToMenu,
  gameMode,
  player1Name = "Player 1",
  player2Name = "Player 2",
}) => {
  const t = useTranslations("Pool8Ball");

  if (!result) return null;

  const getBotTitle = (diff: Difficulty) => {
    switch (diff) {
      case Difficulty.EASY:
        return t("casualLounge");
      case Difficulty.MEDIUM:
        return t("neonClub8");
      case Difficulty.HARD:
        return t("proMasters");
      default:
        return t("alexa");
    }
  };

  const botTitle = getBotTitle(difficulty);
  const isPlayerWin = result === GameResult.PLAYER_WIN;
  const isWinnerTheme = isPlayerWin || gameMode === "TWO_PLAYER";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md transition-all animate-in fade-in duration-300">
        <div
          className={`relative flex flex-col items-center max-w-md w-full p-3.5 min-[400px]:p-5 sm:p-7 rounded-2xl sm:rounded-3xl border backdrop-blur-xl bg-slate-950/90 transition-all duration-500 animate-in zoom-in-95 ${
            isWinnerTheme
              ? "border-emerald-500/45 shadow-[0_0_40px_rgba(16,185,129,0.25)] animate-win-glow"
              : "border-rose-500/45 shadow-[0_0_40px_rgba(239,68,68,0.25)] animate-lose-glow"
          }`}
        >
          {/* Ambient background glow orb */}
          <div
            className={`absolute -top-32 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none ${
              isWinnerTheme ? "bg-emerald-400" : "bg-rose-500"
            }`}
          />

          {/* Animated Icon Container */}
          <div
            className={`relative flex items-center justify-center w-11 h-11 min-[400px]:w-14 min-[400px]:h-14 sm:w-18 sm:h-18 rounded-full border-2 mb-2 min-[400px]:mb-3 sm:mb-4 shadow-xl shrink-0 transition-all duration-300 ${
              isWinnerTheme
                ? "bg-emerald-500/15 border-emerald-400/60 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                : "bg-rose-500/15 border-rose-400/60 text-rose-300 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
            }`}
          >
            {isWinnerTheme ? <VictoryIcon /> : <DefeatIcon />}
          </div>

          {/* Snappy Shimmer Title */}
          <h2
            className={`text-xl min-[400px]:text-2xl sm:text-3.5xl font-black font-display text-center tracking-wider mb-1 sm:mb-1.5 select-none uppercase animate-text-shimmer ${
              isWinnerTheme
                ? "bg-linear-to-r from-emerald-400 via-teal-200 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(52,211,153,0.35)]"
                : "bg-linear-to-r from-rose-500 via-red-300 to-rose-500 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(244,63,94,0.35)]"
            }`}
          >
            {gameMode === "TWO_PLAYER"
              ? isPlayerWin
                ? t("playerWins", { playerName: player1Name })
                : t("playerWins", { playerName: player2Name })
              : isPlayerWin
                ? t("victory")
                : t("defeat")}
          </h2>

          {/* Subtitle showing Alexa Wins when appropriate */}
          {!isPlayerWin && gameMode !== "TWO_PLAYER" && (
            <div className="px-2.5 py-0.5 mb-1.5 sm:mb-2 rounded-full bg-rose-500/10 border border-rose-500/25 text-[8px] min-[400px]:text-[9px] sm:text-[10px] text-rose-300 font-bold uppercase tracking-widest animate-pulse">
              {t("alexaWins")}
            </div>
          )}

          {/* Description */}
          <p className="text-[11px] min-[400px]:text-xs sm:text-sm font-semibold text-slate-300 text-center px-1 mb-2.5 sm:mb-3.5 leading-tight sm:leading-relaxed opacity-90 select-none">
            {gameMode === "TWO_PLAYER"
              ? isPlayerWin
                ? t("pvpWinDesc", {
                    playerName: player1Name,
                    opponentName: player2Name,
                  })
                : t("pvpWinDesc", {
                    playerName: player2Name,
                    opponentName: player1Name,
                  })
              : isPlayerWin
                ? t("playerWinDesc", { botTitle })
                : t("playerLossDesc")}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col w-full gap-2 sm:gap-2.5 mt-0.5 sm:mt-1">
            <button
              onClick={onRestart}
              className={`flex items-center justify-center gap-2 w-full py-2 min-[400px]:py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-black text-xs min-[400px]:text-sm sm:text-base shadow-lg transition-all duration-300 cursor-pointer active:scale-95 ${
                isWinnerTheme
                  ? "bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:scale-[1.02]"
                  : "bg-linear-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-500/20 hover:shadow-rose-500/35 hover:scale-[1.02]"
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 min-[400px]:w-4 min-[400px]:h-4 sm:w-5 sm:h-5 animate-spin-slow" />
              <span>{t("playAgain")}</span>
            </button>

            <button
              onClick={onReturnToMenu}
              className="flex items-center justify-center w-full py-1.5 min-[400px]:py-2 sm:py-2.5 px-4 sm:px-6 rounded-xl font-bold text-[11px] min-[400px]:text-xs sm:text-sm text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 cursor-pointer active:scale-95 hover:text-white"
            >
              {t("returnToMenu")}
            </button>
          </div>
        </div>
      </div>
      {isWinnerTheme && <Confetti />}
    </>
  );
};
