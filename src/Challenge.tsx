import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { asset } from "./asset";
const kittyGif = asset("cuteGifs/kitty.gif");
const twoGhosts = asset("cuteGifs/two ghosts.gif");
const pumpkinCat = asset("cuteGifs/pumpkinCat.gif");



import { createPortal } from "react-dom";

function HelpDownload({
  url,
  fileName,
  depKey,
}: { url?: string; fileName?: string; depKey: number }) {
  const [open, setOpen] = React.useState(false);

  const sameOrigin = !!url && isSameOrigin(url);
  const linkProps = url
    ? sameOrigin
      ? { href: url, download: fileName || undefined } // triggers save dialog
      : { href: url, target: "_blank", rel: "noopener noreferrer" as const } // cannot force download
    : {};

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="text-sm underline text-slate-700 hover:text-slate-900"
        aria-expanded={open}
        aria-controls={`help-${depKey}`}
      >
        Need help?
      </button>

      {open && (
        <div id={`help-${depKey}`} className="mt-2 flex items-center gap-2">
          {url ? (
            <>
              <a
                {...linkProps}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 active:scale-[.99]"
              >
                Download help PDF
              </a>
              {!sameOrigin && (
                <span className="text-xs text-slate-500">
                  (Opens in a new tab to download)
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-500">No help file for this challenge.</span>
          )}
        </div>
      )}
    </div>
  );
}

function SuccessVideoOverlay({
  src,
  show,
  onDone,
}: {
  src: string;
  show: boolean;
  onDone: () => void;
}) {
  const vref = React.useRef<HTMLVideoElement | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  // make visible pre-paint to avoid top-left flash
  React.useLayoutEffect(() => {
    setVisible(!!show);
    if (!show) setReady(false);
  }, [show]);

  // start + keep playing (no pause allowed)
  React.useLayoutEffect(() => {
    const v = vref.current;
    if (!show || !v) return;

    
    v.controls = false;
    v.disablePictureInPicture = true;
    v.disableRemotePlayback = true;

    v.currentTime = 0;
    v.muted = false;   
    v.volume = 1;

    const play = () => v.play().catch(() => {});
    const preventPause = () => { if (show) play(); };
    const preventSeek = (e: Event) => { e.preventDefault(); play(); };

    play();

    
    v.addEventListener("pause", preventPause);
    v.addEventListener("seeking", preventSeek);
    v.addEventListener("ratechange", preventPause);

    // Prevent “space/k” keyboard pauses while overlay is up
    const onKey = (e: KeyboardEvent) => {
      if (!show) return;
      const block = [" ", "Spacebar", "k", "K", "MediaPlayPause", "ArrowLeft", "ArrowRight"];
      if (block.includes(e.key)) { e.preventDefault(); e.stopPropagation(); }
    };
    document.addEventListener("keydown", onKey, { capture: true });

    // If tab is hidden and resumes, keep playing
    const onVis = () => { if (document.visibilityState === "visible") play(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      v.removeEventListener("pause", preventPause);
      v.removeEventListener("seeking", preventSeek);
      v.removeEventListener("ratechange", preventPause);
      document.removeEventListener("keydown", onKey, { capture: true } as any);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [show]);

  if (!mounted || !show) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      // full-screen overlay, ignores clicks
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.9)",
        opacity: visible ? 1 : 0,
        transition: "opacity 150ms ease",
        // block all pointer events on the overlay so no accidental pauses
        pointerEvents: "auto",
      }}
      // Don’t close on click; only when the video ends
      onClick={(e) => { e.stopPropagation(); }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={vref}
        src={src}
        playsInline
        autoPlay
        preload="auto"
        // absolutely no controls
        controls={false}
        // extra hints to browsers
        // @ts-ignore
        controlsList="nodownload noremoteplayback noplaybackrate nofullscreen"
        // styling: centered, no cursor, no clicks
        style={{
          display: "block",
          maxWidth: "90vw",
          maxHeight: "80vh",
          borderRadius: "12px",
          boxShadow: "0 25px 50px rgba(0,0,0,.35)",
          visibility: ready ? "visible" : "hidden",
          pointerEvents: "none",   // clicks pass through (but overlay itself blocks)
          userSelect: "none",
          cursor: "none",
        }}
        onLoadedData={() => setReady(true)}
        onEnded={onDone}
        onMouseDown={(e) => e.preventDefault()}
        onTouchStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>,
    document.body
  );
}


// ========= Crypto helpers (frontend only, no backend needed) =========
async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const hex = [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex;
}

async function matchesHash(
  input: string,
  expectedHash: string
): Promise<boolean> {
  const h = await sha256(input.trim().toLowerCase());
  return h === expectedHash;
}

async function makeCompletionCode(answersInOrder: string[]): Promise<string> {
  const payload = `v1|${answersInOrder
    .map((a) => a.trim().toLowerCase())
    .join("|")}`;
  return sha256("site-wide-salt-change-me" + payload);
}

function TypewriterText({
  text,
  cps = 20,           // characters per second
  startDelayMs = 1000,   // delay before typing starts
  className,
}: {
  text: string;
  cps?: number;
  startDelayMs?: number;
  className?: string;
}) {
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    let intervalId: number | null = null;
    let delayId: number | null = null;

    delayId = window.setTimeout(() => {
      const stepMs = Math.max(10, Math.floor(1000 / cps));
      intervalId = window.setInterval(() => {
        setI((n) => (n < text.length ? n + 1 : n));
      }, stepMs) as unknown as number;
    }, startDelayMs) as unknown as number;

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (delayId) clearTimeout(delayId);
    };
  }, [text, cps, startDelayMs]);

  return <span className={className}>{text.slice(0, i)}</span>;
}

