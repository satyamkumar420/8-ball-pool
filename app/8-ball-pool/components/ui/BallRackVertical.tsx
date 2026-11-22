"use client";

import React from "react";
import { BallType } from "@/lib/types";
import { BALL_VISUALS } from "@/lib/constants/balls";

interface BallRackVerticalProps {
  ballType: BallType | null;
  allPocketed: number[];
  fallbackType: "solids" | "stripes";
}

/**
 * BallRackVertical — Vertical rack displaying Solids or Stripes dynamically.
 * Maps Solids (1-7) or Stripes (9-15) depending on active player category assignment.
 * Stacking Logic: Pocketed balls are removed, rendering empty slots at the top,
 * and pushing active colored 3D balls to the bottom.
 */
export const BallRackVertical: React.FC<BallRackVerticalProps> = ({
  ballType,
  allPocketed,
  fallbackType,
}) => {
  // Resolve active category: use assigned ballType or fallback before assignment
  const resolvedCategory = ballType
    ? ballType
    : fallbackType === "solids"
      ? BallType.SOLID
      : BallType.STRIPE;

  // Define set of IDs for resolved category
  const ballIds =
    resolvedCategory === BallType.SOLID
      ? [1, 2, 3, 4, 5, 6, 7]
      : [9, 10, 11, 12, 13, 14, 15];

  // Separate pocketed and active balls
  const pocketedCount = ballIds.filter((id) => allPocketed.includes(id)).length;
  const activeBalls = ballIds.filter((id) => !allPocketed.includes(id));

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
      {/* 1. Render empty slot placeholders first (accumulate at the top) */}
      {Array.from({ length: pocketedCount }).map((_, idx) => (
        <div
          key={`empty-${idx}`}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#131922] border-2 border-t-[#0c0f14] border-l-[#0c0f14] border-b-[#475264] border-r-[#475264] shadow-[inset_0_4px_6px_rgba(0,0,0,0.85),0_1px_0_rgba(255,255,255,0.06)] flex items-center justify-center transition-all duration-300"
        >
          {/* Subtle center inner shadow dot */}
          <div className="w-2 h-2 rounded-full bg-black/45 shadow-inner" />
        </div>
      ))}

      {/* 2. Render remaining active balls in order below the empty slots */}
      {activeBalls.map((id) => {
        const visual = BALL_VISUALS[id];
        if (!visual) return null;

        const isStripe = id > 8;

        return (
          <div
            key={id}
            className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/15 shadow-[0_3px_5px_rgba(0,0,0,0.5),inset_-1.5px_-1.5px_3.5px_rgba(0,0,0,0.5)] overflow-hidden scale-100 hover:scale-105 transition-transform duration-300 select-none cursor-default"
            style={{ backgroundColor: isStripe ? "#ffffff" : visual.color }}
            title={`Ball ${id} (${visual.type})`}
          >
            {/* 3D sphere gradient overlay */}
            <div className="absolute inset-0 bg-radial from-white/30 via-transparent to-black/35 pointer-events-none" />

            {/* Gloss highlight */}
            <div className="absolute top-0.5 left-0.5 w-2 h-1.5 bg-white/45 filter blur-[0.3px]" />

            {isStripe ? (
              // Stripe Ball Visual: white body base, colored stripe band, white circle center
              <>
                {/* Horizontal colored stripe band */}
                <div
                  className="absolute inset-y-1.5 inset-x-0 shadow-inner"
                  style={{ backgroundColor: visual.color }}
                />
                {/* Inner white circle for the number */}
                <div className="absolute w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-white flex items-center justify-center shadow-[inset_0.5px_0.5px_1px_rgba(0,0,0,0.15)] z-10">
                  <span className="text-[9px] sm:text-[10px] font-black text-slate-900 leading-none">
                    {visual.label}
                  </span>
                </div>
              </>
            ) : (
              // Solid Ball Visual: colored body base, white circle center
              <div className="flex items-center justify-center w-4 h-4 sm:w-4.5 sm:h-4.5 bg-white rounded-full shadow-[inset_0.5px_0.5px_1px_rgba(0,0,0,0.15)]">
                <span className="text-[9px] sm:text-[10px] font-black text-slate-900 leading-none">
                  {visual.label}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
