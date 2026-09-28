"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveVideoProgress } from "@/app/learn/[slug]/actions";
import type { PlayerSource } from "@/lib/video";
import { playerClock } from "./player-clock";

const SAVE_EVERY_MS = 15_000;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Tracks watch position for native video files and YouTube (via postMessage — no
 * extra script). Saves at most every 15s, plus on pause/end. Resumes from the
 * stored position. Other hosts (Google Drive, Vimeo) play without position tracking.
 */
export function VideoPlayer({ source, lessonId, title, initialPosition, track }: { source: NonNullable<PlayerSource>; lessonId: string; title: string; initialPosition: number; track: boolean }) {
  const lastSaved = useRef(0);
  const latest = useRef<{ t: number; d: number | null }>({ t: initialPosition, d: null });
  const [resumed, setResumed] = useState(initialPosition > 5);

  const persist = useCallback((force = false) => {
    if (!track) return;
    const now = Date.now();
    if (!force && now - lastSaved.current < SAVE_EVERY_MS) return;
    lastSaved.current = now;
    void saveVideoProgress(lessonId, latest.current.t, latest.current.d);
  }, [lessonId, track]);

  const onTime = useCallback((t: number, d: number | null) => {
    latest.current = { t, d };
    playerClock.seconds = t;
    persist();
  }, [persist]);

  useEffect(() => {
    playerClock.seconds = null;
    return () => { persist(true); playerClock.seconds = null; };
  }, [persist]);

  const isYouTube = source.kind === "iframe" && source.src.includes("youtube.com/embed/");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isYouTube) return;
    const onMsg = (e: MessageEvent) => {
      if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        const info = data?.info;
        if (info && typeof info.currentTime === "number") onTime(info.currentTime, typeof info.duration === "number" ? info.duration : null);
        if (info && info.playerState === 2) persist(true); // paused
        if (info && info.playerState === 0) persist(true); // ended
      } catch { /* ignore non-JSON messages */ }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [isYouTube, onTime, persist]);

  let src = source.src;
  if (isYouTube) {
    const u = new URL(src);
    u.searchParams.set("enablejsapi", "1");
    if (typeof window !== "undefined") u.searchParams.set("origin", window.location.origin);
    if (initialPosition > 5) u.searchParams.set("start", String(Math.floor(initialPosition)));
    src = u.toString();
  }

  return (
    <div className="relative h-full w-full">
      {source.kind === "file" ? (
        <video
          src={source.src}
          controls
          playsInline
          className="h-full w-full"
          onLoadedMetadata={(e) => { if (initialPosition > 5 && initialPosition < e.currentTarget.duration - 5) e.currentTarget.currentTime = initialPosition; }}
          onTimeUpdate={(e) => onTime(e.currentTarget.currentTime, e.currentTarget.duration || null)}
          onPause={() => persist(true)}
          onEnded={() => persist(true)}
        />
      ) : (
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          className="h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          onLoad={() => { if (isYouTube) iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: lessonId }), "*"); }}
        />
      )}
      {resumed && (source.kind === "file" || isYouTube) ? (
        <button onClick={() => setResumed(false)} className="absolute top-3 left-3 rounded-md bg-foreground/80 px-2.5 py-1 text-xs font-medium text-white">
          Resumed at {fmt(initialPosition)} ✕
        </button>
      ) : null}
    </div>
  );
}
