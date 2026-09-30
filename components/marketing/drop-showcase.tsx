"use client";
import { useRef } from "react";
import Link from "next/link";
import { talent } from "@/lib/marketing/catalog";
import { useStoryMotion } from "@/components/motion/use-story-motion";
import { TalentPortrait } from "./talent-card";
import type { gsap as Gsap } from "gsap";
function animateDrop(
  gsap: typeof Gsap,
  _trigger: unknown,
  element: HTMLElement,
) {
  const track = gsap.utils.toArray<HTMLElement>(".md-drop-track")[0];
  if (!track) return;
  const motion = gsap.to(track, {
    x: () => -Math.max(0, track.scrollWidth - element.clientWidth),
    ease: "none",
    scrollTrigger: {
      trigger: element,
      start: "top top",
      end: () => `+=${Math.max(1000, track.scrollWidth - element.clientWidth)}`,
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
    },
  });
  gsap.utils.toArray<HTMLElement>(".md-drop-frame").forEach((frame) => {
    gsap.fromTo(
      frame,
      { scale: 0.9, rotationY: 6 },
      {
        scale: 1,
        rotationY: 0,
        ease: "none",
        scrollTrigger: {
          trigger: frame,
          containerAnimation: motion,
          start: "left 90%",
          end: "center 50%",
          scrub: true,
        },
      },
    );
  });
}
export function DropShowcase() {
  const root = useRef<HTMLElement>(null);
  useStoryMotion(root, animateDrop);
  return (
    <section className="md-drop" id="the-drop" ref={root}>
      <div className="md-section-top">
        <span className="md-kicker">ACT 02 / THE TALENT</span>
        <Link className="md-text-link" href="/models">
          View all models ↗
        </Link>
      </div>
      <div className="md-drop-heading" data-motion-reveal>
        <h2>
          THE <em>DROP.</em>
        </h2>
        <p>
          A new kind of creative talent.
          <br />
          Five identities. One first collection.
        </p>
      </div>
      <div
        className="md-drop-track"
        role="region"
        aria-label="Drop 001 character collection"
        tabIndex={0}
      >
        {talent.map((m) => (
          <Link className="md-drop-frame" key={m.id} href={`/models/${m.slug}`}>
            <TalentPortrait model={m} />
            <div>
              <span>MODEL {m.number}</span>
              <h3>{m.name}</h3>
              <p>{m.styles.join(" / ")}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
