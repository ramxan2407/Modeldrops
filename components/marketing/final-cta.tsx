"use client";
import { useRef } from "react";
import Link from "next/link";
import { useStoryMotion } from "@/components/motion/use-story-motion";
import type { gsap as Gsap } from "gsap";
import { CinematicMedia } from "./cinematic-media";
import { campaignAssets } from "@/lib/marketing/campaign-assets";
function animateFinal(
  gsap: typeof Gsap,
  _trigger: unknown,
  element: HTMLElement,
) {
  gsap.from(".md-final-image .md-cinematic-frame", {
    scale: 1.25,
    yPercent: 10,
    scrollTrigger: {
      trigger: element,
      start: "top bottom",
      end: "bottom bottom",
      scrub: 1,
    },
  });
  gsap.from(".md-final-type", {
    y: 80,
    scrollTrigger: {
      trigger: element,
      start: "top bottom",
      end: "center center",
      scrub: 1,
    },
  });
}
export function FinalCTA() {
  const root = useRef<HTMLElement>(null);
  useStoryMotion(root, animateFinal);
  return (
    <section className="md-final" ref={root}>
      <div className="md-final-image">
        <CinematicMedia asset={campaignAssets.coast} />
      </div>
      <div className="md-final-type" data-motion-reveal>
        <span className="md-kicker">TALENT IS JUST THE BEGINNING.</span>
        <h2>
          YOUR NEXT
          <br />
          CREATOR DOESN’T
          <br />
          <em>NEED A CAMERA.</em>
        </h2>
        <p>Find a model. Imagine the next frame.</p>
        <div className="md-actions">
          <Link className="md-button" href="/create">
            Start creating ↗
          </Link>
          <Link className="md-text-link" href="/models">
            Explore models ↗
          </Link>
        </div>
      </div>
    </section>
  );
}
