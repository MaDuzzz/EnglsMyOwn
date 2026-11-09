# Bundled vocabulary audio

Published on-demand vocabulary is rendered to short AAC files in `public/audio/words`. The app checks the word ID and headword against `src/data/bundledAudio.json` before using a file. Recordings attached directly to a word remain first priority; Youdao, Google TTS, and device speech remain fallbacks for entries without bundled audio or when a file cannot play.

The current voice is Piper `en_US-joe-medium`. Its [model card](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/joe/medium/MODEL_CARD) identifies the dataset and base model as CC0. The model itself is only needed to generate assets; it is not served to learners. Generated audio is machine speech, and it should be spot checked for pronunciation, especially names and acronyms.

To regenerate after editing the six enriched workbooks in `../vocab_data`:

1. Run `node scripts/export-bundled-audio.mjs`.
2. Install `piper-tts` and `imageio-ffmpeg` in a Python environment, and obtain the `en_US-joe-medium.onnx` model and matching `.onnx.json` from [Piper voices](https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/joe/medium).
3. Run `python scripts/render-bundled-audio.py /path/to/en_US-joe-medium.onnx`.
4. Run `npm test` and `npm run build` before deployment.

If the text of an existing word changes, delete its old `.m4a` before rendering so it is regenerated. Keep the JSON manifest and audio files in the same deployment.
