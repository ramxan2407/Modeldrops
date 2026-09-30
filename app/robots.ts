import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/marketing/metadata";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/welcome", "/models", "/pricing", "/explore", "/resources"],
      disallow: [
        "/api/",
        "/studio",
        "/dashboard",
        "/admin",
        "/library",
        "/projects",
        "/billing",
        "/settings",
        "/auth/",
      ],
    },
    sitemap: siteUrl + "/sitemap.xml",
  };
}
