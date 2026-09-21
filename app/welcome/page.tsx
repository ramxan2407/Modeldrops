"use client";
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Users,
  Image as ImageIcon,
  Film,
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
export default function Welcome() {
  return (
    <div className="marketing">
      <nav>
        <a href="/login" className="brand">
          <ModelDropsBrand />
        </a>
        <div>
          <a href="/marketplace">Characters</a>
          <a href="/studio">The studio</a>
          <a href="/creators">For creators</a>
        </div>
        <Button asChild className="lime-button">
          <a href="/login">
            Sign in <ArrowUpRight size={15} />
          </a>
        </Button>
      </nav>
      <section className="marketing-hero">
        <img
          src="/assets/hero.png"
          alt="Nova, an original fictional character"
        />
        <div>
          <p className="eyebrow">ONE CHARACTER. EVERY POSSIBILITY.</p>
          <h1>
            Your next character.
            <br />
            <em>Your next world.</em>
          </h1>
          <p>
            Discover a distinctive cast. Explore a creative studio.
            <br />
            Build the stories you have been imagining.
          </p>
          <div>
            <Button asChild className="lime-button">
              <a href="/studio">
                Start creating <Sparkles size={16} />
              </a>
            </Button>
            <a href="/marketplace" className="text-link">
              Explore characters <ArrowRight size={15} />
            </a>
          </div>
          <span className="demo-pill">
            Interactive product preview · Simulated AI output
          </span>
        </div>
      </section>
      <section>
        <div className="marketing-heading">
          <span className="eyebrow">FROM A FACE TO AN ENTIRE WORLD</span>
          <h2>A simpler way to start something.</h2>
        </div>
        <div className="marketing-steps">
          {[
            {
              icon: Users,
              title: "Discover your character",
              text: "Find a distinctive identity for the story you want to tell.",
            },
            {
              icon: ShieldCheck,
              title: "Make it part of your cast",
              text: "Keep character access and its license together in your library.",
            },
            {
              icon: ImageIcon,
              title: "Create the first frame",
              text: "Choose your model, describe your vision, and see the cost first.",
            },
            {
              icon: Film,
              title: "Bring the story to life",
              text: "Explore video settings, projects, and an organized creative workflow.",
            },
          ].map((s, i) => (
            <article key={s.title}>
              <s.icon size={24} />
              <small>0{i + 1}</small>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <div className="marketing-heading">
          <span className="eyebrow">A CAST FULL OF POSSIBILITIES</span>
          <h2>Meet the beginning of your next story.</h2>
        </div>
        <div className="marketing-cast">
          {characters.slice(0, 4).map((c) => (
            <a href="/marketplace" key={c.id}>
              <img
                src={c.image}
                alt={c.name}
                style={{ objectPosition: c.position }}
              />
              <div>
                <h3>{c.name}</h3>
                <span>
                  {c.category} <ArrowUpRight size={17} />
                </span>
              </div>
            </a>
          ))}
        </div>
        <p className="artwork-note">
          Illustrative demo collection. Stock portraits do not include model or
          likeness rights.
        </p>
      </section>
      <section className="marketing-creator">
        <span className="eyebrow">FOR CREATORS, BY DESIGN</span>
        <h2>
          Your characters deserve
          <br />a world of their own.
        </h2>
        <p>
          Submit original character concepts, track review progress, and explore
          the foundations of a creator marketplace.
        </p>
        <Button asChild className="lime-button">
          <a href="/creators">
            Explore creator studio <ArrowUpRight size={16} />
          </a>
        </Button>
      </section>
      <section>
        <div className="marketing-heading">
          <span className="eyebrow">ROOM TO EXPERIMENT</span>
          <h2>Find your creative rhythm.</h2>
          <p>
            Example credit packages. Checkout and live generation are not
            enabled in this preview.
          </p>
        </div>
        <div className="package-grid">
          {packages.map((p) => (
            <div className="package" key={p.id}>
              <h3>{p.name}</h3>
              <strong>${p.price}</strong>
              <p>{p.credits.toLocaleString()} credits</p>
              <Button asChild variant="secondary">
                <a href="/billing">View credit preview</a>
              </Button>
            </div>
          ))}
        </div>
      </section>
      <section className="marketing-faq">
        <h2>A few things to know.</h2>
        <Accordion type="single" collapsible>
          {[
            {
              q: "Can I use the same character across creations?",
              a: "The product is designed around licensed character access and model compatibility. This working preview demonstrates that workflow with sample artwork; live character-consistent AI generation is not connected yet.",
            },
            {
              q: "Do I need to download or install a character model?",
              a: "No. The platform design keeps private character assets on the server. Customers work with a character name, preview, and creation controls.",
            },
            {
              q: "Are credits or characters being sold in this preview?",
              a: "No. Your opening balance is made of demo credits. No money is charged, and no commercial license or real-person likeness rights are granted.",
            },
            {
              q: "Are my generations public?",
              a: "No. Your demo generations and uploaded references are private. Publishing community content requires a separate explicit opt-in, which is not enabled in this preview.",
            },
            {
              q: "Can I sell my own characters?",
              a: "You can submit a concept for review. Production sales require ownership verification, an approved license, moderation, and Stripe Connect verification before payouts.",
            },
          ].map((x, i) => (
            <AccordionItem key={x.q} value={String(i)}>
              <AccordionTrigger>{x.q}</AccordionTrigger>
              <AccordionContent>{x.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
      <footer>
        <a href="/login" className="brand">
          <ModelDropsBrand />
        </a>
        <span>A little imagination goes a long way.</span>
        <a href="/login">
          My dashboard <ArrowUpRight size={15} />
        </a>
      </footer>
    </div>
  );
}
