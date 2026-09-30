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
      className="md-hero"
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
        <span>THE DIGITAL TALENT HOUSE</span>
        <span>COLLECTION / 001</span>
      </div>
      <div className="md-hero-copy" data-motion-reveal>
        <div className="md-hero-opening">
          <span className="md-kicker">A NEW KIND OF CREATIVE PARTNER</span>
          <h1>
            REAL PEOPLE
            <br />
            AREN’T YOUR
            <br />
            <em>ONLY OPTION.</em>
          </h1>
        </div>
        <div className="md-hero-next" aria-hidden="true">
          <h2>
            MEET THE NEXT
            <br />
            GENERATION OF
            <br />
            <em>DIGITAL TALENT.</em>
          </h2>
        </div>
      </div>
      <div className="md-hero-bottom">
        <div>
          <p>
            Discover original AI identities.
            <br />
            Bring your creative direction to life.
          </p>
          <div className="md-actions">
            <Link href="/models" className="md-button">
              Explore models <ArrowUpRight size={18} />
            </Link>
            <Link href="/create" className="md-text-link">
              Start creating <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
        <a href="#the-drop" className="md-scroll-cue">
          SCROLL TO DISCOVER <ArrowDown size={17} />
        </a>
      </div>
      <small className="md-art-caption">
        Original concept artwork · launch portraits in preparation
      </small>
    </section>
  );
}
