import { characters } from "../catalog";

/** Public launch copy. Private approved reference assets never enter this payload. */
export const talent = characters.map((character, index) => ({
  ...character,
  slug: character.id,
  number: String(index + 1).padStart(2, "0"),
  gender: "Women",
  styles: [
    ...new Set([
      character.category,
      ...character.tags.filter(
        (t) => !t.includes("AI") && !t.includes("Adult"),
      ),
    ]),
  ],
  accessType: "Launch preview" as const,
  gallery: [] as { src: string; alt: string; scene: string }[],
  featured: index === 0,
  isNew: true,
  popular: false,
}));
export type Talent = (typeof talent)[number];
export const modelFilters = [
  "All",
  "Women",
  "Men",
  "Fashion",
  "Lifestyle",
  "Fitness",
  "Luxury",
  "Beauty",
  "UGC",
  "Editorial",
  "New",
  "Popular",
];
export function filterTalent(items: Talent[], query: string, category: string) {
  const term = query.trim().toLowerCase();
  return items.filter(
    (c) =>
      (!term ||
        [c.name, c.description, ...c.styles]
          .join(" ")
          .toLowerCase()
          .includes(term)) &&
      (category === "All" ||
        category === c.gender ||
        (category === "New" && c.isNew) ||
        (category === "Popular" && c.popular) ||
        c.styles.includes(category)),
  );
}
export const creativeScenes = [
  {
    id: "editorial",
    label: "Studio editorial",
    line: "One identity.",
    setting:
      "A sculptural white studio. Tailored silhouettes. Soft directional light.",
    color: "#bbb8ae",
  },
  {
    id: "hotel",
    label: "Hotel collaboration",
    line: "Any location.",
    setting:
      "Quiet architecture. Linen textures. Late afternoon through tall windows.",
    color: "#9d8268",
  },
  {
    id: "coast",
    label: "Coastal campaign",
    line: "A different light.",
    setting: "An open coastline. Warm sunlight. Effortless summer styling.",
    color: "#809da0",
  },
  {
    id: "cafe",
    label: "Everyday lifestyle",
    line: "Any story.",
    setting: "A neighbourhood café. Natural expressions. An unposed moment.",
    color: "#767452",
  },
  {
    id: "street",
    label: "Streetwear launch",
    line: "Any campaign.",
    setting:
      "Concrete and city lights. Oversized tailoring. A cinematic night scene.",
    color: "#797a87",
  },
  {
    id: "product",
    label: "Product collaboration",
    line: "Your creative direction.",
    setting:
      "A considered product placement. Clean composition. Tactile detail.",
    color: "#a89682",
  },
  {
    id: "social",
    label: "Social stories",
    line: "Made for your audience.",
    setting:
      "A vertical frame. A clear point of view. A story worth stopping for.",
    color: "#a37a6b",
  },
  {
    id: "beauty",
    label: "Beauty campaign",
    line: "A new possibility.",
    setting: "Natural skin texture. Close framing. Refined beauty lighting.",
    color: "#927d83",
  },
];
export const useCases = [
  {
    name: "Creators",
    heading: "A point of view.\nEvery day.",
    text: "Plan a week of social stories around a familiar face.",
    scene: "social",
  },
  {
    name: "Brands",
    heading: "Your world.\nYour talent.",
    text: "Explore a campaign with a consistent digital identity.",
    scene: "product",
  },
  {
    name: "Agencies",
    heading: "Pitch the idea.\nSee the direction.",
    text: "Prototype visual routes before the full production.",
    scene: "editorial",
  },
  {
    name: "E-commerce",
    heading: "Beyond the\nproduct shot.",
    text: "Build lifestyle concepts around your next collection.",
    scene: "coast",
  },
  {
    name: "Social teams",
    heading: "More stories.\nLess setup.",
    text: "Move from a creative brief to content in your private workspace.",
    scene: "cafe",
  },
];
