"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { ModelDropsBrand } from "@/components/model-drops-brand";
import { ThemeToggle } from "@/components/theme-provider";
import {
  useReducedStoryMotion,
  useSystemReducedStoryMotion,
  toggleStoryMotion,
} from "@/components/motion/motion-preference";
const links = [
  ["Product", "/welcome#workspace"],
  ["Workflows", "/welcome#workflows"],
  ["Models", "/models"],
  ["Pricing", "/pricing"],
];
export function MarketingShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [menuImmediate, setMenuImmediate] = useState(false);
  const pathname = usePathname();
  const menuButton = useRef<HTMLButtonElement>(null);
  const mobileNav = useRef<HTMLElement>(null);
  const desktopNav = useRef<HTMLElement>(null);
  const reduced = useReducedStoryMotion();
  const systemReduced = useSystemReducedStoryMotion();
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (header.current) {
        const compact = String(y > 24);
        if (header.current.dataset.compact !== compact) {
          header.current.dataset.compact = compact;
        }
      }
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setMenuImmediate(true);
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("keydown", key);
    update();
    return () => {
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("keydown", key);
      cancelAnimationFrame(frame);
    };
  }, [open]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 960px)");
    const closeOnDesktop = () => {
      if (!desktop.matches) return;
      if (mobileNav.current?.contains(document.activeElement)) {
        desktopNav.current?.querySelector("a")?.focus();
      }
      setMenuImmediate(true);
      setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  const closeMenu = (event: MouseEvent<HTMLAnchorElement>) => {
    setMenuImmediate(event.detail === 0);
    setOpen(false);
  };
  const handleAnchor = (event: MouseEvent<HTMLDivElement>) => {
    if (
      !reduced ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor = (event.target as Element).closest<HTMLAnchorElement>(
      "a[href]",
    );
    if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
    const destination = new URL(anchor.href);
    if (
      destination.origin !== location.origin ||
      destination.pathname !== location.pathname ||
      destination.search !== location.search ||
      !destination.hash
    )
      return;
    const target = document.getElementById(
      decodeURIComponent(destination.hash.slice(1)),
    );
    if (!target) return;
    event.preventDefault();
    history.pushState(null, "", destination.hash);
    target.scrollIntoView({ behavior: "instant" });
    if (target.id === "main-content") target.focus({ preventScroll: true });
  };
  return (
    <div
      className="md-public md-workspace-site"
      data-reduced-motion={reduced}
      onClickCapture={handleAnchor}
    >
      <a className="md-skip" href="#main-content">
        Skip to content
      </a>
      <header className="md-nav ws-nav" ref={header} data-menu-open={open}>
        <Link href="/welcome" aria-label="ModelDrops home">
          <ModelDropsBrand />
        </Link>
        <nav
          className="md-desktop-nav"
          aria-label="Main navigation"
          ref={desktopNav}
        >
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                pathname === href || pathname.startsWith(`${href}/`)
                  ? "page"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="md-nav-actions">
          <ThemeToggle />
          <Link className="md-login" href="/login">
            Sign in
          </Link>
          <Link className="md-button md-button-small" href="/create">
            Start creating <ArrowUpRight size={15} />
          </Link>
          <button
            type="button"
            className="md-menu-button"
            ref={menuButton}
            aria-expanded={open}
            aria-controls="md-mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={(event) => {
              setMenuImmediate(event.detail === 0);
              setOpen(!open);
            }}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        <nav
          ref={mobileNav}
          id="md-mobile-nav"
          className="md-mobile-nav"
          aria-label="Mobile navigation"
          data-open={open}
          data-immediate={menuImmediate}
          aria-hidden={!open}
          inert={!open}
        >
          {links.map(([label, href]) => (
            <Link
              onClick={closeMenu}
              key={href}
              href={href}
              aria-current={
                pathname === href || pathname.startsWith(`${href}/`)
                  ? "page"
                  : undefined
              }
            >
              {label}
              <ArrowUpRight size={18} />
            </Link>
          ))}
          <div className="md-mobile-account">
            <Link onClick={closeMenu} href="/login">
              Sign in
            </Link>
            <Link onClick={closeMenu} href="/create" className="md-button">
              Start creating <ArrowUpRight size={16} />
            </Link>
          </div>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="md-footer">
        <div>
          <Link href="/welcome">
            <ModelDropsBrand />
          </Link>
          <p>
            Your model. Your ideas.
            <br />
            All in one place.
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
                : "Reduce movement while keeping gentle visual feedback."
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
