import Link from "next/link";
export default function NotFound() {
  return (
    <main className="recovery-page">
      <span className="eyebrow">MODEL DROPS · 404</span>
      <h1>This page isn’t available.</h1>
      <p>
        The address may have changed, or this page may require a different
        account.
      </p>
      <div>
        <Link className="primary-btn" href="/dashboard">
          Open your workspace
        </Link>
        <Link href="/welcome">Back to Model Drops</Link>
      </div>
    </main>
  );
}
