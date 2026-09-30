import type { Metadata } from "next";
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://model-drops-ten.vercel.app"
).replace(/\/$/, "");
export function pageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return {
    title: `${title} — ModelDrops`,
    description,
    alternates: { canonical: siteUrl + path },
    openGraph: {
      title,
      description,
      type: "website",
      url: siteUrl + path,
      siteName: "ModelDrops",
      images: [
        {
          url: siteUrl + "/assets/hero.png",
          width: 1536,
          height: 1024,
          alt: "ModelDrops original cinematic concept artwork",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteUrl + "/assets/hero.png"],
    },
  };
}
