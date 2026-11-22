"use client";

import React, { useState } from "react";
import { IGameUIState, Player } from "@/lib/types";
import { SteveAvatar } from "./SteveAvatar";
import { HUDBallRack } from "./PocketedBalls";
import { useTranslations } from "next-intl";

interface HUDProps {
  uiState: IGameUIState;
  onReturnToMenu: () => void;
  isPortrait?: boolean;
}

/**
 * HUD — Gameplay header with centered dual avatars.
 * Layout: [Player Balls] [YOU avatar | AI BOT avatar] [Bot Balls]
 */
export const HUD: React.FC<HUDProps> = ({ uiState }) => {
  const t = useTranslations("Pool8Ball");
  const {
    currentPlayer,
    playerBallType,
    botBallType,
    player1Name,
    player2Name,
    gameMode,
    allPocketed,
  } = uiState;

  // Select random avatars once on mount (after hydration)
  const [avatars, setAvatars] = useState({
    p1: "./avatar_1.jpg",
    p2: "./avatar_2.jpg",
  });

  React.useEffect(() => {
    const rAF = requestAnimationFrame(() => {
      const p1Idx = Math.floor(Math.random() * 10) + 1;
      let p2Idx = Math.floor(Math.random() * 10) + 1;
      while (p2Idx === p1Idx) {
        p2Idx = Math.floor(Math.random() * 10) + 1;
      }
      setAvatars({
        p1: `./avatar_${p1Idx}.jpg`,
        p2: `./avatar_${p2Idx}.jpg`,
      });
    });
    return () => cancelAnimationFrame(rAF);
  }, []);

  const isPlayer1Active = currentPlayer === Player.HUMAN;
  const isPlayer2Active =
    currentPlayer === Player.BOT || currentPlayer === Player.PLAYER2;

  return (
    <div className="w-full flex items-center justify-between px-1 sm:px-3 py-1 sm:py-2 md:py-3 select-none pointer-events-none z-30 relative shrink-0 max-w-full overflow-hidden">
      {/* ─── Left: Player's Ball Rack ─── */}
      <div className="flex-1 flex items-center justify-end min-w-0 pr-0.5 sm:pr-2 overflow-hidden">
        <HUDBallRack
          ballType={playerBallType}
          allPocketed={allPocketed}
          alignRight={true}
        />
      </div>

      {/* ─── Center: Both Avatars Side by Side ─── */}
      <div className="flex items-center gap-0.5 min-[380px]:gap-1 sm:gap-2 md:gap-4 shrink-0 mx-0.5 sm:mx-2">
        {/* Player 1 — YOU */}
        <div className="flex flex-col items-center">
          <div
            className={`w-7 h-7 min-[380px]:w-8 min-[380px]:h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-lg sm:rounded-xl overflow-hidden transition-all duration-300 border-2 ${
              isPlayer1Active
                ? "border-emerald-400 shadow-[0_0_15px_#10b981,0_0_5px_#10b981] scale-105"
                : "border-slate-800 shadow-lg scale-100 opacity-85"
            }`}
          >
            <img
              src={avatars.p1}
              alt="Player 1"
              className="w-full h-full object-cover object-center"
            />
          </div>
          <div className="flex items-start justify-center gap-1 mt-0.5 max-w-12 min-[380px]:max-w-16 sm:max-w-20 md:max-w-28">
            <span className="text-[8px] min-[380px]:text-[10px] sm:text-xs md:text-base font-black font-display text-slate-100 uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] wrap-break-word text-center leading-tight">
              {gameMode === "SINGLE_PLAYER"
                ? t("you").toUpperCase()
                : player1Name}
            </span>
          </div>
        </div>

        {/* VS Divider */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[8px] min-[380px]:text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
            vs
          </span>
        </div>

        {/* Player 2 — AI BOT */}
        <div className="flex flex-col items-center relative">
          <div
            className={`w-7 h-7 min-[380px]:w-8 min-[380px]:h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-lg sm:rounded-xl overflow-hidden transition-all duration-300 border-2 ${
              isPlayer2Active
                ? "border-emerald-400 shadow-[0_0_15px_#10b981,0_0_5px_#10b981] scale-105"
                : "border-slate-800 shadow-lg scale-100 opacity-85"
            }`}
          >
            {gameMode === "TWO_PLAYER" ? (
              <img
                src={avatars.p2}
                alt="Player 2"
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <SteveAvatar />
            )}
          </div>
          <div className="flex items-start justify-center gap-1 mt-0.5 max-w-12 min-[380px]:max-w-16 sm:max-w-20 md:max-w-28">
            <span className="text-[8px] min-[380px]:text-[10px] sm:text-xs md:text-base font-black font-display text-slate-100 uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] wrap-break-word text-center leading-tight">
              {gameMode === "TWO_PLAYER"
                ? player2Name
                : t("alexa").toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Right: Bot's Ball Rack ─── */}
      <div className="flex-1 flex items-center justify-start min-w-0 pl-0.5 sm:pl-2 overflow-hidden">
        <HUDBallRack
          ballType={botBallType}
          allPocketed={allPocketed}
          alignRight={false}
        />
      </div>
    </div>
  );
};
