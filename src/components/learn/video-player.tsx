"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { saveVideoProgress } from "@/app/learn/[slug]/actions";
import type { PlayerSource } from "@/lib/video";
import { playerClock } from "./player-clock";

const SAVE_EVERY_MS = 15_000;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Tracks watch position for native video files and YouTube (via postMessage — no
 * extra script). Saves at most every 15s, plus on pause/end. Resumes from the
 * stored position.
 *
 * Sizing: Mobile-first 16:9 aspect ratio, strictly contained within viewport width,
 * with touch-friendly controls and no horizontal overflow.
 */
export function VideoPlayer({
  source,
  lessonId,
  title,
  initialPosition,
  track,
  courseHref,
  captions = [],
}: {
  source: NonNullable<PlayerSource>;
  lessonId: string;
  title: string;
  initialPosition: number;
  track: boolean;
  courseHref?: string;
  captions?: { src: string; srcLang: string; label: string; default?: boolean }[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastSaved = useRef(0);
  const latest = useRef<{ t: number; d: number | null }>({ t: initialPosition, d: null });
  const [resumed, setResumed] = useState(initialPosition > 5);
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(source.kind === "file");

  const persist = useCallback(
    (force = false) => {
      if (!track) return;
      const now = Date.now();
      if (!force && now - lastSaved.current < SAVE_EVERY_MS) return;
      lastSaved.current = now;
      void saveVideoProgress(lessonId, latest.current.t, latest.current.d);
    },
    [lessonId, track]
  );

  const onTime = useCallback(
    (t: number, d: number | null) => {
      latest.current = { t, d };
      playerClock.seconds = t;
      persist();
    },
    [persist]
  );

  useEffect(() => {
    playerClock.seconds = null;
    return () => {
      persist(true);
      playerClock.seconds = null;
    };
  }, [persist]);

  const isYouTube = source.kind === "iframe" && source.src.includes("youtube.com/embed/");

  useEffect(() => {
    if (!isYouTube) return;
    const onMsg = (e: MessageEvent) => {
      if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        const info = data?.info;
        if (info && typeof info.currentTime === "number") {
          onTime(info.currentTime, typeof info.duration === "number" ? info.duration : null);
        }
        if (info && info.playerState === 2) persist(true); // paused
        if (info && info.playerState === 0) persist(true); // ended
      } catch {
        /* ignore non-JSON messages */
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [isYouTube, onTime, persist]);

  let src = source.kind !== "unavailable" ? source.src : "";
  if (isYouTube && src) {
    const u = new URL(src);
    u.searchParams.set("enablejsapi", "1");
    if (typeof window !== "undefined") u.searchParams.set("origin", window.location.origin);
    if (initialPosition > 5) u.searchParams.set("start", String(Math.floor(initialPosition)));
    src = u.toString();
  }

  // Unavailable or playback error fallback state
  if (source.kind === "unavailable" || hasError) {
    return (
      <div className="relative flex min-h-56 w-full items-center justify-center rounded-lg bg-media p-6 text-center text-on-media sm:min-h-72">
        <div className="max-w-md">
          <AlertCircle className="mx-auto h-8 w-8 text-danger opacity-90" aria-hidden />
          <p className="mt-3 text-base font-semibold text-on-media">Video unavailable</p>
          <p className="mt-1.5 text-xs text-on-media/70 leading-relaxed">
            {source.kind === "unavailable" && source.message
              ? source.message
              : "Video playback is temporarily unavailable. Please try again later."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {source.kind === "file" ? (
              <button
                type="button"
                onClick={() => {
                  setHasError(false);
                  setLoading(true);
                  if (videoRef.current) {
                    videoRef.current.load();
                    videoRef.current.play().catch(() => {});
                  }
                }}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-on-media px-3.5 text-xs font-semibold text-media hover:bg-on-media/90 transition shadow-sm"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Try again
              </button>
            ) : null}
            {courseHref ? (
              <Link
                href={courseHref}
                className="inline-flex min-h-11 items-center rounded-lg border border-on-media/20 bg-on-media/10 px-3.5 text-xs font-medium text-on-media hover:bg-on-media/20 transition"
              >
                Back to course
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-media">
      {source.kind === "file" ? (
        <>
          <video
            ref={videoRef}
            src={source.src}
            controls
            playsInline
            controlsList="nodownload"
            preload="metadata"
            className="h-full w-full object-contain"
            onLoadedMetadata={(e) => {
              if (initialPosition > 5 && initialPosition < e.currentTarget.duration - 5) {
                e.currentTarget.currentTime = initialPosition;
              }
              setLoading(false);
            }}
            onCanPlay={() => setLoading(false)}
            onWaiting={() => setLoading(true)}
            onPlaying={() => setLoading(false)}
            onError={() => {
              setHasError(true);
              setLoading(false);
            }}
            onTimeUpdate={(e) => onTime(e.currentTarget.currentTime, e.currentTarget.duration || null)}
            onPause={() => persist(true)}
            onEnded={() => persist(true)}
          >
            {captions.map((c, i) => (
              <track key={c.src} kind="subtitles" src={c.src} srcLang={c.srcLang} label={c.label} default={c.default ?? i === 0} />
            ))}
          </video>
          {loading && !hasError ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-media/40">
              <Loader2 className="h-8 w-8 animate-spin text-on-media/80" aria-hidden />
            </div>
          ) : null}
        </>
      ) : (
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          onLoad={() => {
            if (isYouTube) {
              iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: "listening", id: lessonId }),
                "*"
              );
            }
          }}
        />
      )}
      {resumed && (source.kind === "file" || isYouTube) ? (
        <button
          onClick={() => setResumed(false)}
          className="absolute top-3 left-3 z-10 max-w-[calc(100%-1.5rem)] rounded-md bg-foreground/80 px-2.5 py-1 text-xs font-medium text-wrap text-background shadow-sm hover:bg-foreground transition"
        >
          Resumed at {fmt(initialPosition)} ✕
        </button>
      ) : null}
    </div>
  );
}
