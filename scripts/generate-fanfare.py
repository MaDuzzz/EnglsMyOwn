"""Build the short, original brass fanfare used after a completed batch."""

import math
import struct
import wave
from pathlib import Path


RATE = 24_000
DURATION = 2.0
SAMPLES = [0.0] * int(RATE * DURATION)


def brass(frequency: float, start: float, duration: float, volume: float) -> None:
    first = int(start * RATE)
    length = int(duration * RATE)
    harmonics = (1.0, 0.64, 0.37, 0.19, 0.09)
    for index in range(length):
        time = index / RATE
        attack = min(1.0, time / 0.025)
        release = min(1.0, (duration - time) / 0.16)
        envelope = max(0.0, attack * release) * (0.82 + 0.18 * math.exp(-time * 7))
        vibrato = 1 + (0.003 * math.sin(2 * math.pi * 5.2 * time) if time > 0.08 else 0)
        phase = 2 * math.pi * frequency * vibrato * time
        tone = sum(
            weight * math.sin((harmonic + 1) * phase)
            for harmonic, weight in enumerate(harmonics)
        )
        SAMPLES[first + index] += tone * envelope * volume


# A C-major call, then a sustained three-note flourish.
for frequency, start, length, volume in (
    (392.0, 0.16, 0.20, 0.18),
    (523.25, 0.35, 0.20, 0.18),
    (659.25, 0.54, 0.22, 0.18),
    (783.99, 0.75, 0.26, 0.18),
    (523.25, 1.03, 0.71, 0.075),
    (659.25, 1.03, 0.71, 0.075),
    (1046.5, 1.03, 0.71, 0.16),
):
    brass(frequency, start, length, volume)

# Two quiet echoes make the small speaker sound less dry.
for delay, amount in ((0.085, 0.16), (0.17, 0.08)):
    offset = int(delay * RATE)
    for index in range(len(SAMPLES) - 1, offset - 1, -1):
        SAMPLES[index] += SAMPLES[index - offset] * amount

peak = max(abs(value) for value in SAMPLES)
pcm = b"".join(struct.pack("<h", int(value / peak * 26_000)) for value in SAMPLES)
target = Path(__file__).resolve().parent.parent / "public/audio/celebration-fanfare.wav"
target.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(target), "wb") as output:
    output.setnchannels(1)
    output.setsampwidth(2)
    output.setframerate(RATE)
    output.writeframes(pcm)
print(target)
