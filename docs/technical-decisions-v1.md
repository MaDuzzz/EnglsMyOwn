# Initial technical decisions

Scope: private pilot for the owner and 1–2 friends. Design/architecture decisions only; no infrastructure or application code has been deployed by this document.

## Hosting, identity and data

- Host the web frontend on GitHub Pages.
- Google sign-in through Firebase Authentication.
- The owner is the sole administrator. Other accounts initially have pending status and cannot access lesson content until approved by the administrator.
- Enforce approval and data ownership using Firebase Security Rules; hiding UI alone is insufficient. Users cannot approve themselves or grant themselves administrator privileges.
- Use Cloud Firestore for structured vocabulary, lesson metadata/scripts, account approval, personal learning progress and pet/report data. Store media references, not audio/video bytes, in Firestore.
- Restricted lesson data must not be included in the public frontend bundle or a public repository dataset.

## Accepted temporary video approach

The user accepted a simpler video experience for the small pilot: embed the Google Drive player in an iframe, with the learner manually controlling playback, seeking, replay and mute. The app manages the six-step journey, transcript, saved items, translation drafts and quiz.

No custom media proxy, VPS or serverless backend is required for this temporary iframe approach. Firebase remains the managed backend for identity and structured data.

This decision supersedes automatic player-control assumptions in the existing video mockups for the pilot. It does not approve publishing private media with “Anyone with the link”.

## Drive access boundary

Carry forward the requested restricted-access policy: keep lesson files Restricted and share with each approved learner's Google account manually. Firebase approval and Drive sharing are separate actions. When revoking access, revoke both.

Approved Drive recipients can also open files in Drive outside the app. This solution does not enforce app-only media access. A Firebase login does not guarantee a usable Google session inside the embedded Drive player.

## Six-step adjustments

| Step              | Pilot behavior                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listen            | Learner starts playback and listens twice; confirms completed listens manually. An audio-only/covered-player presentation must be tested on iPhone before it is promised. |
| Watch and collect | Learner plays twice and manually confirms; the app displays transcript and allows saving words/sentences.                                                                 |
| Translate         | App presents selected lines and stores drafts/reference translations. Learner manually seeks the video to the displayed timestamp.                                        |
| Shadow            | Show target sentence and timestamp; replay/seek and any player-supported speed adjustment are manual. No app-controlled loop button.                                      |
| Speak             | Instruct the learner to mute the Drive player and confirm before practice. Transcript navigation is manual; no automatic timestamp tracking or auto-scroll.               |
| Review            | App runs exercises from saved items. Any media replay requires manual player operation.                                                                                   |

Do not show live playback time, verified watch counts, guaranteed mute state or automatic sentence highlighting unless actually available and tested. Manual confirmations are self-reported study steps, not evidence of uninterrupted playback. Learning-step progress and quiz results can still be saved in Firestore; do not promise precise player-position restoration.

Existing mockup controls for seek-to-sentence, loop, automatic replay counts and synchronized captions are future capabilities, not implemented pilot commitments. Do not use fake timers to simulate video progress. Optional recording is a separate browser feature whose interaction with Drive playback remains unvalidated.

## Validation before full video implementation

- Test one real lesson on laptop, iPhone 12 Pro Max and iPhone 17 Pro Max, including Add to Home Screen mode.
- Check Restricted sharing, logged-in/out Google states, playback, fullscreen/inline behavior and return from background.
- Check the listen-only presentation and the manual mute instructions; the app cannot inspect the cross-origin player to verify either state.
- Explain access failures and offer opening the lesson in Drive when appropriate, without automatically marking the lesson completed.
- Audio files for vocabulary remain on Drive as the user's preferred source, but their exact delivery/player method is still unvalidated; accepting video iframe playback does not resolve vocabulary audio controls.

References: [Drive video playback](https://support.google.com/drive/answer/2423694?hl=en), [Drive sharing](https://support.google.com/drive/answer/7166529?hl=en), [iframe same-origin restrictions](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy).
