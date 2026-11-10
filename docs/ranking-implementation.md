# Ranking pilot

The third navigation tab is now **Ranking**. The Videos route remains in the code for later work, but is no longer in primary navigation.

## Scoring and periods

All day boundaries use `Asia/Ho_Chi_Minh`.

| Tab | Ranking value | Period |
| --- | --- | --- |
| Points | 20 points per saved new-word batch, 10 per saved review batch | Monday 00:00 through Sunday 23:59; starts again each Monday |
| Streak | Longest run of goal days ever achieved | Lifetime record; never resets |
| Words | 10 words per saved new-word batch | Calendar month; starts again on day 1 |

The existing Today streak is the **current** streak and returns to zero after a missed goal day. Ranking compares the **best** streak, so a missed day does not erase a record. The Streak view also shows the current run and the days needed to set a new personal best. A goal day uses the existing `dailyStats().meal` rule: finish all required reviews and at least one new-word batch. Review batches never add to the Words count. Ties share a rank. Period changes display old summaries as zero until each user opens the app and syncs; the best streak remains visible.

The shared weekly goal is 50 new words across the approved group. It is encouragement only and never gates learning or streaks. The 50-word target and 20/10 point weights are pilot values that can be changed later. The mockups in `design/mockups/ranking-v2/` contain sample numbers; their Streak image predates the final decision to rank by lifetime best.

## Data and access

The app writes `rankings/<uid>` only after the learner's private `learning/<uid>` snapshot has loaded. The summary contains display name, companion appearance/stage, the current week/month totals, best and current streak, and last goal day. It contains no email, vocabulary content, answers, or raw batch records. The app compares the summary before writing, so an active batch checkpoint does not create a ranking write. The Ranking page listens to the small summary collection while open; it overlays the current user's calculated summary immediately.

Firestore Rules allow only approved learners to read summaries and only each approved learner to create/update their own bounded summary. The owner can delete a summary. Revoking a learner commits profile revocation and summary deletion in one Firestore batch. Publish the new `firestore.rules` **before** deploying the app or the Ranking screen will show a permission error.

**Pilot limitation:** scores are calculated by the browser from personal records. Firestore Rules check summary shape, ownership, and approved access, but cannot verify arithmetic against all private records. A determined approved user can alter their own score. Trusted server-side scoring would require a backend trigger or function and is outside this GitHub Pages pilot.

## Checks

`npm test` covers week/month boundaries, streak records, a broken current streak, stale period summaries, and ties. `npm run test:rules` covers summary access and writes when the Firestore emulator is available. The local computer needs Java 21 for that emulator; GitHub Actions installs it in CI. `npm run build` checks TypeScript and the production bundle. The local UI was checked at 428×926, 440×956 and laptop width, in both themes; an iPhone Safari/Home Screen test and a two-account Firestore test remain for release validation.
