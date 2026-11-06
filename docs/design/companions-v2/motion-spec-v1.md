# Smooth companion and interface motion — design v1

Updated 2026-11-07. Design targets only; actual frame pacing must be measured on iPhone 12 Pro Max and iPhone 17 Pro Max, including Home Screen web-app mode. These notes do not claim the generated concept sheets are animated assets or that this quality has been implemented.

## Stable art and layout

- Preserve the approved near-real character art. Use aligned rendered layers or an appropriately detailed rig; primitive geometry is not an acceptable substitute for the approved appearance.
- Each appearance stage needs rest, blink and happy facial states. Facial motion needs intermediate eyelid/cheek poses, not abrupt switches between three reference pictures. Keep the body, cushion, whisker roots and fur outline registered to the same coordinates.
- Provide a fixed character canvas, contact-point anchor, consistent camera and pixel density. Reserve enough space for the adult silhouette and lion mane. Loading an image or changing expression must not move page content.
- Production assets should have a clean transparent background, with a separate fixed cushion/contact shadow where appropriate, so the same animal works on light and dark surfaces. The cream-background boards are references only.
- Load and decode the next required expression/stage before use. Keep the current appearance visible if the replacement is not ready; never flash an empty canvas or placeholder during a response.

## Blink and tap

| Interaction | Proposed timing | Behavior |
| --- | --- | --- |
| Idle blink | Random interval 4–7 s, about 180–220 ms total | Open → partial closure → closed → partial opening → open. Keep closed interval short. |
| Tap response entry | About 160–220 ms | Eyes become happy crescents, cheeks lift subtly and closed mouth corners rise. Match the expression reference. |
| Happy hold | 1–1.5 s | Hold expression without a continuous bouncing body. |
| Return to rest | About 200–280 ms | Restore eyes, cheeks and muzzle smoothly. |

Use gentle easing with continuous velocity at endpoints; an initial tuning option is cubic-bezier(0.22, 1, 0.36, 1) for tap entry/exit. Blink closure/opening requires its own shorter curves to avoid sluggish eyelids. Do not use a spring that overshoots the face or scales the eyeballs.

During a happy response, suspend idle blinks. Another tap extends/restarts one happy hold rather than stacking animation timers. At the newborn stage, do not force an awake expression onto a sleeping baby: give a subtle sleepy eyelid/cheek smile while retaining the tiny low resting pose.

## Growth-stage reveal

- Use a proposed 1–1.4 s restrained reveal when a real new milestone is reached. Keep the cushion and ground contact fixed. Avoid oversized scale springs, rapid zooming or full-screen celebration.
- For a rigged character, interpolate supported shape proportions without snapping. For rendered artwork, stage a gentle light/soft dissolve between registered assets; if overlapping silhouettes produce double heads or ghost paws, fade the old silhouette out before revealing the new one. Do not pretend an arbitrary image crossfade is a geometric morph.
- A small progress-bar change may animate over 400–700 ms with ease-out; synchronize any stage reveal with the committed growth result. Never show an earned milestone before a successful save.
- Do not replay the stage reveal on every render, tab switch or reload. On later visits show the current appearance directly. Reopening a result must not add growth again.
- The calendar/effort rules remain a separate product decision. Stage appearance must not be based solely on cumulative study in one sitting.

## Theme and navigation

- Theme target: roughly 400–500 ms color/snapshot transition. The companion keeps its name, species, appearance, expression and position throughout; no model recreation or random new pose on theme changes. Adapt only scene light/background if the chosen asset pipeline supports it.
- Tab target: roughly 250–320 ms restrained opacity and 8–12 px directional content movement. Navigation capsule may use about 380–420 ms easing. Keep the bar fixed above the safe area and preserve accurate active selection during rapid taps.
- Avoid overlapping queued transitions. A new navigation request should resolve to the latest destination, with no stale outgoing screen left interactive. Reset transform after completion so fixed-position overlays retain correct placement.
- Prefer transform/opacity changes. Avoid animating layout sizes, expensive full-screen blur or broad per-frame filters on mobile.

## Accessibility and runtime criteria

- Respect prefers-reduced-motion. Disable automatic blinks and continuous decoration, use immediate facial feedback on explicit activation, and replace large reveal/navigation movement with a brief unobtrusive fade or direct state change.
- Use a labeled button for petting, including keyboard activation. No repeated live-region announcement for every blink. Keep the touch target at least 44 × 44 pt.
- Pause idle work when the page is hidden or the pet is offscreen. Clean up timers, observers and render loops on unmount. Resume with a fresh blink interval; do not catch up missed animations in a burst.
- Aim for stable frame pacing on the actual target phones. Prefer simpler rendering and lower pixel density over dense fur shaders or pursuing the highest possible nominal FPS. Avoid per-frame React state updates.
- Verify cold loading, consecutive theme toggles, rapid tab changes, repeated taps, returning from background, Reduce Motion and stage reveal. Confirm zero layout shift attributable to pet assets and no body/cushion jitter across facial frames.

## Delivery boundary

Concept boards and timing notes are complete for this design iteration. Aligned production expression frames/layers, a female lion adult variant, a device-tested animation prototype and binding appearance stages to an approved growth formula remain implementation work. The existing online app is unchanged by these documents.
