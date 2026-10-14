# Workspace responsive UI repair — 2026-10-14

## Fixed

- Studio stacks controls and results through 1200px instead of compressing both beside the sidebar. Its tall preview stops sticking on short screens.
- Marketplace search is available on phones. Sorting and filters remain available across the entire mobile breakpoint, including 601–767px.
- Purchased-character actions and licenses use a single card column on small phones. Marketplace cards use one column below 381px so status badges and favorite controls fit.
- Library heading actions wrap onto their own row. Request IDs wrap inside generation cards.
- Studio and admin/LoRA native fields use readable phone font sizes.
- Switch thumbs use one translation mechanism and maintain contrast in dark mode. Dashboard hover movement no longer combines two translations.
- Admin editors retain side margins and constrain intrinsic grid widths; long select options and buttons no longer force horizontal scrolling. Tester forms have consistent gaps.
- Dataset remove buttons have a contrasting background and a 44px target.
- The isolated QA app loads the production stylesheet cascade; its local-only banner no longer covers dialogs.

## Verification

Browser checks used the isolated local fixture server with simulated generation. A fixture character purchase populated the buyer's library; no production purchases, settings, uploads, or generation jobs were submitted.

- Studio: 320, 390, 768, 1024 and 1440 CSS pixels; no page overflow, expected one/two-column layout, 16px phone prompt text.
- Expanded video controls and shot editor fit at 320px.
- Marketplace: mobile search narrows results; filter toggle and free-only switch work; sort/filter controls remain visible at 640px.
- Dashboard/library: owned-character actions, license dialog and new-creation action fit at 320px.
- Checkout: 16px side margins at 320px.
- Mobile navigation opens and closes after navigation.
- LoRA: sample portrait preview and removal work; removal target measured 44×44px with white icon on dark background.
- Admin: tester form measured 18px gaps/16px input text; character editor measured 286px client and scroll width inside a 288px dialog at 320px. Its footer buttons wrap and remain 44px high.
- Dark checked switch: dark thumb within an off-white track; no double translation.

Automated checks: 106 tests pass; production build passes; ESLint reports zero errors and 22 existing `no-img-element` warnings. Real iOS/Android hardware was not used; mobile Safari input zoom prevention is based on the 16px native-field rule and browser layout checks.
