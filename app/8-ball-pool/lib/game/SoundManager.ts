// ============================================================
// SoundManager — Web Audio API Procedural Audio Engine
// Generates realistic pool sounds (ball clacks, cushion thuds, pocket drops)
// Zero external asset dependencies = zero latency & 100% reliability
// ============================================================

import { ICollisionEvent, SoundKey } from "@/lib/types";

/**
 * SoundManager uses procedural synthesis via Web Audio API.
 * Lazily initializes AudioContext on first user interaction to satisfy browser policies.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private lastPlayTimes: Map<string, number> = new Map();
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private variationsBuffers: Map<string, AudioBuffer[]> = new Map();
  private rollingSource: AudioBufferSourceNode | null = null;
  private rollingGainNode: GainNode | null = null;
  private bgMusicAudio: HTMLAudioElement | null = null;
  private bgMusicSource: MediaElementAudioSourceNode | null = null;
  private bgMusicGainNode: GainNode | null = null;
  private isBgMusicPlaying: boolean = false;
 
  constructor() {
    // Lazily initialized when play() is first called after user gesture
  }
 
  /**
   * Load sound asset files and decode them.
   * Uses fetch() on HTTP(S) and falls back to XMLHttpRequest for file:// protocol.
   * Silently skips loading when running on file:// protocol (procedural fallback handles it).
   */
  private async loadSoundAssets(): Promise<void> {
    if (!this.ctx) return;

    // On file:// protocol, fetch() is blocked by CORS and XHR has limited support.
    // Skip asset loading entirely — procedural synthesis fallback handles all sounds.
    const isFileProtocol = typeof window !== "undefined" && window.location.protocol === "file:";
    if (isFileProtocol) return;

    const assets: Record<string, string | string[]> = {
      [SoundKey.CUE_STRIKE]: "./sounds/stick-ball-03.m4a",
      [SoundKey.BALL_HIT]: [
        "./sounds/ball-ball-01.m4a",
        "./sounds/ball-ball-02.m4a",
        "./sounds/ball-ball-03.m4a"
      ],
      [SoundKey.CUSHION_HIT]: [
        "./sounds/ball-cushion-01.m4a",
        "./sounds/ball-cushion-02.m4a",
        "./sounds/ball-cushion-04.m4a",
        "./sounds/ball-cushion-05.m4a"
      ],
      [SoundKey.POCKET]: [
        "./sounds/ball-pocket-01.m4a",
        "./sounds/ball-pocket-02.m4a",
        "./sounds/ball-pocket-03.m4a",
        "./sounds/ball-pocket-04.m4a"
      ],
      [SoundKey.TRAY]: "./sounds/ball-tray-bounce-01.m4a",
      [SoundKey.FOUL]: "./sounds/notification.m4a",
      [SoundKey.WIN]: "./sounds/win.m4a",
      [SoundKey.LOSE]: "./sounds/notification.m4a",
      [SoundKey.WELCOME]: "./sounds/welcome.m4a",
      [SoundKey.CLICK]: "./sounds/click.m4a",
      [SoundKey.TURN_ALERT]: "./sounds/turn-notification.m4a",
      "rolling": "./sounds/ball_rolling.wav"
    };
 
    for (const [key, val] of Object.entries(assets)) {
      try {
        if (Array.isArray(val)) {
          const buffers: AudioBuffer[] = [];
          for (const url of val) {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            buffers.push(audioBuffer);
          }
          this.variationsBuffers.set(key, buffers);
        } else {
          const response = await fetch(val);
          if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
          this.audioBuffers.set(key, audioBuffer);
        }
      } catch {
        // Sound asset not available — procedural synthesis fallback will handle playback
      }
    }
  }

  /**
   * Play a decoded AudioBuffer.
   */
  private playBuffer(buffer: AudioBuffer, vol: number, pitchScale: number = 1.0): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.setValueAtTime(pitchScale, this.ctx.currentTime);

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(vol, this.ctx.currentTime);

      source.connect(gainNode);
      gainNode.connect(this.masterGain);
      source.start(0);
    } catch (e) {
      // Audio buffer playback failed — silent fallback
    }
  }

  /**
   * Initialize AudioContext on demand.
   */
  private initContext(): boolean {
    if (this.ctx && this.ctx.state === "running") {
      return true;
    }

    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return false;

      if (!this.ctx) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        const shouldBeMuted = this.isMuted;
        this.masterGain.gain.value = shouldBeMuted ? 0 : 1.0;
        this.masterGain.connect(this.ctx.destination);
        this.loadSoundAssets();
      } else if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      return true;
    } catch (e) {
      // AudioContext init failed — audio will be unavailable
      return false;
    }
  }

  /** Set mute state */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    const shouldBeMuted = this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(
        shouldBeMuted ? 0 : 1.0,
        this.ctx?.currentTime || 0
      );
    }
    if (shouldBeMuted) {
      this.stopRollingSound();
      if (this.bgMusicAudio) {
        this.bgMusicAudio.pause();
      }
    } else {
      if (this.isBgMusicPlaying && this.bgMusicAudio) {
        this.bgMusicAudio.play().catch(() => {});
      }
    }
  }

  /** Check if muted */
  getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Start playing background music (/sounds/bg-music.mp3) on loop at 80% volume.
   */
  startBgMusic(): void {
    if (typeof window === "undefined") return;

    // On file:// protocol, Audio elements face CORS restrictions with MediaElementAudioSourceNode.
    // Skip Web Audio routing — play directly via HTMLAudioElement (simpler, no CORS issue).
    const isFileProtocol = window.location.protocol === "file:";

    this.initContext();

    if (!this.bgMusicAudio) {
      this.bgMusicAudio = new Audio("./sounds/bg-music.mp3");
      this.bgMusicAudio.loop = true;
      this.bgMusicAudio.volume = 0.8; // 80% full volume
      this.bgMusicAudio.addEventListener("ended", () => {
        if (this.isBgMusicPlaying && this.bgMusicAudio && !this.isMuted) {
          this.bgMusicAudio.currentTime = 0;
          this.bgMusicAudio.play().catch(() => {});
        }
      });
    } else {
      this.bgMusicAudio.volume = 0.8;
    }

    // Route through Web Audio API gain node for master volume control (HTTP(S) only).
    // On file:// protocol, createMediaElementSource triggers CORS zeroes output.
    if (!isFileProtocol && this.ctx && this.masterGain && !this.bgMusicSource && this.bgMusicAudio) {
      try {
        this.bgMusicSource = this.ctx.createMediaElementSource(this.bgMusicAudio);
        this.bgMusicGainNode = this.ctx.createGain();
        this.bgMusicGainNode.gain.value = 0.8; // 80% volume
        this.bgMusicSource.connect(this.bgMusicGainNode);
        this.bgMusicGainNode.connect(this.masterGain);
      } catch {
        // MediaElementAudioSourceNode already connected
      }
    } else if (this.bgMusicGainNode) {
      this.bgMusicGainNode.gain.value = 0.8;
    }

    this.isBgMusicPlaying = true;
    const shouldBeMuted = this.isMuted;

    if (!shouldBeMuted && this.bgMusicAudio) {
      const playPromise = this.bgMusicAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Playback blocked by browser autoplay policy — attach one-time user gesture handler to play music
          const handleFirstGesture = () => {
            if (this.isBgMusicPlaying && this.bgMusicAudio && !this.isMuted) {
              this.bgMusicAudio.play().catch(() => {});
            }
            window.removeEventListener("pointerdown", handleFirstGesture);
            window.removeEventListener("keydown", handleFirstGesture);
          };
          window.addEventListener("pointerdown", handleFirstGesture, { once: true });
          window.addEventListener("keydown", handleFirstGesture, { once: true });
        });
      }
    }
  }

  /**
   * Stop background music and reset playback position.
   */
  stopBgMusic(): void {
    this.isBgMusicPlaying = false;
    if (this.bgMusicAudio) {
      this.bgMusicAudio.pause();
      this.bgMusicAudio.currentTime = 0;
    }
  }

  /**
   * Pause background music without resetting position.
   */
  pauseBgMusic(): void {
    if (this.bgMusicAudio) {
      this.bgMusicAudio.pause();
    }
  }

  /**
   * Resume background music if active and not muted.
   */
  resumeBgMusic(): void {
    const shouldBeMuted = this.isMuted;
    if (this.isBgMusicPlaying && this.bgMusicAudio && !shouldBeMuted) {
      this.bgMusicAudio.play().catch(() => {});
    }
  }

  play(key: SoundKey, volumeScale: number = 1.0): void {
    if (this.isMuted) return;
    if (!this.initContext() || !this.ctx || !this.masterGain) return;

    // Throttle high-frequency identical sounds (e.g. rapid collisions within 25ms)
    const nowMs = performance.now();
    const lastTime = this.lastPlayTimes.get(key) || 0;
    if (nowMs - lastTime < 25 && key !== SoundKey.POCKET) {
      return;
    }
    this.lastPlayTimes.set(key, nowMs);

    const clampedVol = Math.max(0.05, Math.min(1.0, volumeScale));

    const variations = this.variationsBuffers.get(key);
    if (variations && variations.length > 0) {
      const idx = Math.floor(Math.random() * variations.length);
      const buffer = variations[idx];
      const pitch = (key === SoundKey.BALL_HIT || key === SoundKey.CUSHION_HIT)
        ? 0.95 + Math.random() * 0.10
        : 1.0;
      this.playBuffer(buffer, clampedVol, pitch);
      return;
    }

    const buffer = this.audioBuffers.get(key);
    if (buffer) {
      this.playBuffer(buffer, clampedVol, 1.0);
      return;
    }

    switch (key) {
      case SoundKey.BALL_HIT:
        this.playBallHit(clampedVol);
        break;
      case SoundKey.CUSHION_HIT:
        this.playCushionHit(clampedVol);
        break;
      case SoundKey.POCKET:
        this.playPocketDrop(clampedVol);
        break;
      case SoundKey.CUE_STRIKE:
        this.playCueStrike(clampedVol);
        break;
      case SoundKey.FOUL:
        this.playFoul(clampedVol);
        break;
      case SoundKey.WIN:
        this.playWin(clampedVol);
        break;
      case SoundKey.LOSE:
        this.playLose(clampedVol);
        break;
    }
  }

  /**
   * Update the continuous rolling sound (ludkana) based on the maximum ball speed.
   */
  updateRollingSound(maxSpeed: number): void {
    if (this.isMuted) {
      this.stopRollingSound();
      return;
    }
    if (!this.initContext() || !this.ctx || !this.masterGain) return;

    const rollingBuffer = this.audioBuffers.get("rolling");
    if (!rollingBuffer) return; // Wait until rolling buffer is loaded

    if (maxSpeed > 0.05) {
      // Scale volume based on speed (subtle felt rolling rumble)
      const targetVol = Math.min(0.35, (maxSpeed / 8.0) * 0.35);
      const pitch = 0.8 + Math.min(0.4, maxSpeed / 10.0);

      if (!this.rollingSource) {
        try {
          this.rollingSource = this.ctx.createBufferSource();
          this.rollingSource.buffer = rollingBuffer;
          this.rollingSource.loop = true;
          this.rollingSource.playbackRate.setValueAtTime(pitch, this.ctx.currentTime);

          this.rollingGainNode = this.ctx.createGain();
          this.rollingGainNode.gain.setValueAtTime(0.001, this.ctx.currentTime);

          this.rollingSource.connect(this.rollingGainNode);
          this.rollingGainNode.connect(this.masterGain);
          this.rollingSource.start(0);
        } catch (e) {
          // Rolling sound start failed — silent fallback
          return;
        }
      }

      if (this.rollingGainNode) {
        this.rollingGainNode.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.1);
      }
      if (this.rollingSource) {
        this.rollingSource.playbackRate.setTargetAtTime(pitch, this.ctx.currentTime, 0.1);
      }
    } else {
      this.stopRollingSound();
    }
  }

  /**
   * Smoothly stop the rolling sound to avoid clicks.
   */
  stopRollingSound(): void {
    if (!this.rollingSource) return;

    const src = this.rollingSource;
    const gainNode = this.rollingGainNode;

    this.rollingSource = null;
    this.rollingGainNode = null;

    if (gainNode && this.ctx) {
      try {
        gainNode.gain.setValueAtTime(gainNode.gain.value, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        setTimeout(() => {
          try {
            src.stop();
            src.disconnect();
            gainNode.disconnect();
          } catch {
            // Ignore disconnect errors
          }
        }, 200);
      } catch {
        // Fallback immediate stop if AudioContext is closed/suspended
        try {
          src.stop();
          src.disconnect();
          gainNode.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      }
    }
  }

  /**
   * Process and play sound effects for physics collision events.
   */
  handleCollisionEvents(events: ICollisionEvent[]): void {
    if (this.isMuted || events.length === 0) return;

    // Limit simultaneous sounds per frame to prevent audio clipping during break shots
    let soundCount = 0;
    const maxSoundsPerFrame = 4;

    for (const event of events) {
      if (soundCount >= maxSoundsPerFrame) break;

      if (event.type === "ball") {
        if (event.speed > 0.4) {
          const vol = Math.min(1.0, Math.max(0.15, event.speed / 14));
          this.play(SoundKey.BALL_HIT, vol);
          soundCount++;
        }
      } else if (event.type === "cushion") {
        if (event.speed > 0.5) {
          const vol = Math.min(1.0, Math.max(0.15, event.speed / 12));
          this.play(SoundKey.CUSHION_HIT, vol);
          soundCount++;
        }
      } else if (event.type === "pocket") {
        this.play(SoundKey.POCKET, 1.0);
        this.playTubeRoll(400, 1.0);
        setTimeout(() => {
          this.play(SoundKey.TRAY, 1.0);
        }, 400);
        soundCount++;
      }
    }
  }

  /**
   * Play a short rolling/sliding sound inside the ball tube when a ball is pocketed.
   */
  playTubeRoll(durationMs: number = 400, volume: number = 1.0): void {
    if (this.isMuted) return;
    if (!this.initContext() || !this.ctx || !this.masterGain) return;

    const rollingBuffer = this.audioBuffers.get("rolling");
    const now = this.ctx.currentTime;
    const durationSec = durationMs / 1000;

    if (rollingBuffer) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = rollingBuffer;
        // Standard full natural pitch
        const pitch = 1.0;
        source.playbackRate.setValueAtTime(pitch, now);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.01, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        source.start(now);
        source.stop(now + durationSec);
        return;
      } catch (e) {
        // Tube roll buffer unavailable — falling through to procedural
      }
    }

    // Procedural fallback if audio buffer is unavailable
    try {
      this.addNoiseBurst(now, durationSec, volume, 600);
    } catch (e) {
      // Procedural tube roll failed — no audio for this event
    }
  }

  // ---- Procedural Synthesis Generators ----

  /**
   * Phenolic ball clack: sharp high-frequency oscillator impulse + transient noise click.
   */
  private playBallHit(vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    gain.connect(this.masterGain);

    // High pitch impact click
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(2100, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.015);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.035);

    // Noise click texture
    this.addNoiseBurst(now, 0.012, vol * 0.4, 3500);
  }

  /**
   * Rubber cushion thud: low frequency triangle drop + low-pass noise punch.
   */
  private playCushionHit(vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    gain.connect(this.masterGain);

    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.07);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.09);

    this.addNoiseBurst(now, 0.06, vol * 0.3, 300);
  }

  /**
   * Leather pocket drop: hollow descending pitch + rolling rumble.
   */
  private playPocketDrop(vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    gain.connect(this.masterGain);

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.18);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.22);

    this.addNoiseBurst(now, 0.2, vol * 0.45, 450);
  }

  /**
   * Cue stick tip strike: punchy mid-frequency pop.
   */
  private playCueStrike(vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.75, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    gain.connect(this.masterGain);

    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.035);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.045);

    this.addNoiseBurst(now, 0.02, vol * 0.3, 1200);
  }

  /**
   * Foul buzzer: dual dissonant sawtooth oscillators.
   */
  private playFoul(vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    gain.connect(this.masterGain);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = "sawtooth";
    osc2.type = "sawtooth";
    osc1.frequency.setValueAtTime(145, now);
    osc2.frequency.setValueAtTime(154, now); // Dissonance

    osc1.connect(gain);
    osc2.connect(gain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  /**
   * Win fanfare: uplifting major chord arpeggio (C5 -> E5 -> G5 -> C6).
   */
  private playWin(vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const noteStart = now + idx * 0.1;
      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(vol * 0.5, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.28);
      gain.connect(this.masterGain!);

      const osc = this.ctx!.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, noteStart);
      osc.connect(gain);
      osc.start(noteStart);
      osc.stop(noteStart + 0.28);
    });
  }

  /**
   * Lose tone: descending sad tones (G4 -> E4 -> C4).
   */
  private playLose(vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [392.0, 329.63, 261.63]; // G4, E4, C4

    notes.forEach((freq, idx) => {
      const noteStart = now + idx * 0.18;
      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(vol * 0.55, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);
      gain.connect(this.masterGain!);

      const osc = this.ctx!.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, noteStart);
      osc.connect(gain);
      osc.start(noteStart);
      osc.stop(noteStart + 0.35);
    });
  }

  /**
   * Helper to generate short white noise burst filtered at target frequency.
   */
  private addNoiseBurst(now: number, duration: number, vol: number, filterFreq: number): void {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.setValueAtTime(1.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + duration);
  }
}

/** Singleton instance for application-wide sound effects */
export const soundManager = new SoundManager();
