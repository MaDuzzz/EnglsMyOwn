"""Render a new original Shadowing lesson from a reviewed JSON script.

The script supplies id, title, level, summary, voices (speaker -> Kokoro voice),
and lines (speaker, text, translation). Run --check-only before rendering, then
run build-shadowing-programs.py on the output directory to add program lengths.
"""

import argparse
import json
import re
import subprocess
import tempfile
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PAUSE_SECONDS = 8.0
BETWEEN_LINES_SECONDS = 5.0
WARMUP_GAP_SECONDS = 0.3


def validate_source(source):
    lesson_id = source.get("id")
    if not isinstance(lesson_id, str) or not re.fullmatch(
        r"[a-z0-9]+(?:-[a-z0-9]+)*", lesson_id
    ) or len(lesson_id) > 64:
        raise ValueError("Use a short lowercase lesson id, such as lesson-02")
    for field in ("title", "summary"):
        if not isinstance(source.get(field), str) or not source[field].strip():
            raise ValueError(f"Missing {field}")
    if source.get("level") not in ("A2", "B1", "B2", "C1"):
        raise ValueError("Level must be A2, B1, B2, or C1")
    lines = source.get("lines")
    if not isinstance(lines, list) or not 8 <= len(lines) <= 40:
        raise ValueError("Use 8–40 reviewed lines")
    voices = source.get("voices")
    if not isinstance(voices, dict):
        raise ValueError("Map each speaker to one Kokoro voice")
    for index, line in enumerate(lines, 1):
        if not isinstance(line, dict):
            raise ValueError(f"Line {index} is not an object")
        speaker = line.get("speaker")
        voice = voices.get(speaker)
        if not isinstance(speaker, str) or not re.fullmatch(r"[A-Za-z][A-Za-z '\-]{0,40}", speaker):
            raise ValueError(f"Line {index} has an invalid speaker name")
        if not isinstance(voice, str) or not re.fullmatch(r"[ab][fm]_[a-z]+", voice):
            raise ValueError(f"Line {index} needs an American or British English voice")
        for field in ("text", "translation"):
            if not isinstance(line.get(field), str) or not line[field].strip():
                raise ValueError(f"Line {index} is missing {field}")
        if len(line["text"]) > 300 or len(line["translation"]) > 400:
            raise ValueError(f"Line {index} is too long")
    return lines, voices


def silence(seconds, sample_rate, np):
    return np.zeros(round(seconds * sample_rate), dtype=np.float32)


def fade_edges(samples, sample_rate, np):
    result = np.asarray(samples, dtype=np.float32).copy()
    edge = min(round(sample_rate * 0.012), len(result) // 3)
    if edge:
        result[:edge] *= np.linspace(0, 1, edge, dtype=np.float32)
        result[-edge:] *= np.linspace(1, 0, edge, dtype=np.float32)
    return result


def write_m4a(path, audio, sample_rate, ffmpeg, np):
    with tempfile.TemporaryDirectory() as temporary:
        wav_path = Path(temporary) / "source.wav"
        with wave.open(str(wav_path), "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(sample_rate)
            wav.writeframes((np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes())
        subprocess.run(
            [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path),
             "-ac", "1", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", str(path)],
            check=True, timeout=180,
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="Reviewed lesson source JSON")
    parser.add_argument("--model", type=Path)
    parser.add_argument("--voices", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--check-only", action="store_true")
    args = parser.parse_args()
    source = json.loads(args.source.read_text())
    lines, voices = validate_source(source)
    if args.check_only:
        print(f"{source['id']}: {len(lines)} lines, {len(voices)} voices — source is valid")
        return
    if not args.model or not args.voices or not args.model.exists() or not args.voices.exists():
        raise FileNotFoundError("Pass existing --model and --voices paths")

    import imageio_ffmpeg
    import numpy as np
    from kokoro_onnx import Kokoro

    output = (args.output or ROOT / "design/shadowing" / f"{source['id']}-audio").resolve()
    output.mkdir(parents=True, exist_ok=True)
    model = Kokoro(str(args.model), str(args.voices))
    sample_rate = None
    rendered = []
    for index, line in enumerate(lines, 1):
        voice = voices[line["speaker"]]
        language = "en-gb" if voice.startswith("b") else "en-us"
        natural, rate = model.create(line["text"], voice=voice, speed=1.0, lang=language)
        slow, slow_rate = model.create(line["text"], voice=voice, speed=0.75, lang=language)
        if sample_rate is not None and rate != sample_rate or slow_rate != rate:
            raise ValueError(f"Inconsistent sample rate on line {index}")
        if not np.isfinite(natural).all() or not np.isfinite(slow).all():
            raise ValueError(f"Invalid samples on line {index}")
        if len(natural) / rate < 0.3 or len(slow) / rate < 0.3:
            raise ValueError(f"Missing spoken audio on line {index}")
        sample_rate = rate
        rendered.append((fade_edges(natural, rate, np), fade_edges(slow, rate, np)))
        print(f"Rendered line {index}/{len(lines)} with {voice}", flush=True)

    warmup_parts, practice_parts = [], []
    warmup_cues, practice_cues = [], []
    warmup_samples = practice_samples = 0
    for index, (line, (natural, slow)) in enumerate(zip(lines, rendered), 1):
        line_id = index
        warmup_start = warmup_samples / sample_rate
        warmup_end = warmup_start + len(natural) / sample_rate
        warmup_cues.append({"line": line_id, "start": warmup_start, "end": warmup_end})
        warmup_parts.append(natural)
        warmup_samples += len(natural)
        if index < len(lines):
            warmup_parts.append(silence(WARMUP_GAP_SECONDS, sample_rate, np))
            warmup_samples += round(WARMUP_GAP_SECONDS * sample_rate)

        first_start = practice_samples / sample_rate
        first_end = first_start + len(slow) / sample_rate
        replay_start = first_end + PAUSE_SECONDS
        replay_end = replay_start + len(natural) / sample_rate
        practice_cues.append({"line": line_id, "firstStart": first_start,
                              "firstEnd": first_end, "replayStart": replay_start,
                              "replayEnd": replay_end})
        practice_parts.extend([slow, silence(PAUSE_SECONDS, sample_rate, np), natural])
        practice_samples += len(slow) + round(PAUSE_SECONDS * sample_rate) + len(natural)
        if index < len(lines):
            practice_parts.append(silence(BETWEEN_LINES_SECONDS, sample_rate, np))
            practice_samples += round(BETWEEN_LINES_SECONDS * sample_rate)

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    write_m4a(output / "warmup.m4a", np.concatenate(warmup_parts), sample_rate, ffmpeg, np)
    write_m4a(output / "shadowing.m4a", np.concatenate(practice_parts), sample_rate, ffmpeg, np)
    cues = {"id": source["id"], "title": source["title"], "level": source["level"],
            "summary": source["summary"], "voices": voices,
            "warmupDuration": warmup_samples / sample_rate,
            "shadowingDuration": practice_samples / sample_rate,
            "lines": [{"id": index, "speaker": line["speaker"], "text": line["text"],
                       "translation": line["translation"], "pauseSeconds": PAUSE_SECONDS}
                      for index, line in enumerate(lines, 1)],
            "warmupCues": warmup_cues, "shadowingCues": practice_cues}
    (output / "cues.json").write_text(json.dumps(cues, ensure_ascii=False, indent=2) + "\n")
    print(f"Saved {len(lines)} lines to {output}")


if __name__ == "__main__":
    main()
