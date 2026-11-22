"use client";

import React from "react";
import { ITutorialStep } from "@/lib/types";
import { useTranslations } from "next-intl";

interface TutorialOverlayProps {
  currentStep: ITutorialStep;
  isTaskCompleted?: boolean;
  isFinished?: boolean;
  feedbackMessage?: string | null;
  isError?: boolean;
  onSkip?: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  currentStep,
  isTaskCompleted = false,
  isFinished = false,
  feedbackMessage = null,
  isError = false,
  onSkip,
}) => {
  const t = useTranslations("Pool8Ball");

  const getActionHintTranslation = (hint: string) => {
    if (hint.includes("Welcome to 8-Ball Billiards")) return t("tutorialWelcome");
    if (hint.includes("Aiming:")) return t("tutorialAiming");
    if (hint.includes("Power Shot:")) return t("tutorialPower");
    if (hint.includes("Ball Selection:")) return t("tutorialSelection");
    if (hint.includes("Ball-in-Hand:")) return t("tutorialBallInHand");
    if (hint.includes("Cue Spin:")) return t("tutorialSpin");
    if (hint.includes("8-Ball Victory:")) return t("tutorialVictory");
    if (hint.includes("Great Job!")) return t("tutorialPractice");
    return hint;
  };

  const getFeedbackMessageTranslation = (msg: string) => {
    if (msg.includes("Welcome to Tutorial")) return t("tutorialWelcome");
    if (msg.includes("Good Job!")) return t("goodJob");
    if (msg.includes("Scratch! Aim at Ball 3")) return t("tutScratchAim3");
    if (msg.includes("Great Aim! You hit Ball 3")) return t("tutGreatAim3");
    if (msg.includes("Missed Ball 3!")) return t("tutMissedBall3");
    if (msg.includes("Scratch! Pull back carefully"))
      return t("tutScratchPower3");
    if (msg.includes("Awesome Shot! Ball 3 Pocketed!"))
      return t("tutAwesomeShot3");
    if (msg.includes("Ball 3 wasn't pocketed")) return t("tutNotPocketed3");
    if (msg.includes("Scratch! Aim for a Solid")) return t("tutScratchSuit");
    if (msg.includes("Excellent! You pocketed a suit"))
      return t("tutPocketedSuit");
    if (msg.includes("No suit ball pocketed")) return t("tutNoSuitPocketed");
    if (msg.includes("Scratch! Place the cue ball"))
      return t("tutScratchBallInHand");
    if (msg.includes("Well Done! Ball-in-Hand"))
      return t("tutWellDoneBallInHand");
    if (msg.includes("Place the cue ball closer")) return t("tutPlaceCloser");
    if (msg.includes("Scratch! Set spin")) return t("tutScratchSpin");
    if (msg.includes("Spin not applied!")) return t("tutSpinNotApplied");
    if (msg.includes("Perfect Spin Control!"))
      return t("tutPerfectSpinControl");
    if (msg.includes("Set spin and strike Ball 1"))
      return t("tutSetSpinStrike1");
    if (msg.includes("Scratch with 8-Ball")) return t("tutScratch8Ball");
    if (msg.includes("Tutorial Complete")) return t("finishedTutorial");
    return msg;
  };

  // Determine active text content to use as React key for sliding animation re-trigger
  const messageText = isFinished
    ? t("finishedTutorial")
    : feedbackMessage
      ? getFeedbackMessageTranslation(feedbackMessage)
      : isTaskCompleted && currentStep.requireTask
        ? t("goodJob")
        : getActionHintTranslation(currentStep.actionHint);

  return (
    <div className="absolute inset-0 flex items-center justify-between gap-2 px-3 sm:px-6 pt-2.5 md:pt-0 select-none pointer-events-none z-30">
      {/* Empty spacer on desktop to balance Skip button and keep pill centered */}
      <div className="hidden sm:block w-16 sm:w-20 shrink-0" />

      {/* Main Pill Banner — with key to restart slideDown animation on text changes */}
      <div
        key={messageText}
        className="flex-1 sm:flex-initial min-w-0 max-w-full sm:max-w-4xl px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-full bg-slate-950/90 backdrop-blur-md text-left sm:text-center border border-white/15 shadow-xl transition-all duration-300 mx-auto overflow-hidden animate-slide-down"
      >
        {isFinished ? (
          <span className="text-xs sm:text-sm font-extrabold text-emerald-400 animate-pulse tracking-wider uppercase drop-shadow-md">
            {messageText}
          </span>
        ) : feedbackMessage ? (
          <span
            className={`text-xs sm:text-sm font-bold tracking-wide drop-shadow-md ${
              isError
                ? "text-rose-400 animate-bounce"
                : "text-emerald-400 animate-pulse"
            }`}
          >
            {messageText}
          </span>
        ) : isTaskCompleted && currentStep.requireTask ? (
          <span className="text-xs sm:text-sm font-bold text-emerald-400 animate-pulse tracking-wide drop-shadow-md">
            {messageText}
          </span>
        ) : (
          <span className="text-xs sm:text-sm font-bold text-slate-100 tracking-wide leading-tight sm:leading-normal drop-shadow-md whitespace-normal wrap-break-word block">
            {messageText}
          </span>
        )}
      </div>

      {/* 3D Skip Button */}
      {onSkip ? (
        <button
          onClick={onSkip}
          className="group relative px-4 py-1.5 sm:px-5 sm:py-2 rounded-xl bg-linear-to-b from-rose-400 via-rose-500 to-rose-600 border-2 border-rose-300 border-b-6 border-b-rose-800 text-white text-xs sm:text-sm font-black tracking-wider uppercase shadow-lg pointer-events-auto transition-all active:border-b-2 active:translate-y-1 duration-100 hover:brightness-110 cursor-pointer shrink-0"
        >
          <div className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/20 to-transparent pointer-events-none" />
          <span>{t("skip")}</span>
        </button>
      ) : (
        <div className="hidden sm:block w-16 sm:w-20 shrink-0" />
      )}
    </div>
  );
};
