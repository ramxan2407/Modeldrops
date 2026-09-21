import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Model Drops — Your next character. Your next world.",
  description:
    "Discover original characters and explore a unified AI creation studio.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
