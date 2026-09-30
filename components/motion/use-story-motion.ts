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

/** The same scroll story at every size, with an explicit reduced-motion fallback. */
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
            // Stable svh frames prevent browser chrome from changing pinned geometry mid-swipe.
            ScrollTrigger.config({ ignoreMobileResize: true });
            const media = gsap.matchMedia();
            media.add(
              {
                mobile: "(max-width: 959px)",
                landscape: "(orientation: landscape)",
                any: "all",
              },
              () => {
                element.setAttribute("data-motion", "full");
                const cleanup = setup(gsap, ScrollTrigger, element);
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

/** Read the complete section before pinning when a short landscape screen cannot fit it. */
export function storyPinStart(element: HTMLElement) {
  return () =>
    element.offsetHeight > window.innerHeight + 1 ? "bottom bottom" : "top top";
}