// ========= Types =========
export type ScareConfig = {
  /** Enable a jump-scare when the user submits a wrong answer */
  enabled?: boolean;
  /** Optional: probability (0-1). Defaults to 1. */
  probability?: number;
  /** Show for this long (ms). Defaults to 1500 */
  durationMs?: number;
  /** Media to show full-screen. Put in /public/assets */
  imageUrl?: string; // png/jpg/gif
  videoUrl?: string; // mp4/webm (muted autoplay)
  soundUrl?: string; // mp3/wav (played on submit click gesture)
  overlayText?: string;
  mazeGate?: boolean;
};

type Challenge = {
  id: number;
  title: string;
  prompt: string;
  downloadUrl?: string;
  downloadName?: string;
  salt?: string;
  expectedHash?: string;
  validate?: (answer: string) => boolean | Promise<boolean>;
  hint?: string;
  scare?: ScareConfig; // per-challenge override
  helpPdfUrl?: string;
};

function isSameOrigin(url: string) {
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin;
  } catch {

    return !/^https?:\/\//i.test(url);
  }
}

function linkPropsFor(url: string, downloadName?: string) {
  const openInNewTab = { target: "_blank", rel: "noopener noreferrer" as const };

  if (isSameOrigin(url)) {
    // same-origin file → download, but in a NEW TAB so the SPA stays put
    return {
      href: url,
      label: `Download ${downloadName || "file"}`,
      extra: { download: downloadName, ...openInNewTab },
    } as const;
  }

  // external site → open new tab
  return {
    href: url,
    label: "Visit website",
    extra: openInNewTab,
  } as const;
}

