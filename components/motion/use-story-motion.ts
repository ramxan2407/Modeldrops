"use client";
import { type RefObject } from "react";
import { useGSAP } from "@gsap/react";
import type { gsap as Gsap } from "gsap";
import type { ScrollTrigger as Trigger } from "gsap/ScrollTrigger";

/** Scoped React cleanup; ScrollTrigger is loaded only when the story mounts. */
export function useStoryMotion(
  root: RefObject<HTMLElement | null>,
  setup: (
    gsap: typeof Gsap,
    ScrollTrigger: typeof Trigger,
    element: HTMLElement,
  ) => void | (() => void),
) {
  useGSAP(
    (context) => {
      let disposed = false;
      Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
        .then(([{ gsap }, { ScrollTrigger }]) => {
          if (disposed || !root.current) return;
          const element = root.current;
          context.add(() => {
            gsap.registerPlugin(useGSAP, ScrollTrigger);
            const media = gsap.matchMedia();
            media.add(
              "(min-width: 960px) and (prefers-reduced-motion: no-preference)",
              () => setup(gsap, ScrollTrigger, element),
            );
            return () => media.revert();
          });
          ScrollTrigger.refresh();
        })
        .catch(() => {
          /* Static content stays readable if motion cannot load. */
        });
      return () => {
        disposed = true;
      };
    },
    { scope: root, dependencies: [setup], revertOnUpdate: true },
  );
}
