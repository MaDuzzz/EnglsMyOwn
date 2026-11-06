# Companion appearance and expressions v2

The user approved the soft, near-real baby animal direction for the kitten, puppy, lion cub and tiger cub, replacing the visual direction of the primitive procedural 3D cat.

## Approved scope — 2026-11-07

- Growth art approved: cat v2, dog v2, tiger v2 and lion v1. Preserve the morphological changes in Young adult and Adult, not just increased size.
- Remove user-selected coat colors and markings. Each species has the fixed palette and coat pattern in its approved artwork, carried through every growth stage.
- Keep the companion name and gender. Species selection belongs to the future integration of the four approved companions; it is not added to the current single-cat renderer in this change.
- The current settings form now edits only name and gender. Existing stored color/pattern fields are preserved for compatibility with current Firestore validation and the legacy renderer, with no new color/marking choices or data migration.
- The approved artwork, growth appearances and blink/smile references are not yet integrated into the online renderer. Removing controls does not claim completion of that separate asset/animation work.

## Design artifacts

- approved-concepts.png: appearance reference approved by the user.
- expressions-v1.png: still expression reference, not a running animation or a production sprite atlas.
- expression-prompt.md: prompt used with built-in Imagegen, referencing the approved concepts.
- [Growth design](growth/README.md): five appearance stages for each of the four species, with rendered concept boards.
- [Smooth motion specification](motion-spec-v1.md): transition timing, asset alignment and performance acceptance criteria.

## Motion specification

Preserve the approved silhouette, fur, colors and proportions. Keep the animal and cushion still while changing the face.

- Rest: eyes open, relaxed mouth.
- Blink: close both eyes gently, then open, approximately 180–220 ms total. Choose a natural interval between 4 and 7 seconds; do not blink continuously.
- Tap or keyboard activation: soften the eyes into smiling crescents and lift the mouth corners subtly. Hold the happy expression for approximately 1–1.5 seconds, then return smoothly to rest.
- During the tap response, suspend the idle blink. Additional taps may restart the happy hold but must not accumulate timers or flicker between states.
- Keep activation accessible via a named button and keyboard. Decorative frame changes should not announce repeated text to screen readers.
- Under Reduce Motion, stop automatic blinking and use an immediate happy expression on activation, then return without movement.
- Pause idle timers when the page is hidden or the companion is outside the viewport.

## Implementation boundary

The art files are design references and motion specifications. They do not replace the deployed character or constitute a rigged 3D model. The expression sheet has small rendering variations and is not pixel-aligned production animation frames. Create aligned production assets from the approved reference before integration; verify that switching expressions does not shift the body, cushion or fur outline. The only app UI change accompanying the scope approval is removal of color and marking controls.