//challenges
const DEMO_CHALLENGES: Challenge[] = [
  {
    id: 1,
    title: "Challenge 1 — OSINT",
    prompt:
      "Here's a fun one! Do you know your Halloween fun facts?! Click on this link and answer all our trivia to get the flag :) !",
    downloadUrl: "https://capture-the-flame.github.io/Spooky_Hunt/",
    expectedHash: "73f9b916de0c603f404095a815591c2e0bc522ed22518f086b35523f8815cda1",
    scare: { enabled: false, probability: 1.0, durationMs: 1000, imageUrl: asset("gifs/s.gif"), soundUrl: asset("gifs/s.mp3") },
  },
  {
    id: 2,
    title: "Challenge 2 — Reverse Engineering",
    prompt: "There are rumors of a new and strange place that was in this abandoned office building. I went to check it out and was completely shocked. I don’t know how I found my way out. Can you look at this simulation and figure out how to traverse the facility?",
    downloadUrl: asset("zips/LinkedRoom.zip"),
    downloadName: "LinkedRooms.zip",
    expectedHash: "2e32c2198d534506188009d693636ff1096cba64d63864c13cd1e43e464dad44",
    scare: { enabled: true, probability: 1.0, durationMs: 1000, imageUrl: asset("gifs/s.gif"), soundUrl: asset("gifs/s.mp3") },
    helpPdfUrl: asset("help/LinkedRooms.pdf"),
  },
  { id: 3, 
    title: "Challenge 3 — Web Exploit", 
    prompt: "There’s this new website out now that I have been looking at. I looked on reddit and it seems to be a crappy site that doesn’t work. But..There was a weird thing that someone noticed. There are invisible attributes of the site. Can you see if there’s something important inside the site?", 
    downloadUrl: "https://capture-the-flame.github.io/Domonic_Themonics/", 
    expectedHash: "d65957fde942d7effc1eaa0758ad624a83a2aa901cb05791a0ba60b62f68b950",
    helpPdfUrl: asset("help/Domonic_Themonics.pdf"),
    scare: { enabled: false, probability: 1.0, durationMs: 1000, imageUrl: asset("gifs/s.gif"), soundUrl: asset("gifs/s.mp3") },
  },
  { id: 4, 
    title: "Challenge 4 — Forensics",
    prompt: "We intercepted this transmission being recorded. We have no idea what it means or how it got recorded. We are trying to figure out what's going on and if there is something embedded in it?", 
    downloadUrl: asset("zips/Intercepted_Transmission.wav"), 
    downloadName: "Intercepted Transmission", 
    expectedHash: "892b6b264d0732cc051f5d847e2c4486a8cd70e3b92b6205c3641e811ee5e3c7",
    helpPdfUrl: asset("help/Intercepted_Transmission.pdf"),
    scare: {enabled: true,  probability: 1.0, imageUrl: asset("gifs/ominous.gif"), soundUrl: asset("gifs/ominous.mp3"), durationMs: 8000, overlayText: "You got lucky...this time."},
  },
  { id: 5, 
    title: "Challenge 5 — Forensics", 
    prompt: "We recovered this footage from a cult group that vacated a lot in the city. We watched it over hundreds of times and cannot find out what it means.",
    downloadUrl: asset("zips/Found_Footage.mp4"), 
    downloadName: "Cult Video", 
    helpPdfUrl: asset("help/Found_Footage.pdf"),
    expectedHash: "cd893fc0e35bc788f5a5963ca4327b51389a445aeb59785c10a507cbfb2745a7",
    scare: {enabled: false,  probability: 1.0, imageUrl: asset("gifs/ominous.gif"), soundUrl: asset("gifs/ominous.mp3"), durationMs: 8000, overlayText: "You got lucky...this time."},
  },
  { id: 6, 
    title: "Challenge 6 — Cryptography", 
    prompt: "An expedition team out in the desert found an ancient tablet that had some sort of unrecognized ancient language. The team has spent months trying to decipher it but has made minimal progress. Every time someone comes close they go missing. I’m thinking that figuring out the text can help us get them back! I’ve attached their research here to give you a head start! Please help us..",
    downloadUrl: asset("zips/Ruined_Language.zip"),
    downloadName: "Ruined_Language.zip", 
    expectedHash: "3f585391c0e52381b47a1067f7681610318e0772e81306009c180655645a6d9c",
    helpPdfUrl: asset("help/Ruined_Language.pdf"),
    scare: {enabled: true, probability: 1, mazeGate: true, imageUrl: asset("gifs/s2.gif"), soundUrl: asset("gifs/s2.mp3"), durationMs: 1000 }, 
  },
];

// ========= Persistence =========
export const STORAGE_KEY = "ctf6_progress_v3";

type StoredState = { index: number; answers: Record<number, string>; solved: Record<number, boolean>; muted: boolean };

function loadState(): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredState) : null;
  } catch {
    return null;
  }
}

