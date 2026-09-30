# Website asset batch — completed

Destination: development preview of the cinematic public website. Keep existing character identities and generation permissions intact. These are campaign environments, not character reference portraits or customer generation examples.

## Deliverables

The user approved a $2 spending cap. Generated three 16:9, 2K JPEG campaign backgrounds using GPT Image 2.5 Sunburst, high quality, through WaveSpeed. Reviewed the stills, then generated one matching five-second, silent Kling 3.0 Standard clip each. All six tasks completed successfully; actual billing records confirm $1.71 total ($0.15 per image and $0.42 per video). No retries were submitted. Exact prompts, settings, task IDs, charges and output hashes are recorded in `website-asset-provenance.json`.

The site serves 1920×1080 WebP posters and H.264 video at 1280×720 (desktop) and 768×432 (mobile). Mobile clips are 76–347 KB each. Original provider downloads and the resumable submission ledger remain in the ignored `work/website-assets/` directory; credentials are never included in assets or provenance.

| Asset | Placement | Still direction | Motion direction |
| --- | --- | --- | --- |
| Coastal dusk | Coastal campaign and final CTA | Photorealistic dark volcanic coastline at blue hour, sculptural black rocks, silver sea mist, restrained warm horizon, tactile fine grain, sophisticated editorial photography. Empty negative space on the left for website copy. No people, text, logos or watermark. | Locked composition with an almost imperceptible forward drift. Gentle waves and drifting mist. Consistent exposure, no cuts or sudden movement. |
| Sculptural studio | Studio editorial campaign | Monumental warm-white plaster architectural studio, curved wall and freestanding charcoal plinth, long angled afternoon shadows, warm-white and near-black palette, realistic material texture. Refined fashion campaign set, empty negative space for typography. No people, text, logos or watermark. | Slow lateral camera glide, very subtle shifting light. Preserve architecture and straight edges; no morphing, cuts or abrupt exposure shifts. |
| City after dark | Streetwear campaign | Cinematic wet concrete city plaza after rain, architectural glass, blurred distant traffic light, charcoal and muted olive palette with restrained lime reflections. Ground-level editorial wide composition, dark left third for website copy. No people, readable signs, logos or watermark. | Subtle camera push, gentle reflected light and faint rain in the distance. Preserve architecture, no rapid traffic streaks, cuts or flashes. |

## Delivery checks

- Inspect stills before animating; review clips for flicker, geometry distortion and intrusive motion.
- Store durable outputs locally and record provider task IDs, exact settings, quotes and provenance separately from credentials.
- Create optimized responsive stills and compressed video renditions; do not serve temporary provider output URLs in the site.
- Use muted inline playback only while visible, with a pause control. Show poster images for reduced motion, data-saving preferences and failed playback.
- Keep the current hero and five catalog placeholders until a separate character-asset review. Do not overwrite private approved generation references.
- Preview and verify desktop/mobile performance before publishing the development preview. Production remains unchanged.

## Integration and verification

- The campaign comparison switches among all three real environments with matching motion, labels and briefs. Use-case panels show the generated stills; the final CTA uses the coastline clip. Existing hero artwork and all five character references remain untouched.
- Playback mounts only while visible and the document is active. Reduced motion and data saving use posters. Pause holds the current frame; play resumes. Unsupported media retains the poster. Individual source failures allow the browser to try the next source.
- Reviewed all stills and five sampled frames from each clip. Verified all three clips playing in the local browser, keyboard pause/resume, mobile source selection, pointer pause on the final CTA, no video elements offscreen, and zero videos/pin spacers in reduced-motion mode.
- Verified 390×844 mobile layout, 320×568 document overflow, and desktop layout. Build/typecheck, targeted lint, and eight marketing/selection tests pass. Physical-device performance remains a separate release check.
