"use client";
import { useSyncExternalStore } from "react";

const key = "modeldrops:reduce-motion";
const event = "modeldrops:motion-change";
const query = "(prefers-reduced-motion: reduce)";
let paused = false;
function snapshot() {
  try {
    paused = localStorage.getItem(key) === "true";
  } catch {
    // The in-memory preference still works with storage disabled.
  }
  return window.matchMedia(query).matches || paused;
}
function subscribe(update: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", update);
  window.addEventListener(event, update);
  window.addEventListener("storage", update);
  return () => {
    media.removeEventListener("change", update);
    window.removeEventListener(event, update);
    window.removeEventListener("storage", update);
  };
}
export function useReducedStoryMotion() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
export function useSystemReducedStoryMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
export function toggleStoryMotion() {
  if (window.matchMedia(query).matches) return;
  paused = !snapshot();
  try {
    localStorage.setItem(key, String(paused));
  } catch {
    /* Optional storage. */
  }
  window.dispatchEvent(new Event(event));
}
