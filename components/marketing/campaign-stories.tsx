"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { creativeScenes, useCases } from "@/lib/marketing/catalog";
import {
  campaignAssets,
  campaignPoster,
  creatorVideoAssets,
} from "@/lib/marketing/campaign-assets";
import { CinematicMedia } from "./cinematic-media";
import { useStoryMotion } from "@/components/motion/use-story-motion";
import type { gsap as Gsap } from "gsap";
function animateCases(gsap: typeof Gsap) {
  gsap.utils.toArray<HTMLElement>(".md-usecase").forEach((panel) => {
    gsap.from(panel.querySelector(".md-usecase-visual"), {
      yPercent: 12,
      scale: 1.08,
      scrollTrigger: {
        trigger: panel,
        start: "top bottom",
        end: "bottom top",
        scrub: 0.8,
      },
    });
  });
}
export function CampaignComparison() {
  const [split, setSplit] = useState(48),
    [scene, setScene] = useState(0);
  const briefs = creatorVideoAssets.map((asset) => ({
    id: asset.slug,
    label: asset.category,
    setting: asset.prompt,
  }));
  const assets = creatorVideoAssets;
  return (
    <section className="md-section md-comparison">
      <span className="md-kicker">ACT 05 / MAKE THE IDEA VISIBLE</span>
      <h2 className="md-display">
        DON’T SEARCH
        <br />
        FOR CONTENT.
        <br />
        <em>DIRECT IT.</em>
      </h2>
      <div className="md-filter-row" role="group" aria-label="Campaign concept">
        {briefs.map((b, i) => (
          <button
            aria-pressed={i === scene}
            key={b.id}
            onClick={() => setScene(i)}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div className="md-comparison-stage">
        <div className="md-concept-image">
          <CinematicMedia
            key={assets[scene].slug}
            asset={assets[scene]}
            sizes="90vw"
          />
          <div className="md-concept-caption">
            <span>AI CREATOR CONCEPT / ILLUSTRATIVE SAMPLE</span>
            <h3>{briefs[scene].label}</h3>
          </div>
        </div>
        <div
          className="md-concept-brief"
          style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        >
          <span>THE BRIEF</span>
          <p>“{briefs[scene].setting}”</p>
          <small>
            Describe your character, setting, composition and light.
          </small>
        </div>
        <div
          className="md-comparison-divider"
          style={{ left: `${split}%` }}
          aria-hidden="true"
        >
          <span>↔</span>
        </div>
        <input
          aria-label="Reveal concept artwork"
          type="range"
          min="0"
          max="100"
          value={split}
          onChange={(e) => setSplit(Number(e.target.value))}
        />
      </div>
      <p className="md-disclosure">
        Explore the creative brief and its AI-generated concept. These fictional
        creators are illustrative samples, not customer results or marketplace
        characters.{" "}
        <Link href={assets[scene].creditUrl}>{assets[scene].credit}</Link>
      </p>
    </section>
  );
}
export function UseCaseStories() {
  const root = useRef<HTMLElement>(null);
  useStoryMotion(root, animateCases);
  const assets = [
    campaignAssets.street,
    campaignAssets.editorial,
    campaignAssets.editorial,
    campaignAssets.coast,
    campaignAssets.street,
  ];
  return (
    <section
      ref={root}
      className="md-usecases"
      aria-label="Built for creators and brands"
    >
      {useCases.map((c, i) => (
        <article key={c.name} className="md-usecase">
          <div
            className="md-usecase-visual"
            style={
              {
                "--scene-color": creativeScenes.find((s) => s.id === c.scene)!
                  .color,
              } as React.CSSProperties
            }
          >
            <Image
              src={campaignPoster(assets[i])}
              alt=""
              fill
              sizes="(max-width: 959px) 100vw, 50vw"
            />
            <span className="md-usecase-number">0{i + 1}</span>
            <div className="md-usecase-type">{c.name.toUpperCase()}</div>
            <span>CREATIVE DIRECTION / {c.scene.toUpperCase()}</span>
          </div>
          <div className="md-usecase-copy" data-motion-reveal>
            <span className="md-kicker">BUILT FOR {c.name.toUpperCase()}</span>
            <h2>{c.heading}</h2>
            <p>{c.text}</p>
            <Link className="md-text-link" href={`/explore?scene=${c.scene}`}>
              Explore the direction ↗
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}
