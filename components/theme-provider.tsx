"use client";
import { ThemeProvider as NextThemeProvider, useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
const subscribe = () => () => {};
export function ThemeToggle({ floating = false }: { floating?: boolean }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const { resolvedTheme, setTheme } = useTheme();
  const dark = mounted && resolvedTheme === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      className={`theme-toggle${floating ? " theme-toggle-floating" : ""}`}
      aria-label={label}
      title={label}
      aria-pressed={dark}
      disabled={!mounted}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
    </button>
  );
}
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="model-drops-theme"
      disableTransitionOnChange
    >
      {children}
      <ThemeToggle floating />
    </NextThemeProvider>
  );
}
