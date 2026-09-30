import { ModelMarketplace } from "@/components/marketing/model-marketplace";
import { pageMetadata } from "@/lib/marketing/metadata";
export const metadata = pageMetadata(
  "Meet the models",
  "Discover the five fictional adult AI identities in ModelDrops Drop 001. Compare styles, creative directions and character access.",
  "/models",
);
export default function Models() {
  return <ModelMarketplace />;
}
