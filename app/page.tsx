"use client";

import { GameCanvas } from "./8-ball-pool/components/game/GameCanvas";

export default function Home() {
  return (
    <main className="flex flex-col h-dvh w-dvw bg-[#1B273A] overflow-hidden select-none">
      <GameCanvas />
    </main>
  );
}
