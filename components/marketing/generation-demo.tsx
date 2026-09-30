"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import { talent } from "@/lib/marketing/catalog";
import { TalentPortrait } from "./talent-card";
import { useStoryMotion } from "@/components/motion/use-story-motion";
import type { gsap as Gsap } from "gsap";
const example =
  "Editorial streetwear portrait in Tokyo at night. An oversized tailored jacket, cinematic lighting, natural skin texture. Preserve the reference character’s identity.";
function animateDemo(
  gsap: typeof Gsap,
  _trigger: unknown,
  element: HTMLElement,
) {
  const progress = { characters: 0 };
  const prompt = gsap.utils.toArray<HTMLElement>(".md-demo-typed")[0];
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: element,
      start: "top top",
      end: "+=160%",
      pin: true,
      scrub: 0.5,
    },
    defaults: { ease: "none" },
  });
  tl.from(".md-demo-window", { rotationX: 7, y: 70, scale: 0.96, duration: 1 })
    .to(
      progress,
      {
        characters: example.length,
        duration: 2,
        onUpdate: () => {
          if (prompt)
            prompt.textContent = example.slice(
              0,
              Math.round(progress.characters),
            );
        },
      },
      0.4,
    )
    .fromTo(".md-demo-progress", { scaleX: 0 }, { scaleX: 1, duration: 1 }, 2.4)
    .fromTo(
      ".md-demo-result",
      { autoAlpha: 0, y: 30, scale: 0.96 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.8 },
      3.4,
    );
  return () => {
    if (prompt) prompt.textContent = example;
  };
}
export function GenerationDemo() {
  const root = useRef<HTMLElement>(null);
  useStoryMotion(root, animateDemo);
  const [selected, setSelected] = useState(talent[0].id);
  const model = talent.find((m) => m.id === selected)!;
  return (
    <section
      className="md-generation-story md-section"
      ref={root}
      id="how-it-works"
    >
      <div className="md-section-top">
        <span className="md-kicker">ACT 04 / INSIDE THE STUDIO</span>
        <span>Interactive walkthrough · no credits used</span>
      </div>
      <h2 className="md-display">
        FROM IDEA
        <br />
        <em>TO CONTENT.</em>
      </h2>
      <div className="md-demo-window" data-motion-reveal>
        <div className="md-demo-title">
          <span>MODELDROPS / CREATOR STUDIO</span>
          <span>PRODUCT PREVIEW</span>
        </div>
        <div className="md-demo-workspace">
          <div className="md-demo-result">
            <TalentPortrait model={model} />
            <div className="md-demo-result-caption">
              <Check size={16} />
              <span>
                Your result appears here.
                <small>Illustrative layout · final model imagery pending</small>
              </span>
            </div>
          </div>
          <div className="md-demo-controls">
            <label htmlFor="demo-model">
              <b>01</b> Choose your model
            </label>
            <select
              id="demo-model"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {talent.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <span className="md-demo-reference">
              Approved reference attached to every request
            </span>
            <label>
              <b>02</b> Describe the scene
            </label>
            <div className="md-demo-prompt">
              <p className="md-demo-typed" aria-hidden="true">
                {example}
              </p>
              <p className="sr-only">{example}</p>
            </div>
            <div className="md-demo-generate">
              <span>
                <b>03</b> Review credits. Generate.
              </span>
              <Sparkles size={17} />
              <div className="md-demo-progress" />
            </div>
            <p>
              One image per request. Save your results privately, download them,
              or add them to a project.
            </p>
          </div>
        </div>
      </div>
      <div className="md-demo-end">
        <h3>
          Your next creative
          <br />
          chapter starts here.
        </h3>
        <Link
          href={`/studio?character=${selected}&inspiration=${selected}.editorial`}
          className="md-button"
        >
          Open Creator Studio <ArrowUpRight size={17} />
        </Link>
      </div>
    </section>
  );
}
