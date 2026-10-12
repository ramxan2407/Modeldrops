import type { MetadataRoute } from "next";
import { publicCatalog } from "@/lib/marketing/public-catalog";
export const dynamic = "force-dynamic";
import { siteUrl } from "@/lib/marketing/metadata";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const talent = await publicCatalog();
  return [
    "/welcome",
    "/models",
    "/explore",
    "/pricing",
    "/resources",
    ...talent.map((m) => `/models/${m.slug}`),
  ].map((path) => ({
    url: siteUrl + path,
    changeFrequency: "weekly",
    priority: path === "/welcome" ? 1 : 0.7,
  }));
}
