"use client";
import { usePublicTalent } from "./use-public-talent";
import { useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { filterTalent, modelFilters } from "@/lib/marketing/catalog";
import { TalentCard } from "./talent-card";
export function ModelMarketplace({ compact = false }: { compact?: boolean }) {
  const talent = usePublicTalent();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All");
  const models = filterTalent(talent, query, category);
  const availableFilters = modelFilters.filter(
    (filter) => filter === "All" || filterTalent(talent, "", filter).length > 0,
  );
  const Heading = compact ? "h2" : "h1";
  return (
    <section
      className={`md-marketplace md-section ${compact ? "md-marketplace-home" : ""}`}
      id="models"
      aria-labelledby="marketplace-title"
    >
      <div className="md-section-top">
        <span className="md-kicker">THE CAST / DROP 001</span>
        <span>Original AI characters</span>
      </div>
      <Heading id="marketplace-title" className="md-display">
        Find your
        <br />
        <em>signature model.</em>
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
        {availableFilters.map((f) => (
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
        {models.length} {models.length === 1 ? "character" : "characters"} ·
        Reviewed for reference-based creation
      </p>
      {models.length ? (
        <div className="md-model-grid">
          {models.map((m, index) => (
            <TalentCard key={m.id} model={m} priority={!compact && index < 2} />
          ))}
        </div>
      ) : (
        <div className="md-empty">
          <h2>
            {talent.length
              ? "A different direction?"
              : "The next drop is taking shape."}
          </h2>
          <p>
            {talent.length
              ? "No characters match these filters. Try another name or style."
              : "Characters appear here once their portraits and generation references are approved. Already have a character? Find it in your workspace."}
          </p>
          {talent.length ? (
            <button
              className="md-button"
              onClick={() => {
                setQuery("");
                setCategory("All");
              }}
            >
              Clear filters
            </button>
          ) : (
            <Link className="md-button" href="/characters">
              Open my characters
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
