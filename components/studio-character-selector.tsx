"use client";

import { ArrowUpRight, ShieldCheck, Users } from "lucide-react";
import type { Character } from "@/lib/catalog";

export function StudioCharacterSelector({
  characters,
  selected,
  loading,
  error,
  replacedSelection,
  onChange,
  onBrowse,
}: {
  characters: Character[];
  selected: string;
  loading: boolean;
  error: boolean;
  replacedSelection: boolean;
  onChange: (id: string) => void;
  onBrowse: () => void;
}) {
  const character = characters.find((c) => c.id === selected);
  const status =
    character?.canGenerate === false
      ? "Generation access restricted"
      : character?.referenceImage
        ? "Reference ready · Images & video"
        : "Reference being prepared";
  return (
    <section
      className="studio-character-picker"
      aria-busy={loading}
      aria-labelledby="studio-character-heading"
    >
      <div className="studio-character-picker-heading">
        <label id="studio-character-heading" htmlFor="studio-character">
          <span>01</span> Your character
        </label>
        <button type="button" onClick={onBrowse}>
          Browse <ArrowUpRight size={13} />
        </button>
      </div>
      <p id="studio-character-help">
        Choose from your purchased characters. The same character is used for
        images and videos.
      </p>
      <select
        id="studio-character"
        aria-describedby="studio-character-help studio-character-status"
        value={character?.id || ""}
        disabled={loading || error || !characters.length}
        onChange={(e) => onChange(e.target.value)}
      >
        {!character && (
          <option value="" disabled>
            {loading
              ? "Loading your characters…"
              : error
                ? "Could not load your characters"
                : "No purchased characters available"}
          </option>
        )}
        {characters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.canGenerate === false
              ? " · Restricted"
              : !c.referenceImage
                ? " · Reference pending"
                : ""}
          </option>
        ))}
      </select>
      {character ? (
        <div className="studio-character-identity">
          <img
            src={character.image}
            style={{ objectPosition: character.position }}
            alt={`${character.name}, your selected character`}
          />
          <div>
            <strong>{character.name}</strong>
            <span id="studio-character-status">{status}</span>
          </div>
          <ShieldCheck size={19} aria-label="Character access verified" />
        </div>
      ) : (
        <div
          id="studio-character-status"
          className="studio-character-empty"
          role="status"
        >
          {loading ? (
            "Checking your character library…"
          ) : error ? (
            "Retry loading your workspace above to continue."
          ) : (
            <>
              <Users size={22} />
              <span>
                Purchase a character to start creating. Preview claims do not
                unlock Studio.
              </span>
              <button type="button" onClick={onBrowse}>
                Explore characters <ArrowUpRight size={13} />
              </button>
            </>
          )}
        </div>
      )}
      {replacedSelection && (
        <p role="status">
          The previous character is unavailable in your purchased library.
          {character
            ? ` ${character.name} is selected instead.`
            : " Your earlier creations are preserved."}
        </p>
      )}
      {character && (
        <small>
          The approved reference is attached automatically. You only need to
          describe the scene.
        </small>
      )}
    </section>
  );
}
