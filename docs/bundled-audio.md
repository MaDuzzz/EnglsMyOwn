# Bundled vocabulary audio

Published on-demand vocabulary is rendered to short AAC files in `public/audio/words`. The app checks the word ID and headword against `src/data/bundledAudio.json` before using a file. Bundled audio has first priority for these entries; existing recordings, Youdao, Google TTS, and device speech remain fallbacks. Vocabulary without bundled audio keeps its existing recording priority.

The current voice is Kokoro v1.0 `af_heart` (American English). The [model and voices](https://huggingface.co/hexgrad/Kokoro-82M) are Apache 2.0. They are used offline to make the AAC files and are not downloaded by learners. This replaced Piper Joe after listening tests on `damage`, `dedicate`, and `contingent workforce`. AI speech still needs spot checks, especially on short words, names, and acronyms.

To regenerate after editing the six enriched workbooks in `../vocab_data`:

1. Run `node scripts/export-bundled-audio.mjs`.
2. Install `kokoro-onnx` and `imageio-ffmpeg` in Python 3.10 or newer. Download `kokoro-v1.0.fp16.onnx` and `voices-v1.0.bin` from the [Kokoro ONNX release](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1).
3. Run `python scripts/render-kokoro-audio.py --model /path/to/kokoro-v1.0.fp16.onnx --voices /path/to/voices-v1.0.bin --voice af_heart --output public/audio/words --overwrite`.
4. Run `npm test` and `npm run build` before deployment.

Use `--overwrite` when a word changes or a new voice is selected; omit it to resume an interrupted run. When replacing existing files, also change `bundledAudioVersion` in `src/lib/pronunciationAudio.ts` so browsers fetch the new recordings. Keep the JSON manifest and audio files in the same deployment. The old `render-bundled-audio.py` Piper generator remains in the repo for reference only.
