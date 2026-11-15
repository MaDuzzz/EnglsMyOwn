# Shadowing pilot deployment

The app runs on GitHub Pages. Firestore stores the published transcript and cues.
The four continuous audio programs live in the **private** R2 bucket
`englsmyown-shadowing`. A Cloudflare Worker checks a Firebase ID token and the
learner's approved status before issuing a one-hour streaming link. The Worker
supports byte ranges for iPhone media playback. Do not enable R2 public access.

## Files prepared in this repository

- `design/shadowing/pilot-01-audio/cues.json`: the 20 approved lines, Vietnamese
  meanings, and timestamps; upload through **Your studio** in the app. This
  private local file is ignored by Git.
- `design/shadowing/pilot-01-audio/program-{1,3,5,7}x.m4a`: ready to upload into
  R2 under the `pilot-01/` prefix. Audio files are ignored by Git.
- `scripts/build-shadowing-programs.py`: rebuilds the four files from the local
  `warmup.m4a` and `shadowing.m4a`. It needs Python `imageio-ffmpeg`.

Each program begins with one full warmup. It then plays the selected number of
practice rounds, with five seconds between rounds. Each practice line plays at
0.75×, pauses eight seconds, replays at 1×, then pauses five seconds before the
next line. The final line has no extra silence.

## Connect the private bucket

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

## Check before inviting learners

- An approved user can open Shadowing and start 1×, 3×, 5×, or 7×.
- A pending/revoked user cannot obtain an audio ticket; an unsigned or expired
  audio URL returns 403. An issued URL remains usable until expiry, at most one
  hour, even if access is revoked in the meantime.
- The warmup transitions to practice and later rounds without a tap. Pause and
  reopen to confirm the selected count and audio position are restored.
- Test a full 7× run with the screen locked on the target iPhones. Browser and
  iOS versions can affect background playback; this cannot be confirmed by
  desktop tests alone.
- Shadowing never changes vocabulary tickets, streak, or ranking.

For local development, set `VITE_SHADOWING_API_BASE` in `.env.local` to the
deployed Worker URL and add the local origin to `ALLOWED_ORIGINS` in the Worker
config if the Vite port differs from 5173. With Firebase disabled, Vite's local
preview loads the pilot cues and audio files directly from the working tree.
