"""Package one Shadowing lesson into uninterrupted files for each repeat choice.

Pass --audio-dir for a new lesson. The directory must contain warmup.m4a,
shadowing.m4a, and cues.json. Requires imageio-ffmpeg, but not the voice model.
"""

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path

import imageio_ffmpeg


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_AUDIO = ROOT / "design/shadowing/pilot-01-audio"
REPEATS = (1, 3, 5, 7)
GAP_SECONDS = 5


def run(*args):
    return subprocess.run(
        [imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-y", *map(str, args)],
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=180,
    )


def duration(path):
    result = subprocess.run(
        [imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-i", str(path)],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=20,
    )
    match = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", result.stderr)
    if not match:
        raise RuntimeError(f"Could not measure {path}")
    hours, minutes, seconds = match.groups()
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-dir", type=Path, default=DEFAULT_AUDIO)
    args = parser.parse_args()
    audio_dir = args.audio_dir.resolve()
    warmup = audio_dir / "warmup.m4a"
    practice = audio_dir / "shadowing.m4a"
    cues_path = audio_dir / "cues.json"
    cues = json.loads(cues_path.read_text())
    if not warmup.exists() or not practice.exists() or not 8 <= len(cues["lines"]) <= 40:
        raise RuntimeError("Lesson audio and 8–40 cue lines are required")

    with tempfile.TemporaryDirectory() as temp:
        temp = Path(temp)
        gap = temp / "five-second-gap.m4a"
        run(
            "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
            "-t", GAP_SECONDS, "-c:a", "aac", "-b:a", "64k", gap,
        )
        outputs = {}
        for count in REPEATS:
            parts = [warmup]
            for round_index in range(count):
                if round_index:
                    parts.append(gap)
                parts.append(practice)
            listing = temp / f"program-{count}x.txt"
            listing.write_text(
                "".join(f"file '{path.as_posix()}'\n" for path in parts)
            )
            output = audio_dir / f"program-{count}x.m4a"
            run("-f", "concat", "-safe", "0", "-i", listing,
                "-c", "copy", "-movflags", "+faststart", output)
            actual = duration(output)
            expected = duration(warmup) + count * duration(practice) + (count - 1) * GAP_SECONDS
            if abs(actual - expected) > 1:
                raise RuntimeError(f"Unexpected duration for {output}: {actual} vs {expected}")
            outputs[str(count)] = {"file": output.name, "duration": actual}
            print(f"{output.name}: {actual:.2f}s, {output.stat().st_size / 1024 / 1024:.2f} MiB")
        (audio_dir / "programs.json").write_text(
            json.dumps({"gapSeconds": GAP_SECONDS, "programs": outputs}, indent=2) + "\n"
        )
        cues["betweenRoundsSeconds"] = GAP_SECONDS
        cues["programDurations"] = {count: details["duration"] for count, details in outputs.items()}
        cues_path.write_text(json.dumps(cues, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
