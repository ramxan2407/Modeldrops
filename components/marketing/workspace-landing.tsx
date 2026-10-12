import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleUserRound,
  Fingerprint,
  FolderClosed,
  ImagePlus,
  LockKeyhole,
  MoveUpRight,
  SlidersHorizontal,
  Video,
} from "lucide-react";
import { publicCatalog } from "@/lib/marketing/public-catalog";
import { TalentPortrait } from "./talent-card";
import { StudioPreview } from "./studio-preview";

const features = [
  {
    icon: Fingerprint,
    title: "Your reference, at the ready.",
    text: "Your unlocked character’s approved portrait is attached as the reference for supported image and video models.",
    label: "CHARACTER REFERENCE",
  },
  {
    icon: SlidersHorizontal,
    title: "The details are yours.",
    text: "Choose your generation model, frame, resolution, and duration from the options that model supports.",
    label: "CREATIVE CONTROL",
  },
  {
    icon: FolderClosed,
    title: "Keep the whole story.",
    text: "Bring finished images and videos into projects. Revisit your ideas and download the work you want to keep.",
    label: "PRIVATE LIBRARY",
  },
];

export async function WorkspaceLanding() {
  const talent = await publicCatalog();
  return (
    <div className="min-landing">
      <section className="min-hero" aria-labelledby="welcome-heading">
        <Link href="/resources#launch" className="min-beta">
          <span /> Built for creators{" "}
          <span className="min-beta-separator">/</span> Invited beta{" "}
          <ArrowUpRight size={13} />
        </Link>
        <h1 id="welcome-heading">
          Your character.
          <br />
          <span>A world of possibilities.</span>
        </h1>
        <p>
          Find your AI character. Create images and videos.
          <br className="min-desktop-break" /> Build a body of work that feels
          unmistakably yours.
        </p>
        <div className="min-hero-actions">
          <Link href="/models" className="md-button">
            Explore the characters <ArrowRight size={17} />
          </Link>
          <a href="#studio" className="min-text-link">
            Meet your new studio <ArrowUpRight size={16} />
          </a>
        </div>
        <StudioPreview />
        <div className="min-capabilities" aria-label="Platform features">
          <span>
            <CircleUserRound /> Original characters
          </span>
          <span>
            <ImagePlus /> Image generation
          </span>
          <span>
            <Video /> Video generation
          </span>
          <span>
            <Fingerprint /> Custom LoRA training
          </span>
          <span>
            <LockKeyhole /> Private workspace
          </span>
        </div>
      </section>
      <section
        className="min-section min-workflow"
        id="studio"
        aria-labelledby="workflow-heading"
      >
        <div className="min-section-heading">
          <span className="min-kicker">01 / THE CREATIVE WORKFLOW</span>
          <h2 id="workflow-heading">
            Less setup.
            <br />
            <span>More making.</span>
          </h2>
          <p>
            From your first character to your next campaign.
            <br />
            One connected workspace for every step.
          </p>
        </div>
        <div className="min-steps">
          <Link href="/models">
            <span className="min-step-number">
              01 <MoveUpRight size={20} />
            </span>
            <h3>Find your character.</h3>
            <p>
              Explore the drops. Unlock a reviewed character with demo credits
              and add it to your collection.
            </p>
            <span className="min-step-link">
              Browse the marketplace <ArrowRight size={15} />
            </span>
          </Link>
          <Link href="/studio">
            <span className="min-step-number">
              02 <MoveUpRight size={20} />
            </span>
            <h3>Give it a direction.</h3>
            <p>
              Select your character in Studio. Describe the scene, fine-tune the
              settings, and see the credit cost before creating.
            </p>
            <span className="min-step-link">
              Open Creator Studio <ArrowRight size={15} />
            </span>
          </Link>
          <Link href="/library">
            <span className="min-step-number">
              03 <MoveUpRight size={20} />
            </span>
            <h3>Make it a collection.</h3>
            <p>
              Follow each generation, organize finished work into projects, and
              download your images and videos.
            </p>
            <span className="min-step-link">
              Explore your workspace <ArrowRight size={15} />
            </span>
          </Link>
        </div>
      </section>
      <section
        className="min-section min-collection"
        id="characters"
        aria-labelledby="collection-heading"
      >
        <div className="min-section-heading min-heading-split">
          <div>
            <span className="min-kicker">02 / MODEL DROPS</span>
            <h2 id="collection-heading">
              It starts with
              <br />
              <span>a character.</span>
            </h2>
          </div>
          <div>
            <p>
              Distinct identities. A new creative starting point.
              <br />
              Discover the characters ready for your studio.
            </p>
            <Link className="min-text-link" href="/models">
              View the collection <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
        {talent.length > 0 ? (
          <div className="min-character-grid">
            {talent.slice(0, 5).map((model) => (
              <Link
                href={`/models/${model.slug}`}
                className="min-character"
                key={model.id}
              >
                <TalentPortrait model={model} />
                <div>
                  <h3>{model.name}</h3>
                  <ArrowUpRight size={21} />
                </div>
                <p>
                  {model.styles.slice(0, 2).join(" · ")}
                  <span>{model.demoCreditPrice} credits</span>
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="min-collection-preview">
            <div className="min-character-symbol" aria-hidden="true">
              <Fingerprint strokeWidth={0.65} />
            </div>
            <div>
              <span className="min-kicker">THE NEXT DROP IS TAKING SHAPE</span>
              <h3>
                Good characters
                <br />
                are worth the wait.
              </h3>
              <p>
                Each character is reviewed before joining the collection.
                Approved portraits and available access will appear here.
              </p>
              <Link className="min-text-link" href="/models">
                Explore Model Drops <ArrowUpRight size={16} />
              </Link>
            </div>
            <span className="min-drop-stamp">MD / 001</span>
          </div>
        )}
        <p className="min-disclosure">
          Character access uses demo credits during the invited beta.
          Availability depends on review and approval.
        </p>
      </section>
      <section
        className="min-section min-feature-section"
        id="workspace"
        aria-labelledby="features-heading"
      >
        <div className="min-section-heading">
          <span className="min-kicker">03 / YOUR WORKSPACE, CONSIDERED</span>
          <h2 id="features-heading">
            Everything you need.
            <br />
            <span>Room to create.</span>
          </h2>
        </div>
        <div className="min-feature-grid">
          {features.map(({ icon: Icon, title, text, label }) => (
            <article key={label}>
              <Icon size={28} strokeWidth={1.3} />
              <span className="min-kicker">{label}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section
        className="min-section min-training"
        id="training"
        aria-labelledby="training-heading"
      >
        <div className="min-training-copy">
          <span className="min-kicker">04 / CUSTOM LORA TRAINING</span>
          <h2 id="training-heading">
            Your own character.
            <br />
            <span>Made for your world.</span>
          </h2>
          <p>
            Have an original character in mind? Submit your image dataset and
            creative notes. Our team reviews your request, trains it externally,
            and delivers the completed LoRA to your account.
          </p>
          <ul>
            <li>
              <Check size={16} /> Upload and preview your dataset
            </li>
            <li>
              <Check size={16} /> Follow review, training, and quality checks
            </li>
            <li>
              <Check size={16} /> Download your LoRA and trigger word
            </li>
          </ul>
          <Link href="/train-lora" className="md-button">
            Start a training request <ArrowUpRight size={17} />
          </Link>
        </div>
        <div
          className="min-training-diagram"
          aria-label="Training process: upload a dataset, human review and training, LoRA delivery"
        >
          <div className="min-dataset-stack" aria-hidden="true">
            <div>
              <ImagePlus />
            </div>
            <div>
              <ImagePlus />
            </div>
            <div>
              <Fingerprint />
            </div>
          </div>
          <div className="min-training-stage">
            <span>01</span>
            <div>
              <strong>Your dataset</strong>
              <p>15+ images and a creative direction</p>
            </div>
          </div>
          <div className="min-training-stage">
            <span>02</span>
            <div>
              <strong>A human touch</strong>
              <p>Review → training → quality check</p>
            </div>
          </div>
          <div className="min-training-stage">
            <span>03</span>
            <div>
              <strong>Your custom LoRA</strong>
              <p>File, trigger word, and recommended prompt</p>
            </div>
            <Check size={18} />
          </div>
          <span className="min-diagram-note">
            A team-managed training service
          </span>
        </div>
      </section>
      <section
        className="min-section min-credit-section"
        aria-labelledby="credit-heading"
      >
        <div>
          <span className="min-kicker">CREATE WITH CLARITY</span>
          <h2 id="credit-heading">
            Your next idea.
            <br />
            <span>No guesswork.</span>
          </h2>
          <p>
            Character access unlocks your reference. Generation credits power
            the images and videos you create with it. Review the cost before
            every request.
          </p>
          <Link href="/pricing" className="min-text-link">
            How access & credits work <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="min-credit-ledger">
          <div>
            <span>IN YOUR WORKSPACE</span>
            <LockKeyhole size={15} />
          </div>
          <p>
            <span>Character access</span>
            <strong>Your creative starting point</strong>
          </p>
          <p>
            <span>Generation cost</span>
            <strong>Shown before you create</strong>
          </p>
          <p>
            <span>Your balance</span>
            <strong>Always in view</strong>
          </p>
          <footer>Invited beta · Demo credits · Payments not yet open</footer>
        </div>
      </section>
      <section className="min-final" aria-labelledby="final-heading">
        <span className="min-kicker">A SPACE FOR YOUR NEXT CHAPTER</span>
        <h2 id="final-heading">
          Make something
          <br />
          <span>that feels like you.</span>
        </h2>
        <Link href="/create" className="md-button">
          Enter your workspace <ArrowUpRight size={18} />
        </Link>
        <p>
          Already invited? <Link href="/login">Sign in to Model Drops</Link>
        </p>
      </section>
    </div>
  );
}
