"use client";
import Link from "next/link";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="recovery-page">
      <span className="eyebrow">MODEL DROPS</span>
      <h1>Something interrupted your workspace.</h1>
      <p>
        Your saved characters and creations are still yours. Try loading this
        page again.
      </p>
      {error.digest && (
        <p className="admin-muted">Support reference: {error.digest}</p>
      )}
      <div>
        <button className="primary-btn" onClick={() => retry()}>
          Try again
        </button>
        <Link href="/dashboard">Return to dashboard</Link>
      </div>
    </main>
  );
}
