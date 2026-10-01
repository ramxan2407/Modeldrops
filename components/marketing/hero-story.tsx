"use client";
import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import {
  useStoryMotion,
  storyPinStart,
} from "@/components/motion/use-story-motion";
import type { gsap as Gsap } from "gsap";
function animateHero(
  gsap: typeof Gsap,
  _trigger: unknown,
  element: HTMLElement,
) {
  const story = gsap.timeline({
    scrollTrigger: {
      trigger: element,
      start: storyPinStart(element),
      end: "+=130%",
      scrub: 0.8,
      pin: true,
    },
    defaults: { ease: "none" },
  });
  story
    .fromTo(
      ".md-hero-art",
      { scale: 1.3, yPercent: 8 },
      { scale: 1, yPercent: 0, duration: 2 },
      0,
    )
    .to(".md-hero-opening", { yPercent: -30, autoAlpha: 0, duration: 0.8 }, 0.4)
    .fromTo(
      ".md-hero-next",
      { yPercent: 30, autoAlpha: 0 },
      { yPercent: 0, autoAlpha: 1, duration: 0.8 },
      1,
    )
    .to(".md-hero-shade", { opacity: 0.35, duration: 2 }, 0);
}
export function HeroStory() {
  const root = useRef<HTMLElement>(null);
  useStoryMotion(root, animateHero);
  return (
    <section
      className="md-hero md-hero-editorial"
      ref={root}
      aria-label="Meet the next generation of digital talent"
    >
      <div className="md-hero-art">
        <Image
          src="/assets/hero.png"
          alt="Original fictional cinematic character in a dramatic landscape"
          fill
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
        />
      </div>
      <div className="md-hero-shade" />
      <div className="md-hero-top">
        <span className="md-hero-eyebrow">
          <i aria-hidden="true" /> THE DIGITAL TALENT HOUSE
        </span>
        <Link href="/models" className="md-hero-drop-label">
          DROP 001 <span>LAUNCH PREVIEW</span> <ArrowUpRight size={13} />
        </Link>
      </div>
      <div className="md-hero-copy" data-motion-reveal>
        <div className="md-hero-opening">
          <h1>
            Meet your
            <br />
            next <em>muse.</em>
          </h1>
        </div>
        <div className="md-hero-next" aria-hidden="true">
          <h2>
            One identity.
            <br />
            <em>Endless stories.</em>
          </h2>
        </div>
      </div>
      <div className="md-hero-bottom">
        <div>
          <p>
            Five original AI identities.
            <br />A new way to bring your vision to life.
          </p>
          <div className="md-actions">
            <Link href="/models" className="md-button">
              Explore models <ArrowUpRight size={18} />
            </Link>
            <Link href="/create" className="md-text-link">
              Creator Studio <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </div>
      <div className="md-hero-footer">
        <a href="#the-drop" className="md-hero-collection">
          <span className="md-hero-index">01—05</span>
          <span>Discover the first collection</span>
          <ArrowDown size={17} />
        </a>
        <span className="md-hero-footer-note">
          A FACE. A POINT OF VIEW. YOUR NEXT CHAPTER.
        </span>
      </div>
      <small className="md-art-caption">
        Original concept artwork · launch portraits in preparation
      </small>
    </section>
  );
}
