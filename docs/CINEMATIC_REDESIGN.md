# Cinematic public experience

Implemented on `codex/drop-001-models`. Production deployment, database migrations, payment activation, and paid generation are outside this development update.

## Information architecture

- `/welcome`: hero portrait, casting board, identity/scene story, simulated Studio demonstration, campaign comparison, editorial use cases, marketplace, final CTA.
- `/models`: searchable, filterable Drop 001 catalog.
- `/models/[slug]`: five indexable talent profiles with metadata, prompt inspiration and access-aware Studio links.
- `/explore`: eight creative directions, character selection and a prompt composer.
- `/pricing`: existing credit packs and the separate character-license concept. Prices are planned while payments remain disabled.
- `/resources`: workflow, licenses/privacy, manual LoRA training and launch status.
- `/create`: forwards character context and supported inspiration to the authenticated Studio.
- Existing account, Studio, library, projects, billing and administrator routes remain available.

The conversion path is discover → profile → review access → purchased character in Studio → prompt → generate → library/project → download. Sign-in preserves the target character. Public prompt drafts remain in session storage for one hour, are consumed only for the matching character, and never submit a job automatically.

## Visual and motion system

`app/cinematic.css` scopes the public system: near black `#090909`, warm white `#f5f3ef`, neutral gray and a restrained lime accent; oversized sans-serif headlines with serif emphasis; rectangular editorial surfaces. Existing authenticated components retain their controls and backend contracts, with a canvas-first desktop Studio and a prominent purchased-character selector.

`components/marketing/` contains separate story sections, cards, filters, navigation and prompt access components. `components/motion/use-story-motion.ts` uses scoped GSAP React cleanup and dynamically loads ScrollTrigger. Desktop sequences pin their outer section and animate descendants with transforms and opacity. Scroll progress does not update React state on every frame. Routes and media-query changes revert their timelines.

The same cinematic timelines run on desktop, tablets and phones: hero zoom/crossfade, a pinned horizontal casting board, eight scene transitions, and the typing/progress/result demonstration. Mobile compositions use stable `svh` frames. Sections taller than a short viewport pin at their bottom so their contents can first scroll into view. The prompt reserves its complete text height to prevent typing-induced layout shifts. Width-breakpoint and orientation changes rebuild the timelines; refreshes are coalesced and ordered by document position.

The footer's Reduce motion control and the system reduced-motion preference replace pinned stories with normal document sections, native horizontal cards and interactive scene selectors. Navigation, native selects, range comparisons, visible focus, skip links and labeled controls support keyboard use. No custom scrolling or WebGL dependency is needed.

## Data and generation

The public talent adapter preserves the existing five character IDs and derives cards and filters from catalog data. Server ownership and permissions remain authoritative. The Studio lists only catalog-visible characters in the authenticated account's verified `usableCharacters`; preview claims cannot unlock it. It honors a valid requested character or defaults to the newest ready purchase, shows pending/restricted access explicitly, and retains the selection across image/video modes.

The generation worker uses a server-side provider adapter. Existing endpoint IDs, input schemas, pricing, credit reservation, reconciliation, native-reference enforcement, private storage and refund behavior are preserved. The only connected production provider remains the existing integration; other providers have no configured adapter. No secrets are added to public components.

Public pages use server-rendered content, canonical metadata, OpenGraph, a sitemap, and descriptive structured data for fictional characters. Set `NEXT_PUBLIC_SITE_URL` to the verified canonical domain when changing domains; the current fallback is the existing Vercel production domain.

## Assets and launch dependencies

The existing hero artwork is explicitly labeled concept artwork. It is not presented as a Drop 001 identity or a customer generation. The five new characters keep honest portrait/portfolio placeholders until approved original assets exist. Scene transitions and campaign comparisons demonstrate art direction; they do not claim to show generated results. Populate each talent's gallery with approved same-identity examples before launch. Alternate-pose hover imagery, photographic environment transitions and a final generated-content collage depend on those assets.

The homepage demonstration accurately represents one image per request. No fabricated testimonials, generation counts, popularity, monthly allowances, unlimited generation, unsupported upscale or variations are advertised. Payments remain unavailable. Projects and output actions reuse existing working capabilities rather than introducing placeholder paid actions.

## Verification

- 82 automated tests passed, covering catalog identity, filters, draft handoff, purchased-only selection, reference enforcement, credits/refunds, authorization and provider rejection.
- Next.js production compilation and type checking passed. Targeted ESLint checks passed for the new public routes, marketing/motion components, data helpers and tests.
- Browser checks passed with local isolated data: desktop pinned stories, mobile marketplace/search and navigation, dark mode, profile prompts and sign-in context, Studio selection and image/video switching, and the disabled empty-library state.
- All public routes and five profiles returned successful responses with canonical metadata. Unknown profiles returned 404; `/create` and Studio redirects preserved the selected character.
- No real purchases, paid generation or production data writes were used for this review.
- Mobile motion follow-up: full timelines and no document overflow verified at 320×568, 390×844, 844×390, 768×1024, 1280×720 and 1440×900. At 390×844, verified the hero headline crossfade, casting through Scarlett, later scene crossfades and the completed demo result. Reduced motion removed all four pin spacers; re-enabling restored them.
- Real-device performance, measured Core Web Vitals and a complete assistive-technology audit remain release checks; they are not claimed from local visual testing.
