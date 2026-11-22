"use client";

import React, { useRef, useState } from "react";

interface PowerMeterProps {
  power: number; // 0.0 to 1.0
  isCharging: boolean;
  isVisible: boolean;
  scale?: number;
  isHighlighted?: boolean;
  onChargeStart?: () => void;
  onChargeUpdate?: (power: number) => void;
  onChargeRelease?: () => void;
}

/**
 * PowerMeter — Vertical power gauge styled to match the reference screenshots.
 * Positioned flat against the left screen boundary directly under the SoundToggle.
 * Supports touch/drag interactions on mobile/desktop to pull back the stick.
 */
export const PowerMeter: React.FC<PowerMeterProps> = ({
  power,
  isCharging,
  isVisible,
  scale = 1,
  isHighlighted = false,
  onChargeStart,
  onChargeUpdate,
  onChargeRelease,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeDrag, setActiveDrag] = useState(false);

  if (!isVisible) return null;

  // Normalize power (0 to 1)
  const normalizedPower = Math.min(1.0, Math.max(0, power));

  // Calculate translation: at power 0, translate is 0% (stick covers meter).
  // At power 1, translate is roughly 90% (stick tip is at the bottom).
  // The container uses overflow-hidden to clip the stick as it moves down.
  const translateY = isCharging ? normalizedPower * 92 : 0;

  const updatePowerFromEvent = (clientY: number) => {
    if (!containerRef.current || !onChargeUpdate) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // We want power = 0 at the top (rect.top) and power = 1 at the bottom (rect.bottom).
    // Subtract vertical padding (py-6 is 24px top & bottom) to make drag more responsive.
    const verticalPadding = 24; 
    const dragHeight = rect.height - verticalPadding * 2;
    const relativeY = clientY - rect.top - verticalPadding;
    
    const calculatedPower = dragHeight > 0 ? relativeY / dragHeight : 0;
    const clampedPower = Math.min(1.0, Math.max(0, calculatedPower));
    onChargeUpdate(clampedPower);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!onChargeStart || !onChargeUpdate) return;

    containerRef.current?.setPointerCapture(e.pointerId);
    setActiveDrag(true);
    onChargeStart();
    updatePowerFromEvent(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeDrag) return;
    e.preventDefault();
    updatePowerFromEvent(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeDrag) return;
    setActiveDrag(false);
    containerRef.current?.releasePointerCapture(e.pointerId);
    onChargeRelease?.();
  };

  return (
    <div className="relative inline-flex items-center">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative left-0 pl-0 pr-2 py-3 sm:py-5 bg-[#292e35] border-y-[3px] border-r-[3px] rounded-r-2xl flex items-center justify-end w-10 h-48 sm:w-14 sm:h-72 lg:w-16 lg:h-96 origin-left transition-all duration-300 cursor-ns-resize active:cursor-grabbing touch-none select-none game-power-meter ${
          isHighlighted
            ? "md:border-[#4e545c] md:shadow-[0_12px_36px_rgba(0,0,0,0.8),inset_-1px_2px_4px_rgba(255,255,255,0.15)] border-amber-300 ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-900 shadow-[0_0_35px_rgba(251,191,36,0.95),0_0_15px_rgba(251,191,36,0.7)] animate-pulse scale-105"
            : "border-[#4e545c] shadow-[0_12px_36px_rgba(0,0,0,0.8),inset_-1px_2px_4px_rgba(255,255,255,0.15)]"
        }`}
        style={scale !== 1 ? { transform: `scale(${scale})` } : undefined}
      >
        {/* Power Gauge Container */}
        <div className="relative w-6 h-full sm:w-7 rounded-lg bg-slate-950 border border-slate-800 shadow-[inset_0_3px_10px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col p-0.5 pointer-events-none">
          {/* Background Gradient (Static: Yellow top -> Red bottom) */}
          <div className="absolute inset-0 bg-linear-to-b from-[#fcd34d] via-[#ea580c] to-[#dc2626]" />

          {/* Gloss highlight overlay over the background */}
          <div className="absolute inset-y-0 left-0.5 w-1.5 bg-white/10 rounded-full pointer-events-none" />

          {/* Tonal background segment lines (5 sections) */}
          <div className="absolute inset-0 flex flex-col justify-between py-0.5 pointer-events-none z-10 opacity-60">
            <div className="w-full border-t border-black/80 shadow-[0_1px_0_rgba(255,255,255,0.15)]" />
            <div className="w-full border-t border-black/80 shadow-[0_1px_0_rgba(255,255,255,0.15)]" />
            <div className="w-full border-t border-black/80 shadow-[0_1px_0_rgba(255,255,255,0.15)]" />
            <div className="w-full border-t border-black/80 shadow-[0_1px_0_rgba(255,255,255,0.15)]" />
            <div className="w-full border-t border-black/80 shadow-[0_1px_0_rgba(255,255,255,0.15)]" />
          </div>

          {/* The Long Cue Stick - translating downwards (tapered design matching board stick) */}
          <div
            className="relative w-full h-full z-20 flex flex-col items-center transition-transform duration-75 ease-out"
            style={{ transform: `translateY(${translateY}%)` }}
          >
            {/* Segment A: Tip (Black leather) */}
            <div className="w-[30%] h-[1.5%] bg-linear-to-r from-[#1c2833] via-[#2c3e50] to-[#11161b] rounded-t-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />

            {/* Segment B: Ferrule (White) */}
            <div className="w-[30%] h-[2.5%] bg-linear-to-r from-gray-300 via-white to-gray-400 shadow-[0_1px_1px_rgba(0,0,0,0.3)] border-b border-black/10" />

            {/* Segment C: Shaft (Tan wood) */}
            <div className="w-[35%] h-[50%] bg-linear-to-r from-[#cfa164] via-[#edd3a4] to-[#a87f48] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]" />

            {/* Segment D: Black Collar Ring */}
            <div className="w-[45%] h-[1.5%] bg-[#151515] border-y border-black/20" />

            {/* Segment E: Mahogany Wrap/Grip */}
            <div className="w-[55%] h-[38.5%] bg-linear-to-r from-[#421d05] via-[#5a2d0c] to-[#261001]" />

            {/* Segment F: Black Butt Cap */}
            <div className="w-[65%] h-[6%] bg-linear-to-r from-zinc-800 to-black rounded-b-md" />
          </div>
        </div>
      </div>

      {/* Tutorial Left-Hand Pointer Overlay (Mobile screens only) */}
      {isHighlighted && (
        <div className="md:hidden absolute left-full ml-3 sm:ml-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none z-50 whitespace-nowrap animate-bounce-x">
          {/* SVG Pointer Icon */}
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
