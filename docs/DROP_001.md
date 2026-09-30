# Drop 001: five fictional adult AI models

This branch prepares a five-model soft launch: Valentina (28), Isla (27), Amara Rose (29), Sora (26), and Scarlett (30). All are original fictional women. The $29 prices are draft launch prices, not an active checkout.

## Current state

The catalog, welcome page, login artwork, model details, and My Models labels use the new collection. The earlier character catalog is no longer advertised. Existing purchase and generation records remain untouched; old IDs are not reassigned to new identities.

The built-in image-generation tool rejected the portrait requests. No new photographic portraits were produced. The files in `public/assets/drops/*.svg` are explicitly labeled temporary covers, not generated model portraits.

Selected model identities now persist in the Studio. The server resolves a selected model to its reviewed reference portrait, checks account ownership and paid access, and supplies that reference to Qwen Image Edit or GPT Image editing. Price quotes include the selected identity. Client-supplied portrait references cannot replace the selected model's identity reference. Free preview claims do not unlock paid character generation. Missing portraits fail before any credits are reserved.

Character-specific video uses Kling 3.0 Standard image-to-video with the same approved portrait as the first frame. Studio requires an unlocked character for both images and video. These workflows use references, not trained LoRAs, and cannot guarantee perfect identity consistency.

## Before a public model launch

1. Supply five original, non-explicit portraits of fictional adult women. In Super Admin → Characters → Edit, upload and approve each JPG/PNG/WebP reference. Approved portraits stay in private storage and replace the placeholder in the authenticated catalog. Public welcome artwork is separate and must be reviewed before launch.
2. Connect real model checkout and verified payment fulfillment. Only a server-verified successful payment may create a payment-mode `character_orders` record and active `character_entitlements` record with the reviewed license snapshot. Existing free `demo-1` records must never count as paid access. Test checkout is available only when explicitly enabled outside production.
3. Confirm final prices and commercial license terms, then test purchase → My Models → quote → reference-based generation.
4. Validate actual image and video outputs with the approved references before making likeness claims. The automated and local UI checks use mocked generation; they do not validate real model quality.

## Attempted portrait direction

Built-in image tool; no successful image output. Intended assets: one vertical head-to-mid-thigh photoreal editorial portrait per identity, fully clothed adult fashion styling, natural skin texture, original identity, no text, logos, nudity, or sexual activity.

- Valentina: olive skin, espresso hair, brown almond eyes; black evening dress, Mediterranean terrace.
- Isla: honey-blonde hair, hazel eyes, freckles; ivory summer dress, coastal villa.
- Amara Rose: rich brown skin, natural dark curls; bronze evening dress, warm penthouse.
- Sora: adult East Asian appearance, straight dark hair; ruby evening dress, city rooftop.
- Scarlett: copper-auburn waves, green eyes, freckles; emerald dress, warmly lit interior.
