# Shadowing deployment

The app runs on GitHub Pages. Firestore stores the published transcript and cues.
Each lesson's four continuous audio programs live in the **private** R2 bucket
`englsmyown-shadowing`. A Cloudflare Worker checks a Firebase ID token and the
learner's approved status before issuing a one-hour streaming link. The Worker
supports byte ranges for iPhone media playback. Do not enable R2 public access.

## Live lessons

- App: <https://maduzzz.github.io/EnglsMyOwn/#shadowing>
- Worker: <https://englsmyown-shadowing.englsmyown.workers.dev>
- All four `pilot-01/program-{1,3,5,7}x.m4a` files were uploaded to private R2.
  `MEDIA_SIGNING_SECRET` is configured in Cloudflare.
- The `shadowingLessons` Firestore Rules are published, and `pilot-01` is
  published through **Your studio**. The GitHub Actions variable
  `VITE_SHADOWING_API_BASE` points to the Worker.
- [Pages deployment](https://github.com/MaDuzzz/EnglsMyOwn/actions/runs/43714521622)
  passed. Authenticated playback was checked on the public site with 1× and
  3× programs. The user confirmed that audio continues when the iPhone screen
  is off. A complete 7× run with the screen locked has not yet been checked.
- Two original 20-line stories were added on 17 November 2026: `lesson-02`
  (The Rain Check, British English) and `lesson-03` (The Demo Without Slides,
  American English). Each has separate voices for its two speakers and four
  programs in private R2. The lesson source, transcript and audio are local
  ignored files; the published transcript is stored in Firestore.
- Two further original 20-line stories were published on 18 November 2026:
  `lesson-04` (The Parcel Mix-Up, American English with `af_nova` and
  `am_liam`) and `lesson-05` (A Friday Deadline, British English with
  `bf_alice` and `bm_daniel`). All eight `program-{1,3,5,7}x.m4a` files are in
  the private R2 bucket under their lesson IDs. Both cue sheets passed the app's
  import validation and were published to Firestore. Authenticated playback was
  verified on the public app for lesson 04 at 1× and lesson 05 at 1× and 7×.

## Files prepared in this repository

- `design/shadowing/pilot-01-audio/cues.json`: the 20 approved lines, Vietnamese
  meanings, and timestamps; already published through **Your studio**. This
  private local file is ignored by Git.
- `design/shadowing/pilot-01-audio/program-{1,3,5,7}x.m4a`: local source files
  for the programs uploaded under the R2 `pilot-01/` prefix. Audio files are
  ignored by Git.
- `scripts/build-shadowing-programs.py`: rebuilds the four files from the local
  `warmup.m4a` and `shadowing.m4a`. It needs Python `imageio-ffmpeg`.

Each program begins with one full warmup. It then plays the selected number of
practice rounds, with five seconds between rounds. Each practice line plays at
0.75×, pauses eight seconds, replays at 1×, then pauses five seconds before the
next line. The final line has no extra silence.

## Re-deploy or replace the pilot

The initial setup is complete. Use these steps when changing the audio,
transcript, Worker, or project configuration.

1. Upload the four `program-*.m4a` files to **R2 → englsmyown-shadowing →
   pilot-01**. Keep the two existing source files if desired; the app reads
   only the `program-*` files. Set the content type to `audio/mp4` if the
   dashboard offers it. Verify names exactly: `pilot-01/program-1x.m4a`,
   `pilot-01/program-3x.m4a`, `pilot-01/program-5x.m4a`, and
   `pilot-01/program-7x.m4a`.
2. From the app repository, authenticate Wrangler to the Cloudflare account
   that owns the bucket, then deploy the Worker:

   ```sh
   npx wrangler login
   npx wrangler deploy --config workers/shadowing/wrangler.jsonc
   npx wrangler secret put MEDIA_SIGNING_SECRET --config workers/shadowing/wrangler.jsonc
   ```

   Enter a fresh random secret of at least 32 characters when prompted. Keep it
   only in Cloudflare; never place it in a repo, GitHub variable, or chat. The
   `secret put` command deploys a new Worker version with the secret. Record the
   resulting `https://...workers.dev` URL. Cloudflare's
   [Worker deployment](https://developers.cloudflare.com/workers/wrangler/commands/workers/)
   and [R2 upload](https://developers.cloudflare.com/r2/reference/wrangler-commands/)
   docs describe the commands.
3. In GitHub repo **Settings → Secrets and variables → Actions → Variables**, add
   `VITE_SHADOWING_API_BASE` with that Worker URL (no final slash). Trigger the
   Pages workflow after all backend steps are ready.
4. Publish the updated `firestore.rules` to Firebase project
   `english-app-6ca48`. The new `shadowingLessons` rule permits the owner to
   write and approved learners to read published lessons only.
5. Sign in as the app administrator, open **Your studio**, select local
   `design/shadowing/pilot-01-audio/cues.json`, then press **Publish Shadowing
   lesson**. This writes `shadowingLessons/pilot-01` in Firestore.

The program files are in R2, not GitHub Pages. The transcript is in Firestore,
not in the production JavaScript bundle. Uploading just the two original M4A
files is insufficient for the repeat selector.

## Add an original lesson

See `docs/shadowing-content-workflow.md` for the source format and render
commands. Review the story and translation, render `warmup.m4a` and
`shadowing.m4a`, then build `program-{1,3,5,7}x.m4a`. Upload all four programs
to the private R2 prefix matching the lesson ID. The app administrator then
imports that lesson's local `cues.json` from **Your studio**. It validates the
line timings and publishes the Firestore document. The Worker checks both the
approved Firebase account and published lesson before issuing a signed audio
link. The new lesson appears in the Shadowing library without changing the
pilot.

## Check before inviting learners

- An approved user can open Shadowing and start 1×, 3×, 5×, or 7×.
- A pending/revoked user cannot obtain an audio ticket; an unsigned or expired
  audio URL returns 403. An issued URL remains usable until expiry, at most one
  hour, even if access is revoked in the meantime.
- The warmup transitions to practice and later rounds without a tap. Pause and
  reopen to confirm the selected count and audio position are restored.
- Test a full 7× run with the screen locked on the target iPhones to confirm
  every practice-round transition plays without opening the app. Screen-off
  playback itself was confirmed by the user.
- Shadowing never changes vocabulary tickets, streak, or ranking.

For local development, set `VITE_SHADOWING_API_BASE` in `.env.local` to the
deployed Worker URL and add the local origin to `ALLOWED_ORIGINS` in the Worker
config if the Vite port differs from 5173. With Firebase disabled, Vite's local
preview loads the pilot cues and audio files directly from the working tree.
