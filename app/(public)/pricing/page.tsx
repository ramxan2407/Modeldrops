import Link from "next/link";
import { packages } from "@/lib/catalog";
import { pageMetadata } from "@/lib/marketing/metadata";
export const metadata = pageMetadata(
  "Access & credits",
  "Understand planned character access and generation credits. Review the exact generation cost in ModelDrops Studio before submitting.",
  "/pricing",
);
export default function Pricing() {
  return (
    <section className="md-section md-pricing">
      <span className="md-kicker">A CLEAR WAY TO CREATE</span>
      <h1 className="md-display">
        Your character.
        <br />
        <em>Your pace.</em>
      </h1>
      <p className="md-lede">
        Character access unlocks an identity.
        <br />
        Credits power the content you create with it.
      </p>
      <div className="md-launch-note">
        Launch preview · Payments are not connected. These are planned credit
        packs, not active monthly subscriptions.
      </div>
      <div className="md-price-grid">
        {packages.map((p, i) => (
          <article key={p.id}>
            <span>0{i + 1}</span>
            <h2>{p.name}</h2>
            <p className="md-price">
              ${p.price}
              <small>planned pack</small>
            </p>
            <strong>{p.credits.toLocaleString("en-US")} credits</strong>
            <p>
              Use across supported image and video generation. Final cost
              depends on the model and settings.
            </p>
            <Link href="/billing" className="md-button md-button-outline">
              Review credits ↗
            </Link>
          </article>
        ))}
      </div>
      <div className="md-pricing-explainer">
        <h2>
          One identity.
          <br />
          Many possibilities.
        </h2>
        <div>
          <h3>Character access is separate.</h3>
          <p>
            Drop 001 models have a planned $29 access price. That access does
            not include generation credits or exclusive ownership. Final terms
            will be shown before checkout opens.
          </p>
          <h3>Review the quote before you create.</h3>
          <p>
            Studio confirms the price before you generate. Video costs reflect
            duration and optional sound. Credits are reserved at submission;
            rejected or failed jobs receive a refund. Requests with an
            unconfirmed outcome are reviewed before any further charge.
          </p>
          <h3>Your work stays in your workspace.</h3>
          <p>
            Download completed outputs or organize them into projects. Your
            files are not automatically published.
          </p>
          <Link className="md-text-link" href="/resources#licenses">
            Read the access guide ↗
          </Link>
        </div>
      </div>
    </section>
  );
}
