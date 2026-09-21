export type Character = {
  id: string;
  name: string;
  creator: string;
  category: string;
  price: number;
  image: string;
  color: string;
  description: string;
  tags: string[];
  rating: string;
  uses: string;
  badge?: string;
  position?: string;
};
export const characters: Character[] = [
  {
    id: "nova",
    name: "Nova",
    creator: "studio.north",
    category: "Realistic",
    price: 24,
    image: "/assets/hero.png",
    position: "78% center",
    color: "#7d8672",
    description:
      "Quiet confidence. Otherworldly presence. Nova is an original cinematic character with a signature silver bob, designed for editorial stories and speculative worlds.",
    tags: ["Cinematic", "Editorial", "Sci-fi"],
    rating: "4.9",
    uses: "2.4k",
    badge: "FEATURED",
  },
  {
    id: "amara",
    name: "Amara",
    creator: "mila.studio",
    category: "Realistic",
    price: 19,
    image: "/assets/amara.jpg",
    color: "#795834",
    description:
      "Warm, expressive, and effortlessly bold. A contemporary muse for fashion campaigns, lifestyle narratives, and beautiful everyday moments.",
    tags: ["Fashion", "Lifestyle", "Portrait"],
    rating: "4.9",
    uses: "1.8k",
    badge: "TRENDING",
  },
  {
    id: "kael",
    name: "Kael",
    creator: "worldbuilder",
    category: "Fantasy",
    price: 29,
    image: "/assets/kael.jpg",
    color: "#354844",
    description:
      "A wanderer between worlds. Build richly textured adventures around this mysterious, cinematic character.",
    tags: ["Adventure", "Fantasy", "Cinematic"],
    rating: "4.8",
    uses: "960",
  },
  {
    id: "yuki",
    name: "Yuki",
    creator: "pixel.moon",
    category: "Anime",
    price: 15,
    image: "/assets/yuki.jpg",
    color: "#657780",
    description:
      "A new chapter in every frame. An expressive illustrated character for animated stories and imaginative worlds.",
    tags: ["Anime", "Illustration", "Storytelling"],
    rating: "4.9",
    uses: "3.1k",
    badge: "NEW",
  },
  {
    id: "elio",
    name: "Elio",
    creator: "form.foundry",
    category: "3D",
    price: 12,
    image: "/assets/elio.jpg",
    color: "#b0834e",
    description:
      "Small character. Big personality. A playful mascot for memorable brand stories and colorful creative experiments.",
    tags: ["Mascot", "Playful", "Brand"],
    rating: "4.8",
    uses: "740",
  },
  {
    id: "sienna",
    name: "Sienna",
    creator: "atelier.ai",
    category: "Fashion",
    price: 22,
    image: "/assets/sienna.jpg",
    color: "#8e6156",
    description:
      "An editorial point of view. Sienna brings a distinctive look to fashion concepts and art-directed portraits.",
    tags: ["Editorial", "Fashion", "Beauty"],
    rating: "4.9",
    uses: "1.2k",
  },
];
export const categories = [
  "All characters",
  "Realistic",
  "Anime",
  "3D",
  "Fantasy",
  "Fashion",
];
export const models = [
  {
    id: "forma-image",
    name: "Model Drops Image",
    provider: "Demo",
    type: "image",
    credits: 12,
    time: "~15s",
    description: "Explore a simulated image workflow",
    ratios: ["1:1", "16:9", "9:16", "4:5"],
    resolutions: ["1024", "2048"],
    enabled: true,
  },
  {
    id: "forma-cinema",
    name: "Model Drops Cinema",
    provider: "Demo",
    type: "video",
    credits: 36,
    time: "~45s",
    description: "Explore a simulated video workflow",
    ratios: ["16:9", "9:16"],
    resolutions: ["720", "1080"],
    enabled: true,
  },
];
export const packages = [
  { id: "starter", name: "Starter", price: 10, credits: 1000 },
  { id: "creator", name: "Creator", price: 25, credits: 2750 },
  { id: "pro", name: "Pro", price: 50, credits: 6000 },
  { id: "studio", name: "Studio", price: 100, credits: 13000 },
];
export const license =
  "Demo license v1.0. This preview grants access to the simulated character workflow only. Stock preview artwork is illustrative; no model weights, real-person likeness rights, or commercial rights are sold or transferred. A production purchase requires a reviewed seller license and a confirmed payment.";
