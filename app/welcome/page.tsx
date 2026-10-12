export const dynamic = "force-dynamic";
import { MarketingShell } from "@/components/marketing/shell";
import { WorkspaceLanding } from "@/components/marketing/workspace-landing";
import { pageMetadata } from "@/lib/marketing/metadata";
export const metadata = pageMetadata(
  "Your character. A world of possibilities.",
  "Discover original AI characters, create reference-based images and videos, and request custom LoRA training in your private Model Drops workspace.",
  "/welcome",
);
export default function Welcome() {
  return (
    <MarketingShell>
      <WorkspaceLanding />
    </MarketingShell>
  );
}
