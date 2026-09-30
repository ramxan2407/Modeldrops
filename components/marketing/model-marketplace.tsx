"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { talent, filterTalent, modelFilters } from "@/lib/marketing/catalog";
import { TalentCard } from "./talent-card";
export function ModelMarketplace({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All");
  const models = filterTalent(talent, query, category);
  const Heading = compact ? "h2" : "h1";
  return (
    <section
      className={`md-marketplace md-section ${compact ? "md-marketplace-home" : ""}`}
      id="models"
      aria-labelledby="marketplace-title"
    >
      <div className="md-section-top">
        <span className="md-kicker">THE CAST / DROP 001</span>
        <span>Five original identities</span>
      </div>
      <Heading id="marketplace-title" className="md-display">
        FIND YOUR
        <br />
        <em>FACE.</em>
      </Heading>
      <div className="md-marketplace-intro">
        <p>
          Digital talent for your next chapter.
          <br />
          Meet the collection. Find your creative connection.
        </p>
        <label className="md-search">
          <Search size={18} />
          <input
            aria-label="Search models"
            placeholder="Find a name or a style"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="md-filter-row" role="group" aria-label="Filter models">
        {modelFilters.map((f) => (
          <button
            key={f}
            aria-pressed={category === f}
            onClick={() => setCategory(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <p className="md-result-count" aria-live="polite">
        {models.length} {models.length === 1 ? "model" : "models"} · Portraits
        and paid access in preparation
      </p>
      {models.length ? (
        <div className="md-model-grid">
          {models.map((m, index) => (
            <TalentCard key={m.id} model={m} priority={!compact && index < 2} />
          ))}
        </div>
      ) : (
        <div className="md-empty">
          <h2>No models in this direction yet.</h2>
          <p>
            Drop 001 is a collection of five women. More styles can arrive in
            future drops.
          </p>
          <button
            className="md-button"
            onClick={() => {
              setQuery("");
              setCategory("All");
            }}
          >
            See the full collection
          </button>
        </div>
      )}
    </section>
  );
}
