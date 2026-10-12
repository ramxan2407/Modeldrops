import Link from "next/link";
import { ArrowUpRight, Check, Layers3, Sparkles } from "lucide-react";
import { packages } from "@/lib/catalog";
import { pageMetadata } from "@/lib/marketing/metadata";

export const metadata = pageMetadata(
  "Access & credits",
  "Understand character access, demo credits and generation costs in the Model Drops invited beta.",
  "/pricing",
);

export default function Pricing() {
  return (
    <section className="md-section md-pricing md-supporting-page">
      <header className="md-supporting-heading">
        <span className="md-kicker">ACCESS & CREDITS</span>
        <h1 className="md-display">
          A little clarity. <br />
          <em>More room to create.</em>
        </h1>
        <p className="md-lede">
          Unlock a character. Use credits to create with her. <br />
          See the cost before every generation.
        </p>
      </header>

      <div className="md-beta-banner">
        <span className="md-status-dot" aria-hidden="true" />
        <div>
          <strong>Currently in invited beta</strong>
          <p>
            Invited accounts use administrator-granted demo credits. Payments
            and credit purchases are not enabled.
          </p>
        </div>
        <Link href="/login">
          Sign in <ArrowUpRight size={16} />
        </Link>
      </div>

      <div className="md-access-grid">
        <article>
          <span className="md-feature-icon">
            <Layers3 size={22} strokeWidth={1.5} />
          </span>
          <span className="md-kicker">01 / CHARACTER ACCESS</span>
          <h2>Start with your model.</h2>
          <p>
            Review a character’s approved reference, supported generation models
            and credit price in the marketplace. Your unlocked characters appear
            in Studio.
          </p>
          <ul>
            <li>
              <Check size={16} /> Account-linked character access
            </li>
            <li>
              <Check size={16} /> Approved portrait used as the reference
            </li>
            <li>
              <Check size={16} /> Access terms shown before unlocking
            </li>
          </ul>
          <Link className="md-text-link" href="/models">
            Explore the collection <ArrowUpRight size={16} />
          </Link>
        </article>
        <article>
          <span className="md-feature-icon">
            <Sparkles size={22} strokeWidth={1.5} />
          </span>
          <span className="md-kicker">02 / GENERATION CREDITS</span>
          <h2>Create at your pace.</h2>
          <p>
            Image and video generation use credits separately from character
            access. Your selected model, resolution and video options determine
            the quote.
          </p>
          <ul>
            <li>
              <Check size={16} /> Cost shown before submission
            </li>
            <li>
              <Check size={16} /> Credits returned for confirmed failures
            </li>
            <li>
              <Check size={16} /> Private outputs saved to your library
            </li>
          </ul>
          <Link className="md-text-link" href="/billing">
            View your credits <ArrowUpRight size={16} />
          </Link>
        </article>
      </div>

      <section
        className="md-planned-packs"
        aria-labelledby="planned-packs-title"
      >
        <div className="md-supporting-section-heading">
          <div>
            <span className="md-kicker">LOOKING AHEAD</span>
            <h2 id="planned-packs-title">Planned credit packs.</h2>
          </div>
          <p>
            Preview only. These packs are not available to buy and are not
            monthly subscriptions.
          </p>
        </div>
        <div className="md-price-grid">
          {packages.map((pack) => (
            <article key={pack.id}>
              <span className="md-pack-status">Planned</span>
              <h3>{pack.name}</h3>
              <p className="md-price">
                ${pack.price}
                <small>per pack, when available</small>
              </p>
              <strong>{pack.credits.toLocaleString("en-US")} credits</strong>
              <p>
                For supported image and video models. Final terms will be
                confirmed before paid access opens.
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="md-pricing-explainer">
        <div>
          <span className="md-kicker">GOOD TO KNOW</span>
          <h2>
            Made to be <br />
            understood.
          </h2>
          <Link className="md-text-link" href="/resources#licenses">
            Read the access guide <ArrowUpRight size={16} />
          </Link>
        </div>
        <div>
          <h3>A character is a reference, not a LoRA.</h3>
          <p>
            Marketplace access is non-exclusive and uses the character’s
            approved portrait with supported generation models. Custom LoRA
            training is a separate request-based workflow.
          </p>
          <h3>A clear quote before you create.</h3>
          <p>
            Credits are reserved at submission. A confirmed rejection or failed
            job returns those credits once. Requests with an unconfirmed outcome
            are reviewed before any further charge.
          </p>
          <h3>Your work stays in your workspace.</h3>
          <p>
            Download completed outputs or organize them into projects. Your
            files are not automatically published or posted to social media.
          </p>
        </div>
      </div>
    </section>
  );
}
