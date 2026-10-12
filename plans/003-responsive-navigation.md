# 003 — Make mobile menus reversible and breakpoint safe

- **Status**: DONE
- **Commit**: 060bc74
- **Severity**: MEDIUM
- **Category**: Accessibility and interruptibility
- **Estimated scope**: 4 files, focused motion/UI changes

## Problem

The active motion audit found a defect or continuity gap in `components/marketing/shell.tsx:96`. Current code:

```tsx
{open && (
```

## Target

1. Keep public navigation mounted. Set `data-open`, `aria-hidden` and `inert` from the open state. Preserve native links, Escape focus restoration and aria-expanded on the menu button.
2. Public menu transitions opacity 180ms, translateY(-6px) and scale(0.98) 200ms, origin top right and strong ease-out `cubic-bezier(0.23, 1, 0.32, 1)`. Delay closed visibility by 200ms; opening has zero visibility delay. Keyboard toggles/Escape close immediately.
3. Hide the public mobile menu at `min-width: 960px`, and reset open state on that media query's change event. Clean up the listener. If keyboard focus is inside the menu when widening, move it to visible desktop navigation.
4. Add `md-sheet-content` and `data-side` to SheetContent; remove Tailwind slide keyframes and duration classes. Use transform transitions 280ms `cubic-bezier(0.32, 0.72, 0, 1)`, with +/-100% closed translation appropriate to each side.
5. Use `@starting-style` for initial sheet position. Preserve Radix exit presence using different open/closed neutral visibility keyframe names for 280ms. These lifecycle-only keyframes must never animate transform, opacity or layout. Do not forceMount, rewrite Radix state/focus trapping or add timer state.
6. Sheet overlay uses opacity transitions 180ms and matching neutral presence keyframes. Put these CSS rules in app/motion.css imported after workspace-marketing.css; reduced-motion disables the lifecycle animations so closing unmounts immediately.

## Repo conventions to follow

Existing motion tokens live in `/Users/animeshjaiswal/Projects/Models/app/design-system.css:21`. Shared controls already use `var(--md-fast)` and `var(--md-ease)`. Extend those names. Effective public styles live in `app/workspace-marketing.css`, imported after `app/cinematic.css`. All paths in this plan resolve from `/Users/animeshjaiswal/Projects/Models`.

Exact files:

- `/Users/animeshjaiswal/Projects/Models/components/marketing/shell.tsx`
- `/Users/animeshjaiswal/Projects/Models/components/ui/sheet.tsx`
- `/Users/animeshjaiswal/Projects/Models/app/motion.css`
- `/Users/animeshjaiswal/Projects/Models/app/layout.tsx`

## Steps

Execute the numbered target steps in order. Read Next.js client-component guidance at `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md` before editing TSX. Keep CSS transitions declarative and retargetable.

## Boundaries

- No new dependencies, provider requests, account/catalog mutations, payment changes or deployments.
- Do not change API contracts, reference ownership, credits, Supabase or storage.
- Preserve normal Radix focus and dismiss behavior.
- If referenced code no longer matches commit 060bc74, re-audit the changed area before proceeding.

## Verification

- **Mechanical**: `npm run lint`, `npm run typecheck`, `npm run build:vercel`; expect no errors. Existing native-image lint warnings are unrelated.
- **Feel check**: At 390px, open/close mobile menu rapidly; it must retarget rather than jump. Open it then widen to 1024px; no stray overlay. Open local workspace drawer, close while entering, reopen, then Escape. Focus trapping, overlay dismissal and body scrolling must recover normally.
- Use the browser's Animations panel at 10% speed to inspect reversals if available; otherwise rapidly alternate states and inspect screenshots/computed transitions. Reduced motion must remove movement and retain gentle feedback.
- **Done when**: browser checks confirm the target behavior at desktop, 390px mobile and 320px narrow mobile, with no new console errors and passing mechanical checks.
