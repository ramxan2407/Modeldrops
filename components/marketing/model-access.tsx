"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Talent } from "@/lib/marketing/catalog";
import { creativeScenes } from "@/lib/marketing/catalog";
import { saveStudioDraft } from "@/lib/characters/studio-draft";
export function ModelAccess({
  model,
  composer = false,
  initialPrompt,
}: {
  model: Talent;
  composer?: boolean;
  initialPrompt?: string;
}) {
  const [ownedId, setOwnedId] = useState<string | null>(null),
    [prompt, setPrompt] = useState(
      initialPrompt ||
        `An editorial portrait of the adult character in the approved reference. Preserve her facial identity. Soft studio lighting, tailored styling, natural skin texture.`,
    );
  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/platform?action=state", {
      signal: abort.signal,
      cache: "no-store",
    })
      .then(async (r) =>
        r.ok
          ? ((await r.json()) as { account?: { usableCharacters?: string[] } })
          : null,
      )
      .then((d) => {
        if (!abort.signal.aborted)
          setOwnedId(
            d?.account?.usableCharacters?.includes(model.id) ? model.id : null,
          );
      })
      .catch(() => {});
    return () => abort.abort();
  }, [model.id]);
  const owned = ownedId === model.id;
  const href = owned
    ? `/studio?character=${model.id}`
    : `/marketplace?character=${model.id}`;
  return (
    <div className="md-model-access">
      {composer && (
        <>
          <label htmlFor={`prompt-${model.id}`}>
            Your scene. {model.name}’s identity.
          </label>
          <textarea
            id={`prompt-${model.id}`}
            value={prompt}
            maxLength={4000}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
          />
          <div className="md-prompt-examples" aria-label="Example prompts">
            {creativeScenes.slice(0, 4).map((s) => (
              <button
                key={s.id}
                onClick={() =>
                  setPrompt(
                    `Create a ${s.label.toLowerCase()} image of the adult character in the approved reference. ${s.setting} Preserve facial identity and natural skin texture.`,
                  )
                }
              >
                {s.label} ↗
              </button>
            ))}
          </div>
        </>
      )}
      <Link
        href={href}
        className="md-button"
        onClick={() => {
          if (composer && prompt.trim()) saveStudioDraft(model.id, prompt);
        }}
      >
        {owned ? `Open ${model.name} in Studio` : `Review ${model.name} access`}
        <ArrowUpRight size={17} />
      </Link>
      <small>
        {owned
          ? "Your character stays selected. Generation uses credits separately."
          : "Payments are not connected. Review the planned license and access status in your workspace."}
      </small>
    </div>
  );
}
