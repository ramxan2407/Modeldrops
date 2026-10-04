import { MarketingShell } from "@/components/marketing/shell";
import { WorkspaceLanding } from "@/components/marketing/workspace-landing";
import { pageMetadata } from "@/lib/marketing/metadata";
export const metadata = pageMetadata(
  "Your model. Your ideas. All in one place.",
  "Discover original AI character models and create images and videos in a private production studio. Meet ModelDrops Drop 001.",
  "/welcome",
);
export default function Welcome() {
  return (
    <MarketingShell>
      <WorkspaceLanding />
    </MarketingShell>
  );
}
