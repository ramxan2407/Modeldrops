import React from "react";
import Link from "next/link";
import { createRoot } from "react-dom/client";
import ModelDropsApp from "../../components/model-drops-app";
import { ThemeProvider } from "../../components/theme-provider";
import "../../app/globals.css";
import "../../app/admin.css";
import "../../app/lora.css";
import "../../app/theme.css";
import "../../app/design-system.css";
const path = window.location.pathname.slice(1) || "marketplace";
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <div
      style={{
        padding: "7px 16px",
        background: "#e7dbaa",
        color: "#191919",
        position: "relative",
        zIndex: 100,
        textAlign: "center",
        fontSize: 12,
      }}
    >
      LOCAL QA · SIMULATED GENERATION ·{" "}
      <Link prefetch={false} href="/api/demo-account?id=alice">
        Buyer
      </Link>{" "}
      ·{" "}
      <Link prefetch={false} href="/api/demo-account?id=admin">
        Super admin
      </Link>{" "}
      ·{" "}
      <Link prefetch={false} href="/api/demo-account?id=bob">
        Second buyer
      </Link>
    </div>
    <ModelDropsApp
      initialPage={path as "marketplace"}
      initialCharacter={
        new URLSearchParams(location.search).get("character") || ""
      }
    />
  </ThemeProvider>,
);
