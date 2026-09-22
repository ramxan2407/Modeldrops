"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  Check,
  Copy,
  Sparkles,
  Users,
  Image as ImageIcon,
  Film,
  ShieldCheck,
  RotateCcw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ModelDropsBrand } from "@/components/model-drops-brand";
import { characters, packages } from "@/lib/catalog";
import { inspirationPrompt, inspirationStyles } from "@/lib/inspiration";

const heroScenes = [
  {
    name: "Cinematic",
    image: "/assets/hero.png",
    character: "Nova",
    position: "center 38%",
    headline: "Your next world.",
  },
  {
    name: "Illustrated",
    image: "/assets/yuki.jpg",
    character: "Yuki",
    position: "center 35%",
    headline: "A different reality.",
  },
  {
    name: "Playful",
    image: "/assets/elio.jpg",
    character: "Elio",
    position: "center 35%",
    headline: "A little more magic.",
  },
];
const steps = [
  {
    icon: Users,
    title: "Find a starting point",
    text: "Explore the character collection and discover an aesthetic that feels like you.",
    detail: "Build your cast",
    description:
      "Browse distinctive personalities, compare creative directions, and collect inspiration before opening the Studio.",
    action: "Explore the cast",
    href: "#playground",
    tags: ["Character previews", "Creative directions", "Prompt inspiration"],
  },
  {
    icon: ImageIcon,
    title: "Create your first frame",
    text: "Turn a direction into a prompt, then choose your image model and settings.",
    detail: "Make it your own",
    description:
      "Use Qwen Image Edit for reference-based edits or explore the GPT Image 2.5 models. Review the cost before you generate.",
    action: "Try the prompt explorer",
    href: "#playground",
    tags: ["Reference editing", "Model controls", "Upfront credit cost"],
  },
  {
    icon: Film,
    title: "Bring it to life",
    text: "Take your next idea into motion with the video workspace.",
    detail: "Think beyond the frame",
    description:
      "Explore Kling 3.0 video generation with duration, aspect ratio, sound, and shot-planning controls in your private workspace.",
    action: "Open the Studio",
    href: "/studio",
    tags: ["Video generation", "Shot planning", "Optional sound"],
  },
  {
    icon: ShieldCheck,
    title: "Build your own character",
    text: "Submit references for a custom LoRA and follow your team's progress.",
    detail: "A character that's yours",
    description:
      "Upload at least 15 reference images. Our team reviews and trains your LoRA manually, then delivers the completed file to your account.",
    action: "Train a LoRA",
    href: "/train-lora",
    tags: ["Private datasets", "Human-operated training", "Status updates"],
  },
];
const faqs = [
  {
    q: "Does this page generate an image?",
    a: "No. This page uses existing sample artwork to help you explore characters, framing, and prompts. Open the Studio to choose a model, review its credit cost, and submit a real generation.",
  },
  {
    q: "Can I use the same character across creations?",
    a: "Character consistency depends on the model and references you use. The landing-page characters are illustrative examples; selecting one does not activate a trained LoRA or grant rights to a person's likeness.",
  },
  {
    q: "How does custom LoRA training work?",
    a: "Submit your character details and at least 15 reference images. Our team reviews the request, trains the model on our infrastructure, and uploads the finished LoRA to your private library. Training is human operated.",
  },
  {
    q: "Are my generations public?",
    a: "Your generated files and uploaded references are stored privately in your workspace. They are not automatically published to a public gallery.",
  },
  {
    q: "How much does generation cost?",
    a: "The Studio displays a credit quote based on your chosen model and settings. Review that quote before submitting. The packages below are illustrative; opening a package does not charge you.",
  },
  {
    q: "Can I sell my own characters?",
    a: "You can submit a concept for review. Production sales and payouts require ownership verification, an approved license, moderation, and payment-provider onboarding.",
  },
];
export default function Welcome() {
  const [scene, setScene] = useState(0);
  const [characterId, setCharacterId] = useState("nova");
  const [filter, setFilter] = useState("All");
  const [styleId, setStyleId] = useState("cinematic");
  const [frame, setFrame] = useState("4 / 5");
  const [step, setStep] = useState(0);
  const [copyMessage, setCopyMessage] = useState("");
  const [faqQuery, setFaqQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const character =
    characters.find((c) => c.id === characterId) ?? characters[0];
  const visibleCharacters = characters.filter(
    (c) =>
      filter === "All" ||
      (filter === "Illustrated"
        ? ["Anime", "3D"].includes(c.category)
        : c.category === filter),
  );
  const preset = `${character.id}.${styleId}`;
  const prompt = inspirationPrompt(preset)!;
  const currentScene = heroScenes[scene];
  const currentStep = steps[step];
  const filteredFaqs = faqs.filter((f) =>
    `${f.q} ${f.a}`.toLowerCase().includes(faqQuery.toLowerCase().trim()),
  );
  useEffect(() => {
    if (!root.current || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.revealed = "true";
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.08 },
    );
    root.current
      .querySelectorAll(".welcome-reveal")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  const resetExplorer = () => {
    setCharacterId("nova");
    setFilter("All");
    setStyleId("cinematic");
    setFrame("4 / 5");
    setCopyMessage("");
  };
  return (
    <div className="marketing welcome-interactive" ref={root} id="top">
      <div className="welcome-scroll-progress" aria-hidden="true" />
      <nav aria-label="Welcome navigation">
        <Link
          prefetch={false}
          href="#top"
          className="brand"
          aria-label="Model Drops home"
        >
          <ModelDropsBrand />
        </Link>
        <div>
          <Link prefetch={false} href="#playground">
            Explore
          </Link>
          <Link prefetch={false} href="#how-it-works">
            How it works
          </Link>
          <Link prefetch={false} href="#questions">
            Questions
          </Link>
        </div>
        <Button asChild className="lime-button">
          <Link prefetch={false} href="/login">
            Sign in <ArrowUpRight size={15} />
          </Link>
        </Button>
      </nav>
      <section
        className="marketing-hero welcome-hero"
        aria-label="Discover your creative world"
      >
        <img
          key={currentScene.image}
          src={currentScene.image}
          alt={`${currentScene.character}, ${currentScene.name.toLowerCase()} sample artwork`}
          style={{ objectPosition: currentScene.position }}
          fetchPriority="high"
        />
        <div className="welcome-hero-copy">
          <p className="eyebrow">ONE CHARACTER. EVERY POSSIBILITY.</p>
          <h1>
            Your next character.
            <br />
            <em key={scene}>{currentScene.headline}</em>
          </h1>
          <p>
            Find your spark. Shape your story.
            <br />A whole creative world, in one place.
          </p>
          <div className="welcome-hero-actions">
            <Button asChild className="lime-button">
              <Link prefetch={false} href="/studio">
                Start creating <Sparkles size={16} />
              </Link>
            </Button>
            <Link
              prefetch={false}
              href="#playground"
              className="welcome-secondary-link"
            >
              Try the explorer <ArrowDown size={16} />
            </Link>
          </div>
          <fieldset className="welcome-scene-picker">
            <legend>Pick a world to explore</legend>
            <div>
              {heroScenes.map((s, i) => (
                <button
                  key={s.name}
                  onClick={() => setScene(i)}
                  aria-pressed={scene === i}
                >
                  {s.name}
                  {scene === i && <Check size={13} />}
                </button>
              ))}
            </div>
          </fieldset>
          <span className="welcome-art-caption" aria-live="polite">
            {currentScene.character} · Sample artwork
          </span>
        </div>
      </section>
      <section
        id="playground"
        className="welcome-reveal"
        aria-labelledby="explorer-title"
      >
        <div className="marketing-heading welcome-section-heading">
          <div>
            <span className="eyebrow">
              A LITTLE PLAY. A LOT OF POSSIBILITY.
            </span>
            <h2 id="explorer-title">Make the first move.</h2>
            <p>Pick a character. Find a direction. Leave with a prompt.</p>
          </div>
          <button className="welcome-reset" onClick={resetExplorer}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>
        <div
          className="welcome-filters"
          role="group"
          aria-label="Filter character previews"
        >
          {["All", "Realistic", "Illustrated", "Fantasy"].map((f) => (
            <button
              key={f}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div
          className="welcome-character-strip"
          role="group"
          aria-label="Choose a character"
        >
          {visibleCharacters.map((c) => (
            <button
              key={c.id}
              aria-pressed={character.id === c.id}
              onClick={() => {
                setCharacterId(c.id);
                setCopyMessage("");
              }}
            >
              <img
                src={c.image}
                alt=""
                loading="lazy"
                style={{ objectPosition: c.position }}
              />
              <span>{c.name}</span>
              {character.id === c.id && <Check size={14} />}
            </button>
          ))}
        </div>
        <div className="welcome-playground">
          <div className="welcome-preview-stage">
            <div
              className="welcome-preview-frame"
              style={{ aspectRatio: frame }}
            >
              <img
                key={character.id}
                src={character.image}
                alt={`${character.name} sample artwork with ${frame === "4 / 5" ? "portrait" : frame === "1 / 1" ? "square" : "wide"} framing`}
                style={{ objectPosition: character.position }}
              />
              <span>Artwork preview</span>
            </div>
            <fieldset className="welcome-frame-picker">
              <legend>Preview crop</legend>
              <div>
                {[
                  { label: "Portrait", value: "4 / 5" },
                  { label: "Square", value: "1 / 1" },
                  { label: "Wide", value: "16 / 9" },
                ].map((f) => (
                  <button
                    key={f.value}
                    aria-pressed={frame === f.value}
                    onClick={() => setFrame(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="welcome-prompt-panel">
            <div className="welcome-character-heading" aria-live="polite">
              <span className="eyebrow">
                {character.category} · CHARACTER INSPIRATION
              </span>
              <h3>{character.name}</h3>
              <p>{character.description}</p>
            </div>
            <fieldset className="welcome-style-picker">
              <legend>Creative direction</legend>
              <div>
                {inspirationStyles.map((s) => (
                  <button
                    key={s.id}
                    aria-pressed={styleId === s.id}
                    onClick={() => {
                      setStyleId(s.id);
                      setCopyMessage("");
                    }}
                  >
                    {s.name}
                    {styleId === s.id && <Sparkles size={13} />}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="welcome-prompt-label" htmlFor="welcome-prompt">
              Your starting prompt <span>Ready to make your own</span>
            </label>
            <textarea id="welcome-prompt" value={prompt} readOnly rows={5} />
            <div className="welcome-prompt-actions">
              <Button asChild className="lime-button">
                <Link
                  prefetch={false}
                  href={`/studio?inspiration=${encodeURIComponent(preset)}`}
                >
                  Open prompt in Studio <ArrowUpRight size={16} />
                </Link>
              </Button>
              <button
                className="welcome-copy"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(prompt);
                    setCopyMessage("Prompt copied.");
                  } catch {
                    setCopyMessage(
                      "Select the prompt above to copy it manually.",
                    );
                  }
                }}
              >
                <Copy size={15} /> Copy prompt
              </button>
            </div>
            <p className="welcome-copy-status" role="status">
              {copyMessage}
            </p>
            <p className="welcome-preview-note">
              This explorer uses existing artwork, not live generation. Creative
              direction changes the prompt; crop changes only this preview. Your
              prompt carries into the Studio after sign-in. Choose a model and
              review credits there.
            </p>
          </div>
        </div>
        <p className="artwork-note">
          Illustrative character collection. Sample artwork does not grant
          model, commercial, or likeness rights.
        </p>
      </section>
      <section
        id="how-it-works"
        className="welcome-reveal"
        aria-labelledby="workflow-title"
      >
        <div className="marketing-heading">
          <span className="eyebrow">
            FROM THE FIRST SPARK TO THE NEXT CHAPTER
          </span>
          <h2 id="workflow-title">One workspace. So many possibilities.</h2>
          <p>Explore each part of the creative process.</p>
        </div>
        <div className="welcome-workflow">
          <div
            className="welcome-step-list"
            role="group"
            aria-label="Explore the workflow"
          >
            {steps.map((s, i) => (
              <button
                key={s.title}
                aria-pressed={step === i}
                aria-controls="welcome-step-detail"
                onClick={() => setStep(i)}
              >
                <span className="welcome-step-number">0{i + 1}</span>
                <span>
                  <strong>{s.title}</strong>
                  <small>{s.text}</small>
                </span>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
          <article
            id="welcome-step-detail"
            className="welcome-step-detail"
            aria-live="polite"
          >
            <div key={step}>
              <currentStep.icon size={32} />
              <span className="eyebrow">STEP 0{step + 1}</span>
              <h3>{currentStep.detail}</h3>
              <p>{currentStep.description}</p>
              <ul>
                {currentStep.tags.map((tag) => (
                  <li key={tag}>
                    <Check size={14} />
                    {tag}
                  </li>
                ))}
              </ul>
              <Link
                prefetch={false}
                href={currentStep.href}
                className="text-link"
              >
                {currentStep.action}
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </article>
        </div>
      </section>
      <section className="marketing-creator welcome-reveal">
        <span className="eyebrow">SOMETHING ONLY YOU COULD IMAGINE</span>
        <h2>
          Your character.
          <br />
          Your next chapter.
        </h2>
        <p>
          Bring your own references. Our training team turns them into a custom
          LoRA, delivered to your private library.
        </p>
        <Button asChild className="lime-button">
          <Link prefetch={false} href="/train-lora">
            Create your own character <ArrowUpRight size={16} />
          </Link>
        </Button>
      </section>
      <section className="welcome-reveal" aria-labelledby="credits-title">
        <div className="marketing-heading">
          <span className="eyebrow">ROOM TO EXPERIMENT</span>
          <h2 id="credits-title">Find your creative rhythm.</h2>
          <p>
            Explore example credit packages. Opening a package won’t charge you;
            review availability and pricing in your account.
          </p>
        </div>
        <div className="package-grid">
          {packages.map((p) => (
            <div className="package" key={p.id}>
              <h3>{p.name}</h3>
              <strong>${p.price}</strong>
              <p>{p.credits.toLocaleString()} credits</p>
              <Button asChild variant="secondary">
                <Link prefetch={false} href="/billing">
                  Explore {p.name}
                  <ArrowUpRight size={14} />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </section>
      <section id="questions" className="marketing-faq welcome-reveal">
        <div className="marketing-heading">
          <span className="eyebrow">GOOD QUESTIONS. CLEAR ANSWERS.</span>
          <h2>A few things to know.</h2>
        </div>
        <label className="welcome-faq-search">
          <Search size={17} />
          <input
            type="search"
            aria-label="Search questions"
            placeholder="Search questions…"
            value={faqQuery}
            onChange={(e) => setFaqQuery(e.target.value)}
          />
        </label>
        <Accordion type="single" collapsible>
          {filteredFaqs.map((x) => (
            <AccordionItem key={x.q} value={x.q}>
              <AccordionTrigger>{x.q}</AccordionTrigger>
              <AccordionContent>{x.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {filteredFaqs.length === 0 && (
          <div className="welcome-faq-empty" role="status">
            <p>
              No matching questions. Try “credits”, “training”, or “private”.
            </p>
            <button className="text-link" onClick={() => setFaqQuery("")}>
              Show all questions <RotateCcw size={14} />
            </button>
          </div>
        )}
      </section>
      <footer>
        <Link
          prefetch={false}
          href="#top"
          className="brand"
          aria-label="Back to top"
        >
          <ModelDropsBrand />
        </Link>
        <span>A little imagination goes a long way.</span>
        <Link prefetch={false} href="/studio">
          Make something yours <ArrowUpRight size={15} />
        </Link>
      </footer>
    </div>
  );
}
