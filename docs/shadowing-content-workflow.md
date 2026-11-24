# Producing the next Shadowing lessons

Start from a learner-supplied transcript or write an original story. For a
reference transcript, rewrite it into an original, coherent conversation or
monologue before recording. Keep the target situation, useful language, and
learner level, while changing the story, wording, speakers, and examples.
Review the final English and Vietnamese line by line.

## Voice and listening quality

- Keep one voice per speaker for the entire lesson. Change the cast between
  lessons so the library offers different voices and accents. Label accents
  according to the selected voice; do not present a British voice as American.
- Audition each candidate voice on the actual script before the full render.
  Check names, contractions, emphasis, sentence endings, and lines containing
  connected speech. The [Kokoro voice list](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)
  includes American and British voices and notes that very short utterances can
  sound weaker. Combine tiny fragments into a natural complete line when it
  improves the rhythm of the exercise.
- Write conversational turns with a clear emotional context. Avoid a collection
  of unrelated example sentences. A line should be short enough to repeat from
  memory, but long enough to sound like a natural utterance.
- Hear the full warm-up at 1×, then every line at 0.75×, leave eight seconds
  for the learner, replay at 1×, and leave five seconds before the next line.
  The warm-up happens once; only the practice section repeats 1/3/5/7 times.
- Listen to every rendered line before publication. Correct awkward
  pronunciation or unnatural stress in the script and render again. Check that
  the spoken words match the displayed transcript and translations.

## Source format and rendering

Save the reviewed original script locally as
`design/shadowing/<lesson-id>-source.json` (ignored by Git):

```json
{
  "id": "lesson-02",
  "title": "Example title",
  "level": "B1",
  "summary": "One sentence describing the situation.",
  "voices": { "Alex": "af_bella", "Sam": "am_fenrir" },
  "lines": [
    {
      "speaker": "Alex",
      "text": "A complete English line to repeat.",
      "translation": "Bản dịch tự nhiên của câu tiếng Anh."
    }
  ]
}
```

The example shows one line for brevity; a lesson must contain 8–40 reviewed
lines. Use a local Kokoro ONNX model and its matching voices file:

```sh
python scripts/render-shadowing-lesson.py design/shadowing/lesson-02-source.json --check-only
python scripts/render-shadowing-lesson.py design/shadowing/lesson-02-source.json --model /path/to/kokoro-v1.0.fp16.onnx --voices /path/to/voices-v1.0.bin
python scripts/build-shadowing-programs.py --audio-dir design/shadowing/lesson-02-audio
```

For a slightly gentler natural reading, pass `--natural-speed 0.95` to the
renderer. The default is `1.0`; supported values are `0.85` through `1.1`.
This sets the synthesis pace for the warm-up and the second reading. The first
practice reading still uses 75% of that base pace. The player uses the mastered
audio at its normal playback rate; it does not apply another slowdown. The
renderer records `naturalSpeed` in the local cue sheet for reproducibility.
Measure the resulting speech durations and review the listening quality rather
than assuming a synthesis-speed value guarantees a particular words-per-minute
rate. The eight-second and five-second pauses remain unchanged, and all program
durations are rebuilt from the generated audio.

The renderer writes `warmup.m4a`, `shadowing.m4a`, and `cues.json`. The builder
adds four continuous audio programs and their exact durations to `cues.json`.
Listen to the generated files, then upload only `program-{1,3,5,7}x.m4a` to the
private R2 prefix matching the lesson ID. Publish that lesson's `cues.json`
through **Your studio** after the R2 uploads succeed. The approved learner
library reads all published Shadowing lessons from Firestore.

The local source JSON, audio, cues, and generated program manifests are ignored
by Git. Keep the model and source transcripts out of the public repository too.
