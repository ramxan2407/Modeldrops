"use client";
import { useEffect, useState } from "react";
import type { Talent } from "@/lib/marketing/catalog";
export function usePublicTalent() {
  const [talent, setTalent] = useState<Talent[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/catalog", { signal: controller.signal, cache: "no-store" })
      .then(async (r) => {
        if (r.ok) {
          const d = (await r.json()) as { characters: Talent[] };
          if (!controller.signal.aborted) setTalent(d.characters);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return talent;
}
