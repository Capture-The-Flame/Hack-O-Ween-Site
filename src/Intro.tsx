// src/IntroOverlay.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import laughUrl from "./assets/evil-laugh-89423.mp3"; // path relative to this file


type Step = "gate" | "present" | "title" | "fadeout" | "done";

export default function IntroOverlay({
  onDone,
  presentText = "WiCyS @ UIC presents…",
  titleText = "Hack-O-Ween",
  audio = laughUrl,
  stepMs = 2000,   // delay before showing the title
  holdMs = 2500,   // time the title stays before fadeout
  fadeMs = 500,    // overlay fade-out duration (match your CSS)
}: {
  onDone: () => void;
  presentText?: string;
  titleText?: string;
  audio?: string;
  stepMs?: number;
  holdMs?: number;
  fadeMs?: number;
}) {
  const [step, setStep] = useState<Step>("gate");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  };

  const finish = useCallback(() => {
    setStep("done");
    onDone();
  }, [onDone]);

  // Start sequence AFTER user clicks Start; also "unlock" audio here
  const beginIntro = useCallback(async () => {
    // 1) Prime/unlock audio under the user gesture
    const a = audioRef.current;
    if (a) {
      try {
        a.muted = true;           // muted autoplay is allowed
        await a.play();           // start (muted)
        a.pause();                // stop immediately
        a.currentTime = 0;        // rewind
        a.muted = false;          // unmute for later real play
      } catch {
        // Even if priming fails, we still run the sequence; the first click is a gesture,
        // so playing on 'title' often succeeds anyway.
      }
    }

    // 2) Kick off your original timed steps
    const noMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = noMotion ? 0 : stepMs;
    const h = noMotion ? 0 : holdMs;
    const f = noMotion ? 0 : fadeMs;

    setStep("present");
    timersRef.current.push(
      window.setTimeout(() => setStep("title"), 30 + s) as unknown as number,
      window.setTimeout(() => setStep("fadeout"), 30 + s + h) as unknown as number,
      window.setTimeout(() => finish(), 30 + s + h + f) as unknown as number
    );
  }, [stepMs, holdMs, fadeMs, finish]);

  // When the title shows, play the audio for real
  useEffect(() => {
    if (step !== "title") return;
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.volume = 1.0;
    a.play().catch(() => {
      // If this still fails, it means the browser blocked it.
      // Since we already had a click, this is rare; but no crash.
    });
  }, [step]);

  // Cleanup timers if component unmounts early
  useEffect(() => clearTimers, []);

  if (step === "done") return null;

  return (
    <div
      className={`intro-overlay ${step === "fadeout" ? "fadeout" : ""}`}
      role="dialog"
      aria-label="Intro"
      tabIndex={0}
    >
      {/* Preload/hold the sound */}
      <audio ref={audioRef} src={audio} preload="auto" />

      <div className="intro-inner" style={{ textAlign: "center" }}>
        {step === "gate" ? (
          <>
            <p className="intro-line present show" style={{ marginBottom: 16 }}>
              Are you ready to play?
            </p>
            <button
              onClick={beginIntro}
              className="intro-start-btn"
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid #666",
                background: "#111",
                color: "#eee",
                cursor: "pointer",
              }}
            >
              Start
            </button>
          </>
        ) : (
          <>
            {/* Line 1: WiCyS presents… */}
            <p className={`intro-line present ${step === "present" ? "show" : ""}`}>
              {presentText}
            </p>

            {/* Line 2: Hack-O-Ween */}
            <p className={`intro-line title ${step === "title" ? "show" : ""}`}>
              {titleText}
            </p>

          </>
        )}
      </div>
    </div>
  );
}
