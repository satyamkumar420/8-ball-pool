// LoadingScreen.jsx
"use client";
import { useState, useEffect } from "react";

import { useTranslations } from "next-intl";
import Image from "next/image";

export default function LoadingScreen({ onComplete }) {
  const tGame = useTranslations("Pool8Ball");

  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  // Animate progress and call onComplete when done
  useEffect(() => {
    const duration = 1000;
    const interval = 20;
    const steps = duration / interval;
    const progressPerStep = 100 / steps;

    let currentProgress = 0;
    const timer = setInterval(() => {
      currentProgress += progressPerStep;
      if (currentProgress >= 100) {
        setProgress(100);
        clearInterval(timer);
        setFadeOut(true);
        setTimeout(() => {
          onComplete?.();
        }, 300);
      } else {
        setProgress(Math.min(currentProgress, 99));
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <>
      <style>
        {`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}
      </style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#0a0a1a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          transition: "opacity 0.6s ease",
          opacity: fadeOut ? 0 : 1,
          pointerEvents: fadeOut ? "none" : "auto",
        }}
      >
        {/* Branding */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            marginBottom: "26px",
            animation: "fadeUp 1s ease",
          }}
        >
          <Image
            src="./logo.png"
            width={120}
            height={120}
            alt="Cloudz Fun"
            style={{
              width: "72px",
              height: "72px",
              objectFit: "contain",
              marginBottom: "10px",
              filter: "drop-shadow(0 0 12px rgba(255,140,0,0.4))",
            }}
          />

          <h1
            style={{
              color: "#fff",
              fontSize: "1.6rem",
              fontWeight: 900,
              letterSpacing: "2px",
              margin: 0,
              fontFamily: "Poppins, sans-serif",
            }}
          >
            CLOUDZ FUN
          </h1>
        </div>

        {/* Header */}
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <h2
            style={{
              color: "#fff",
              fontSize: "2rem",
              fontWeight: 900,
              letterSpacing: "0.1em",
              margin: 0,
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {tGame("title")}
          </h2>

          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "0.85rem",
              marginTop: "6px",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {tGame("loadingGame")}
          </p>
        </div>

        {/* Spinner */}
        <div
          style={{
            width: "48px",
            height: "48px",
            border: "4px solid rgba(255,255,255,0.1)",
            borderTop: "4px solid #a78bfa",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            marginBottom: "24px",
          }}
        />

        {/* Progress Bar */}
        <div
          style={{
            width: "200px",
            height: "4px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "99px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
              borderRadius: "99px",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        <p
          style={{
            color: "rgba(255,255,255,0.3)",
            fontSize: "0.75rem",
            marginTop: "10px",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {Math.floor(progress)}%
        </p>
      </div>
    </>
  );
}
