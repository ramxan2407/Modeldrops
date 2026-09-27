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
  age: number;
  drop: string;
  referenceImage?: string;
  canGenerate?: boolean;
};
// Portraits must be original fictional adults. Set referenceImage only after a
// final portrait has been reviewed and added to public/assets/drops.
export const characters: Character[] = [
  {
    id: "valentina",
    name: "Valentina",
    age: 28,
    creator: "modeldrops",
    category: "Editorial",
    price: 29,
    image: "/assets/drops/valentina.svg",
    color: "#3d302b",
    drop: "DROP 001",
    description:
      "A fictional adult AI model with warm olive skin, espresso hair, and brown almond eyes. Confident Mediterranean glamour for polished fashion editorials and creator campaigns.",
    tags: ["Adult AI model", "Editorial", "Mediterranean"],
    rating: "—",
    uses: "0",
    badge: "COMING SOON",
  },
  {
    id: "isla",
    name: "Isla",
    age: 27,
    creator: "modeldrops",
    category: "Lifestyle",
    price: 29,
    image: "/assets/drops/isla.svg",
    color: "#747365",
    drop: "DROP 001",
    description:
      "A fictional adult AI model with honey-blonde hair, hazel eyes, and natural freckles. Relaxed coastal confidence for sunlit lifestyle shoots and personal-brand content.",
    tags: ["Adult AI model", "Coastal", "Lifestyle"],
    rating: "—",
    uses: "0",
    badge: "COMING SOON",
  },
  {
    id: "amara-rose",
    name: "Amara Rose",
    age: 29,
    creator: "modeldrops",
    category: "Beauty",
    price: 29,
    image: "/assets/drops/amara-rose.svg",
    color: "#674638",
    drop: "DROP 001",
    description:
      "A fictional adult AI model with rich brown skin, voluminous natural curls, and expressive brown eyes. Warm, assured presence for beauty campaigns and contemporary glamour.",
    tags: ["Adult AI model", "Beauty", "Natural curls"],
    rating: "—",
    uses: "0",
    badge: "COMING SOON",
  },
  {
    id: "sora",
    name: "Sora",
    age: 26,
    creator: "modeldrops",
    category: "Editorial",
    price: 29,
    image: "/assets/drops/sora.svg",
    color: "#493c4a",
    drop: "DROP 001",
    description:
      "A fictional adult East Asian AI model with dark straight hair and an elegant, modern look. City-night energy for fashion stories and sophisticated creator campaigns.",
    tags: ["Adult AI model", "City nights", "Fashion"],
    rating: "—",
    uses: "0",
    badge: "COMING SOON",
  },
  {
    id: "scarlett",
    name: "Scarlett",
    age: 30,
    creator: "modeldrops",
    category: "Lifestyle",
    price: 29,
    image: "/assets/drops/scarlett.svg",
    color: "#654537",
    drop: "DROP 001",
    description:
      "A fictional adult AI model with copper-auburn waves, green eyes, and natural freckles. Distinctive, self-assured charm for warm lifestyle imagery and refined editorial stories.",
    tags: ["Adult AI model", "Auburn", "Lifestyle"],
    rating: "—",
    uses: "0",
    badge: "COMING SOON",
  },
];
export const categories = ["All models", "Editorial", "Lifestyle", "Beauty"];
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
  "Demo license v1.0. This preview grants access to the simulated character workflow only. Drop portraits and reference-image workflows require final asset review; no model weights, real-person likeness rights, or commercial rights are sold or transferred. A production purchase requires a reviewed seller license and a confirmed payment.";
