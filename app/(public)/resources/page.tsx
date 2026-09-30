import Link from "next/link";
import { pageMetadata } from "@/lib/marketing/metadata";
export const metadata = pageMetadata(
  "The creator's guide",
  "How character access, reference-guided generation, credits, private projects and manual LoRA training work on ModelDrops.",
  "/resources",
);
const questions = [
  [
    "How does the character become my reference?",
    "Studio attaches the approved portrait on the server after checking your character access. Image models receive it as their editing reference; video starts from the portrait. You choose the scene and supported settings. Likeness varies across outputs.",
  ],
  [
    "Can I change the character reference?",
    "Character references are controlled by super administrators. In Studio, choose another character you have unlocked. Personal identity uploads cannot replace a purchased character's approved reference.",
  ],
  [
    "How does LoRA training work?",
    "Upload at least 15 JPG, PNG or WebP images, add a trigger word and submit your request. Our team reviews, trains manually and delivers the completed LoRA to your private library. The platform tracks each stage; it does not currently run automatic training.",
  ],
  [
    "What happens if generation fails?",
    "A definite provider rejection or failed job returns the reserved credits once. An uncertain submission is held for administrator review to avoid charging twice. Submitted jobs cannot be cancelled in Studio.",
  ],
  [
    "Can I publish directly to social media?",
    "Download completed media from your library and publish it through your own channels. ModelDrops does not currently connect or post to social accounts.",
  ],
  [
    "Are upscale and variations available?",
    "You can recreate a result using its saved prompt and settings. Dedicated upscale and variation services are not yet connected. Image and video options shown in Studio follow the current model's supported capabilities.",
  ],
];
export default function Resources() {
  return (
    <div className="md-section md-resources">
      <span className="md-kicker">THE FIELD GUIDE</span>
      <h1 className="md-display">
        GOOD IDEAS.
        <br />
        <em>CLEAR NEXT STEPS.</em>
      </h1>
      <section id="how-it-works">
        <span className="md-kicker">01 / THE WORKFLOW</span>
        <h2>From discovery to your next post.</h2>
        <ol className="md-guide-steps">
          {[
            [
              "Discover",
              "Explore the collection and review a model's creative direction.",
              "/models",
            ],
            [
              "Unlock",
              "Review access terms. Payments will open after launch preparation.",
              "/marketplace",
            ],
            [
              "Describe",
              "Your purchased character is selected in Studio. Write the scene.",
              "/studio",
            ],
            [
              "Generate",
              "Review the credit cost, submit, and follow the job in your workspace.",
              "/studio",
            ],
            [
              "Publish",
              "Download completed work from your private library, then publish on your channels.",
              "/library",
            ],
          ].map(([name, text, href], i) => (
            <li key={name}>
              <span>0{i + 1}</span>
              <div>
                <h3>{name}</h3>
                <p>{text}</p>
              </div>
              <Link href={href} aria-label={`Open ${name.toLowerCase()} step`}>
                ↗
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <section id="licenses">
        <span className="md-kicker">02 / ACCESS & PRIVACY</span>
        <h2>
          Your identity license.
          <br />
          Your private workspace.
        </h2>
        <p>
          Character access is non-exclusive use inside ModelDrops under the
          license shown at checkout. It does not transfer ownership of a real
          person’s likeness or include a trained LoRA. Final commercial terms
          must be reviewed before a paid launch.
        </p>
        <p>
          Generation uses credits separately. Prompts and approved references
          are sent to the generation service; outputs are saved to private
          storage. Your earlier license snapshots and creations remain in your
          account.
        </p>
        <p>
          Super administrators control characters, approved references and
          permissions. Training administrators manage training requests, not
          marketplace access.
        </p>
      </section>
      <section id="launch">
        <span className="md-kicker">03 / LAUNCH STATUS</span>
        <h2>
          In preparation.
          <br />
          With intention.
        </h2>
        <p>
          The five Drop 001 portraits and their portfolios are awaiting review.
          Payments remain disconnected. Clearly labeled test access is available
          only in an explicitly configured non-production environment.
        </p>
        <p>
          Public concept artwork and the homepage walkthrough illustrate the
          product. They are not results generated for the five launch
          identities, customer testimonials, or proof of likeness quality.
        </p>
      </section>
      <section>
        <span className="md-kicker">04 / ANSWERS</span>
        <h2>A few things worth knowing.</h2>
        {questions.map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <span>+</span>
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
