"use client";

import React from "react";
import { Volume2, VolumeX } from "lucide-react";

interface SoundToggleProps {
  isMuted: boolean;
  onToggle: () => void;
}

/**
 * SoundToggle — Glassmorphic button to mute/unmute game audio.
 */
export const SoundToggle: React.FC<SoundToggleProps> = ({
  isMuted,
  onToggle,
}) => {
  return (
    <button
      onClick={onToggle}
      className="relative left-0 flex items-center justify-end pl-0 pr-2 sm:pr-2.5 lg:pr-3 py-2 sm:py-3 lg:py-3.5 bg-[#292e35] border-y-[2px] sm:border-y-[3px] border-r-[2px] sm:border-r-[3px] border-[#4e545c] rounded-r-xl sm:rounded-r-2xl shadow-[0_12px_36px_rgba(0,0,0,0.8),inset_-1px_2px_4px_rgba(255,255,255,0.15)] w-10 sm:w-14 lg:w-16 transition-all duration-200 hover:scale-[1.03] origin-left active:scale-95 cursor-pointer"
      title={isMuted ? "Unmute Sound" : "Mute Sound"}
      aria-label={isMuted ? "Unmute Sound" : "Mute Sound"}
    >
      <div className="relative w-5 h-5 sm:w-7 sm:h-7 lg:w-8 lg:h-8 flex items-center justify-center">
        {isMuted ? (
          <VolumeX className="size-4 sm:size-6 lg:size-7 text-rose-400" />
        ) : (
          <Volume2 className="size-4 sm:size-6 lg:size-7 text-white" />
        )}
      </div>
    </button>
  );
};
