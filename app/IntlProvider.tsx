"use client";

import { NextIntlClientProvider } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import enMessages from "../languages/en.json";

interface CustomWindow extends Window {
  gdData?: {
    language?: string;
    lang?: string;
  };
  appLanguage?: string;
}

const normalizeLanguage = (lang: string): string => {
  if (!lang || typeof lang !== "string") return "en";
  const lower = lang.toLowerCase();
  
  if (lower.startsWith("zh")) {
    if (lower.includes("hant") || lower.includes("tw") || lower.includes("hk")) {
      return "zh-Hant";
    }
    return "zh-Hans";
  }

  const code = lower.split("-")[0];
  const supported = ["ar", "de", "en", "es", "fr", "hi", "id", "it", "ja", "ko", "ms", "nl", "pt", "ro", "ru", "th", "tr", "uk", "vi"];
  if (supported.includes(code)) return code;

  return "en";
};

export default function IntlProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Record<string, unknown>>(
    enMessages as unknown as Record<string, unknown>
  );
  const [locale, setLocale] = useState<string>("en");

  const loadMessages = useCallback(async (lang: string) => {
    if (!lang || typeof lang !== "string") return;

    const normalized = normalizeLanguage(lang);
    setLocale(normalized);
    if (normalized === "en") {
      setMessages(enMessages as unknown as Record<string, unknown>);
      return;
    }
    try {
      const msg = await import(`../languages/${normalized}.json`);
      setMessages((msg.default || msg) as Record<string, unknown>);
    } catch {
      setMessages(enMessages as unknown as Record<string, unknown>);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let savedLang: string | null = null;
    try {
      savedLang = localStorage.getItem("8ballPoolLanguage");
      if (!savedLang) {
        const settingsStr = localStorage.getItem("8ballpool_settings");
        if (settingsStr) {
          const parsed = JSON.parse(settingsStr);
          if (parsed && typeof parsed.language === "string") {
            savedLang = parsed.language;
          }
        }
      }
    } catch {
      // localStorage read error
    }

    const customWindow = window as unknown as CustomWindow;
    const initialLang =
      savedLang ||
      customWindow.appLanguage ||
      (typeof navigator !== "undefined" ? navigator.language : "en");

    if (initialLang && initialLang !== "en") {
      setTimeout(() => {
        loadMessages(initialLang);
      }, 0);
    }

    const handleLanguageChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.lang) {
        loadMessages(customEvent.detail.lang);
      }
    };

    window.addEventListener("languageChanged", handleLanguageChange as EventListener);
    return () =>
      window.removeEventListener("languageChanged", handleLanguageChange as EventListener);
  }, [loadMessages]);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages as unknown as import("next-intl").AbstractIntlMessages}
      timeZone="UTC"
    >
      {children}
    </NextIntlClientProvider>
  );
}
