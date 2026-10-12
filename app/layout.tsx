import type { Metadata } from "next";
import "./globals.css";
import "./admin.css";
import "./theme.css";
import "./design-system.css";
import "./welcome.css";
import "./cinematic.css";
import "./workspace-marketing.css";
import "./motion.css";
import "./minimal-public.css";
import "./minimal-supporting.css";
import "./minimal-workspace.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Model Drops — Your signature AI model.",
  description:
    "Discover Drop 001: five fictional adult AI models for your creator brand. Explore model drops and a private content creation studio.",
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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
