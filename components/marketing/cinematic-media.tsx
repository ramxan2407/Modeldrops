"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useReducedStoryMotion } from "@/components/motion/motion-preference";
import {
  campaignPoster,
  type CampaignAsset,
} from "@/lib/marketing/campaign-assets";

type Connection = EventTarget & { saveData?: boolean };

/** Poster-first decorative media; nothing downloads until the section is visible. */
export function CinematicMedia({
  asset,
  sizes = "100vw",
}: {
  asset: CampaignAsset;
  sizes?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reduced = useReducedStoryMotion();
  const [eligible, setEligible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mediaError, setMediaError] = useState<number>();

  useEffect(() => {
    const element = root.current;
    if (!element || !window.IntersectionObserver) return;
    const connection = (navigator as Navigator & { connection?: Connection })
      .connection;
    let visible = false;
    const update = () =>
      setEligible(visible && !document.hidden && !connection?.saveData);
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        update();
      },
      { threshold: 0.05 },
    );
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    connection?.addEventListener("change", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      connection?.removeEventListener("change", update);
    };
  }, []);

  const canMount = eligible && !reduced;
  const canPlay = canMount && !failed;
  const isPlaying = canPlay && !paused && playing;
  return (
    <div
      className="md-cinematic-media"
      ref={root}
      data-playing={isPlaying}
      data-ready={canPlay && hasFrame}
      data-media-error={mediaError}
      data-media-status={
        failed
          ? "unavailable"
          : reduced
            ? "reduced"
            : !eligible
              ? "inactive"
              : paused
                ? "paused"
                : playing
                  ? "playing"
                  : "loading"
      }
    >
      <div className="md-cinematic-frame">
        <Image src={campaignPoster(asset)} alt={asset.alt} fill sizes={sizes} />
        {canMount && (
          <video
            ref={video}
            autoPlay={!paused && !failed}
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
              src={`/assets/campaigns/${asset.slug}-mobile.mp4`}
              type="video/mp4"
              media="(max-width: 767px)"
            />
            <source
              src={`/assets/campaigns/${asset.slug}.mp4`}
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
      {canPlay && (
        <button
          type="button"
          className="md-media-toggle"
          aria-label={`${isPlaying ? "Pause" : "Play"} ${asset.label.toLowerCase()} video`}
          onClick={() => {
            if (isPlaying) {
              video.current?.pause();
              setPaused(true);
            } else {
              setPaused(false);
              void video.current?.play().catch(() => setPlaying(false));
            }
          }}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          <span>{isPlaying ? "Pause motion" : "Play motion"}</span>
        </button>
      )}
    </div>
  );
}
