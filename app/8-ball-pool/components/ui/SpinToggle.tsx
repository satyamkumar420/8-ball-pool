"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface SpinToggleProps {
  spinX: number; // Range [-1, 1]
  spinY: number; // Range [-1, 1]
  onClick: () => void;
  disabled?: boolean;
  isHighlighted?: boolean;
}

/**
 * SpinToggle — Glassmorphic sidebar button displaying a mini 3D cue ball
 * with a red dot representing the active spin offset.
 * Includes tutorial highlight glow and pointing hand indicator when isHighlighted is true.
 */
export const SpinToggle: React.FC<SpinToggleProps> = ({
  spinX,
  spinY,
  onClick,
  disabled = false,
  isHighlighted = false,
}) => {
  const t = useTranslations("Pool8Ball");

  // Map normalized spin [-1, 1] to absolute percentage offsets from center (50%)
  // Max offset is capped at 35% to keep the red pointer comfortably inside the border
  const pointerLeft = `${50 + spinX * 35}%`;
  const pointerTop = `${50 - spinY * 35}%`;

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`relative left-0 flex items-center justify-end pl-0 pr-2 sm:pr-2.5 lg:pr-3 py-2 sm:py-3 lg:py-3.5 bg-[#292e35] border-y-2 sm:border-y-[3px] border-r-2 sm:border-r-[3px] rounded-r-xl sm:rounded-r-2xl transition-all duration-200 hover:scale-[1.03] origin-left active:scale-95 cursor-pointer ${
          isHighlighted
            ? "border-amber-300 ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-900 shadow-[0_0_35px_rgba(251,191,36,0.95),0_0_15px_rgba(251,191,36,0.7)] animate-pulse scale-105"
            : "border-[#4e545c] shadow-[0_12px_36px_rgba(0,0,0,0.8),inset_-1px_2px_4px_rgba(255,255,255,0.15)]"
        } w-10 sm:w-14 lg:w-16 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        title={t("cueBallSpin")}
        aria-label={t("cueBallSpin")}
      >
        <div className="relative w-5 h-5 sm:w-7 sm:h-7 lg:w-8 lg:h-8 flex items-center justify-center">
          {/* Mini 3D Cue Ball */}
          <div className="relative w-5 h-5 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full bg-radial from-white via-slate-100 to-slate-300 border border-slate-400 shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.3)] flex items-center justify-center overflow-hidden">
            {/* Subtle crosshair grid (very faint) */}
            <div className="absolute inset-0 border-t border-slate-300/40 top-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute inset-0 border-l border-slate-300/40 left-1/2 -translate-x-1/2 pointer-events-none" />

            {/* Red Pointer Indicator */}
            <div
              className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 bg-rose-500 rounded-full border border-rose-700 shadow-[0_0_4px_rgba(244,63,94,0.8)] -translate-x-1/2 -translate-y-1/2 transition-all duration-150 ease-out"
              style={{
                left: pointerLeft,
                top: pointerTop,
              }}
            />
          </div>
        </div>
      </button>

      {/* Tutorial Left-Hand Pointer Overlay */}
      {isHighlighted && (
        <div className="absolute left-full ml-3 sm:ml-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none z-50 whitespace-nowrap animate-bounce-x">
          {/* User Provided SVG Pointer Icon */}
          <div className="relative flex items-center justify-center filter drop-shadow-[0_0_20px_rgba(245,189,36,0.95)] shrink-0">
            <svg
              fill="#f5bd24"
              version="1.1"
              id="Capa_1"
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              viewBox="0 0 81.609 81.61"
              xmlSpace="preserve"
              className="w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22 object-contain select-none filter drop-shadow-[0_4px_16px_rgba(245,189,36,0.8)]"
            >
              <g id="SVGRepo_bgCarrier" strokeWidth="0" />
              <g
                id="SVGRepo_tracerCarrier"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <g id="SVGRepo_iconCarrier">
                <g>
                  <path d="M81.607,26.567c0-1.649-1.334-2.984-2.982-2.984h-7.459c-1.646,0-2.982,1.335-2.984,2.984v0.523 c-3.44,0.319-9.994-0.96-15.574-12.984c-0.309-0.876-2.729-7.226-8.131-7.227c-0.139,0-3.406,0.035-5.125,2.971 c-1.939,3.313-0.928,8.754,3.005,16.189c-0.688,0.181-1.668,0.342-2.974,0.342H7.322C3.285,26.381,0,29.667,0,33.705 c0,1.62,0.533,3.111,1.425,4.325c0,0,2.277,2.951,4.751,2.951c1.427,0,13.113,0.025,19.701,0.04 c-2.505,3.899-1.438,8.541-0.96,10.106c0.337,1.675,0.482,3.271,0.474,4.816c0.479,2.396,1.622,5.369,4.234,8.047 c0.392,0.543,0.602,1.496,0.82,2.504c0.59,2.717,1.482,6.82,7.596,7.97l0.145,0.021c0.498,0.045,12.313,1.068,19.117-1.433 c2.545-0.937,4-1.777,5.17-2.452c1.578-0.912,2.621-1.512,5.709-1.785v0.52c0,1.646,1.338,2.982,2.984,2.982h7.459 c1.646,0,2.984-1.336,2.984-2.982L81.607,26.567z M68.182,65.805c-3.746,0.299-5.185,1.025-7.211,2.197 c-1.125,0.65-2.4,1.389-4.703,2.234c-5.918,2.176-16.762,1.349-17.744,1.267c-4.092-0.794-4.58-3.042-5.146-5.646 c-0.289-1.328-0.588-2.705-1.439-3.781l-0.109-0.123c-4.424-4.482-3.742-10.006-3.709-10.237c0.042-0.322-0.021-0.632-0.161-0.897 c-0.016-0.072-0.03-0.144-0.058-0.214c-0.022-0.06-2.24-6.047,1.833-9.487c0.031-0.025,0.056-0.059,0.084-0.086 c0.347,0,0.538,0,0.538,0v-0.06h0.644c0.828,0,1.5-0.672,1.5-1.5s-0.672-1.5-1.5-1.5h-7.583c-0.138,0-0.269,0.024-0.395,0.06 L7.322,38.031c-2.383,0.001-4.323-1.94-4.323-4.325c0-2.384,1.94-4.323,4.323-4.324h32.062c3.915,0.001,5.761-1.225,5.96-1.363 l1.104-0.781l-0.663-1.178c-5.3-9.446-4.681-13.26-3.843-14.693c0.846-1.445,2.519-1.485,2.535-1.486 c3.478,0.001,5.295,5.207,5.313,5.259l0.063,0.16c3.447,7.459,7.77,12.17,12.845,14.001c2.088,0.754,3.971,0.885,5.483,0.78V65.805 z" />
                </g>
              </g>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
