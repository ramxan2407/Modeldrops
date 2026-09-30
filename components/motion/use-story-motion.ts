"use client";
import { type RefObject } from "react";
import { useGSAP } from "@gsap/react";
import type { gsap as Gsap } from "gsap";
import type { ScrollTrigger as Trigger } from "gsap/ScrollTrigger";
import { useReducedStoryMotion } from "./motion-preference";

let refreshFrame = 0;
/** All sections share one refresh; pin spacing is measured in document order. */
function refreshStory(ScrollTrigger: typeof Trigger) {
  if (refreshFrame) return;
  refreshFrame = requestAnimationFrame(() => {
    refreshFrame = 0;
    ScrollTrigger.sort((a: Trigger, b: Trigger) => {
      if (!a.trigger || !b.trigger || a.trigger === b.trigger) return 0;
      return a.trigger.compareDocumentPosition(b.trigger) &
        Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1;
    });
    ScrollTrigger.refresh();
  });
}

/** Full stories on roomy desktops; light reveals on touch/short screens; optional zero motion. */
export function useStoryMotion(
  root: RefObject<HTMLElement | null>,
  setup: (
    gsap: typeof Gsap,
    ScrollTrigger: typeof Trigger,
    element: HTMLElement,
  ) => void | (() => void),
) {
  const reduced = useReducedStoryMotion();
  useGSAP(
    (context) => {
      let disposed = false;
      const element = root.current;
      if (!element) return;
      if (reduced) {
        element.setAttribute("data-motion", "off");
        return () => {
          element.removeAttribute("data-motion");
        };
      }
      let observer: ResizeObserver | undefined;
      Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
        .then(([{ gsap }, { ScrollTrigger }]) => {
          if (disposed) return;
          context.add(() => {
            gsap.registerPlugin(useGSAP, ScrollTrigger);
            // Mobile browser chrome changes height while scrolling. No mobile story is pinned.
            ScrollTrigger.config({ ignoreMobileResize: true });
            const media = gsap.matchMedia();
            media.add(
              {
                roomy: "(min-width: 960px) and (min-height: 900px)",
                pointer: "(hover: hover) and (pointer: fine)",
                any: "all",
              },
              (match) => {
                const full =
                  !!match.conditions?.roomy && !!match.conditions?.pointer;
                element.setAttribute("data-motion", full ? "full" : "light");
                let cleanup: void | (() => void);
                if (full) cleanup = setup(gsap, ScrollTrigger, element);
                else {
                  // Never hide content or hijack native swipes. Each reveal plays only once.
                  element
                    .querySelectorAll<HTMLElement>("[data-motion-reveal]")
                    .forEach((target) => {
                      gsap.from(target, {
                        y: 18,
                        duration: 0.65,
                        ease: "power2.out",
                        scrollTrigger: {
                          trigger: target,
                          start: "top 94%",
                          once: true,
                        },
                      });
                    });
                }
                refreshStory(ScrollTrigger);
                return () => {
                  cleanup?.();
                  element.removeAttribute("data-motion");
                };
              },
            );
            return () => media.revert();
          });
          const main = element.closest("main");
          if (main && typeof ResizeObserver !== "undefined") {
            let previous = "";
            observer = new ResizeObserver(([entry]) => {
              const size = `${Math.round(entry.contentRect.width)}:${Math.round(entry.contentRect.height)}`;
              if (!disposed && size !== previous) {
                previous = size;
                refreshStory(ScrollTrigger);
              }
            });
            observer.observe(main);
          }
          document.fonts?.ready.then(() => {
            if (!disposed) refreshStory(ScrollTrigger);
          });
        })
        .catch(() => {
          /* Native layouts remain readable if motion cannot load. */
        });
      return () => {
        disposed = true;
        observer?.disconnect();
      };
    },
    { scope: root, dependencies: [setup, reduced], revertOnUpdate: true },
  );
}
