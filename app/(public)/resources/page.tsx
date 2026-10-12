import Link from "next/link";
import {
  ArrowUpRight,
  FolderClosed,
  Image as ImageIcon,
  Layers3,
} from "lucide-react";
import { pageMetadata } from "@/lib/marketing/metadata";

export const metadata = pageMetadata(
  "The creator's guide",
  "How character access, reference-guided generation, credits, private projects and manual LoRA training work on Model Drops.",
  "/resources",
);

const questions = [
  [
    "How does the character become my reference?",
    "Studio attaches the approved portrait after checking your character access. Image models receive it as their editing reference; video starts from the portrait. You choose the scene and supported settings. Likeness varies across outputs.",
  ],
  [
    "Can I change the character reference?",
    "Character references are controlled by super administrators. In Studio, choose another character you have unlocked. Personal identity uploads cannot replace a purchased character’s approved reference.",
  ],
  [
    "How does LoRA training work?",
    "Upload at least 15 JPG, PNG or WebP images, add a trigger word and submit your request. Administrators review the dataset, train manually and deliver the completed LoRA to your private library. The platform tracks each stage; training is not automated.",
  ],
  [
    "What happens if generation fails?",
    "A confirmed rejection or failed job returns the reserved credits once. An uncertain submission is held for administrator review to avoid charging twice. Submitted jobs cannot currently be cancelled in Studio.",
  ],
  [
    "Can I publish directly to social media?",
    "Download completed media from your library and publish it through your own channels. Model Drops does not currently connect or post to social accounts.",
  ],
  [
    "Are upscale and variations available?",
    "You can recreate a result using its saved prompt and settings. Dedicated upscale and variation services are not yet connected. The image and video options shown in Studio follow the selected model’s supported capabilities.",
  ],
];
const steps = [
  [
    "Find your character",
    "Explore the collection. Review a character’s creative direction, approved reference and access terms.",
    "/models",
  ],
  [
    "Unlock access",
    "Sign in with your invited account. Eligible characters can be unlocked with demo credits in the marketplace.",
    "/marketplace",
  ],
  [
    "Set the scene",
    "Select an unlocked character in Studio. Choose image or video, describe your scene and adjust the supported settings.",
    "/studio",
  ],
  [
    "Review and create",
    "Check the credit quote, submit your generation and follow its progress in your workspace.",
    "/studio",
  ],
  [
    "Make it yours",
    "Find completed work in your private library, organize it into projects and download it for your channels.",
    "/library",
  ],
];

export default function Resources() {
  return (
    <div className="md-section md-resources md-supporting-page">
      <header className="md-supporting-heading">
        <span className="md-kicker">THE CREATOR’S GUIDE</span>
        <h1 className="md-display">
          Good ideas. <br />
          <em>A clear next step.</em>
        </h1>
        <p className="md-lede">
          Everything you need to understand your workspace, <br />
          from your first character to your next creation.
        </p>
      </header>
      <nav className="md-guide-nav" aria-label="Guide sections">
        <a href="#how-it-works">
          The workflow <span>01</span>
        </a>
        <a href="#licenses">
          Access & privacy <span>02</span>
        </a>
        <a href="#launch">
          Beta access <span>03</span>
        </a>
        <a href="#answers">
          Common questions <span>04</span>
        </a>
      </nav>

      <section id="how-it-works">
        <span className="md-kicker">01 / THE WORKFLOW</span>
        <h2>
          One character. <br />
          Your creative direction.
        </h2>
        <ol className="md-guide-steps">
          {steps.map(([name, description, href], index) => (
            <li key={name}>
              <span>0{index + 1}</span>
              <div>
                <h3>{name}</h3>
                <p>{description}</p>
              </div>
              <Link href={href} aria-label={name}>
                <ArrowUpRight size={20} />
              </Link>
            </li>
          ))}
        </ol>
        <div className="md-guide-tools">
          <Link href="/studio">
            <ImageIcon size={22} strokeWidth={1.5} />
            <h3>Creator Studio</h3>
            <p>
              Reference-guided images and video, with a clear cost before you
              create.
            </p>
            <span>
              Open Studio <ArrowUpRight size={16} />
            </span>
          </Link>
          <Link href="/library">
            <FolderClosed size={22} strokeWidth={1.5} />
            <h3>Your library</h3>
            <p>
              Completed creations, saved prompts and projects in one private
              space.
            </p>
            <span>
              View library <ArrowUpRight size={16} />
            </span>
          </Link>
          <Link href="/train-lora">
            <Layers3 size={22} strokeWidth={1.5} />
            <h3>Custom LoRA training</h3>
            <p>
              Submit a dataset, follow the review and receive your manually
              trained file.
            </p>
            <span>
              Explore training <ArrowUpRight size={16} />
            </span>
          </Link>
        </div>
      </section>

      <section id="licenses" className="md-guide-prose">
        <div>
          <span className="md-kicker">02 / ACCESS & PRIVACY</span>
          <h2>
            Your character. <br />
            Your private workspace.
          </h2>
        </div>
        <div>
          <h3>Understand your access</h3>
          <p>
            Character access is non-exclusive use inside Model Drops under the
            terms shown at checkout. It does not transfer ownership of a
            person’s likeness or include a trained LoRA. Final commercial terms
            must be reviewed before a paid launch.
          </p>
          <h3>Keep your work together</h3>
          <p>
            Generation uses credits separately. Prompts and approved references
            are sent to the generation service; outputs are saved to private
            storage. Earlier license snapshots and creations remain in your
            account.
          </p>
          <h3>Controlled references and permissions</h3>
          <p>
            Super administrators manage characters, approved references and
            permissions. Training administrators manage training requests rather
            than marketplace access.
          </p>
        </div>
      </section>

      <section id="launch" className="md-guide-beta">
        <div>
          <span className="md-kicker">03 / INVITED BETA</span>
          <h2>A focused beginning.</h2>
          <p>
            An administrator must approve your email and grant demo credits.
            Character access depends on each character’s review status. Payments
            remain disconnected.
          </p>
          <Link className="md-button" href="/login">
            Sign in to your workspace <ArrowUpRight size={17} />
          </Link>
        </div>
        <aside>
          <span className="md-status-dot" aria-hidden="true" />
          <h3>About the artwork</h3>
          <p>
            Public concept artwork illustrates creative possibilities. It is not
            a result generated for the launch characters, a customer testimonial
            or proof of likeness quality. Approved character examples appear
            after review.
          </p>
        </aside>
      </section>

      <section id="answers">
        <span className="md-kicker">04 / COMMON QUESTIONS</span>
        <h2>A few useful answers.</h2>
        {questions.map(([question, answer]) => (
          <details key={question}>
            <summary>
              {question}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
