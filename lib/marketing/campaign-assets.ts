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

export type CampaignAsset =
  (typeof campaignAssets)[keyof typeof campaignAssets];
export const campaignPoster = (asset: CampaignAsset) =>
  `/assets/campaigns/${asset.slug}.webp`;
