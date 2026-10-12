# Motion optimization and interaction redesign

Audit baseline: `060bc74`, Next.js 16.3.8 / React 19 / CSS transitions / Radix. Active routes audited: welcome, models, workspace Studio/library/marketplace/admin and shared overlays. Unused cinematic GSAP sequences excluded. Existing offscreen, save-data and reduced-motion video handling is already sound.

| #   | Severity | Category         | Location                        | Finding                                       | Fix                                            |
| --- | -------- | ---------------- | ------------------------------- | --------------------------------------------- | ---------------------------------------------- |
| 1   | MEDIUM   | Accessibility    | model-drops-app.tsx:614         | Workspace navigation forces smooth scrolling  | Immediate page reset                           |
| 2   | MEDIUM   | Accessibility    | workspace-marketing.css:46,1090 | Touch hover and reduced-motion position jumps | Pointer gates, clear movement, gentle feedback |
| 3   | MEDIUM   | Responsive UX    | shell.tsx:96                    | Mobile menu survives desktop breakpoint       | Persistent inert panel and breakpoint reset    |
| 4   | MEDIUM   | Interruptibility | sheet.tsx:63                    | Drawer restarts keyframes, 500ms entry        | Retargetable 280ms transitions                 |
| 5   | MEDIUM   | Physicality      | select.tsx:65                   | Item-aligned select zoom has no Radix origin  | Fade-only item-aligned branch                  |
| 6   | MEDIUM   | Performance      | cinematic.css:904               | Hover animates character-name spacing         | Stable typography                              |
| 7   | MEDIUM   | Performance      | workspace-marketing.css:277     | Perpetual SVG dash paint animation            | State-driven connector opacity                 |
| 8   | MEDIUM   | Frequency        | sidebar.tsx:221,232             | Keyboard toggle animates layout               | Immediate desktop toggle                       |
| 9   | LOW      | Cohesion         | design-system.css:302           | Press/release share timing                    | 160ms press, 100ms response                    |

Additive opportunities: crossfade large workflow previews without remounts; connect the public mobile panel to its trigger; make hero step selection legible on phones. These preserve the current near-black/lime composition, assets and product copy.

| Plan                                 | Title                 | Severity | Status |
| ------------------------------------ | --------------------- | -------- | ------ |
| [001](001-shared-motion-controls.md) | Shared controls       | MEDIUM   | DONE   |
| [002](002-workflow-continuity.md)    | Workflow continuity   | MEDIUM   | DONE   |
| [003](003-responsive-navigation.md)  | Responsive navigation | MEDIUM   | DONE   |
| [004](004-accessible-motion.md)      | Accessible motion     | MEDIUM   | DONE   |
| [005](005-purposeful-hero.md)        | Purposeful hero       | MEDIUM   | DONE   |

Execution order: 001, 004, 002, 003, 005. Plans 002/003/005 use the tokens from 001 and final motion-preference overrides from 004. User requested optimization and redesign, so this pass implements the focused plans rather than stopping at advice. No production or provider changes are part of this pass.

## Verification

Completed locally, with no deployment, account mutation or paid generation:

- `npm run typecheck`: pass.
- `npm run lint`: 0 errors; 23 pre-existing native-image warnings.
- `npm run build:vercel`: optimized build passes, all 26 static pages generated.
- Bundled Node 24.19.0: `node --import tsx --test tests/*.test.ts`, 89 tests pass, 0 fail. Installed Node 23.11.0 hung in the existing Vercel migration test; both the isolated diagnostic copy and the full suite under Node 24 finish successfully. No backend code was changed for this pass.
- Browser viewport checks: 320px, 390px, 1024px, 1280px. No horizontal overflow at the two mobile widths. Hero controls retain 44px tap height.
- Workflow panel stays 417px on desktop through rapid image/video/collection switches. Three stable media layers; only active content is exposed and inactive copies have inert/aria-hidden attributes. Inactive videos unmount.
- Mobile public menu resets on widening beyond 960px; Escape restores its trigger focus. Closed menu is inert and hidden.
- Local workspace drawer uses a 280ms CSS transform transition with the specified curve. Interrupted close measured x=-98.578px; immediate reopen continued at x=-44.0495px rather than restarting at the -288px boundary. Final dismissal removes the drawer and restores body pointer events.
- Video model select has a 180ms fade and no item-aligned zoom. Desktop sidebar shortcut has a computed transition duration of 0s.
- Local reduced-motion toggle removes active-node translation and video playback while retaining 125ms feedback. Same-page links jump immediately; Back to top focuses main content.
- Light/dark screenshots reviewed. Final screenshot artifacts are in ignored `work/motion-audit/`.
