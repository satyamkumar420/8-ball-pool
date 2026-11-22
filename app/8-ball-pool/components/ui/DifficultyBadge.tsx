"use client";

import React from "react";
import { Difficulty } from "@/lib/types";
import { Bot } from "lucide-react";
import { useTranslations } from "next-intl";

interface DifficultyBadgeProps {
  difficulty: Difficulty;
}

/**
 * DifficultyBadge — Displays the active bot difficulty level with distinct glowing color indicators.
 */
export const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({ difficulty }) => {
  const t = useTranslations("Pool8Ball");

  const getBadgeStyle = () => {
    switch (difficulty) {
      case Difficulty.EASY:
        return {
          bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
          glow: "shadow-[0_0_12px_rgba(16,185,129,0.2)]",
          label: t("easyBot"),
        };
      case Difficulty.MEDIUM:
        return {
          bg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
          glow: "shadow-[0_0_12px_rgba(245,158,11,0.2)]",
          label: t("mediumBot"),
        };
      case Difficulty.HARD:
        return {
          bg: "bg-rose-500/15 border-rose-500/30 text-rose-400",
          glow: "shadow-[0_0_12px_rgba(244,63,94,0.25)]",
          label: t("proBot"),
        };
      default:
        return {
          bg: "bg-blue-500/15 border-blue-500/30 text-blue-400",
          glow: "",
          label: difficulty,
        };
    }
  };

  const style = getBadgeStyle();

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border backdrop-blur-md text-xs font-semibold tracking-wide uppercase transition-all duration-300 ${style.bg} ${style.glow}`}
    >
      <Bot className="w-3.5 h-3.5 animate-pulse" />
      <span>{style.label}</span>
    </div>
  );
};
