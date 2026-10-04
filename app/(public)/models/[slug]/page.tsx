import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { talent } from "@/lib/marketing/catalog";
import { pageMetadata, siteUrl } from "@/lib/marketing/metadata";
import { TalentPortrait } from "@/components/marketing/talent-card";
import { ModelAccess } from "@/components/marketing/model-access";
export function generateStaticParams() {
  return talent.map((m) => ({ slug: m.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const m = talent.find((m) => m.slug === slug);
  return m
    ? pageMetadata(
        `${m.name} · AI digital model`,
        m.description,
        `/models/${m.slug}`,
      )
    : {};
}
export default async function ModelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const m = talent.find((m) => m.slug === slug);
  if (!m) notFound();
  return (
    <article className="md-profile">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: `${m.name} — fictional AI character`,
            description: m.description,
            url: `${siteUrl}/models/${m.slug}`,
            creator: { "@type": "Organization", name: "ModelDrops" },
          }).replace(/</g, "\\u003c"),
        }}
      />
      <section className="md-profile-hero md-section">
        <div>
          <Link href="/models" className="md-text-link">
            ← The collection
          </Link>
          <span className="md-kicker">AI DIGITAL MODEL / {m.drop}</span>
          <h1>{m.name}</h1>
          <p>{m.description}</p>
          <dl>
            <div>
              <dt>Style</dt>
              <dd>{m.styles.join(" / ")}</dd>
            </div>
            <div>
              <dt>Best for</dt>
              <dd>Campaigns / Social / Editorial</dd>
            </div>
            <div>
              <dt>Creator</dt>
              <dd>ModelDrops · Fictional adult, {m.age}</dd>
            </div>
            <div>
              <dt>Planned access</dt>
              <dd>${m.price} · Generation credits separate</dd>
            </div>
          </dl>
          <ModelAccess model={m} />
        </div>
        <TalentPortrait model={m} priority />
      </section>
      <section className="md-section md-profile-portfolio">
        <div className="md-section-top">
          <span className="md-kicker">01 / PORTFOLIO</span>
          <span>Reviewed examples only</span>
        </div>
        <h2 className="md-display">
          One identity.
          <br />
          <em>A world of stories.</em>
        </h2>
        {m.gallery.length > 0 ? (
          <div className="md-portfolio-grid">
            {m.gallery.map((image) => (
              <figure key={image.src}>
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={900}
                  height={1200}
                  sizes="(max-width: 600px) 88vw, 44vw"
                />
                <figcaption>{image.scene}</figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="md-portfolio-pending">
            <span>PORTFOLIO / IN PREPARATION</span>
            <p>
              {m.name}’s approved portrait and sample generations will appear
              here after review.
            </p>
            <p>
              Her identity will be attached as a native reference to supported
              image and video models. Outputs vary; no trained LoRA is included.
            </p>
          </div>
        )}
      </section>
      <section className="md-section md-profile-composer">
        <div>
          <span className="md-kicker">02 / YOUR CREATIVE DIRECTION</span>
          <h2>
            Imagine
            <br />
            {m.name}
            <br />
            <em>anywhere.</em>
          </h2>
          <p>
            Start with a scene. Your character and draft follow you into the
            workspace.
          </p>
        </div>
        <ModelAccess model={m} composer />
      </section>
      <section className="md-section md-profile-details">
        <span className="md-kicker">03 / MODEL NOTES</span>
        <h2>Know your talent.</h2>
        <div>
          <p>{m.description}</p>
          <p>
            Choose Qwen Image Edit or either GPT Image 2.5 variant for images.
            Kling 3.0 Standard creates video starting from the approved
            portrait. Available controls and credit costs follow the selected
            generation model.
          </p>
          <p>
            Access is tied to your account. Only purchased or explicitly granted
            test access can unlock Studio generation. Browse the{" "}
            <Link href="/resources#licenses">license and privacy guide</Link>{" "}
            before launch.
          </p>
        </div>
      </section>
    </article>
  );
}
