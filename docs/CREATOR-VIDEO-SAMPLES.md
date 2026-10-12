# Creator video samples

The marketing video showcase uses three original AI-generated concepts: an unbranded skincare product demo, a cafe lifestyle vlog, and a fashion outfit reel. The creators are fictional adults. These samples are not customer results, purchasable marketplace characters, or demonstrations of identity consistency for the launch characters.

The user approved up to $2 for this batch. Three GPT Image 2.5 Sunburst stills were reviewed before submitting three silent, five-second Kling 3.0 Standard image-to-video jobs through WaveSpeed. All six jobs completed without retries. Provider billing records confirm a total charge of $1.71: $0.15 per still and $0.42 per video. Prompts, settings, task IDs, charges and final file hashes are recorded in `creator-video-provenance.json`.

## Delivery

- Versioned local files in `public/assets/creators/`; no expiring provider URLs in the website.
- Desktop clips: 720 × 1280, H.264, 24 fps, silent, fast-start MP4, 628–732 KB each.
- Mobile clips: 432 × 768, same format, 186–251 KB each.
- WebP posters extracted from each generated clip's first frame.
- Default showcase opens to video and offers product, lifestyle and fashion sample selectors. Only the selected clip can play; other cards remain static.
- Reduced motion and data-saving preferences retain posters. Offscreen or hidden-page video is unloaded. Every playing clip has an accessible pause control.
- AI disclosures link to `/resources#artwork`; the showcase does not submit generations or spend user credits.

## Verification

Production build and targeted ESLint passed. All three final clips decoded and played at 720 × 1280 in the browser. Mobile selection loaded the 432 × 768 source. Pause behavior, reduced-motion poster fallback, light and dark themes, artwork attribution, and layouts at 320, 390, 768 and 1440 CSS pixels were checked. No horizontal overflow was observed. Contact sheets were reviewed for motion continuity and obvious visual artifacts. The first poster loads eagerly for the landing-page LCP.
