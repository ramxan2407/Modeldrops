import type { MetadataRoute } from "next";
import { talent } from "@/lib/marketing/catalog";
import { siteUrl } from "@/lib/marketing/metadata";
export default function sitemap(): MetadataRoute.Sitemap {
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
