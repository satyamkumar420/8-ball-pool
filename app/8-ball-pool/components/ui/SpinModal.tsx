"use client";

import React, { useRef, useState, useEffect } from "react";
import { X, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

interface SpinModalProps {
  isOpen: boolean;
  spinX: number; // Current normalized horizontal spin [-1, 1]
  spinY: number; // Current normalized vertical spin [-1, 1]
  onChange: (x: number, y: number) => void;
  onClose: () => void;
}

export const SpinModal: React.FC<SpinModalProps> = ({
  isOpen,
  spinX,
  spinY,
  onChange,
  onClose,
}) => {
  const t = useTranslations("Pool8Ball");
  const ballRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Process mouse/touch events to calculate normalized spin coordinates
  const handlePointerUpdate = (clientX: number, clientY: number) => {
    if (!ballRef.current) return;
    const rect = ballRef.current.getBoundingClientRect();
    const radius = rect.width / 2;
    const centerX = rect.left + radius;
    const centerY = rect.top + radius;

    // Calculate offset from center in pixels
    const dx = clientX - centerX;
    const dy = centerY - clientY; // Invert Y so up is positive and down is negative

    // Convert to normalized coordinates [-1, 1]
    let normX = dx / radius;
    let normY = dy / radius;

    // Constrain within the circular boundary (dx^2 + dy^2 <= 1)
    const dist = Math.sqrt(normX * normX + normY * normY);
    if (dist > 1.0) {
      normX /= dist;
      normY /= dist;
    }

    // Round to 2 decimal places for clean calculations
    onChange(parseFloat(normX.toFixed(2)), parseFloat(normY.toFixed(2)));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    if (ballRef.current) {
      ballRef.current.setPointerCapture(e.pointerId);
    }
    handlePointerUpdate(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    handlePointerUpdate(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (ballRef.current) {
      ballRef.current.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="relative flex flex-col items-center max-w-sm w-full p-4 rounded-3xl border border-slate-700 bg-slate-900/95 shadow-2xl text-white select-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative flex justify-center items-center w-full mb-4">
          <h3 className="text-2xl font-black font-display tracking-wider uppercase select-none">
            <span
              className="text-indigo-100"
              style={{
                textShadow:
                  "0 1px 0 #818cf8, 0 2px 0 #6366f1, 0 3px 0 #4f46e5, 0 4px 0 #3730a3, 0 5px 0 #1e1b4b, 0 6px 6px rgba(0,0,0,0.6)",
              }}
            >
              {t("cueBall")}{" "}
            </span>
            <span
              className="text-emerald-300"
              style={{
                textShadow:
                  "0 1px 0 #34d399, 0 2px 0 #059669, 0 3px 0 #047857, 0 4px 0 #065f46, 0 5px 0 #064e3b, 0 6px 6px rgba(0,0,0,0.6)",
              }}
            >
              {t("spin")}
            </span>
          </h3>
          <button
            onClick={onClose}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="size-5 text-slate-200 hover:text-white" />
          </button>
        </div>

        {/* Large Interactive Cue Ball */}
        <div
          ref={ballRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-48 h-48 sm:w-52 sm:h-52 rounded-full bg-radial from-white via-slate-100 to-slate-300 border-[3px] border-slate-400 shadow-[inset_-8px_-8px_16px_rgba(0,0,0,0.35),0_12px_24px_rgba(0,0,0,0.6)] cursor-crosshair overflow-hidden touch-none"
        >
          {/* Red Pointer Dot */}
          <div
            className="absolute w-4 h-4 bg-rose-500 rounded-full border-2 border-rose-700 shadow-[0_0_12px_rgba(244,63,94,0.9),inset_1px_1px_2px_rgba(255,255,255,0.4)] -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ease-out"
            style={{
              left: `${50 + spinX * 50}%`,
              top: `${50 - spinY * 50}%`, // Invert Y back for CSS coordinates
            }}
          />
        </div>

        {/* Current Coordinates Display */}
        <div className="flex gap-4 text-xs font-mono text-indigo-300 my-3 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800">
          <span>X: {spinX > 0 ? `+${spinX}` : spinX}</span>
          <span>Y: {spinY > 0 ? `+${spinY}` : spinY}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex w-full gap-3 mt-2">
          <button
            onClick={() => onChange(0, 0)}
            className="group relative flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-xl bg-linear-to-b from-slate-500 via-slate-600 to-slate-700 border-2 border-slate-400 border-b-6 border-b-slate-800 text-xs font-black text-white tracking-wider active:border-b-2 active:translate-y-1 hover:brightness-110 transition-all duration-150 cursor-pointer overflow-hidden uppercase shadow-lg shadow-black/25"
          >
            <div className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/20 to-transparent pointer-events-none" />
            <RefreshCw className="size-4 shrink-0 transition-transform group-hover:rotate-45" />
            <span>{t("reset")}</span>
          </button>

          <button
            onClick={onClose}
            className="group relative flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-xl bg-linear-to-b from-emerald-400 via-emerald-500 to-teal-600 border-2 border-emerald-300 border-b-6 border-b-teal-900 text-xs font-black text-white tracking-wider active:border-b-2 active:translate-y-1 hover:brightness-110 transition-all duration-150 cursor-pointer overflow-hidden uppercase shadow-lg shadow-teal-950/40"
          >
            <div className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/30 to-transparent pointer-events-none" />
            <span>{t("done")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
