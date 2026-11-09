"""Render the exported vocabulary with a locally installed Piper voice.

Usage: python scripts/render-bundled-audio.py MODEL.onnx [OUTPUT_DIR]
The voice model is not checked into the app. This script uses en_US-joe-medium
(CC0 dataset) by default; see docs/bundled-audio.md.
"""

import json
import os
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import imageio_ffmpeg
from piper import PiperVoice


root = Path(__file__).resolve().parents[1]
model = Path(sys.argv[1])
output = Path(sys.argv[2]) if len(sys.argv) > 2 else root / "public/audio/words"
entries = json.loads((root / "src/data/bundledAudio.json").read_text())
output.mkdir(parents=True, exist_ok=True)
voice = PiperVoice.load(model)
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

for index, (word_id, headword) in enumerate(entries.items(), 1):
    destination = output / f"{word_id}.m4a"
    if destination.exists() and destination.stat().st_size > 1000:
        continue
    with tempfile.TemporaryDirectory() as temp:
        wav_path = Path(temp) / "speech.wav"
        mp4_path = Path(temp) / "speech.m4a"
        with wave.open(str(wav_path), "wb") as wav:
            voice.synthesize_wav(headword, wav)
        subprocess.run(
            [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path),
             "-ac", "1", "-c:a", "aac", "-b:a", "48k", str(mp4_path)],
            check=True,
            timeout=30,
        )
        if mp4_path.stat().st_size < 1000:
            raise RuntimeError(f"Audio too short for {word_id}: {headword}")
        os.replace(mp4_path, destination)
    if index % 50 == 0 or index == len(entries):
        print(f"Rendered {index}/{len(entries)}", flush=True)