function saveState(s: StoredState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function MazeGateOverlay({
  show,
  onWin,
  title = "Nice job! You're almost there, just thread the needle...",
  tip = "Start at START, stay on the path, reach GOAL. Leaving the path resets.",
}: {
  show: boolean;
  onWin: () => void;
  title?: string;
  tip?: string;
}) {
  const startedRef = React.useRef(false); // must be set by START
  const failedRef  = React.useRef(false);
  const wonRef     = React.useRef(false);

  React.useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [show]);

  if (!show) return null;

  const armRun = () => {
    // only START can arm a run
    startedRef.current = true;
    failedRef.current  = false;
    wonRef.current     = false;
  };

  const failRun = () => {
    // only fail an active run (after START, before GOAL)
    if (startedRef.current && !wonRef.current) {
      failedRef.current = true;
    }
  };

  // any move not over a "safe" element fails an armed run
  const onBoardMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!startedRef.current || wonRef.current) return;
    const el = e.target as HTMLElement;
    const safe = el.closest('[data-safe="1"]');
    if (!safe) failRun();
  };

  const tryWin = () => {
    // you can only win if you started at START and never failed
    if (startedRef.current && !failedRef.current && !wonRef.current) {
      wonRef.current = true;
      onWin();
    }
  };

  return (
    <div className="maze-overlay" role="dialog" aria-modal="true" aria-label="Maze" tabIndex={-1}>
      <div className="maze-frame">
        <div className="maze-head"><strong>{title}</strong></div>
        <div className="maze-tip">{tip}</div>

        <div
          className="maze-board"
          onMouseLeave={failRun}    // leaving the board = fail (if armed)
          onMouseMove={onBoardMove} // leaving the safe path = fail (if armed)
        >
          {/* START — ONLY this arms the run */}
          <div
            className="maze-start maze-flag"
            data-safe="1"
            onMouseEnter={armRun}
          >
            START
          </div>

          {/* SAFE PATH — cursor must remain on these (plus START/GOAL) */}
          <div className="safe safe-h s1" data-safe="1" aria-hidden />
          <div className="safe safe-v s2" data-safe="1" aria-hidden />
          <div className="safe safe-h s3" data-safe="1" aria-hidden />
          <div className="safe safe-v s4" data-safe="1" aria-hidden />
          <div className="safe safe-h s5" data-safe="1" aria-hidden />
          <div className="safe safe-v s6" data-safe="1" aria-hidden />
          <div className="safe safe-h s7" data-safe="1" aria-hidden />
          <div className="safe safe-v s8" data-safe="1" aria-hidden />

          {/* GOAL — only wins if started && not failed */}
          <div
            className="maze-goal maze-flag"
            data-safe="1"
            onMouseEnter={tryWin}
          >
            GOAL
          </div>

          {/* Visual walls (unsafe) */}
          <div className="maze-wall w1" aria-hidden />
          <div className="maze-wall w2" aria-hidden />
          <div className="maze-wall w3" aria-hidden />
          <div className="maze-wall w4" aria-hidden />
          <div className="maze-wall w5" aria-hidden />
          <div className="maze-wall w6" aria-hidden />
          <div className="maze-wall w7" aria-hidden />
          <div className="maze-wall w8" aria-hidden />

          {/* Edge guards (unsafe) */}
          <div className="maze-edge top" aria-hidden />
          <div className="maze-edge right" aria-hidden />
          <div className="maze-edge bottom" aria-hidden />
          <div className="maze-edge left" aria-hidden />
        </div>
      </div>
    </div>
  );
}

// ========= Jump‑scare overlay =========
function JumpscareOverlay({
  show,
  config,
  onDone,
  muted,
}: {
  show: boolean;
  config?: ScareConfig;
  onDone: () => void;
  muted: boolean;
}) {
  const timeoutRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!show) return;
    // auto hide after duration
    const dur = config?.durationMs ?? 1500;
    timeoutRef.current = window.setTimeout(() => onDone(), dur);

    // try to play audio once
    if (!muted && config?.soundUrl) {
      const a = new Audio(config.soundUrl);
      audioRef.current = a;
      a.play().catch(() => {});
    }
    // try to play video 
    if (config?.videoUrl && videoRef.current) {
      const v = videoRef.current;
      v.currentTime = 0;
      v.play().catch(() => {});
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, [show]);

  if (!show) return null;
  return (
    <div className="jumpscare-overlay" role="dialog" aria-modal="true" aria-label="Scare">
      {config?.imageUrl && !config.videoUrl && (
        <img src={config.imageUrl} alt="boo" className="jumpscare-media" />
      )}
      {config?.videoUrl && (
        <video
          ref={videoRef}
          src={config.videoUrl}
          className="jumpscare-media"
          muted
          playsInline
        />
      )}

      {/* Overlay */}
      {config?.overlayText && (
        <div className="j-text" aria-hidden="true">
          <TypewriterText text={config.overlayText} cps={4} startDelayMs={40}/>
        </div>
      )}
    </div>
  );
}

