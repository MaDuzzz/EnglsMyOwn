# Christmas season design · v1

Latest image mockups of the existing mobile Today screen:

- today-christmas-light-v2.png
- today-christmas-dark-v2.png

Version 2 adds a sculpted white snowdrift resting along the feet of the EnglsMyOwn logo letters. The letters and candy cane remain readable. The light version uses a faint icy shadow to distinguish the snow from the cream background.

The original version is retained for comparison:

- today-christmas-light.png
- today-christmas-dark.png

These images are the references for the running Christmas UI in `src/components/Christmas.tsx` and `src/styles.css`. Both keep the current task hierarchy, tiger companion, glass navigation, and existing theme colors. The holiday layer adds a small candy cane at the wordmark, a reindeer charm by the greeting, a miniature tree beside the pet, and sparse snow in unused space. The light tree uses cream, pink, and gold; the dark tree uses silver, ice blue, and gold. Text, progress bars, buttons, and the pet's face stay clear.

## Motion direction for implementation

- Snow starts as soon as the seasonal design is enabled; there is no delayed start.
- Around 10–14 tiny flakes may be visible across a phone viewport at once. Each falls independently at a calm pace with mild side-to-side drift and soft opacity. Avoid synchronized loops, fast particle bursts, or a dense snow curtain.
- Keep snow behind readable content and above the plain page backdrop. It must never capture taps or block controls. The pet card can have a few flakes in its empty upper area.
- Animate only position and opacity for smooth, low-cost motion. Pause when the page is hidden. If reduced motion is requested, show a few still flakes or none.
- The candy cane, reindeer, and tree remain stationary. Tiny glints can pulse gently, but all study feedback and task progress retain visual priority.
- Desktop should place the same small charms in its existing header and pet card, with snow mostly in wide gutters. Do not scale up the phone layout.

Seasonal end date is not decided in this design pass. The date and learning numbers in the images are illustrative snapshots. The existing app copy and data stay dynamic when implemented.

The transparent production charms are in `public/assets/christmas/`. The Christmas layer is active now; a future season-end rule can be added after its date is agreed.

The exact image generation prompts are in prompts.md. Generated with the built-in imagegen tool.
