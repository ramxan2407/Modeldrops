"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CircleUserRound,
  FolderClosed,
  ImageIcon,
  LayoutGrid,
  LockKeyhole,
  Plus,
  SlidersHorizontal,
  Video,
} from "lucide-react";
import { CinematicMedia } from "./cinematic-media";
import { campaignAssets } from "@/lib/marketing/campaign-assets";

const modes = [
  { id: "image", label: "Create images", icon: ImageIcon },
  { id: "video", label: "Create videos", icon: Video },
  { id: "library", label: "Your library", icon: FolderClosed },
] as const;
type Mode = (typeof modes)[number]["id"];

/** An explicitly illustrative tour. Changing its view never submits a generation. */
export function StudioPreview() {
  const [mode, setMode] = useState<Mode>("image");
  return (
    <div className="min-studio-preview" id="workflows">
      <div className="min-preview-topbar">
        <span>
          <span className="min-window-dot" /> Creator Studio
        </span>
        <div
          className="min-preview-modes"
          role="group"
          aria-label="Explore the workspace"
        >
          {modes.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              aria-pressed={mode === id}
              aria-controls="studio-tour-panel"
              onClick={() => setMode(id)}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <span className="min-preview-label">INTERACTIVE TOUR</span>
      </div>
      <div id="studio-tour-panel" className="min-preview-body" data-mode={mode}>
        <aside className="min-preview-controls">
          <span className="min-kicker">YOUR CREATIVE DIRECTION</span>
          <h2>
            {mode === "image"
              ? "An idea, brought to life."
              : mode === "video"
                ? "Put your ideas in motion."
                : "A home for every idea."}
          </h2>
          {mode !== "library" ? (
            <>
              <div className="min-reference-preview">
                <span>
                  <CircleUserRound size={23} strokeWidth={1.3} />
                </span>
                <div>
                  <strong>Your character</strong>
                  <p>Selected from your collection</p>
                </div>
                <Check size={15} />
              </div>
              <div className="min-prompt-preview">
                <span>PROMPT</span>
                <p>
                  {mode === "image"
                    ? "Soft afternoon light. Sculptural architecture. A quiet, editorial mood."
                    : "A slow cinematic movement along the coast. Soft waves, silver light."}
                </p>
              </div>
              <div className="min-setting-preview">
                <span>
                  <SlidersHorizontal size={14} />{" "}
                  {mode === "image"
                    ? "Framing & resolution"
                    : "Duration & resolution"}
                </span>
                <span>You’re in control</span>
              </div>
              <p className="min-preview-note">
                Your character’s portrait is used as a reference in the real
                Studio.
              </p>
            </>
          ) : (
            <>
              <div className="min-library-nav">
                <span>
                  <LayoutGrid size={16} /> All creations <Check size={14} />
                </span>
                <span>
                  <FolderClosed size={16} /> Campaign studies
                </span>
                <span>
                  <Plus size={16} /> Your next project
                </span>
              </div>
              <p className="min-preview-note">
                Group finished work into projects. Keep the prompt and settings.
                Download when you’re ready.
              </p>
            </>
          )}
          <Link
            href={mode === "library" ? "/library" : "/studio"}
            className="min-tour-link"
          >
            {mode === "library" ? "Open your library" : "Open Creator Studio"}{" "}
            <ArrowUpRight size={16} />
          </Link>
        </aside>
        <div className="min-preview-canvas">
          {mode === "image" ? (
            <div className="min-scene-preview">
              <Image
                src="/assets/campaigns/sculptural-studio.webp"
                alt={campaignAssets.editorial.alt}
                fill
                sizes="(max-width: 760px) 92vw, 72vw"
                priority
              />
              <span className="min-scene-caption">
                STUDIO STUDY <span>01 / SOFT LIGHT</span>
              </span>
            </div>
          ) : mode === "video" ? (
            <div className="min-scene-preview">
              <CinematicMedia
                asset={campaignAssets.coast}
                sizes="(max-width: 760px) 92vw, 72vw"
              />
              <span className="min-scene-caption">
                COASTAL STUDY <span>02 / IN MOTION</span>
              </span>
            </div>
          ) : (
            <div className="min-library-preview">
              {Object.values(campaignAssets).map((asset, i) => (
                <div key={asset.slug}>
                  <div>
                    <Image
                      src={`/assets/campaigns/${asset.slug}.webp`}
                      alt={asset.alt}
                      fill
                      sizes="(max-width: 760px) 42vw, 25vw"
                    />
                  </div>
                  <span>
                    {asset.label}
                    <ArrowUpRight size={13} />
                  </span>
                  <p>Scene study / 0{i + 1}</p>
                </div>
              ))}
            </div>
          )}
          <div className="min-preview-canvas-footer">
            <span>
              <LockKeyhole size={12} /> Private by default
            </span>
            <span>Illustrative scene previews · not character outputs</span>
          </div>
        </div>
      </div>
    </div>
  );
}
