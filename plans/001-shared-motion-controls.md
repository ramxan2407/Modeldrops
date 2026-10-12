# 001 — Unify shared control motion

- **Status**: DONE
- **Commit**: 060bc74
- **Severity**: MEDIUM
- **Category**: Easing, origin and frequency
- **Estimated scope**: 3 files, focused motion/UI changes

## Problem

The active motion audit found a defect or continuity gap in `app/design-system.css:21`. Current code:

```tsx
--md-ease: cubic-bezier(0.22, 1, 0.36, 1);
```

## Target

1. Change the existing `--md-ease` to `cubic-bezier(0.23, 1, 0.32, 1)`. Add `--md-ease-move: cubic-bezier(0.77, 0, 0.175, 1)`, `--md-ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`, and `--md-response: 100ms` in the same root token block. Preserve 160ms and 280ms tokens.
2. Use `scale: 0.97` for ordinary button presses. Keep 160ms pressing and use 100ms release for scale only. Preserve all existing color/focus feedback.
3. In SelectContent, retain the item-aligned default and Radix positioning. Remove zoom/origin classes from the item-aligned branch; use Radix origin and 0.95 zoom only when `position === "popper"`. Keep the effective 180ms fade.
4. Remove desktop sidebar width/left/right transitions; its Ctrl/Cmd+B keyboard shortcut must be immediate. Leave layout widths, placement and cookie state intact.
5. Remove repeated workspace page entrance animation; retain the 350ms login entrance because sign-in is occasional.

## Repo conventions to follow

Existing motion tokens live in `/Users/animeshjaiswal/Projects/Models/app/design-system.css:21`. Shared controls already use `var(--md-fast)` and `var(--md-ease)`. Extend those names. Effective public styles live in `app/workspace-marketing.css`, imported after `app/cinematic.css`. All paths in this plan resolve from `/Users/animeshjaiswal/Projects/Models`.

Exact files:

- `/Users/animeshjaiswal/Projects/Models/app/design-system.css`
- `/Users/animeshjaiswal/Projects/Models/components/ui/select.tsx`
- `/Users/animeshjaiswal/Projects/Models/components/ui/sidebar.tsx`

## Steps

Execute the numbered target steps in order. Read Next.js client-component guidance at `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md` before editing TSX. Keep CSS transitions declarative and retargetable.

## Boundaries

- No new dependencies, provider requests, account/catalog mutations, payment changes or deployments.
- Do not change API contracts, reference ownership, credits, Supabase or storage.
- Preserve normal Radix focus and dismiss behavior.
- If referenced code no longer matches commit 060bc74, re-audit the changed area before proceeding.

## Verification

- **Mechanical**: `npm run lint`, `npm run typecheck`, `npm run build:vercel`; expect no errors. Existing native-image lint warnings are unrelated.
- **Feel check**: Open Studio model and aspect-ratio selects; item-aligned menus should fade without zooming from their center. Press/release a button rapidly. Toggle desktop sidebar with Ctrl/Cmd+B; content must become usable immediately.
- Use the browser's Animations panel at 10% speed to inspect reversals if available; otherwise rapidly alternate states and inspect screenshots/computed transitions. Reduced motion must remove movement and retain gentle feedback.
- **Done when**: browser checks confirm the target behavior at desktop, 390px mobile and 320px narrow mobile, with no new console errors and passing mechanical checks.
