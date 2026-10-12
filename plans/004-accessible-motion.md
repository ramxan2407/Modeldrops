# 004 — Respect motion preferences and touch input

- **Status**: DONE
- **Commit**: 060bc74
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 5 files, focused motion/UI changes

## Problem

The active motion audit found a defect or continuity gap in `components/model-drops-app.tsx:614`. Current code:

```tsx
window.scrollTo({ top: 0, behavior: "smooth" });
```

## Target

1. Workspace page navigation resets scroll immediately with `behavior: "instant"`; high-frequency navigation has no reason to animate. Preserve route/history/account logic.
2. Restrict decorative button/card/image/arrow hover movement to `(hover: hover) and (pointer: fine)`; add final coarse-pointer overrides for legacy workspace selectors. Keep color and border feedback available for touch.
3. Final app/motion.css overrides legacy reduced-motion blanket rules for ordinary controls and workflow opacity: allow only color, border/background and opacity transitions for 125ms ease. Never override modal positioning transforms globally.
4. Under both device reduced motion and `.md-workspace-site[data-reduced-motion="true"]`, clear decorative node translate, copy translate, tile lift, arrow movement, portrait zoom, theme-icon rotation, press scale and card lift. Static node rotations remain static.
5. Make preference snapshot available to anchor click handling. When reduced motion is active, prevent same-page anchor smooth scroll and use scrollIntoView with `behavior: "instant"`; do not change ordinary link navigation.
6. Preserve existing video poster fallback and local motion toggle; update the toggle help to explain gentler motion, rather than promising all feedback is disabled.

## Repo conventions to follow

Existing motion tokens live in `/Users/animeshjaiswal/Projects/Models/app/design-system.css:21`. Shared controls already use `var(--md-fast)` and `var(--md-ease)`. Extend those names. Effective public styles live in `app/workspace-marketing.css`, imported after `app/cinematic.css`. All paths in this plan resolve from `/Users/animeshjaiswal/Projects/Models`.

Exact files:

- `/Users/animeshjaiswal/Projects/Models/components/model-drops-app.tsx`
- `/Users/animeshjaiswal/Projects/Models/components/motion/motion-preference.ts`
- `/Users/animeshjaiswal/Projects/Models/app/motion.css`
- `/Users/animeshjaiswal/Projects/Models/app/workspace-marketing.css`
- `/Users/animeshjaiswal/Projects/Models/app/globals.css`

## Steps

Execute the numbered target steps in order. Read Next.js client-component guidance at `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md` before editing TSX. Keep CSS transitions declarative and retargetable.

## Boundaries

- No new dependencies, provider requests, account/catalog mutations, payment changes or deployments.
- Do not change API contracts, reference ownership, credits, Supabase or storage.
- Preserve normal Radix focus and dismiss behavior.
- If referenced code no longer matches commit 060bc74, re-audit the changed area before proceeding.

## Verification

- **Mechanical**: `npm run lint`, `npm run typecheck`, `npm run build:vercel`; expect no errors. Existing native-image lint warnings are unrelated.
- **Feel check**: Enable the footer Reduce motion button; switch hero steps and workflows and confirm no spatial jumps, but color/opacity still communicate state. Use keyboard links and verify focus remains visible. At 320px and 390px confirm no horizontal overflow or clipped 44px targets.
- Use the browser's Animations panel at 10% speed to inspect reversals if available; otherwise rapidly alternate states and inspect screenshots/computed transitions. Reduced motion must remove movement and retain gentle feedback.
- **Done when**: browser checks confirm the target behavior at desktop, 390px mobile and 320px narrow mobile, with no new console errors and passing mechanical checks.