// ========= Main Component =========
export default function ChallengeFlow({
  challenges = DEMO_CHALLENGES,
  globalScare = { enabled: true, probability: 0.25, durationMs: 1400, imageUrl: asset("assets/scare-default.png") },

}: {
  challenges?: Challenge[];
  /** default scare config used when challenge.scare is undefined */
  globalScare?: ScareConfig;
  onRequestReset?: () => void;
}) {
  const total = challenges.length;

  const initial = useMemo(() => loadState(), []);
  const [index, setIndex] = useState<number>(initial?.index ?? 0);
  const [answers, setAnswers] = useState<Record<number, string>>(initial?.answers ?? {});
  const [solved, setSolved] = useState<Record<number, boolean>>(initial?.solved ?? {});
  const [muted] = useState<boolean>(initial?.muted ?? false);
  const [showMaze, setShowMaze] = useState(false);
  const [scareFired, setScareFired] = useState<Record<number, boolean>>({});
  const [showSuccessVideo, setShowSuccessVideo] = useState(false);


  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showScare, setShowScare] = useState(false);
  const current = challenges[index];
  const currentAnswer = answers[current.id] ?? "";
  const solvedCount = Object.values(solved).filter(Boolean).length;

  const audioBank = React.useRef<Record<string, HTMLAudioElement>>({});
  const mazePrimedAudio = React.useRef<HTMLAudioElement | null>(null);

  const navigate = useNavigate();

  // Persist
  useEffect(() => {
    saveState({ index, answers, solved, muted });
  }, [index, answers, solved, muted]);

  function onChangeAnswer(v: string) {
    setAnswers((prev) => ({ ...prev, [current.id]: v }));
  }

  function maybeScare() {
    const cfg = current.scare ?? globalScare;
    if (!cfg?.enabled) return;
    if (scareFired[current.id]) return;

    const p = cfg.probability ?? 1;
    if (Math.random() > p) return; // miss → do nothing

    if (cfg.mazeGate) {
      
      setShowMaze(true);
      if (!muted && cfg.soundUrl) {
        const a = audioBank.current[cfg.soundUrl] || new Audio(cfg.soundUrl);
        audioBank.current[cfg.soundUrl] = a;
        try {
          a.loop = false;
          a.muted = true;      // key: muted playback allowed without gesture
          a.currentTime = 0;
          a.preload = "auto";
          a.play().catch(() => {}); // start silently
          mazePrimedAudio.current = a;
        } catch {}
      }
    } else {
      setShowScare(true);
      setScareFired(prev => ({ ...prev, [current.id]: true }));
    }
  }

  async function checkAnswer(): Promise<boolean> {
    const raw = (answers[current.id] ?? "").trim();
    if (!raw) return false;

    if (current.validate) return !!(await current.validate(raw));
    if (current.expectedHash) return matchesHash(raw, current.expectedHash);
    return true; // fallback (accept any non-empty)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const ok = await checkAnswer();
      if (!ok) {

        setError(current.hint || "Not quite right. Try again!");
        maybeScare();
        return;
      }

      if (current.id === 1) {
        setShowSuccessVideo(true); // overlay mounts and auto-plays with sound
      }
      setSolved((prev) => ({ ...prev, [current.id]: true }));

      const finishing = (solvedCount + 1) === total;

      if (finishing) {
        const orderedAnswers = challenges.map((c) =>
        c.id === current.id ? (answers[c.id] ?? "").trim() : (answers[c.id] ?? "")
        );

        const code = await makeCompletionCode(orderedAnswers);

        const finishedAtMs = Math.floor(performance.timeOrigin + performance.now());
        const finishedAtIso = new Date(finishedAtMs).toISOString();

        try {
          const a = new Audio(asset("gifs/Andrew Gold - Spooky, Scary Skeletons - Undead Tombstone Remix.mp3"));
          a.preload = "auto";
          a.play().catch(() => {});
        } catch {}

          navigate(
            `/congrats?code=${encodeURIComponent(code)}&finished=${encodeURIComponent(finishedAtIso)}&ms=${finishedAtMs}`,
            { replace: true }
          );
        return;
      }

      if (index < total - 1) setIndex(index + 1);
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    setIndex(0);
    setAnswers({});
    setSolved({});
    setError(null);
  }

  return (
    <div className="ChallengeFlow">
      { /* corner gifs */}
      {/* <img src={ghost} className="corner corner--tl" aria-hidden/> */}
      <img src={twoGhosts} className="corner corner--tr" aria-hidden/>
      {/* <img src={explodingPumpkin} className="corner corner--bl" aria-hidden/> */}
      <img src={pumpkinCat} className="corner corner--bl" aria-hidden/>
        <div className="challenge-root">
        <div className="challenge-container">

            {/* Current Challenge Card */}
            <section className="challenge-card">
            <div className="challenge-card-body">
                <div className="title-gif">
                  <img src={kittyGif} alt="kitty" className="kitty-gif-icon"></img>
                  <h2 className="challenge-title">{current.title}</h2>
                </div>
                <p className="challenge-prompt">{current.prompt}</p>

                {current.downloadUrl && (() => {
                  const { href, label, extra } = linkPropsFor(current.downloadUrl, current.downloadName);
                  return (
                    <div className="link">
                      <a
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 active:scale-[.99]"
                        href={href}
                        {...extra}
                      >
                        {label}
                      </a>
                    </div>
                  );
                })()}
                <button onClick={resetAll} className="text-sm px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-white active:scale-[.99]">Reset</button>

                <form onSubmit={onSubmit} className="mt-6">
                <input
                    id="answer"
                    type="text"
                    autoComplete="off"
                    className="challenge-input-box"
                    value={currentAnswer}
                    onChange={(e) => onChangeAnswer(e.target.value)}
                    placeholder="Answer if you dare"
                    required
                />

                {error && <div className="error-message">{error}</div>}
                {solved[current.id] && <div className="mt-3 text-sm text-emerald-700">Correct! You can proceed to the next challenge.</div>}

                <div className="challenge-button">
                    <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:opacity-95 active:scale-[.99] disabled:opacity-60"
                    >
                    {solved[current.id] ? "Re‑check" : submitting ? "Checking…" : "Submit"}
                    </button>
                    {/* navigation is gated: no Back/Next buttons */}
                </div>
                </form>

                <div className="help-button">
                  <HelpDownload
                    url={current.helpPdfUrl}
                    fileName={current.title.replace(/\s+/g, "_") + ".pdf"} // optional nice name
                    depKey={current.id}
                  />
                </div>
            </div>
            </section>

        </div>

        <MazeGateOverlay
          show={showMaze}
          onWin={() => {
          const cfg = (current.scare ?? globalScare);
          if (!muted && cfg?.soundUrl && mazePrimedAudio.current) {
            try {
              mazePrimedAudio.current.currentTime = 0; // jump to start
              mazePrimedAudio.current.muted = false;   // instantly audible
            } catch {}
          }
            setShowMaze(false);
            setShowScare(true);              // trigger jumpscare immediately
            setScareFired(prev => ({ ...prev, [current.id]: true })); // mark fired here
          }}
        />

        <SuccessVideoOverlay
          src={asset("gifs/CouragTheDog.mp4")} 
          show={showSuccessVideo}
          onDone={() => setShowSuccessVideo(false)}
        />

        {/* Full‑screen jump‑scare */}
        <JumpscareOverlay
            show={showScare}
            config={current.scare ?? globalScare}
            onDone={() => setShowScare(false)}
            muted={muted}
        />
        </div>
    </div>
  );
}
