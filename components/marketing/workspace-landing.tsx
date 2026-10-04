import Link from "next/link";
import Image from "next/image";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  Folder,
  LockKeyhole,
  Plus,
} from "lucide-react";
import { WorkspaceFlow } from "./workspace-flow";
import { WorkflowShowcase } from "./workflow-showcase";
import { talent } from "@/lib/marketing/catalog";
import { campaignAssets } from "@/lib/marketing/campaign-assets";

export function WorkspaceLanding() {
  return (
    <div className="ws-landing">
      <section className="ws-hero" aria-labelledby="workspace-heading">
        <div className="ws-hero-copy">
          <Link href="/models" className="ws-release">
            <span className="ws-status-dot" /> MEET DROP 001{" "}
            <span>
              Five original identities <ArrowUpRight size={12} />
            </span>
          </Link>
          <h1 id="workspace-heading">
            Your model.
            <br />
            Your ideas.
            <br />
            <span>All in one place.</span>
          </h1>
          <p>
            A creative home for your AI character. Make images and videos,
            explore new directions, and keep your best work together.
          </p>
          <div className="ws-actions">
            <Link href="/create" className="md-button">
              Start creating <ArrowRight size={17} />
            </Link>
            <a href="#workflows" className="ws-secondary">
              Explore the workflow <ArrowDown size={16} />
            </a>
          </div>
          <span className="ws-hero-note">
            <LockKeyhole size={12} /> Your character. Your private workspace.
          </span>
        </div>
        <WorkspaceFlow />
      </section>
      <div
        className="ws-capability-strip"
        aria-label="The Model Drops workflow"
      >
        <span>LESS SETUP. MORE CREATING.</span>
        <div>
          <span>Choose a model</span>
          <ArrowRight />
          <span>Create images & video</span>
          <ArrowRight />
          <span>Organize & download</span>
        </div>
      </div>
      <WorkflowShowcase />
      <section
        className="ws-section ws-talent-section"
        id="the-drop"
        aria-labelledby="talent-heading"
      >
        <div className="ws-section-heading">
          <div>
            <span className="ws-eyebrow">THE FIRST COLLECTION</span>
            <h2 id="talent-heading">
              A familiar face.
              <br />
              An original point of view.
            </h2>
          </div>
          <div>
            <p>
              Five distinct identities for five different worlds.
              <br />
              Find the one that feels like your next chapter.
            </p>
            <Link href="/models" className="ws-inline-link">
              Meet the collection <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
        <div className="ws-talent-row">
          {talent.map((model) => (
            <Link
              key={model.id}
              href={`/models/${model.slug}`}
              className="ws-talent-tile"
            >
              <div
                className="ws-talent-monogram"
                style={{ background: model.color }}
              >
                <span>DROP 001 / {model.number}</span>
                <strong>
                  {model.name.charAt(0)}
                  <i>.</i>
                </strong>
                <small>PORTRAIT IN PREPARATION</small>
                <ArrowUpRight size={18} />
              </div>
              <h3>{model.name}</h3>
              <p>{model.styles[0]}</p>
            </Link>
          ))}
        </div>
        <p className="ws-disclosure">
          Launch preview · Approved portraits and paid character access are in
          preparation.
        </p>
      </section>
      <section
        className="ws-section ws-library-section"
        id="workspace"
        aria-labelledby="library-heading"
      >
        <div className="ws-section-heading">
          <div>
            <span className="ws-eyebrow">KEEP YOUR CREATIVE MOMENTUM</span>
            <h2 id="library-heading">
              From a new idea
              <br />
              to your next favorite.
            </h2>
          </div>
          <p>
            Your work has a home.
            <br />
            Come back to it whenever inspiration hits.
          </p>
        </div>
        <div className="ws-library-grid">
          <div className="ws-library-card">
            <div className="ws-library-top">
              <span>
                <Folder size={15} /> Campaign studies
              </span>
              <span>EXAMPLE PROJECT</span>
            </div>
            <div className="ws-library-images">
              {Object.values(campaignAssets).map((asset, i) => (
                <div key={asset.slug}>
                  <Image
                    src={`/assets/campaigns/${asset.slug}.webp`}
                    alt={asset.alt}
                    fill
                    sizes="(max-width: 760px) 28vw, 220px"
                  />
                  <span>{i === 1 ? "IMAGE" : "CAMPAIGN"}</span>
                </div>
              ))}
            </div>
            <div className="ws-library-bottom">
              <span>
                <LockKeyhole size={13} /> Private by default
              </span>
              <Link href="/library">
                Open your library <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
          <div className="ws-library-copy">
            <div>
              <span className="ws-feature-icon">
                <Folder size={20} />
              </span>
              <h3>Give every idea a home.</h3>
              <p>
                Group completed generations into projects. Keep each campaign
                together, without losing the details behind it.
              </p>
            </div>
            <div>
              <span className="ws-feature-icon">
                <Download size={20} />
              </span>
              <h3>Yours to take from here.</h3>
              <p>
                Download your finished images and videos. Share them through
                your own channels, on your own schedule.
              </p>
            </div>
            <Link href="/projects" className="ws-inline-link">
              Explore your workspace <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </section>
      <section
        className="ws-section ws-cost-section"
        aria-labelledby="cost-heading"
      >
        <div>
          <span className="ws-eyebrow">CREATE AT YOUR PACE</span>
          <h2 id="cost-heading">
            Your direction.
            <br />
            <span>A clear next step.</span>
          </h2>
          <p>
            Character access and generation credits do different jobs. Know what
            you’re using before you create.
          </p>
          <Link className="ws-inline-link" href="/pricing">
            Understand access & credits <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="ws-access-card">
          <div className="ws-access-title">
            <span>THE MODEL DROPS WORKSPACE</span>
            <span>Launch preview</span>
          </div>
          <div className="ws-access-row">
            <span>01</span>
            <div>
              <h3>Choose your character</h3>
              <p>Access an identity from the collection.</p>
            </div>
            <ArrowUpRight size={18} />
          </div>
          <div className="ws-access-row">
            <span>02</span>
            <div>
              <h3>Make it your own</h3>
              <p>Use credits for images and videos.</p>
            </div>
            <Plus size={18} />
          </div>
          <ul>
            <li>
              <Check size={15} /> Review generation cost before submitting
            </li>
            <li>
              <Check size={15} /> Follow each request in your workspace
            </li>
            <li>
              <Check size={15} /> Keep completed media in your private library
            </li>
          </ul>
          <Link href="/pricing" className="md-button">
            See access & credits <ArrowRight size={16} />
          </Link>
          <p className="ws-disclosure">
            Payments are not open yet. No subscription is required to explore.
          </p>
        </div>
      </section>
      <section className="ws-final">
        <span className="ws-eyebrow">A NEW WAY TO CREATE</span>
        <h2>
          Your next idea
          <br />
          looks good on you.
        </h2>
        <p>Find your model. Make something that feels like you.</p>
        <div className="ws-actions">
          <Link href="/create" className="md-button">
            Start creating <ArrowRight size={17} />
          </Link>
          <Link href="/models" className="ws-secondary">
            Meet the models <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="ws-final-grid" aria-hidden="true" />
      </section>
    </div>
  );
}
