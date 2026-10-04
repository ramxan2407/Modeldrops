# Model Drops product website redesign

The October 2026 redesign uses aio.fm as a reference for compact navigation, a visual creator workflow, restrained dark surfaces and product-led sections. All copy, branding, components and artwork remain Model Drops originals. This is a website design update, not implementation of the feature expansion in the attached product brief.

## Current experience

- `/welcome`: split hero and interactive three-stage workspace illustration; image/video/project showcase; five-character collection; library/project illustration; access and credits; closing CTA.
- Sticky public navigation, keyboard-accessible mobile menu, active route indicators, dark and light palettes, and the existing reduced-motion setting.
- Supporting Models, character profiles, Explore, Pricing and Resources use matching typography, cards and spacing.
- On phones, the hero illustration becomes a vertical workflow, character cards use native horizontal scrolling, and content panels stack.
- Default theme is dark for new visitors; saved theme preferences continue to win.

## Boundaries

CTAs route to existing Studio, character catalog, creative directions, projects, library and pricing. No API, social publishing, editor, subscriptions, BYOK, automation or new backend functionality is introduced. Existing character entitlements, generation, credit accounting and authentication are unchanged. Payments remain disabled.

The hero is an explicitly illustrative workspace using existing concept artwork. Character tiles use monograms until approved portraits exist. Generated campaign environments and the previously created coastline video are reused; no paid generation or third-party site assets were used.

## Implementation

- `workspace-landing.tsx`: server-rendered marketing sections and existing-route links.
- `workspace-flow.tsx`: local-only workflow selection; updates selected cards and explanatory text.
- `workflow-showcase.tsx`: local-only image/video/project previews; no generation requests.
- `workspace-marketing.css`: styles scoped to `.md-workspace-site`, including responsive layouts and reduced motion.
- `CinematicMedia`: retained visibility-aware loading, mobile video source, pause/resume, poster fallback and reduced-motion behavior.

## Verification

Browser checks cover desktop/mobile layouts, workflow controls, video playback and pause, light theme, mobile section navigation, catalog search and existing sign-in/Studio routing. No page-level overflow at widths 320, 390, 430, 768, 1024, 1280 and 1440. Local browser viewport checks do not establish measured Core Web Vitals or performance on physical devices.
