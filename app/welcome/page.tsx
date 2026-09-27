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

const heroScenes = characters.map((c) => ({
  name: c.name,
  image: c.image,
  character: c.name,
  position: "center",
  headline: "Your signature model.",
}));
const steps = [
  {
    icon: Users,
    title: "Choose your model",
    text: "Meet the five women in Drop 001 and choose the identity for your creator brand.",
    detail: "Five models. Five identities.",
    description:
      "Compare each model’s look and creative direction. Save your favorites while the first collection is being prepared.",
    action: "Explore the drop",
    href: "#playground",
    tags: ["Character previews", "Creative directions", "Prompt inspiration"],
  },
  {
    icon: ImageIcon,
    title: "Unlock your model",
    text: "At launch, buy model access once, then use generation credits to create.",
    detail: "Your model. Your workspace.",
    description:
      "Checkout is not connected yet. Preview access can be added to your account without payment; it does not unlock unfinished portraits or commercial rights.",
    action: "Try the prompt explorer",
    href: "#playground",
    tags: ["Reference editing", "Model controls", "Upfront credit cost"],
  },
  {
    icon: Film,
    title: "Create with her",
    text: "Use her reference portrait, write a scene, and review your credit quote.",
    detail: "Think beyond the frame",
    description:
      "Unlocked models use their approved portrait for image editing and as the starting frame for video. Results depend on the generation model. Generation requires character access and credits.",
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
    a: "No. Drop 001 currently uses clearly marked placeholder covers. Final adult AI model portraits must be added before character generation can launch.",
  },
  {
    q: "Can I use the same character across creations?",
    a: "An unlocked model’s approved portrait is attached to image editing requests. This guides facial identity but does not guarantee perfect consistency or activate a trained LoRA. Portraits for the first drop are still being prepared.",
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
  const [characterId, setCharacterId] = useState(characters[0].id);
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
    (c) => filter === "All" || c.category === filter,
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
    setCharacterId(characters[0].id);
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
          <p className="eyebrow">DROP 001 · FIVE FICTIONAL ADULT MODELS</p>
          <h1>
            A model worth following.
            <br />
            <em key={scene}>{currentScene.headline}</em>
          </h1>
          <p>
            Five distinct identities. Your own creative direction.
            <br />
            Small drops. A model-first creator studio.
          </p>
          <div className="welcome-hero-actions">
            <Button asChild className="lime-button">
              <Link prefetch={false} href="/marketplace">
                Explore Drop 001 <Sparkles size={16} />
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
            <legend>Meet the first five</legend>
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
            {currentScene.character} · Portrait coming soon
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
            <span className="eyebrow">THE FIRST DROP</span>
            <h2 id="explorer-title">Meet your next model.</h2>
            <p>
              Explore five fictional women, all aged 26+. Choose a model, then
              build your visual identity.
            </p>
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
          {["All", "Editorial", "Lifestyle", "Beauty"].map((f) => (
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
                {character.category} · FICTIONAL ADULT AI MODEL
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
                  href={`/studio?character=${character.id}&inspiration=${encodeURIComponent(preset)}`}
                >
                  Preview model in Studio <ArrowUpRight size={16} />
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
              Drop 001 is in preparation. These covers are placeholders, not
              finished model portraits. Preview the creative direction now;
              character generation opens after the reference portraits are
              ready.
            </p>
          </div>
        </div>
        <p className="artwork-note">
          Every model is a fictional adult AI identity. Launch prices are
          previews; purchases and commercial licenses are not available yet.
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
