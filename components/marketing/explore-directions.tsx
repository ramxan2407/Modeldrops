"use client";
import { useState } from "react";
import { creativeScenes, talent } from "@/lib/marketing/catalog";
import { ModelAccess } from "./model-access";
export function ExploreDirections({
  initialScene = "editorial",
}: {
  initialScene?: string;
}) {
  const [scene, setScene] = useState(
      creativeScenes.find((s) => s.id === initialScene) || creativeScenes[0],
    ),
    [id, setId] = useState(talent[0].id);
  const model = talent.find((m) => m.id === id)!;
  return (
    <section className="md-section md-explore">
      <span className="md-kicker">THE CREATIVE NOTEBOOK</span>
      <h1 className="md-display">
        One character.
        <br />
        <em>A world of possibilities.</em>
      </h1>
      <p className="md-lede">Start with a direction. Make the story yours.</p>
      <div className="md-filter-row" role="group" aria-label="Explore scenes">
        {creativeScenes.map((s) => (
          <button
            key={s.id}
            aria-pressed={scene.id === s.id}
            onClick={() => setScene(s)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="md-direction-board">
        <div style={{ background: scene.color }}>
          <span>CONCEPT / {scene.id.toUpperCase()}</span>
          <h2>{scene.line}</h2>
          <p>{scene.setting}</p>
          <small>Creative brief · approved generation examples pending</small>
        </div>
        <div>
          <label htmlFor="explore-character">Your creative partner</label>
          <select
            id="explore-character"
            value={id}
            onChange={(e) => setId(e.target.value)}
          >
            {talent.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <p>
            Choose a character, then adapt a prompt. Access is verified before
            Studio generation.
          </p>
          <ModelAccess
            key={id + scene.id}
            model={model}
            composer
            initialPrompt={`Create a ${scene.label.toLowerCase()} image of the adult character in the approved reference. ${scene.setting} Preserve facial identity and natural skin texture.`}
          />
        </div>
      </div>
    </section>
  );
}
