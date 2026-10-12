"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useReducedStoryMotion } from "@/components/motion/motion-preference";
import {
  campaignPoster,
  type CampaignAsset,
} from "@/lib/marketing/campaign-assets";

type Connection = EventTarget & { saveData?: boolean };

/** Poster-first media; hover previews wait for deliberate playback intent. */
export function CinematicMedia({
  asset,
  sizes = "100vw",
  eager = false,
  playback = "viewport",
  active = true,
  onActivate,
}: {
  asset: CampaignAsset;
  sizes?: string;
  eager?: boolean;
  playback?: "viewport" | "hover";
  /** Lets a gallery stop its other previews without disabling their play controls. */
  active?: boolean;
  onActivate?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const playAttempt = useRef(0);
  const reduced = useReducedStoryMotion();
  const [eligible, setEligible] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [intent, setIntent] = useState(false);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mediaError, setMediaError] = useState<number>();
  const [previousActive, setPreviousActive] = useState(active);

  // Reset a deactivated gallery preview before its next render can reuse intent.
  if (previousActive !== active) {
    setPreviousActive(active);
    if (!active) {
      setIntent(false);
      setPaused(false);
      setPlaying(false);
      setHasFrame(false);
    }
  }

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const connection = (navigator as Navigator & { connection?: Connection })
      .connection;
    let visible = !window.IntersectionObserver;
    const update = () => {
      const nextSaveData = Boolean(connection?.saveData);
      const nextEligible = visible && !document.hidden && !nextSaveData;
      setSaveData(nextSaveData);
      setEligible(nextEligible);
      if (!nextEligible) {
        playAttempt.current += 1;
        setIntent(false);
        setPlaying(false);
        setHasFrame(false);
      }
    };
    const observer = window.IntersectionObserver
      ? new IntersectionObserver(
          ([entry]) => {
            visible = entry.isIntersecting;
            update();
          },
          { threshold: 0.05 },
        )
      : undefined;
    observer?.observe(element);
    update();
    document.addEventListener("visibilitychange", update);
    connection?.addEventListener("change", update);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
      connection?.removeEventListener("change", update);
    };
  }, []);

  const canPlay = eligible && !reduced && !failed;
  const canControl =
    !reduced && !failed && !saveData && (playback === "hover" || eligible);
  const canMount = canPlay && active && (playback === "viewport" || intent);
  const requested = canMount && !paused;
  const isPlaying = requested && playing;

  const requestPlayback = useCallback(
    (element: HTMLVideoElement, isCancelled: () => boolean = () => false) => {
      const attempt = ++playAttempt.current;
      void element.play().catch(() => {
        if (
          isCancelled() ||
          attempt !== playAttempt.current ||
          video.current !== element
        ) {
          return;
        }
        // Autoplay can be rejected even for muted clips. Keep the control retryable.
        setPlaying(false);
        setPaused(true);
      });
    },
    [],
  );

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let cancelled = false;
    if (requested) {
      requestPlayback(element, () => cancelled);
    } else {
      playAttempt.current += 1;
      element.pause();
    }
    return () => {
      cancelled = true;
      // Do not interrupt a Play click on the same node as its state changes.
      if (!element.isConnected) element.pause();
    };
  }, [requested, asset.slug, requestPlayback]);

  const beginPlayback = (fromControl = false) => {
    setIntent(true);
    setPaused(false);
    onActivate?.();
    // Preserve the browser's user-activation context when retrying a mounted clip.
    if (fromControl && video.current) requestPlayback(video.current);
  };
  const stopPreview = () => {
    playAttempt.current += 1;
    video.current?.pause();
    setIntent(false);
    setPlaying(false);
    setHasFrame(false);
  };
  return (
    <div
      className="md-cinematic-media"
      ref={root}
      data-playback={playback}
      data-playing={isPlaying}
      data-ready={canMount && hasFrame}
      data-media-error={mediaError}
      onPointerEnter={(event) => {
        if (
          playback === "hover" &&
          canPlay &&
          event.pointerType !== "touch" &&
          window.matchMedia("(hover: hover) and (pointer: fine)").matches
        ) {
          beginPlayback();
        }
      }}
      onPointerLeave={(event) => {
        if (playback === "hover" && event.pointerType !== "touch") {
          stopPreview();
        }
      }}
      data-media-status={
        failed
          ? "unavailable"
          : reduced
            ? "reduced"
            : !eligible
              ? "inactive"
              : !canMount && playback === "hover"
                ? "poster"
                : paused
                  ? "paused"
                  : playing
                    ? "playing"
                    : "loading"
      }
    >
      <div className="md-cinematic-frame">
        <Image
          src={campaignPoster(asset)}
          alt={asset.alt}
          fill
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
        />
        {canMount && (
          <video
            ref={video}
            autoPlay={requested}
            muted
            loop
            playsInline
            preload="none"
            poster={campaignPoster(asset)}
            aria-hidden="true"
            tabIndex={-1}
            onPlaying={() => {
              setPlaying(true);
              setHasFrame(true);
            }}
            onPause={() => setPlaying(false)}
            onError={(event) => {
              // A failed source must not prevent the browser from trying its fallback.
              if (event.target !== event.currentTarget) return;
              setMediaError(event.currentTarget.error?.code);
              setFailed(true);
              setPlaying(false);
            }}
          >
            <source
              src={
                asset.mobileVideo ??
                `/assets/campaigns/${asset.slug}-mobile.mp4`
              }
              type="video/mp4"
              media="(max-width: 767px)"
            />
            <source
              src={asset.video ?? `/assets/campaigns/${asset.slug}.mp4`}
              type="video/mp4"
              onError={() => {
                setMediaError(4);
                setFailed(true);
                setPlaying(false);
              }}
            />
          </video>
        )}
      </div>
      {canControl && (
        <button
          type="button"
          className="md-media-toggle"
          aria-label={`${requested ? "Pause" : "Play"} ${asset.label.toLowerCase()} video`}
          aria-pressed={requested}
          onClick={() => {
            if (requested) {
              playAttempt.current += 1;
              video.current?.pause();
              setPaused(true);
            } else {
              beginPlayback(true);
            }
          }}
        >
          {requested ? <Pause size={14} /> : <Play size={14} />}
          <span>{requested ? "Pause motion" : "Play motion"}</span>
        </button>
      )}
    </div>
  );
}
