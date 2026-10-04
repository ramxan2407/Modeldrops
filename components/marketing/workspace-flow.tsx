"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Film,
  Folder,
  ImageIcon,
  LockKeyhole,
  Sparkles,
} from "lucide-react";

const stages = [
  {
    label: "Your model",
    text: "An approved character reference stays attached to your creative direction.",
  },
  {
    label: "Your direction",
    text: "Choose an image or video model, shape your scene, then review the credit cost.",
  },
  {
    label: "Your library",
    text: "Keep completed images and videos together. Organize, download, and create again.",
  },
];

export function WorkspaceFlow() {
  const [stage, setStage] = useState(0);
  return (
    <div className="ws-flow" data-stage={stage}>
      <div
        className="ws-flow-board"
        aria-label="Illustration of the Model Drops creative workflow"
      >
        <div className="ws-board-label">
          <span className="ws-status-dot" /> YOUR CREATIVE WORKSPACE{" "}
          <span>0{stage + 1} / 03</span>
        </div>
        <svg
          className="ws-connectors"
          viewBox="0 0 600 510"
          fill="none"
          aria-hidden="true"
        >
          <path d="M152 150 H300 Q325 150 325 175 V254 H457 M325 254 V384 H450" />
          <path
            d="M152 150 H300 Q325 150 325 175 V254 H457 M325 254 V384 H450"
            className="ws-connector-pulse"
          />
        </svg>
        <div className="ws-node ws-persona" data-active={stage === 0}>
          <div className="ws-node-title">
            <Sparkles size={14} />
            <span>Character reference</span>
            <LockKeyhole size={12} />
          </div>
          <div className="ws-persona-image">
            <Image
              src="/assets/hero.png"
              alt="Original fictional character concept in a cinematic landscape"
              fill
              sizes="(max-width: 600px) 42vw, 220px"
              loading="eager"
              fetchPriority="high"
            />
            <span>CONCEPT / 001</span>
          </div>
          <div className="ws-persona-footer">
            <span>Your signature identity</span>
            <span className="ws-tiny-icon">
              <Check size={12} />
            </span>
          </div>
        </div>
        <div className="ws-node ws-scene" data-active={stage === 1}>
          <div className="ws-node-title">
            <ImageIcon size={14} />
            <span>Set the scene</span>
            <span>16:9</span>
          </div>
          <div className="ws-scene-image">
            <Image
              src="/assets/campaigns/sculptural-studio.webp"
              alt="Warm sculptural studio, a visual direction"
              fill
              sizes="(max-width: 600px) 40vw, 240px"
              loading="eager"
            />
          </div>
          <p>Soft light. A new perspective.</p>
        </div>
        <div className="ws-prompt-chip">
          <Sparkles size={13} />
          <span>One reference. Your imagination.</span>
        </div>
        <div className="ws-node ws-output" data-active={stage === 2}>
          <div className="ws-output-picture">
            <Image
              src="/assets/campaigns/coastal-dusk.webp"
              alt="Coastal dusk campaign environment"
              fill
              sizes="150px"
            />
            <span>
              <Film size={12} /> 00:05
            </span>
          </div>
          <div>
            <span className="ws-output-label">CAMPAIGN STUDY</span>
            <strong>Take it somewhere new.</strong>
            <span className="ws-output-note">
              <Folder size={12} /> Keep it in your library
            </span>
          </div>
          <ArrowUpRight size={17} />
        </div>
        <span className="ws-flow-mobile-arrow" aria-hidden="true">
          <ArrowDown size={20} />
        </span>
        <div className="ws-board-note">
          Illustrative workspace · original concept artwork
        </div>
      </div>
      <div
        className="ws-flow-controls"
        role="group"
        aria-label="Explore the creative workflow"
      >
        {stages.map((item, i) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={stage === i}
            onClick={() => setStage(i)}
          >
            <span>0{i + 1}</span>
            {item.label}
          </button>
        ))}
      </div>
      <p className="ws-flow-caption" aria-live="polite">
        {stages[stage].text}
      </p>
    </div>
  );
}
