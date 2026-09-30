"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { ModelDropsBrand } from "@/components/model-drops-brand";
import { ThemeToggle } from "@/components/theme-provider";
import {
  useReducedStoryMotion,
  useSystemReducedStoryMotion,
  toggleStoryMotion,
} from "@/components/motion/motion-preference";
const links = [
  ["Models", "/models"],
  ["Create", "/create"],
  ["Explore", "/explore"],
  ["Pricing", "/pricing"],
  ["Resources", "/resources"],
];
export function MarketingShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedStoryMotion();
  const systemReduced = useSystemReducedStoryMotion();
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    let previous = window.scrollY,
      direction = 0,
      travel = 0,
      frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - previous;
      if (Math.sign(delta) !== direction) travel = 0;
      direction = Math.sign(delta);
      travel += delta;
      if (header.current) {
        header.current.dataset.compact = String(y > 80);
        if (open || y < 500 || travel < -12)
          header.current.dataset.hidden = "false";
        else if (travel > 36) header.current.dataset.hidden = "true";
      }
      previous = y;
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("keydown", key);
      cancelAnimationFrame(frame);
    };
  }, [open]);
  return (
    <div className="md-public" data-reduced-motion={reduced}>
      <a className="md-skip" href="#main-content">
        Skip to content
      </a>
      <header className="md-nav" ref={header}>
        <Link href="/welcome" aria-label="ModelDrops home">
          <ModelDropsBrand />
        </Link>
        <nav className="md-desktop-nav" aria-label="Main navigation">
          {links.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="md-nav-actions">
          <ThemeToggle />
          <Link className="md-login" href="/login">
            Log in
          </Link>
          <Link className="md-button md-button-small" href="/create">
            Start creating <ArrowUpRight size={15} />
          </Link>
          <button
            className="md-menu-button"
            aria-expanded={open}
            aria-controls="md-mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <nav
            id="md-mobile-nav"
            className="md-mobile-nav"
            aria-label="Mobile navigation"
          >
            {links.map(([label, href]) => (
              <Link onClick={() => setOpen(false)} key={href} href={href}>
                {label}
                <ArrowUpRight size={18} />
              </Link>
            ))}
            <Link href="/login">Log in</Link>
          </nav>
        )}
      </header>
      <main id="main-content">{children}</main>
      <footer className="md-footer">
        <div>
          <Link href="/welcome">
            <ModelDropsBrand />
          </Link>
          <p>
            Digital talent.
            <br />A world of possibility.
          </p>
        </div>
        <div>
          <span>Discover</span>
          <Link href="/models">The models</Link>
          <Link href="/explore">Creative directions</Link>
          <Link href="/pricing">Access & credits</Link>
        </div>
        <div>
          <span>Your workspace</span>
          <Link href="/studio">Creator Studio</Link>
          <Link href="/projects">Projects</Link>
          <Link href="/train-lora">Custom LoRA training</Link>
        </div>
        <div>
          <span>Good to know</span>
          <Link href="/resources#how-it-works">How it works</Link>
          <Link href="/resources#licenses">Licenses & privacy</Link>
          <Link href="/resources#launch">Launch status</Link>
        </div>
        <div className="md-footer-bottom">
          <span>© {new Date().getFullYear()} ModelDrops</span>
          <span>Drop 001 · Fictional adult identities · Launch preview</span>
          <button
            className="md-motion-toggle"
            type="button"
            aria-pressed={reduced}
            disabled={systemReduced}
            title={
              systemReduced
                ? "Motion is reduced by your device accessibility settings."
                : "Turn off scroll animations and interface transitions."
            }
            onClick={toggleStoryMotion}
          >
            {systemReduced
              ? "Reduced motion (device)"
              : reduced
                ? "Reduced motion on"
                : "Reduce motion"}
          </button>
          <a href="#main-content">Back to top ↑</a>
        </div>
      </footer>
    </div>
  );
}
