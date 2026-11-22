"use client";

import React, { useState, useRef, useEffect } from "react";
import { Languages } from "lucide-react";

interface LanguageSwitcherProps {
  language: string;
  onChangeLanguage: (lang: string) => void;
  variant?: "sidebar" | "menu";
  parentScale?: number;
}

const SUPPORTED_LANGUAGES = [
  { code: "ar", label: "العربية" },
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "hi", label: "हिन्दी" },
  { code: "id", label: "Indonesia" },
  { code: "it", label: "Italiano" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "ms", label: "Melayu" },
  { code: "nl", label: "Nederlands" },
  { code: "pt", label: "Português" },
  { code: "ro", label: "Română" },
  { code: "ru", label: "Русский" },
  { code: "th", label: "ไทย" },
  { code: "tr", label: "Türkçe" },
  { code: "uk", label: "Українська" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "zh-Hans", label: "简体中文" },
  { code: "zh-Hant", label: "繁體中文" },
];

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  language,
  onChangeLanguage,
  variant = "sidebar",
  parentScale = 1.0,
}) => {
  const normalizedLanguage =
    language.toLowerCase() === "en-us" ? "en" : language;
  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === normalizedLanguage) ||
    SUPPORTED_LANGUAGES.find((l) => l.code === "en")!;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, {
      passive: true,
    });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const buttonStyle =
    variant === "sidebar"
      ? "relative left-0 flex items-center justify-end pl-0 pr-2 sm:pr-2.5 lg:pr-3 py-2 sm:py-3 lg:py-3.5 bg-[#292e35] border-y-[2px] sm:border-y-[3px] border-r-[2px] sm:border-r-[3px] border-[#4e545c] rounded-r-xl sm:rounded-r-2xl shadow-[0_12px_36px_rgba(0,0,0,0.8),inset_-1px_2px_4px_rgba(255,255,255,0.15)] w-10 sm:w-14 lg:w-16 transition-all duration-200 hover:scale-[1.03] origin-left active:scale-95 cursor-pointer text-white"
      : "flex items-center gap-2 px-3 py-2 rounded-xl bg-[#292e35] border-[2px] sm:border-[3px] border-[#4e545c] shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all hover:scale-[1.03] active:scale-95 cursor-pointer text-white font-outfit";

  const wrapperStyle =
    variant === "sidebar"
      ? "absolute left-full top-0 ml-2.5 z-50"
      : "absolute right-0 top-full mt-2 z-50";

  const dropdownStyle =
    "w-40 sm:w-44 rounded-xl bg-[#1e2329]/95 border-2 border-[#4e545c] shadow-2xl backdrop-blur-md overflow-y-auto custom-scrollbar max-h-[250px] sm:max-h-[60vh] lg:max-h-[400px] animate-in fade-in zoom-in-95 duration-150";

  const compensationScale = 1 / parentScale;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonStyle}
        title="Change Language"
        aria-label="Change Language"
      >
        {variant === "menu" ? (
          <div className="flex items-center justify-center gap-1.5 font-outfit">
            <Languages className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
            {/*
           
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100">
              {currentLangObj.label}
            </span>
              */}
          </div>
        ) : (
          <div className="relative w-5 h-5 sm:w-7 sm:h-7 lg:w-8 lg:h-8 flex items-center justify-center">
            <Languages className="size-4 sm:size-6 lg:size-7 text-emerald-400" />
          </div>
        )}
      </button>

      {isOpen && (
        <div
          className={wrapperStyle}
          style={{
            transform: `scale(${compensationScale})`,
            transformOrigin: variant === "sidebar" ? "left top" : "right top",
          }}
        >
          <div className={dropdownStyle}>
            <div className="py-1">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm hover:bg-[#292e35]/80 transition-colors flex items-center justify-between font-outfit font-bold cursor-pointer ${
                    normalizedLanguage === lang.code
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-slate-300 hover:text-white"
                  }`}
                  onClick={() => {
                    onChangeLanguage(lang.code);
                    setIsOpen(false);
                  }}
                >
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
