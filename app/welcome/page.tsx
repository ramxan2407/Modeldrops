import { MarketingShell } from "@/components/marketing/shell";
import { HeroStory } from "@/components/marketing/hero-story";
import { DropShowcase } from "@/components/marketing/drop-showcase";
import { PossibilityStory } from "@/components/marketing/possibility-story";
import { GenerationDemo } from "@/components/marketing/generation-demo";
import {
  CampaignComparison,
  UseCaseStories,
} from "@/components/marketing/campaign-stories";
import { ModelMarketplace } from "@/components/marketing/model-marketplace";
import { FinalCTA } from "@/components/marketing/final-cta";
import { pageMetadata } from "@/lib/marketing/metadata";
export const metadata = pageMetadata(
  "Digital talent. Your creative direction.",
  "Discover original AI character models and create images and videos in a private production studio. Meet ModelDrops Drop 001.",
  "/welcome",
);
export default function Welcome() {
  return (
    <MarketingShell>
      <HeroStory />
      <DropShowcase />
      <PossibilityStory />
      <GenerationDemo />
      <CampaignComparison />
      <UseCaseStories />
      <ModelMarketplace compact />
      <FinalCTA />
    </MarketingShell>
  );
}
