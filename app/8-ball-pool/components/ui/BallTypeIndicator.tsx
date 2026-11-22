"use client";

import React from "react";
import { BallType, Player } from "@/lib/types";
import { BALL_VISUALS } from "@/lib/constants/balls";
import { BulldogAvatar } from "./BulldogAvatar";
import { SteveAvatar } from "./SteveAvatar";

interface BallTypeIndicatorProps {
  player: Player;
  ballType: BallType | null;
  pocketedIds: number[];
  isActiveTurn: boolean;
  /** If true, reverses layout so avatar is on right and balls flow left (for bot side) */
  reverse?: boolean;
}

/**
 * BallTypeIndicator — Compact horizontal player panel for the top HUD bar.
 * Shows avatar, player name, ball-type badge, and pocketed balls in a single row.
 * Matches the premium look shown in reference image.
 */
export const BallTypeIndicator: React.FC<BallTypeIndicatorProps> = ({
  player,
  pocketedIds,
  isActiveTurn,
  reverse = false,
}) => {
  const isHuman = player === Player.HUMAN;

  // Active turn glow border color
  const containerClass = isActiveTurn
    ? isHuman
      ? "border-emerald-400/70 shadow-[0_0_14px_rgba(16,185,129,0.25),inset_0_1px_0_rgba(255,255,255,0.06)]"
      : "border-amber-400/70 shadow-[0_0_14px_rgba(245,158,11,0.25),inset_0_1px_0_rgba(255,255,255,0.06)]"
    : "border-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

  // Avatar glow
  const avatarClass = isActiveTurn
    ? isHuman
      ? "bg-emerald-500/20 border-emerald-400/80 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
      : "bg-amber-500/20 border-amber-400/80 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
    : "bg-white/5 border-white/15 text-slate-400";

  const activeDot = isActiveTurn ? (
    <span
      className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-950 animate-pulse ${
        isHuman ? "bg-emerald-400" : "bg-amber-400"
      }`}
    />
  ) : null;


  // Pocketed balls row with a sunken tray feel
  const ballsRow = (
    <div
      className={`flex items-center gap-1 px-1 py-1 rounded-full bg-black/50 border border-white/6 shadow-[inset_0_3px_8px_rgba(0,0,0,0.8)] min-w-13 ${
        reverse ? "flex-row-reverse justify-end" : "flex-row"
      } overflow-x-auto max-w-30 sm:max-w-40 custom-scrollbar`}
    >
      {pocketedIds.length === 0
        ? // Placeholder dots when no balls pocketed yet
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-full border border-dashed border-white/10 opacity-25 shrink-0"
            />
          ))
        : pocketedIds.map((id) => {
            const visual = BALL_VISUALS[id];
            const isStripe = id > 8;
            return (
              <div
                key={id}
                className="relative flex items-center justify-center w-6 h-6 rounded-full shrink-0 border border-white/15 shadow-[0_2px_5px_rgba(0,0,0,0.7),inset_-1px_-1px_3px_rgba(0,0,0,0.4)] overflow-hidden"
                style={{ backgroundColor: visual?.color || "#ffffff" }}
                title={`Ball ${id}`}
              >
                {/* Gloss highlight */}
                <div className="absolute top-0.5 left-0.5 w-1.5 h-1 rounded-full bg-white/45 filter blur-[0.5px]" />

                {isStripe && (
                  <div className="absolute inset-x-0 h-2 bg-white shadow-inner flex items-center justify-center">
                    <span className="text-[6px] font-extrabold text-black leading-none">
                      {visual?.label}
                    </span>
                  </div>
                )}
                {!isStripe && (
                  <div className="flex items-center justify-center w-3 h-3 bg-white rounded-full shadow-sm">
                    <span className="text-[6px] font-extrabold text-black leading-none">
                      {visual?.label}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
    </div>
  );
  // Avatar
  const avatar = (
    <div
      className={`relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 overflow-hidden transition-all duration-300 shrink-0 ${avatarClass}`}
    >
      {isHuman ? (
        <BulldogAvatar className="w-full h-full object-cover object-center" />
      ) : (
        <SteveAvatar className="w-full h-full object-cover object-center" />
      )}
      {activeDot}
    </div>
  );

  return (
    <div
      className={`flex items-center gap-1 px-1 py-1.5 sm:px-3 sm:py-2 rounded-full border-2 bg-linear-to-r transition-all duration-300 ${
        isHuman
          ? "from-slate-900/80 to-slate-800/60"
          : "from-slate-800/60 to-slate-900/80"
      } ${containerClass} ${reverse ? "flex-row-reverse" : "flex-row"}`}
    >
      {avatar}
      {ballsRow}
    </div>
  );
};
