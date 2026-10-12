# 002 — Crossfade workflow previews without restarting

- **Status**: DONE
- **Commit**: 060bc74
- **Severity**: MEDIUM
- **Category**: Interruptibility and continuity
- **Estimated scope**: 2 files, focused motion/UI changes

## Problem

The active motion audit found a defect or continuity gap in `components/marketing/workflow-showcase.tsx:96`. Current code:

```tsx
<div className="ws-workflow-art" key={item.id}>
```

## Target

1. Replace the keyed artwork remount with three persistent media layers keyed by each workflow ID. Each layer gets `data-active`, `aria-hidden` and `inert` when inactive.
2. Keep a static poster in every layer. Mount CinematicMedia only for the selected video layer so inactive videos cannot play or download. Preserve its existing visibility/save-data/reduced-motion gates.
3. Put the three copy panels in the same grid cell to reserve the tallest panel height. Inactive copies must be inert, aria-hidden and non-clickable. Announce only the selected workflow label through one polite status element.
4. Transition layer opacity for 200ms using `var(--md-ease)` (exact value `cubic-bezier(0.23, 1, 0.32, 1)`). Copy uses opacity 160ms and translate 200ms with 6px maximum movement. No timers or keyframe remounts.
5. Keyboard selection uses an immediate state swap. Pointer selection can crossfade, and rapid reversals must retarget CSS transitions. Keep all existing CTA destinations and disclosures.

## Repo conventions to follow

Existing motion tokens live in `/Users/animeshjaiswal/Projects/Models/app/design-system.css:21`. Shared controls already use `var(--md-fast)` and `var(--md-ease)`. Extend those names. Effective public styles live in `app/workspace-marketing.css`, imported after `app/cinematic.css`. All paths in this plan resolve from `/Users/animeshjaiswal/Projects/Models`.

Exact files:

- `/Users/animeshjaiswal/Projects/Models/components/marketing/workflow-showcase.tsx`
- `/Users/animeshjaiswal/Projects/Models/app/workspace-marketing.css`

## Steps

Execute the numbered target steps in order. Read Next.js client-component guidance at `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md` before editing TSX. Keep CSS transitions declarative and retargetable.

## Boundaries

- No new dependencies, provider requests, account/catalog mutations, payment changes or deployments.
- Do not change API contracts, reference ownership, credits, Supabase or storage.
- Preserve normal Radix focus and dismiss behavior.
- If referenced code no longer matches commit 060bc74, re-audit the changed area before proceeding.

## Verification

- **Mechanical**: `npm run lint`, `npm run typecheck`, `npm run build:vercel`; expect no errors. Existing native-image lint warnings are unrelated.
- **Feel check**: Rapidly alternate all three workflow buttons on desktop and a 390px viewport; no blank artwork, stale text or panel height jump. Tab through the result; only the selected CTA and video controls can receive focus.
- Use the browser's Animations panel at 10% speed to inspect reversals if available; otherwise rapidly alternate states and inspect screenshots/computed transitions. Reduced motion must remove movement and retain gentle feedback.
- **Done when**: browser checks confirm the target behavior at desktop, 390px mobile and 320px narrow mobile, with no new console errors and passing mechanical checks.
