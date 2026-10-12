export const campaignAssets = {
  coast: {
    slug: "coastal-dusk",
    label: "Coastal dusk",
    alt: "Silver waves and sea mist along a dark volcanic coastline at dusk",
  },
  editorial: {
    slug: "sculptural-studio",
    label: "Sculptural studio",
    alt: "Warm plaster studio with a curved wall, charcoal plinth and long afternoon shadows",
  },
  street: {
    slug: "city-after-dark",
    label: "City after dark",
    alt: "Glass architecture and muted green reflections on a rain-wet city plaza",
  },
} as const;

export type CampaignAsset = {
  slug: string;
  label: string;
  alt: string;
  poster?: string;
  video?: string;
  mobileVideo?: string;
};
export const campaignPoster = (asset: CampaignAsset) =>
  asset.poster ?? `/assets/campaigns/${asset.slug}.webp`;

/** Original AI creator concepts. These fictional adults are not marketplace characters or customers. */
export const creatorVideoAssets = [
  {
    slug: "ugc-product",
    label: "The product story",
    category: "UGC product demo",
    alt: "A fictional AI creator presents an unbranded skincare bottle in a sunlit home",
    prompt:
      "A relaxed product walkthrough. Natural gestures, a clear focal point, and a personal tone.",
    credit: "AI-generated for Model Drops",
    creditUrl: "/resources#artwork",
    poster: "/assets/creators/ugc-product-v1.webp",
    video: "/assets/creators/ugc-product-v1.mp4",
    mobileVideo: "/assets/creators/ugc-product-v1-mobile.mp4",
  },
  {
    slug: "lifestyle-vlog",
    label: "A day in the life",
    category: "Lifestyle vlog",
    alt: "A fictional AI lifestyle creator shares a coffee moment at a sidewalk cafe",
    prompt:
      "A coffee stop in the city. A warm smile, a candid perspective, and a story that feels personal.",
    credit: "AI-generated for Model Drops",
    creditUrl: "/resources#artwork",
    poster: "/assets/creators/lifestyle-vlog-v1.webp",
    video: "/assets/creators/lifestyle-vlog-v1.mp4",
    mobileVideo: "/assets/creators/lifestyle-vlog-v1-mobile.mp4",
  },
  {
    slug: "fashion-reel",
    label: "The outfit edit",
    category: "Fashion creator",
    alt: "A fictional AI fashion creator presents a cream blazer and tailored trousers",
    prompt:
      "An outfit reveal with movement and texture. A simple setting lets the look tell the story.",
    credit: "AI-generated for Model Drops",
    creditUrl: "/resources#artwork",
    poster: "/assets/creators/fashion-reel-v1.webp",
    video: "/assets/creators/fashion-reel-v1.mp4",
    mobileVideo: "/assets/creators/fashion-reel-v1-mobile.mp4",
  },
] as const;

/** Photorealistic fictional demo references, separate from the marketplace catalog. */
export const creatorProfiles = [
  {
    id: "maya",
    name: "Maya",
    role: "Beauty & UGC",
    portrait: "/assets/creator-portraits/maya-v1.webp",
    alt: "Photorealistic AI portrait of Maya with dark wavy hair and an ivory cotton top",
    description: "Warm, natural, camera-ready.",
    imagePrompt:
      "Soft window light. Natural skin texture. An ivory cotton top and a warm, quiet backdrop.",
    videoIndex: 0,
  },
  {
    id: "zoe",
    name: "Zoe",
    role: "Everyday & lifestyle",
    portrait: "/assets/creator-portraits/zoe-v1.webp",
    alt: "Photorealistic AI portrait of Zoe with short natural curls and a sage shirt in a sunlit cafe",
    description: "Everyday moments, full of personality.",
    imagePrompt:
      "Morning light at a neighborhood cafe. A sage linen shirt, soft greenery, and an easy smile.",
    videoIndex: 1,
  },
  {
    id: "lena",
    name: "Lena",
    role: "Fashion & editorial",
    portrait: "/assets/creator-portraits/lena-v1.webp",
    alt: "Photorealistic AI portrait of Lena with a dark bob and cream blazer against a warm studio backdrop",
    description: "Considered style. Effortless presence.",
    imagePrompt:
      "An understated editorial portrait. A cream blazer, soft side light, and a warm plaster backdrop.",
    videoIndex: 2,
  },
] as const;
