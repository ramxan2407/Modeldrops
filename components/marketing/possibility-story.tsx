"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { creativeScenes } from "@/lib/marketing/catalog";
import { useStoryMotion } from "@/components/motion/use-story-motion";
import type { gsap as Gsap } from "gsap";
function animatePossibilities(
  gsap: typeof Gsap,
  _trigger: unknown,
  element: HTMLElement,
) {
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: element,
      start: "top top",
      end: "+=240%",
      pin: true,
      scrub: 0.6,
    },
    defaults: { ease: "none" },
  });
  gsap.utils.toArray<HTMLElement>(".md-scene-layer").forEach((layer, i) => {
    if (i)
      timeline.fromTo(
        layer,
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, duration: 1 },
        i - 0.25,
      );
    if (i < 7)
      timeline.to(layer, { autoAlpha: 0, y: -30, duration: 0.6 }, i + 0.65);
  });
  timeline.fromTo(
    ".md-identity-study img",
    { scale: 1.16 },
    { scale: 1, yPercent: -3, duration: 7 },
    0,
  );
}
export function PossibilityStory() {
  const root = useRef<HTMLElement>(null);
  useStoryMotion(root, animatePossibilities);
  const [scene, setScene] = useState(0);
  return (
    <section className="md-possibilities" ref={root}>
      <div className="md-section-top">
        <span className="md-kicker">ACT 03 / CREATIVE CONTINUITY</span>
        <span>Reference-guided creation</span>
      </div>
      <h2 className="md-display">
        ONE MODEL.
        <br />
        <em>ENDLESS POSSIBILITIES.</em>
      </h2>
      <div className="md-possibility-stage" data-motion-reveal>
        <div className="md-identity-study">
          <Image
            src="/assets/hero.png"
            alt="The same fictional concept character, a study in framing and creative direction"
            fill
            sizes="(max-width: 700px) 100vw, 50vw"
          />
          <span>IDENTITY STUDY / CONCEPT ART</span>
        </div>
        <div className="md-scene-stack">
          {creativeScenes.map((s, i) => (
            <div
              key={s.id}
              className={`md-scene-layer ${scene === i ? "is-mobile-active" : ""}`}
              style={{ "--scene-color": s.color } as React.CSSProperties}
            >
              <span>
                {String(i + 1).padStart(2, "0")} / {s.label}
              </span>
              <h3>{s.line}</h3>
              <p>{s.setting}</p>
              <small>Art-direction concept · generation examples pending</small>
            </div>
          ))}
        </div>
      </div>
      <div className="md-scene-mobile-tabs" aria-label="Creative directions">
        {creativeScenes.map((s, i) => (
          <button
            key={s.id}
            aria-pressed={scene === i}
            onClick={() => setScene(i)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="md-disclosure">
        An approved character reference guides identity. Results vary by model
        and prompt; exact likeness is not guaranteed.
      </p>
    </section>
  );
}
