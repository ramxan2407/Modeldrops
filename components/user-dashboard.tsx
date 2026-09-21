"use client";
import {
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Users,
  Images,
  Folder,
  Zap,
  ShieldCheck,
  Plus,
  Video,
  Image as ImageIcon,
  RefreshCw,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { characters, type Character } from "@/lib/catalog";
export type PurchaseRecord = {
  characterId: string;
  purchaseDate: string;
  licenseVersion: string;
  licenseSnapshot: string;
  priceCents: number;
};
type Creation = {
  id: string;
  prompt: string;
  image: string;
  type: string;
  status: string;
  createdAt: string;
};
type Props = {
  name: string;
  balance: number;
  owned: string[];
  purchases: PurchaseRecord[];
  generations: Creation[];
  projects: { id: string; name: string; description: string }[];
  loading: boolean;
  onCreate: (c: Character, mode: "image" | "video") => void;
  onBrowse: () => void;
  onModels: () => void;
  onTrain: () => void;
  onLoras: () => void;
  onStudio: () => void;
  onCredits: () => void;
  onLibrary: () => void;
  onProjects: () => void;
  onProject: (id: string) => void;
  onResume: (id: string) => void;
  onLicense: (purchase: PurchaseRecord) => void;
};
export function UserDashboard(p: Props) {
  const collection = characters
    .filter((c) => p.owned.includes(c.id))
    .sort((a, b) =>
      (
        p.purchases.find((x) => x.characterId === b.id)?.purchaseDate || ""
      ).localeCompare(
        p.purchases.find((x) => x.characterId === a.id)?.purchaseDate || "",
      ),
    );
  const latest = p.generations.find((g) => g.status === "completed");
  const completed = p.generations.filter(
    (g) => g.status === "completed",
  ).length;
  const processing = p.generations.filter((g) =>
    ["queued", "processing"].includes(g.status),
  ).length;
  return (
    <div className="user-dashboard" aria-busy={p.loading}>
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h1>
            {p.loading
              ? "Your dashboard."
              : `Welcome back, ${p.name.split(" ")[0]}.`}
          </h1>
          <p>Create something new or continue a recent project.</p>
        </div>
        <span className="workspace-private">
          <ShieldCheck size={15} />
          Private workspace
        </span>
      </div>
      <div className="dashboard-start-actions">
        <button
          onClick={p.onStudio}
          className="dashboard-action-card primary-action"
        >
          <span className="action-icon">
            <Sparkles size={23} />
          </span>
          <div>
            <small>CREATE CONTENT</small>
            <h2>Bring an idea to life</h2>
            <p>
              Choose a character, write a prompt, and create an image or video.
            </p>
            <strong>
              Open studio <ArrowRight size={16} />
            </strong>
          </div>
        </button>
        <button onClick={p.onTrain} className="dashboard-action-card">
          <span className="action-icon">
            <Users size={23} />
          </span>
          <div>
            <small>CUSTOM CHARACTER</small>
            <h2>Train your own LoRA</h2>
            <p>
              Upload your references. Our team trains and delivers your model.
            </p>
            <strong>
              Start training request <ArrowRight size={16} />
            </strong>
          </div>
        </button>
      </div>
      <div className="dashboard-stats">
        {[
          {
            label: "Models in your library",
            value: collection.length,
            icon: Users,
            action: p.onModels,
          },
          {
            label: "Completed creations",
            value: completed,
            icon: Images,
            action: p.onLibrary,
          },
          {
            label: "Your projects",
            value: p.projects.length,
            icon: Folder,
            action: p.onProjects,
          },
          {
            label: "Available demo credits",
            value: p.balance,
            icon: Zap,
            action: p.onCredits,
          },
        ].map((s) => (
          <button key={s.label} onClick={s.action}>
            <span>
              <s.icon size={18} />
              {s.label}
            </span>
            <strong>{p.loading ? "—" : s.value.toLocaleString()}</strong>
            <ArrowUpRight size={16} />
          </button>
        ))}
      </div>
      <div className="dashboard-columns">
        <div className="dashboard-primary">
          <section className="dashboard-models">
            <div className="dashboard-section-title">
              <div>
                <h2>Your character models</h2>
                <p>Ready to create with, whenever you are.</p>
              </div>
              <button className="text-link" onClick={p.onBrowse}>
                Browse characters
                <ArrowUpRight size={15} />
              </button>
            </div>
            {p.loading ? (
              <div className="dashboard-loading" role="status">
                <RefreshCw size={22} className="spin" />
                Loading your personal library…
              </div>
            ) : collection.length ? (
              <div className="owned-model-grid">
                {collection.map((c) => {
                  const purchase = p.purchases.find(
                    (x) => x.characterId === c.id,
                  );
                  return (
                    <article className="owned-model-card" key={c.id}>
                      <div className="owned-model-image">
                        <img
                          src={c.image}
                          alt={`${c.name}, in your character library`}
                          style={{ objectPosition: c.position }}
                        />
                        <span>
                          <ShieldCheck size={13} />
                          In your library
                        </span>
                      </div>
                      <div className="owned-model-info">
                        <div>
                          <h3>{c.name}</h3>
                          <span>
                            {c.category} · @{c.creator}
                          </span>
                        </div>
                        <p>
                          {purchase
                            ? `Added ${new Date(purchase.purchaseDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                            : "Ready in your library"}
                        </p>
                        <div className="owned-model-actions">
                          <Button
                            className="lime-button"
                            onClick={() => p.onCreate(c, "image")}
                          >
                            <ImageIcon size={15} />
                            Create image
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => p.onCreate(c, "video")}
                            aria-label={`Create video with ${c.name}`}
                          >
                            <Video size={16} />
                          </Button>
                        </div>
                        {purchase && (
                          <button
                            className="owned-license-link"
                            onClick={() => p.onLicense(purchase)}
                          >
                            <ShieldCheck size={12} />
                            View your license
                            <ArrowUpRight size={12} />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="dashboard-empty">
                <span className="dashboard-empty-icon">
                  <Users size={30} />
                </span>
                <h3>Add your first character</h3>
                <p>
                  Models you acquire are saved to this dashboard. Choose one,
                  then create images and videos from the same place.
                </p>
                <Button className="lime-button" onClick={p.onBrowse}>
                  Explore character models
                  <ArrowUpRight size={16} />
                </Button>
                <small>Try the workflow with a free demo character.</small>
              </div>
            )}
          </section>
          <section className="dashboard-recent">
            <div className="dashboard-section-title">
              <div>
                <h2>Recent creations</h2>
                <p>
                  {processing
                    ? `${processing} generation${processing > 1 ? "s" : ""} in progress`
                    : "Your latest results, ready to revisit."}
                </p>
              </div>
              <button className="text-link" onClick={p.onLibrary}>
                View all
                <ArrowRight size={15} />
              </button>
            </div>
            {p.generations.length ? (
              <div className="dashboard-recent-grid">
                {p.generations.slice(0, 4).map((g) => (
                  <button
                    key={g.id}
                    onClick={() => p.onResume(g.id)}
                    className="dashboard-generation"
                  >
                    <div>
                      {g.image ? (
                        <img src={g.image} alt={g.prompt} />
                      ) : (
                        <span>
                          <Clock size={24} />
                          {g.status}
                        </span>
                      )}
                      <span className="generation-type">
                        {g.type === "video" ? (
                          <Video size={12} />
                        ) : (
                          <ImageIcon size={12} />
                        )}
                        DEMO
                      </span>
                    </div>
                    <p>{g.prompt}</p>
                    <small>
                      {g.status} · {new Date(g.createdAt).toLocaleDateString()}
                    </small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="dashboard-small-empty">
                <Images size={24} />
                <p>
                  Your first creation will appear here.
                  <br />
                  <span>
                    Start with a model from your library or an idea of your own.
                  </span>
                </p>
                <Button variant="secondary" onClick={p.onStudio}>
                  Open studio
                  <ArrowUpRight size={15} />
                </Button>
              </div>
            )}
          </section>
        </div>
        <aside className="dashboard-aside">
          <section className="continue-card">
            <span className="eyebrow">KEEP THE IDEAS FLOWING</span>
            {latest ? (
              <>
                <div className="continue-image">
                  <img src={latest.image} alt="Your latest creation" />
                  <span>
                    <RefreshCw size={13} />
                    PICK UP WHERE YOU LEFT OFF
                  </span>
                </div>
                <h3>Your next take starts here.</h3>
                <p>{latest.prompt}</p>
                <Button
                  className="lime-button"
                  onClick={() => p.onResume(latest.id)}
                >
                  Continue creating
                  <ArrowUpRight size={15} />
                </Button>
              </>
            ) : (
              <>
                <div className="dashboard-start-icon">
                  <Sparkles size={31} />
                </div>
                <h3>
                  Meet your next
                  <br />
                  creative obsession.
                </h3>
                <p>
                  Start from a text prompt or choose a character from your
                  library.
                </p>
                <Button className="lime-button" onClick={p.onStudio}>
                  Start creating
                  <ArrowUpRight size={15} />
                </Button>
              </>
            )}
          </section>
          <section className="dashboard-lora-link">
            <div className="dashboard-section-title">
              <h2>Your trained LoRAs</h2>
              <Users size={18} />
            </div>
            <p>Track training requests and download completed models.</p>
            <button className="text-link" onClick={p.onLoras}>
              Open My LoRAs <ArrowRight size={15} />
            </button>
          </section>
          <section className="dashboard-projects">
            <div className="dashboard-section-title">
              <h2>Your projects</h2>
              <button aria-label="View projects" onClick={p.onProjects}>
                <ArrowUpRight size={17} />
              </button>
            </div>
            {p.projects.length ? (
              p.projects.slice(0, 3).map((project) => (
                <button
                  className="dashboard-project"
                  key={project.id}
                  onClick={() => p.onProject(project.id)}
                >
                  <span>
                    <Folder size={17} />
                  </span>
                  <div>
                    <strong>{project.name}</strong>
                    <small>Private project</small>
                  </div>
                  <ArrowUpRight size={14} />
                </button>
              ))
            ) : (
              <p className="dashboard-project-empty">
                Give your next campaign, film, or character story a home.
              </p>
            )}
            <button className="dashboard-new-project" onClick={p.onProjects}>
              <Plus size={14} />
              Manage projects
            </button>
          </section>
          <div className="dashboard-privacy">
            <ShieldCheck size={20} />
            <div>
              <strong>Just your creative world.</strong>
              <p>
                Your model access, projects, credits, and creations are tied to
                your account.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
