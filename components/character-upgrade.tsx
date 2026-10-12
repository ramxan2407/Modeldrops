"use client";
import Image from "next/image";
import { useState } from "react";
import type { Character } from "@/lib/catalog";
import { Button } from "./ui/button";
export function CharacterUpgrade({
  character,
  onUpdated,
}: {
  character: Character;
  onUpdated: () => Promise<unknown>;
}) {
  const [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (
    !character.versionId ||
    !character.latestVersionId ||
    character.versionId === character.latestVersionId
  )
    return null;
  return (
    <div className="license-block">
      <div>
        <strong>A new portrait version is available</strong>
        <p>
          Your current portrait remains selected. Updating changes future
          generations; existing creations and queued jobs keep their original
          version.
        </p>
        <Button onClick={() => setReview(!review)}>
          Review portrait update
        </Button>
        {review && (
          <>
            <Image
              src={`/api/characters/reference?id=${encodeURIComponent(character.id)}`}
              alt="New approved portrait"
              width={120}
              height={160}
              unoptimized
            />
            <p>
              The same character license applies. No additional character
              credits are charged.
            </p>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const r = await fetch("/api/characters/upgrade", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      characterId: character.id,
                      fromVersion: character.versionId,
                      toVersion: character.latestVersionId,
                      acceptedLicense: true,
                    }),
                  });
                  const d = (await r.json()) as { error?: string };
                  if (!r.ok)
                    throw new Error(
                      d.error || "Could not accept this portrait.",
                    );
                  await onUpdated();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Accept new portrait and license
            </Button>
          </>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </div>
  );
}
