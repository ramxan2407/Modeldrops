export function ModelDropsBrand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={"brand model-drops-brand" + (compact ? " compact" : "")}>
      <span className="drops-mark" aria-hidden="true">
        <svg viewBox="0 0 32 36" fill="none">
          <path
            d="M16 2C12 8 3 17 3 23a13 13 0 0 0 26 0C29 17 20 8 16 2Z"
            fill="currentColor"
          />
          <path
            d="M9 26V18l7 6 7-6v8"
            stroke="#17200e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="brand-wordmark">
        Model <strong>Drops</strong>
        <span className="brand-period">.</span>
      </span>
    </span>
  );
}
