# Creator Studio marketing widget

The landing-page tour now uses three photorealistic fictional adult AI references: Maya, Zoe and Lena. New portraits were created with the built-in image generation tool using the existing fictional video stills as identity references. The exact prompts, optimized asset paths and hashes are in `creator-portrait-prompts.json`. Original PNGs are retained locally in the ignored `work/studio-widget/` directory.

The reference picker stays synchronized across portrait images, video concepts and a six-item sample library. Selecting a library tile opens its corresponding image or video view. The widget remains an illustrative tour: it makes no generation requests and does not add these characters to the marketplace.

## Playback

Desktop mouse/pen hover starts a muted preview. Leaving the card stops playback and restores its poster. Keyboard and touch users have explicit Play/Pause buttons. Group activation stops the previous clip; video sources mount only after playback intent and visibility. Reduced-motion and Save-Data preferences retain still posters. Hidden and offscreen media unload.

Playback rejection restores a retryable Play button. Manual retries call the media element from the click gesture when available, and stale play promises cannot override a newer interaction. Hover-mode controls remain keyboard-focusable before their card enters the viewport.

## Verification

Browser checks covered all three views, reference synchronization, library-to-preview navigation, mouse entry/leave, keyboard start/pause, mobile source selection, reduced-motion fallback and light/dark rendering. Layouts at 320, 390, 768 and 1440 CSS pixels had no horizontal overflow. Mobile profile buttons measure 49 pixels high. Real hardware touch was not emulated; touch pointer handling and 44-pixel play controls were inspected, while explicit mobile playback was exercised with keyboard activation.
