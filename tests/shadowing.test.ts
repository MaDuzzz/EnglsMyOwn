import {
  programDuration,
  shadowingPosition,
  validateShadowingImport,
} from "../src/lib/shadowing";
import { describe, expect, it } from "vitest";

const cues = {
  title: "The Interview Detour",
  warmupDuration: 59.2,
  shadowingDuration: 369.1,
  lines: Array.from({ length: 20 }, (_, index) => ({
    id: index + 1,
    speaker: index % 2 ? "Ben" : "Maya",
    text: `Test sentence ${index + 1}.`,
    translation: `Câu mẫu ${index + 1}.`,
    pauseSeconds: 8,
  })),
  warmupCues: Array.from({ length: 20 }, (_, index) => ({
    line: index + 1, start: index * 2.5, end: index * 2.5 + 2,
  })),
  shadowingCues: Array.from({ length: 20 }, (_, index) => ({
    line: index + 1,
    firstStart: index * 18,
    firstEnd: index * 18 + 4,
    replayStart: index * 18 + 12,
    replayEnd: index * 18 + 16,
  })),
};
const lesson = validateShadowingImport(cues);

describe("shadowing lesson", () => {
  it("rejects a missing or out-of-order cue", () => {
    const damaged = structuredClone(cues);
    damaged.shadowingCues[3].firstStart = 0;
    expect(() => validateShadowingImport(damaged)).toThrow(/Line 4/);
  });

  it("plays warmup once and moves through every selected round", () => {
    const warmup = lesson.warmupDuration;
    const round = lesson.shadowingDuration;
    expect(shadowingPosition(lesson, warmup - 0.1, 3).phase).toBe("warmup");
    expect(shadowingPosition(lesson, warmup, 3)).toMatchObject({
      phase: "practice", round: 1, line: 1,
    });
    expect(shadowingPosition(lesson, warmup + round + 2, 3)).toMatchObject({
      phase: "practice", round: 1, stage: "Next round",
    });
    expect(shadowingPosition(lesson, warmup + round + 5.1, 3)).toMatchObject({
      phase: "practice", round: 2, line: 1,
    });
    expect(programDuration(7)).toBeGreaterThan(programDuration(5));
  });

  it("shows the eight-second learner pause and normal-speed replay", () => {
    const cue = lesson.shadowingCues[4];
    const base = lesson.warmupDuration;
    expect(shadowingPosition(lesson, base + cue.firstEnd + 0.1, 1)).toMatchObject({
      line: 5, stage: "Your turn",
    });
    expect(shadowingPosition(lesson, base + cue.replayStart + 0.1, 1)).toMatchObject({
      line: 5, stage: "1× Replay",
    });
  });
});
