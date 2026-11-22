"use client";

import React from "react";
import { GamePhase, Player } from "@/lib/types";
import { Play, Sparkles, Move } from "lucide-react";

interface TurnIndicatorProps {
  phase: GamePhase;
  currentPlayer: Player;
}

/**
 * TurnIndicator — Top center dynamic banner indicating the current game status and turn owner.
 */
export const TurnIndicator: React.FC<TurnIndicatorProps> = ({ phase, currentPlayer }) => {
  const isHuman = currentPlayer === Player.HUMAN;

  if (phase === GamePhase.MENU || phase === GamePhase.GAME_OVER) {
    return null;
  }

  const getPhaseInfo = () => {
    switch (phase) {
      case GamePhase.BALLS_MOVING:
        return {
          title: "Balls in Motion",
          subtitle: "Evaluating physics & collisions...",
          color: "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]",
          icon: <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />,
        };
      case GamePhase.BALL_IN_HAND:
        return {
          title: isHuman ? "Your Ball-In-Hand!" : "Bot Placing Cue Ball",
          subtitle: isHuman ? "Click anywhere inside table bounds to place cue ball" : "Bot selecting position...",
          color: isHuman
            ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse"
            : "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]",
          icon: <Move className="w-4 h-4 text-emerald-400" />,
        };
      case GamePhase.BOT_TURN:
        return {
          title: "Bot Thinking...",
          subtitle: "Calculating angles & trajectory",
          color: "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]",
          icon: <Sparkles className="w-4 h-4 animate-bounce text-amber-400" />,
        };
      default:
        // PLAYER_TURN
        return {
          title: "Your Turn to Shoot",
          subtitle: "Drag and release anywhere to strike cue ball",
          color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
          icon: <Play className="w-4 h-4 fill-emerald-400 text-emerald-400" />,
        };
    }
  };

  const info = getPhaseInfo();

  return (
    <div
      className={`flex items-center gap-3 px-5 py-2.5 rounded-full backdrop-blur-md border transition-all duration-300 ${info.color}`}
    >
      <div className="flex items-center justify-center p-1.5 rounded-full bg-white/10 shrink-0">
        {info.icon}
      </div>
      <div className="flex flex-col">
        <span className="font-bold font-display text-sm leading-tight tracking-wide">{info.title}</span>
        <span className="text-[11px] text-slate-300 font-normal leading-tight opacity-90">
          {info.subtitle}
        </span>
      </div>
    </div>
  );
};
