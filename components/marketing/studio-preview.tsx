"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  FolderClosed,
  ImageIcon,
  MousePointer2,
  Play,
  ScanFace,
  Video,
} from "lucide-react";
import { CinematicMedia } from "./cinematic-media";
import {
  creatorProfiles,
  creatorVideoAssets,
} from "@/lib/marketing/campaign-assets";

const modes = [
  { id: "image", label: "Images", icon: ImageIcon },
  { id: "video", label: "Videos", icon: Video },
  { id: "library", label: "Library", icon: FolderClosed },
] as const;
type Mode = (typeof modes)[number]["id"];

/** An illustrative, local-only tour. Sample selections never submit a generation. */
export function StudioPreview() {
  const [mode, setMode] = useState<Mode>("video");
  const [selected, setSelected] = useState(0);
  const profile = creatorProfiles[selected];
  const video = creatorVideoAssets[profile.videoIndex];

  function openSample(index: number, nextMode: Mode) {
    setSelected(index);
    setMode(nextMode);
  }

  return (
    <section
      className="min-studio-preview"
      id="workflows"
      aria-label="Explore Creator Studio"
    >
      <div className="min-preview-topbar">
        <span className="min-preview-brand">
          <span className="min-studio-mark" aria-hidden="true">
            <ScanFace size={18} strokeWidth={1.5} />
          </span>
          Creator Studio
          <span className="min-preview-beta">PREVIEW</span>
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
        <span className="min-preview-label">
          <span /> YOUR CREATIVE SPACE
        </span>
      </div>

      <div id="studio-tour-panel" className="min-preview-body" data-mode={mode}>
        <aside
          className="min-preview-controls"
          aria-label="Sample creative direction"
        >
          <div className="min-preview-intro">
            <span className="min-kicker">MEET YOUR NEXT IDEA</span>
            <h2>
              A character.
              <br /> A world of content.
            </h2>
          </div>
          <div className="min-profile-picker-label">
            <span>Choose a sample reference</span>
            <span>01—03</span>
          </div>
          <div
            className="min-profile-picker"
            role="group"
            aria-label="Choose an AI creator reference"
          >
            {creatorProfiles.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected === index}
                aria-label={`${item.name}, ${item.role}`}
                onClick={() => setSelected(index)}
              >
                <span className="min-profile-thumb">
                  <Image src={item.portrait} alt="" fill sizes="90px" />
                  {selected === index && (
                    <span className="min-profile-check">
                      <Check size={10} strokeWidth={2.5} />
                    </span>
                  )}
                </span>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
          <div className="min-reference-preview">
            <span className="min-reference-portrait">
              <Image
                src={profile.portrait}
                alt={profile.alt}
                fill
                sizes="64px"
              />
            </span>
            <div>
              <span className="min-reference-label">SELECTED REFERENCE</span>
              <strong>{profile.name}</strong>
              <p>{profile.role}</p>
            </div>
            <Check size={14} />
          </div>
          <div className="min-prompt-preview">
            <span>
              {mode === "library" ? "CREATOR COLLECTION" : "CREATIVE BRIEF"}
              <span>AI SAMPLE</span>
            </span>
            <p>
              {mode === "library"
                ? profile.description
                : mode === "image"
                  ? profile.imagePrompt
                  : video.prompt}
            </p>
          </div>
          <div className="min-setting-preview">
            <span>
              {mode === "library" ? (
                <FolderClosed size={13} />
              ) : mode === "image" ? (
                <ImageIcon size={13} />
              ) : (
                <Video size={13} />
              )}
              {mode === "library"
                ? "3 portraits + 3 videos"
                : mode === "image"
                  ? "Portrait · 3:4"
                  : "Portrait · 9:16"}
            </span>
            <span>
              {mode === "library"
                ? "Sample collection"
                : mode === "image"
                  ? "Photo reference"
                  : "5-second clip"}
            </span>
          </div>
          <p className="min-preview-note">
            In the Studio, select a character you own and use their portrait to
            guide your next image or video.
          </p>
          <Link
            href={mode === "library" ? "/library" : "/studio"}
            className="min-tour-link"
          >
            {mode === "library" ? "Open your library" : "Open Creator Studio"}
            <ArrowUpRight size={16} />
          </Link>
        </aside>

        <div className="min-preview-canvas">
          <header className="min-canvas-heading">
            <div>
              <span className="min-kicker">
                {mode === "image"
                  ? "THE FACE OF YOUR NEXT STORY"
                  : mode === "video"
                    ? "FROM A FACE TO A FEELING"
                    : "ONE SPACE FOR EVERY CREATION"}
              </span>
              <h3>
                {mode === "image"
                  ? "Start with someone memorable."
                  : mode === "video"
                    ? "Made for your feed."
                    : "Your ideas, together."}
              </h3>
            </div>
            <span className="min-canvas-hint">
              {mode === "video" ? (
                <>
                  <MousePointer2 size={12} />
                  <span className="min-hover-hint">Hover to play</span>
                  <span className="min-touch-hint">Tap play to preview</span>
                </>
              ) : mode === "image" ? (
                <>
                  <ImageIcon size={12} />3 references
                </>
              ) : (
                <>
                  <FolderClosed size={12} />6 samples
                </>
              )}
            </span>
          </header>

          {mode === "image" ? (
            <div className="min-portrait-grid">
              {creatorProfiles.map((item, index) => (
                <button
                  key={item.id}
                  className="min-portrait-card"
                  type="button"
                  data-active={selected === index}
                  aria-pressed={selected === index}
                  aria-label={`Select ${item.name} as the sample reference`}
                  onClick={() => setSelected(index)}
                >
                  <span className="min-portrait-frame">
                    <Image
                      src={item.portrait}
                      alt={item.alt}
                      fill
                      sizes="(max-width: 760px) 80vw, 24vw"
                    />
                    <span className="min-sample-badge">AI PORTRAIT</span>
                    <span className="min-portrait-selection">
                      <Check size={13} />
                      Selected reference
                    </span>
                  </span>
                  <span className="min-sample-caption">
                    <span>
                      <strong>{item.name}</strong>
                      <span>{item.role}</span>
                    </span>
                    <ArrowUpRight size={16} />
                  </span>
                </button>
              ))}
            </div>
          ) : mode === "video" ? (
            <div className="min-creator-samples">
              {creatorProfiles.map((item, index) => {
                const asset = creatorVideoAssets[item.videoIndex];
                return (
                  <article
                    key={asset.slug}
                    className="min-creator-sample"
                    data-active={selected === index}
                    aria-label={`${item.name}: ${asset.category}`}
                  >
                    <div className="min-creator-video">
                      <CinematicMedia
                        asset={asset}
                        sizes="(max-width: 760px) 80vw, 24vw"
                        playback="hover"
                        active={selected === index}
                        onActivate={() => setSelected(index)}
                        eager={index === 0}
                      />
                      <span className="min-sample-badge">AI VIDEO · 0:05</span>
                    </div>
                    <button
                      className="min-sample-caption min-sample-caption-button"
                      type="button"
                      aria-pressed={selected === index}
                      onClick={() => setSelected(index)}
                      aria-label={`Select ${item.name}'s ${asset.category.toLowerCase()} sample`}
                    >
                      <span>
                        <strong>{asset.label}</strong>
                        <span>
                          {item.name} · {asset.category}
                        </span>
                      </span>
                      <ArrowUpRight size={16} />
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="min-library-preview">
              {creatorProfiles.flatMap((item, index) => {
                const asset = creatorVideoAssets[item.videoIndex];
                return [
                  <button
                    key={`${item.id}-image`}
                    type="button"
                    onClick={() => openSample(index, "image")}
                    aria-label={`View ${item.name}'s portrait reference`}
                  >
                    <span className="min-library-frame">
                      <Image
                        src={item.portrait}
                        alt={item.alt}
                        fill
                        sizes="(max-width: 760px) 40vw, 24vw"
                      />
                      <span className="min-library-kind">
                        <ImageIcon size={11} />
                        IMAGE
                      </span>
                    </span>
                    <span className="min-library-caption">
                      <strong>{item.name} / Portrait</strong>
                      <span>Reference image</span>
                    </span>
                  </button>,
                  <button
                    key={`${item.id}-video`}
                    type="button"
                    onClick={() => openSample(index, "video")}
                    aria-label={`View ${item.name}'s ${asset.category.toLowerCase()} video`}
                  >
                    <span className="min-library-frame">
                      <Image
                        src={asset.poster}
                        alt={asset.alt}
                        fill
                        sizes="(max-width: 760px) 40vw, 24vw"
                      />
                      <span className="min-library-kind">
                        <Play size={10} fill="currentColor" />
                        0:05
                      </span>
                    </span>
                    <span className="min-library-caption">
                      <strong>{item.name} / Motion</strong>
                      <span>{asset.category}</span>
                    </span>
                  </button>,
                ];
              })}
            </div>
          )}

          <footer className="min-preview-canvas-footer">
            <span>
              <span className="min-ai-dot" />
              Fictional AI creators · illustrative samples
            </span>
            <Link href="/resources#artwork">
              About these samples
              <ArrowUpRight size={12} />
            </Link>
          </footer>
        </div>
      </div>
      <div className="min-studio-disclosure">
        Select a demo reference, explore a format, then open Creator Studio to
        start creating with your collection.
      </div>
    </section>
  );
}
