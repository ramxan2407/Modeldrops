import { ExploreDirections } from "@/components/marketing/explore-directions";
import { pageMetadata } from "@/lib/marketing/metadata";
export const metadata = pageMetadata(
  "Explore creative directions",
  "Discover editorial, lifestyle, beauty and campaign prompts for your AI character. Carry your creative direction into ModelDrops Studio.",
  "/explore",
);
export default async function Explore({
  searchParams,
}: {
  searchParams: Promise<{ scene?: string }>;
}) {
  const { scene } = await searchParams;
  return <ExploreDirections initialScene={scene} />;
}
