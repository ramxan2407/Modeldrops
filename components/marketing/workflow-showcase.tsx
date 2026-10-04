"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Film, ImageIcon, Layers3 } from "lucide-react";
import { CinematicMedia } from "./cinematic-media";
import { campaignAssets } from "@/lib/marketing/campaign-assets";

const workflows = [
  {
    id: "images",
    label: "Create images",
    icon: ImageIcon,
    title: "The same character. A whole new scene.",
    description:
      "Take your approved character reference into a new setting. Choose the image model, frame your shot, and make the creative direction yours.",
    tags: ["Character reference", "Prompt", "Aspect ratio"],
    link: "/explore?scene=editorial",
    cta: "Plan an image",
    asset: campaignAssets.editorial,
  },
  {
    id: "video",
    label: "Create video",
    icon: Film,
    title: "Give your next idea a little motion.",
    description:
      "Start with your character’s approved portrait. Direct the moment, choose supported video settings, and review your quote before generating.",
    tags: ["Character reference", "Duration", "Resolution"],
    link: "/create",
    cta: "Open Creator Studio",
    asset: campaignAssets.coast,
  },
  {
    id: "projects",
    label: "Build a collection",
    icon: Layers3,
    title: "Good ideas deserve a place to live.",
    description:
      "Keep completed work in your private library. Bring related images and videos into projects, ready to download when you are.",
    tags: ["Private library", "Projects", "Download"],
    link: "/projects",
    cta: "Open your projects",
    asset: campaignAssets.street,
  },
];

export function WorkflowShowcase() {
  const [selected, setSelected] = useState(0);
  const item = workflows[selected];
  return (
    <section
      className="ws-section ws-workflows"
      id="workflows"
      aria-labelledby="workflow-heading"
    >
      <div className="ws-section-heading">
        <div>
          <span className="ws-eyebrow">MAKE IT YOURS</span>
          <h2 id="workflow-heading">
            An idea is all
            <br />
            you need to start.
          </h2>
        </div>
        <p>
          A character. A direction. A place to create.
          <br />
          Keep the whole process close.
        </p>
      </div>
      <div
        className="ws-workflow-tabs"
        role="group"
        aria-label="Choose a workflow preview"
      >
        {workflows.map((workflow, i) => {
          const Icon = workflow.icon;
          return (
            <button
              type="button"
              key={workflow.id}
              aria-pressed={selected === i}
              aria-controls="workflow-preview"
              onClick={() => setSelected(i)}
            >
              <Icon size={16} />
              {workflow.label}
              <ArrowUpRight size={14} />
            </button>
          );
        })}
      </div>
      <div className="ws-workflow-panel" id="workflow-preview">
        <div className="ws-workflow-art" key={item.id}>
          {selected === 1 ? (
            <CinematicMedia
              asset={item.asset}
              sizes="(max-width: 760px) 90vw, 55vw"
            />
          ) : (
            <Image
              src={`/assets/campaigns/${item.asset.slug}.webp`}
              alt={item.asset.alt}
              fill
              sizes="(max-width: 760px) 90vw, 55vw"
            />
          )}
          <span className="ws-art-label">
            {selected === 1
              ? "GENERATED MOTION STUDY"
              : "GENERATED CAMPAIGN ENVIRONMENT"}
          </span>
          {selected === 2 && (
            <div className="ws-collection-stack" aria-hidden="true">
              <span>
                <ImageIcon size={15} /> City after dark
              </span>
              <span>
                <Film size={15} /> Coastal dusk
              </span>
              <span>
                <FolderIcon /> Studio studies
              </span>
            </div>
          )}
        </div>
        <div className="ws-workflow-copy" aria-live="polite">
          <span className="ws-eyebrow">
            0{selected + 1} / {item.label}
          </span>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <div className="ws-tags">
            {item.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <Link className="ws-inline-link" href={item.link}>
            {item.cta}
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
      <p className="ws-disclosure">
        Campaign studies show creative settings, not likeness results for the
        launch characters.
      </p>
    </section>
  );
}
function FolderIcon() {
  return <Layers3 size={15} />;
}
