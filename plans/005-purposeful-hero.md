# 005 — Refine the hero and remove wasteful decorative work

- **Status**: DONE
- **Commit**: 060bc74
- **Severity**: MEDIUM
- **Category**: Performance and explanatory design
- **Estimated scope**: 4 files, focused motion/UI changes

## Problem

The active motion audit found a defect or continuity gap in `app/workspace-marketing.css:277`. Current code:

```tsx
animation: ws-flow-dash 9s linear infinite;
```

## Target

1. Remove the perpetual SVG stroke-dashoffset animation and its keyframe. Render static connector branches with accent opacity controlled by the current workflow stage. Transition only opacity for 200ms ease-out `cubic-bezier(0.23, 1, 0.32, 1)`.
2. Keep persona/scene static rotations. Replace active transform override with individual `translate: 0 -4px`, using 200ms movement curve `cubic-bezier(0.77, 0, 0.175, 1)`. Do not reset rotations when selecting steps.
3. Give hero step buttons clear segmented selection, a 44px minimum target and readable mobile labels. Keep three-step state and existing text, images and disclosure. Store caption rows in the same grid cell and crossfade opacity 160ms; announce the selected sentence once.
4. Add a rare 400ms hero copy/board entrance with maximum 8px translate and 60ms stagger. Gate on `prefers-reduced-motion: no-preference` and the local wrapper preference. Content must remain usable throughout and fully visible if animations are disabled.
5. Remove marketplace heading letter-spacing transition and hover spacing changes; preserve stable -0.055em typography. Reduce frequent portrait hover to scale(1.03), 200ms strong ease-out and mouse-only. Preserve images at normal saturation to avoid repaints on hover.
6. Do not generate assets, spend API balance, modify backend/auth/credits or change catalog data.

## Repo conventions to follow

Existing motion tokens live in `/Users/animeshjaiswal/Projects/Models/app/design-system.css:21`. Shared controls already use `var(--md-fast)` and `var(--md-ease)`. Extend those names. Effective public styles live in `app/workspace-marketing.css`, imported after `app/cinematic.css`. All paths in this plan resolve from `/Users/animeshjaiswal/Projects/Models`.

Exact files:

- `/Users/animeshjaiswal/Projects/Models/components/marketing/workspace-flow.tsx`
- `/Users/animeshjaiswal/Projects/Models/app/workspace-marketing.css`
- `/Users/animeshjaiswal/Projects/Models/app/cinematic.css`
- `/Users/animeshjaiswal/Projects/Models/app/motion.css`

## Steps

Execute the numbered target steps in order. Read Next.js client-component guidance at `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md` before editing TSX. Keep CSS transitions declarative and retargetable.

## Boundaries

- No new dependencies, provider requests, account/catalog mutations, payment changes or deployments.
- Do not change API contracts, reference ownership, credits, Supabase or storage.
- Preserve normal Radix focus and dismiss behavior.
- If referenced code no longer matches commit 060bc74, re-audit the changed area before proceeding.

## Verification

- **Mechanical**: `npm run lint`, `npm run typecheck`, `npm run build:vercel`; expect no errors. Existing native-image lint warnings are unrelated.
- **Feel check**: Hero step changes preserve perspective and clearly connect reference, direction and library. Scroll beyond the hero: no perpetual SVG animations remain. Inspect marketplace names while hovering; spacing stays fixed. Review light/dark desktop and narrow mobile layouts.
- Use the browser's Animations panel at 10% speed to inspect reversals if available; otherwise rapidly alternate states and inspect screenshots/computed transitions. Reduced motion must remove movement and retain gentle feedback.
- **Done when**: browser checks confirm the target behavior at desktop, 390px mobile and 320px narrow mobile, with no new console errors and passing mechanical checks.
