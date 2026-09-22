# Model Drops interface foundations

The shared style layer is `app/design-system.css`, imported after feature styles in the root layout. It covers the workspace, public/auth pages, LoRA workflow, administration, and portalled controls. It is inspired by Apple's Human Interface Guidelines without using proprietary font files or changing Model Drops branding.

- **Typography:** system font stack, 30–44px workspace titles, balanced headings, tighter heading tracking. Apple devices use their native system font; other devices use their own system fallback.
- **Color:** retain the rich-black dark theme and light theme. Lime identifies primary actions and focus. Use `--md-label`, `--md-secondary`, and semantic error/success colors for content.
- **Surfaces:** opaque cards for content; translucent materials only for navigation and floating menus. `--md-surface`, `--md-inset`, `--md-elevated`, and `--md-glass` define hierarchy.
- **Corners:** controls 12px, cards 24px, windows 28px; cards/windows reduce to 20/24px on mobile.
- **Motion:** 160ms control feedback, 280ms floating layers and switches, 350ms small content entrance. Animate opacity/transform/scale, not layout dimensions. Card hover lift only on devices with a fine pointer.
- **Accessibility:** visible keyboard focus, 16px mobile form text to prevent zoom, 44px primary mobile controls, reduced-motion and reduced-transparency fallbacks, increased-contrast borders. Preserve native/Radix keyboard interaction and dialog focus management.

New components should consume these tokens rather than add unrelated colors, radii, or timings. Existing model controls, billing calculations, authentication, generation submission, and storage behavior are unaffected.

References: https://developer.apple.com/design/human-interface-guidelines/materials and https://developer.apple.com/design/human-interface-guidelines/motion
