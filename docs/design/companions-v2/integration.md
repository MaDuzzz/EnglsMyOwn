# Companion artwork integration

Built-in Imagegen produced five source atlases in public/assets/pets: cat-v1.png, dog-v1.png, lion-v1.png, lioness-v1.png and tiger-v1.png. Each atlas has five age columns and three expression rows (rest, blink, happy). These are pre-rendered 2D artwork with a 3D visual style, not real-time 3D models.

The generator's alpha exports were invalid, so the shipped source uses a flat green backing. petArt.ts removes the backing at decode time, suppresses edge spill and registers the slate cushion before caching the expression canvases. Source PNGs remain unmodified. At most three decoded companion atlases are retained; idle artwork has no animation/render loop. Only short CSS opacity transitions animate expressions and appearance changes. Small differences in generated facial/body frames remain a visual limitation; this is not a rigged face morph.

Species is an optional validated Firestore pet field, synced with the existing owner-only personal learning record. Legacy accounts default to cat. Existing color/pattern fields remain stored for backwards compatibility but are ignored by artwork. Lion male uses the mane atlas; female and unspecified use the maneless atlas.

Growth keeps the existing effort calculation and calendar-age ceiling. Appearance thresholds are 0, 500, 1000, 1500 and 2000 growth, with Adult progress held at 100%. Growth preview changes no saved growth, stage, tickets or learning records. Saved settings include name, gender and species only.

The Today page, settings preview, meal-result screen and login artwork use the new renderer. Supports keyboard petting, reduced motion, offscreen/document-hidden pausing, asset retry and asynchronous load cancellation. Runtime source prompts are recorded in runtime-prompts.md.

Local checks: production build and 32 tests passed. Firestore Emulator could not run locally because Java is absent; CI includes Java 21 and executes the dedicated Rules suite before deployment.
