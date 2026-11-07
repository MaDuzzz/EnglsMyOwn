# Learning rules — current decisions

Updated: 2026-11-07. Source: approved word-session design and batch-learning changes.
This supersedes the yesterday-only unlock rule in Words v2 and any conflicting older mockup. The batch flow is implemented in the app.

## Assignment and unlock

- Each new/review batch contains 10 words, with four required tasks per word: listening, one sentence task, English-to-Vietnamese meaning, Vietnamese-to-English recall. Total: 40 unique tasks.
- A new batch selects from the unlearned published pool by vocabulary type (collocation, phrase, or a word's part of speech). It alternates available types and varies the items within each type using a stable day-based ordering. The selection is independent of Firestore import order. If only one type remains, fill the batch from it. The selected ten IDs stay fixed in the saved session.
- ALL mandatory review must be complete before new learning: yesterday, the selected earlier day, and outstanding review. Finishing yesterday alone is insufficient.
- Apply the gate at every entry point: Words, Today, topic details, direct links and session creation. Recheck eligibility on entry.
- Review includes all assigned batches, not just the first ten words. An empty required-review set permits new learning; an empty yesterday set does not bypass other pending review.
- Browsing, word details and optional videos remain available. Videos do not replace required review.
- This flow consumes the assigned review list; it does not establish a new earlier-day selection algorithm.
- Words Learn presents a single daily review word total and aggregate progress, without splitting the display by yesterday, earlier-day or outstanding sources. Source tracking remains internal; this presentation does not change the all-review unlock gate.
- Learning-day boundary: 00:00 Asia/Ho_Chi_Minh, consistently across devices.

## Review flow

Finish the current round, including retries, before entering the next.

| Round | Tasks                                  | Completion range |
| ----- | -------------------------------------- | ---------------- |
| 1     | 10 listen → type English               | 0–10 / 40        |
| 2     | 5 gap fills + 5 sentence arrangements  | 10–20 / 40       |
| 3     | 10 English → choose Vietnamese meaning | 20–30 / 40       |
| 4     | 10 Vietnamese → type English           | 30–40 / 40       |

Each word receives exactly one sentence subtype. Incorrect tasks return after 2–3 OTHER questions in the same round, retaining their original task identity.
If too few other questions remain, show a knowledge refresher, then retry unfinished tasks. A refresher earns no progress; do not invent extra scored tasks.

## New-word flow

Introduce all ten words first, then start the 40 practice tasks. Practice presents the four exercise styles for each word before moving through the remaining words. Wrong tasks may return after 2–3 intervening questions. Resolve all remaining tasks with a refresher where needed.

Introduction includes part of speech, level, US/UK pronunciation, EN/VI meanings, common pattern and bilingual example. Viewing it earns no progress.
Play an available verified recording when a word introduction opens and when a listening question opens. Start and advance actions initiate playback from the learner's gesture so iPhone Safari can allow it. Keep the replay and slow controls available if playback is blocked or fails.
Use five gap fills and five sentence arrangements across the batch, not both sentence types for every word.
Only completing all 40 unique tasks commits the 10 newly learned words and awards a ticket. A partial batch does not add partial newly-learned counts or entries to My words.

## Grading and progress

- Typing, selecting an option or arranging tokens does not grade or advance automatically.
- Check answer grades an explicit submission. Empty input, no selection or an incomplete arrangement keeps it disabled.
- Show feedback until Continue is pressed.
- Every active review question has 20 seconds. The timer pauses while the app is hidden or the leave dialog is open, and restarts at 20 seconds when a saved question is reopened. A visible Show answer button reveals the answer early. Timeout and reveal both use incorrect feedback, award no progress, and return the task later in the same round. New-word practice remains untimed.
- Correct feedback has a rising chime, a visible confetti burst, automatic replay of the word's verified recording where available, then short spoken encouragement where browser speech is available. Incorrect feedback has a descending three-note cue. The graded card retains a manual audio replay control. Reduced-motion mode shows still confetti instead of an animation.
- All correct question types use viewport-wide confetti so it stays visible when the feedback card is scrolled into view; a synthesized English reading is the fallback when a verified recording is missing or fails. Completing a review or new-word batch triggers a distinct fanfare and celebration on the result screen.
- During the ten new-word introductions, dragging the word card left moves it with the gesture; a long enough swipe slides it out and brings in the next card, while a short swipe springs back. The former fixed bottom swipe bar is hidden here. A small Next word/Start practice button below the card is the tap and keyboard alternative. Refresher and graded-answer screens retain their swipe/Continue action; no swipe can submit an ungraded answer. Reduced-motion mode changes cards without animation.
- Ignore case and leading/trailing/repeated whitespace. Actual spelling errors remain incorrect; no fuzzy typo acceptance.
- Accepted variants and punctuation belong in the question's content specification. Ambiguous prompts must be corrected rather than penalizing valid alternatives.
- First correct completion of a unique task: +1/40, or 2.5% of the path. Wrong: +0. No backward movement.
- A previously wrong task earns its one step when first answered correctly. Already completed tasks and duplicate submissions earn no additional progress.
- Position the entire character within the SVG safe area using completed-task count / 40 along the path length. Animate along the curve on correct answers; do not move on wrong answers. Milestone dots are decoration.
- At 40/40, arrive at the shop and award one ticket exactly once.

## Daily tickets and the illustrated scenario

The daily goal is all required review plus at least one new ten-word batch. Each completed batch awards one ticket. Required daily tickets equal required review batches plus one new batch; optional videos do not replace these.

| Board/state        | Review              | New batch | Tickets               | Outcome                                    |
| ------------------ | ------------------- | --------- | --------------------- | ------------------------------------------ |
| 01 Words           | 1 of 2 batches done | Locked    | 1/3                   | Finish remaining review                    |
| 11 Review complete | 2 of 2 done         | Unlocked  | 2/3                   | Ticket only; no meal                       |
| 12 Daily complete  | 2 of 2 done         | Complete  | 3/3 earned, exchanged | Automatically feed Mochi and update growth |

No Claim or Feed action. Reopening a result must not duplicate tickets, meals or growth.
“3/3 tickets earned” is a receipt, not three still-spendable tickets.
The illustrated +1 growth and 9/365 total are sample presentation values, not a growth formula established by this delivery. The kitten does not instantly evolve.
This scope does not redefine growth balancing, extra-learning rewards or ticket carryover outside the illustrated day.

## Leaving and restoring a batch

| Event                                 | Current unfinished word batch                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Open exit confirmation                | Pause; retain the current question and answer                                                                |
| Keep learning / dismiss confirmation  | Continue the same question                                                                                   |
| Confirm Save & leave                  | Save the checkpoint and return to Words                                                                      |
| Close app or reload                   | Restore the latest valid checkpoint and offer Resume batch                                                   |
| Cross 00:00 Vietnam time              | Keep the original batch and its learning day; the new day's assignment is evaluated when the learner returns |
| Switch app or lock screen temporarily | Pause; resume the same session                                                                               |

A checkpoint includes the chosen word IDs, introduction position, task queue including retries, completed task IDs, round, answer, arranged tokens, feedback, and study seconds. Save it immediately on this device and sync it to the learner's own Firestore learning document. Stage changes sync at once; typing is debounced. On another device, the most recent synced checkpoint is available. If the network is interrupted, the same device can still resume from its local checkpoint.

Only one unfinished batch is active at a time. Starting new learning still requires all mandatory review to be complete. The original batch keeps its learning-day ID when it crosses midnight; finishing it records the original day once, while subsequent assignments use the current Vietnam day. A completed batch clears its checkpoint and cannot award duplicate progress or tickets.

Stop audio and active-study time while paused. Resuming a word introduction or listening task from a learner gesture may replay its recording. These rules apply to word batches, not automatically to video lessons or other flows.

## Implementation acceptance checks

- Yesterday complete + earlier review pending → locked.
- Yesterday/earlier complete + outstanding review pending → locked.
- All required review complete, or empty required set → unlocked at every entry point.
- Correct at 6/40 → 7/40; wrong at 6/40 → 6/40; duplicate correct → still 7/40.
- Final round-1 task wrong → remain in round 1; refresher/retry when necessary.
- All ten introductions seen but only 39 unique tasks correct → no ticket or new-word batch commit.
- Final mandatory review in sample → 2/3 and unlock; no meal.
- New batch in sample → 3/3 receipt, one automatic meal and one growth update.
- Cancel exit → same progress; confirm exit → Resume batch appears in Today and Words.
- Reload after a typed but unchecked answer, graded feedback, or a queued retry → restore the same state without duplicate task credit.
- Cross Vietnam midnight → retain the batch and its original day; evaluate the next daily assignment after completion.

See [mockups and interaction specification](mockups/word-sessions-v1/README.md). Earlier mockups still show the previous introduction order; this document and the running app take precedence.
