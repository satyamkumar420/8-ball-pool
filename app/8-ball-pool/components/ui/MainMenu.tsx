"use client";

import React, { useState } from "react";
import { Difficulty, GameMode } from "@/lib/types";
import { Play, Bot, Star, Users, User, Crown, Check } from "lucide-react";
import { SteveAvatar } from "./SteveAvatar";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { soundManager } from "../../lib/game/SoundManager";
import { SoundKey } from "../../lib/types";

interface MainMenuProps {
  onStartGame: (
    difficulty: Difficulty,
    mode: GameMode,
    p1Name: string,
    p2Name: string,
  ) => void;
  stats?: {
    winCount: number;
    lossCount: number;
    bestScore: number;
    totalGamesPlayed: number;
    highestDifficultyWon: Difficulty;
  };
  language: string;
  onChangeLanguage: (lang: string) => void;
}

type MenuScreen = "MODE" | "NAMES" | "DIFFICULTY";

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  language,
  onChangeLanguage,
}) => {
  const t = useTranslations("Pool8Ball");
  const [screen, setScreen] = useState<MenuScreen>("MODE");
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>(
    Difficulty.MEDIUM,
  );
  const [mode, setMode] = useState<GameMode>(GameMode.SINGLE_PLAYER);
  const [p1Name, setP1Name] = useState("Player 1");
  const [p2Name, setP2Name] = useState("Player 2");

  React.useEffect(() => {
    soundManager.startBgMusic();
    soundManager.play(SoundKey.WELCOME, 1.0);
  }, []);

  const arenas = [
    {
      level: Difficulty.EASY,
      title: "Casual Lounge",
      subtitle: "Easy Bot / Guidelines",
      desc: "Relaxed pace, forgiving accuracy, great for warm-up shots.",
      stars: 1,
      badge: "BEGINNER",
      badgeColor: "bg-emerald-500 text-slate-950 font-black",
      cardStyle:
        "from-emerald-600 to-teal-800 border-emerald-500 hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] text-white border-b-6 sm:border-b-8 border-b-teal-950",
      activeRing:
        "ring-4 ring-yellow-400 shadow-[0_0_35px_rgba(250,204,21,0.6),0_12px_24px_rgba(0,0,0,0.5)] scale-[1.02]",
      inactiveStyle:
        "hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(0,0,0,0.5)]",
    },
    {
      level: Difficulty.MEDIUM,
      title: "Neon Club 8",
      subtitle: "Medium Bot / Standard",
      desc: "Balanced precision, smart defensive safety play & exact bank shots.",
      stars: 2,
      badge: "ADVANCED",
      badgeColor: "bg-amber-500 text-slate-950 font-black",
      cardStyle:
        "from-amber-600 to-orange-800 border-amber-500 hover:border-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] text-white border-b-6 sm:border-b-8 border-b-orange-950",
      activeRing:
        "ring-4 ring-yellow-400 shadow-[0_0_35px_rgba(250,204,21,0.6),0_12px_24px_rgba(0,0,0,0.5)] scale-[1.02]",
      inactiveStyle:
        "hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(0,0,0,0.5)]",
    },
    {
      level: Difficulty.HARD,
      title: "Pro Masters",
      subtitle: "Pro Bot / No Guides",
      desc: "Pinpoint accuracy, aggressive multi-rail clearances & ruthless tactics.",
      stars: 3,
      badge: "EXPERT",
      badgeColor: "bg-rose-500 text-slate-950 font-black",
      cardStyle:
        "from-rose-600 to-red-800 border-rose-500 hover:border-rose-400 hover:shadow-[0_0_30px_rgba(244,63,94,0.3)] text-white border-b-6 sm:border-b-8 border-b-red-950",
      activeRing:
        "ring-4 ring-yellow-400 shadow-[0_0_35px_rgba(250,204,21,0.6),0_12px_24px_rgba(0,0,0,0.5)] scale-[1.02]",
      inactiveStyle:
        "hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(0,0,0,0.5)]",
    },
  ];

  const getArenaTitle = (level: Difficulty) => {
    switch (level) {
      case Difficulty.EASY:
        return t("casualLounge");
      case Difficulty.MEDIUM:
        return t("neonClub8");
      case Difficulty.HARD:
        return t("proMasters");
      default:
        return "";
    }
  };

  const getArenaSubtitle = (level: Difficulty) => {
    switch (level) {
      case Difficulty.EASY:
        return t("easyBotSub");
      case Difficulty.MEDIUM:
        return t("mediumBotSub");
      case Difficulty.HARD:
        return t("proBotSub");
      default:
        return "";
    }
  };

  const getArenaDesc = (level: Difficulty) => {
    switch (level) {
      case Difficulty.EASY:
        return t("easyBotDesc");
      case Difficulty.MEDIUM:
        return t("mediumBotDesc");
      case Difficulty.HARD:
        return t("proBotDesc");
      default:
        return "";
    }
  };

  const getArenaBadge = (level: Difficulty) => {
    switch (level) {
      case Difficulty.EASY:
        return t("beginner");
      case Difficulty.MEDIUM:
        return t("advanced");
      case Difficulty.HARD:
        return t("expert");
      default:
        return "";
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-between w-full h-full overflow-y-auto px-4 py-3 sm:px-8 sm:py-6 select-none main-menu-container bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, rgba(8, 13, 26, 0.55), rgba(4, 6, 12, 0.9)), url('./menu_background.jpg')",
      }}
    >
      {/* Language Switcher Dropdown */}
      <div className="absolute top-3 right-4 sm:top-5 sm:right-6 z-50">
        <LanguageSwitcher
          language={language}
          onChangeLanguage={onChangeLanguage}
          variant="menu"
        />
      </div>

      <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-4xl w-full my-auto py-1 sm:py-2 px-2 sm:px-4">
        {/* 3D Title Block */}
        <div className="relative flex flex-col items-center mb-1 sm:mb-2 logo-container">
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black font-display tracking-tight text-center uppercase logo-title flex flex-row items-center justify-center gap-x-2 sm:gap-x-3 select-none">
            {(() => {
              const parts = (t("title") || "8-BALL BILLIARDS").split(" ");
              const firstPart = parts[0];
              const secondPart = parts.slice(1).join(" ");
              return (
                <>
                  <span
                    className="text-emerald-400 font-extrabold"
                    style={{
                      textShadow:
                        "0 1px 0 #047857, 0 2px 0 #035b43, 0 3px 0 #024331, 0 4px 0 #012b20, 0 5px 0 #011812, 0 4px 8px rgba(0,0,0,0.9)",
                    }}
                  >
                    {firstPart}
                  </span>
                  {secondPart && (
                    <span
                      className="text-amber-400 font-extrabold"
                      style={{
                        textShadow:
                          "0 1px 0 #b45309, 0 2px 0 #8f3f07, 0 3px 0 #6e2e03, 0 4px 0 #4a1e01, 0 5px 0 #2a1100, 0 4px 8px rgba(0,0,0,0.9)",
                      }}
                    >
                      {secondPart}
                    </span>
                  )}
                </>
              );
            })()}
          </h1>

          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-md mt-4 sm:mt-5 mb-2 sm:mb-3">
            <Crown className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-300">
              {screen === "MODE"
                ? t("selectGameMode")
                : screen === "NAMES"
                  ? t("enterPlayers")
                  : t("selectDifficulty")}
            </span>
          </div>
        </div>

        {/* Dynamic Screen Content */}
        {screen === "MODE" && (
          <div className="w-full max-w-md mt-1 sm:mt-2 flex flex-col gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-6 duration-300 items-center px-1">
            {/* Human vs AI Button */}
            <button
              onClick={() => {
                soundManager.play(SoundKey.CLICK, 0.65);
                setMode(GameMode.SINGLE_PLAYER);
                setScreen("DIFFICULTY");
              }}
              className="group relative flex items-center justify-between w-full py-3.5 sm:py-4 px-5 sm:px-6 rounded-2xl bg-linear-to-b from-emerald-400 via-emerald-500 to-teal-700 border-2 border-emerald-300 border-b-6 sm:border-b-8 border-b-teal-950 text-white font-black text-lg sm:text-xl tracking-wider shadow-[0_6px_16px_rgba(16,185,129,0.25)] active:border-b-2 active:translate-y-1.5 hover:brightness-110 transition-all duration-150 cursor-pointer overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/35 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-100 shrink-0" />
                <span>{t("humanVsBot")}</span>
              </div>
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
            </button>

            {/* Player 1 vs Player 2 Button */}
            <button
              onClick={() => {
                soundManager.play(SoundKey.CLICK, 0.65);
                setMode(GameMode.TWO_PLAYER);
                setScreen("NAMES");
              }}
              className="group relative flex items-center justify-between w-full py-3.5 sm:py-4 px-5 sm:px-6 rounded-2xl bg-linear-to-b from-amber-400 via-amber-500 to-orange-700 border-2 border-amber-300 border-b-6 sm:border-b-8 border-b-orange-950 text-white font-black text-lg sm:text-xl tracking-wider shadow-[0_6px_16px_rgba(245,158,11,0.25)] active:border-b-2 active:translate-y-1.5 hover:brightness-110 transition-all duration-150 cursor-pointer overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/35 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-amber-100 shrink-0" />
                <span>{t("player1VsPlayer2")}</span>
              </div>
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
            </button>
          </div>
        )}

        {screen === "NAMES" && (
          <div className="w-full max-w-md  lg:mt-2 flex flex-col gap-4 sm:gap-5 p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-300 relative overflow-hidden items-center">
            <div className="w-full flex flex-col gap-3 lg:gap-4">
              <div>
                <label className="text-xs text-emerald-400 uppercase font-black mb-1.5 block tracking-wider">
                  {t("player1NameLabel")}
                </label>
                <input
                  type="text"
                  value={p1Name}
                  onChange={(e) => setP1Name(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 sm:py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm sm:text-base shadow-inner"
                  maxLength={15}
                />
              </div>
              <div>
                <label className="text-xs text-amber-400 uppercase font-black mb-1.5 block tracking-wider">
                  {t("player2NameLabel")}
                </label>
                <input
                  type="text"
                  value={p2Name}
                  onChange={(e) => setP2Name(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 sm:py-2.5 text-white font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm sm:text-base shadow-inner"
                  maxLength={15}
                />
              </div>
            </div>

            <div className="flex flex-row gap-3 mt-2 sm:mt-3 w-full justify-stretch">
              <button
                onClick={() => {
                  soundManager.play(SoundKey.CLICK, 0.65);
                  setScreen("MODE");
                }}
                className="w-full group relative flex items-center justify-center gap-1.5 py-3 sm:py-3.5 px-4 sm:px-6 rounded-2xl bg-linear-to-b from-slate-500 via-slate-600 to-slate-700 border-2 border-slate-400 border-b-6 sm:border-b-8 border-b-slate-800 text-white font-black text-xs sm:text-base uppercase tracking-wider shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:border-b-2 active:translate-y-1 hover:brightness-110 transition-all duration-150 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/20 to-transparent pointer-events-none" />
                <span>{t("back")}</span>
              </button>
              <button
                onClick={() => {
                  soundManager.play(SoundKey.CLICK, 0.65);
                  onStartGame(
                    Difficulty.MEDIUM,
                    mode,
                    p1Name || "Player 1",
                    p2Name || "Player 2",
                  );
                }}
                className="w-full group relative flex items-center justify-center gap-1.5 py-3.5 sm:py-4 px-5 sm:px-6 rounded-2xl bg-linear-to-b from-emerald-400 via-emerald-500 to-teal-700 border-2 border-emerald-300 border-b-6 sm:border-b-8 border-b-teal-950 text-white font-black whitespace-nowrap text-xs sm:text-base uppercase tracking-wider shadow-[0_6px_16px_rgba(16,185,129,0.25)] active:border-b-2 active:translate-y-1 hover:brightness-110 transition-all duration-150 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/35 to-transparent pointer-events-none" />
                <span>{t("startMatch")}</span>
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
              </button>
            </div>
          </div>
        )}

        {screen === "DIFFICULTY" && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-6 duration-300 flex flex-col items-center px-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 w-full max-w-5xl">
              {arenas.map((arena) => {
                const isSelected = selectedDiff === arena.level;
                return (
                  <button
                    key={arena.level}
                    onClick={() => {
                      soundManager.play(SoundKey.CLICK, 0.65);
                      setSelectedDiff(arena.level);
                    }}
                    className={`group relative flex flex-col items-stretch p-3.5 sm:p-5 rounded-2xl bg-linear-to-b border-2 transition-all duration-200 text-left cursor-pointer overflow-hidden shadow-xl arena-card ${
                      arena.cardStyle
                    } ${isSelected ? arena.activeRing : arena.inactiveStyle}`}
                  >
                    <div className="absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-white/20 to-transparent pointer-events-none" />

                    <div className="flex items-center justify-between w-full mb-2 sm:mb-3 relative z-10">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs text-white uppercase tracking-wider shadow-sm ${arena.badgeColor}`}
                      >
                        {getArenaBadge(arena.level)}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {[...Array(3)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < arena.stars
                                ? "text-yellow-300 fill-yellow-300 drop-shadow-[0_0_5px_rgba(253,224,71,0.8)]"
                                : "text-white/20 fill-white/10"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-2 sm:mb-3 relative z-10">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden border border-white/30 shadow-inner shrink-0 bg-slate-900">
                        <SteveAvatar className="w-full h-full object-cover object-center" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm sm:text-base text-white leading-tight drop-shadow-sm">
                          {getArenaTitle(arena.level)}
                        </h3>
                        <div className="flex items-center gap-1 text-[10px] font-extrabold opacity-95">
                          <Bot className="w-3.5 h-3.5" />
                          <span>{getArenaSubtitle(arena.level)}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed mb-auto relative pr-7 sm:pr-8 "></p>

                    {isSelected && (
                      <div className="absolute bottom-2.5 right-2.5 flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400 text-slate-950 font-black text-xs shadow-md z-20">
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Restored generous padding & row spacing */}
            <div className="flex flex-row gap-3 mt-3 sm:mt-6 w-full max-w-md px-1 justify-stretch">
              <button
                onClick={() => {
                  soundManager.play(SoundKey.CLICK, 0.65);
                  setScreen(mode === GameMode.SINGLE_PLAYER ? "MODE" : "NAMES");
                }}
                className="w-full group relative flex items-center justify-center gap-1.5 py-3 sm:py-3.5 px-4 sm:px-6 rounded-2xl bg-linear-to-b from-slate-500 via-slate-600 to-slate-700 border-2 border-slate-400 border-b-6 sm:border-b-8 border-b-slate-800 text-white font-black text-xs sm:text-base tracking-wider shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:border-b-2 active:translate-y-1 hover:brightness-110 transition-all duration-150 cursor-pointer overflow-hidden uppercase"
              >
                <div className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/20 to-transparent pointer-events-none" />
                <span>{t("back")}</span>
              </button>

              <button
                onClick={() => {
                  soundManager.play(SoundKey.CLICK, 0.65);
                  onStartGame(
                    selectedDiff,
                    mode,
                    p1Name || "Player 1",
                    p2Name || "Player 2",
                  );
                }}
                className="w-full group relative flex items-center justify-center gap-2 py-3.5 sm:py-4 px-5 sm:px-6 rounded-2xl bg-linear-to-b from-emerald-400 via-emerald-500 to-teal-700 border-2 border-emerald-300 border-b-6 sm:border-b-8 border-b-teal-950 text-white font-black whitespace-nowrap text-sm sm:text-base tracking-wider shadow-[0_6px_16px_rgba(16,185,129,0.25)] active:border-b-2 active:translate-y-1.5 hover:brightness-110 transition-all duration-150 cursor-pointer overflow-hidden uppercase"
              >
                <div className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/35 to-transparent pointer-events-none" />
                <span>{t("startMatch")}</span>
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
