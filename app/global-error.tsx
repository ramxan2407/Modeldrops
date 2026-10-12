"use client";
import Link from "next/link";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui,sans-serif",
          background: "#101010",
          color: "#fafafa",
          margin: 0,
          padding: "10vh 8vw",
        }}
      >
        <main>
          <p>MODEL DROPS</p>
          <h1>We couldn’t load this page.</h1>
          <p>Please try again. Your saved work is not affected.</p>
          {error.digest && <p>Support reference: {error.digest}</p>}
          <button onClick={() => retry()}>Try again</button>{" "}
          <Link href="/welcome" style={{ color: "#d9f99d" }}>
            Back to Model Drops
          </Link>
        </main>
      </body>
    </html>
  );
}
