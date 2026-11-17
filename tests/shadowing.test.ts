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
    expect(programDuration(lesson, 7)).toBeGreaterThan(programDuration(lesson, 5));
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

  it("accepts a new lesson with its own speakers and audio lengths", () => {
    const next = validateShadowingImport({
      ...cues,
      id: "lesson-02",
      title: "A Better Weekend Plan",
      level: "B1",
      summary: "Two friends make a practical plan.",
      betweenRoundsSeconds: 5,
      warmupDuration: 30,
      shadowingDuration: 216,
      programDurations: { "1": 246, "3": 688, "5": 1130, "7": 1572 },
      lines: cues.lines.slice(0, 12).map((line) => ({ ...line, speaker: "Avery" })),
      warmupCues: cues.warmupCues.slice(0, 12),
      shadowingCues: cues.shadowingCues.slice(0, 12),
    });
    expect(next.id).toBe("lesson-02");
    expect(next.lines).toHaveLength(12);
    expect(programDuration(next, 7)).toBe(1572);
    expect(shadowingPosition(next, 30 + 216 + 1, 7)).toMatchObject({
      stage: "Next round", line: 12,
    });
  });
});
