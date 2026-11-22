"use client";

import React from "react";
import { BallType } from "@/lib/types";
import { BALL_VISUALS } from "@/lib/constants/balls";

interface HUDballRackProps {
  ballType: BallType | null;
  allPocketed: number[];
  alignRight?: boolean;
}

/**
 * HUDBallRack — Horizontal rack in the HUD showing assigned ball category.
 *
 * Behavior:
 * - Initially EMPTY (no balls shown until ball type is assigned)
 * - Once ball type assigned (SOLID/STRIPE), all 7 balls appear
 * - As balls get pocketed, they are removed and empty inset slots stack at the end
 * - Remaining balls stay grouped together, empties accumulate sequentially
 */
export const HUDBallRack: React.FC<HUDballRackProps> = ({
  ballType,
  allPocketed,
  alignRight = true,
}) => {
  const justifyClass = alignRight ? "justify-end" : "justify-start";

  // Render 7 empty inset slots by default when category is not yet assigned
  if (!ballType) {
    return (
      <div className={`flex flex-nowrap gap-0.5 sm:gap-1 items-center ${justifyClass} w-full`}>
        {Array.from({ length: 7 }).map((_, idx) => (
          <div
            key={`empty-init-${idx}`}
            className="w-3.5 h-3.5 min-[380px]:w-4.5 min-[380px]:h-4.5 sm:w-6.5 sm:h-6.5 md:w-8 md:h-8 shrink-0 rounded-full bg-[#1e2a3a] border-2 border-t-[#141d2b] border-l-[#141d2b] border-b-[#3a4a5e] border-r-[#3a4a5e] shadow-[inset_0_3px_8px_rgba(0,0,0,0.85),inset_0_1px_3px_rgba(0,0,0,0.6)] transition-all duration-500"
          />
        ))}
      </div>
    );
  }

  // Determine which ball IDs belong to this category
  const ballIds =
    ballType === BallType.SOLID
      ? [1, 2, 3, 4, 5, 6, 7]
      : [9, 10, 11, 12, 13, 14, 15];

  // Separate active and pocketed — active balls first, then empty slots
  const activeBalls = ballIds.filter((id) => !allPocketed.includes(id));
  const pocketedCount = ballIds.length - activeBalls.length;

  return (
    <div className={`flex flex-nowrap gap-0.5 sm:gap-1 items-center ${justifyClass} w-full`}>
      {/* 1. Active balls grouped together first */}
      {activeBalls.map((id) => {
        const visual = BALL_VISUALS[id];
        if (!visual) return null;
        const isStripe = id > 8;

        return (
          <div
            key={id}
            className="relative flex items-center justify-center w-3.5 h-3.5 min-[380px]:w-4.5 min-[380px]:h-4.5 sm:w-6.5 sm:h-6.5 md:w-8 md:h-8 shrink-0 rounded-full border border-white/15 shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_-1px_-1px_3px_rgba(0,0,0,0.5)] overflow-hidden select-none transition-all duration-300"
            style={{ backgroundColor: isStripe ? "#ffffff" : visual.color }}
            title={`Ball ${id}`}
          >
            {/* 3D sphere gradient overlay */}
            <div className="absolute inset-0 bg-radial from-white/30 via-transparent to-black/35 pointer-events-none" />

            {isStripe ? (
              <>
                {/* Horizontal colored stripe band */}
                <div
                  className="absolute inset-y-0.5 min-[380px]:inset-y-1 sm:inset-y-1.5 inset-x-0 shadow-inner"
                  style={{ backgroundColor: visual.color }}
                />
                {/* Inner white circle for the number */}
                <div className="absolute w-2 h-2 min-[380px]:w-2.5 min-[380px]:h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 rounded-full bg-white flex items-center justify-center shadow-[inset_0.5px_0.5px_1px_rgba(0,0,0,0.15)] z-10">
                  <span className="text-[6px] min-[380px]:text-[7px] sm:text-[8px] md:text-[9px] font-black text-slate-900 leading-none">
                    {visual.label}
                  </span>
                </div>
              </>
            ) : (
              // Solid Ball Visual
              <div className="flex items-center justify-center w-2 h-2 min-[380px]:w-2.5 min-[380px]:h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 bg-white rounded-full shadow-[inset_0.5px_0.5px_1px_rgba(0,0,0,0.15)]">
                <span className="text-[6px] min-[380px]:text-[7px] sm:text-[8px] md:text-[9px] font-black text-slate-900 leading-none">
                  {visual.label}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* 2. Empty inset slots stacked sequentially at the end */}
      {Array.from({ length: pocketedCount }).map((_, idx) => (
        <div
          key={`empty-${idx}`}
          className="w-3.5 h-3.5 min-[380px]:w-4.5 min-[380px]:h-4.5 sm:w-6.5 sm:h-6.5 md:w-8 md:h-8 shrink-0 rounded-full bg-[#1e2a3a] border-2 border-t-[#141d2b] border-l-[#141d2b] border-b-[#3a4a5e] border-r-[#3a4a5e] shadow-[inset_0_3px_8px_rgba(0,0,0,0.85),inset_0_1px_3px_rgba(0,0,0,0.6)] transition-all duration-500"
        />
      ))}
    </div>
  );
};
