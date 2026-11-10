"""Render reviewed vocabulary with Kokoro ONNX into short iPhone-compatible AAC files.

This is an offline content preparation step; the model is never loaded in the app.
Run `node scripts/export-bundled-audio.mjs` first, then provide the Kokoro v1.0
ONNX model and matching voices file. Install kokoro-onnx and imageio-ffmpeg in
the Python environment used to run this script.
"""

import argparse
import json
import os
import subprocess
import tempfile
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from kokoro_onnx import Kokoro


root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--model", type=Path, required=True)
parser.add_argument("--voices", type=Path, required=True)
parser.add_argument("--voice", required=True)
parser.add_argument("--output", type=Path, required=True)
parser.add_argument("--overwrite", action="store_true")
args = parser.parse_args()

entries = json.loads((root / "src/data/bundledAudio.json").read_text())
args.output.mkdir(parents=True, exist_ok=True)
model = Kokoro(str(args.model), str(args.voices))
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

for index, (word_id, headword) in enumerate(entries.items(), 1):
    destination = args.output / f"{word_id}.m4a"
    if not args.overwrite and destination.exists() and destination.stat().st_size > 1000:
        continue
    speech, sample_rate = model.create(
        headword.rstrip(".?!") + ".",
        voice=args.voice,
        speed=0.9,
        lang="en-us",
    )
    duration = len(speech) / sample_rate
    if not 0.25 < duration < 15 or not np.isfinite(speech).all() or np.max(np.abs(speech)) < 0.001:
        raise RuntimeError(f"Invalid audio for {word_id} ({headword}): {duration:.2f}s")
    with tempfile.TemporaryDirectory() as temp:
        wav_path = Path(temp) / "speech.wav"
        m4a_path = Path(temp) / "speech.m4a"
        with wave.open(str(wav_path), "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(sample_rate)
            wav.writeframes((np.clip(speech, -1, 1) * 32767).astype("<i2").tobytes())
        subprocess.run(
            [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path),
             "-ac", "1", "-c:a", "aac", "-b:a", "48k", str(m4a_path)],
            check=True,
            timeout=30,
        )
        if m4a_path.stat().st_size < 1000:
            raise RuntimeError(f"Encoded audio too short for {word_id}: {headword}")
        os.replace(m4a_path, destination)
    if index % 50 == 0 or index == len(entries):
        print(f"Rendered {index}/{len(entries)} with {args.voice}", flush=True)
