import { describe, it, expect } from "vitest";
import pilot from "../content/vocabulary-pilot-v2.json";
import { projectWord, storedWord, validateImport } from "../src/lib/content";
import { availableAccents } from "../src/lib/vocabulary";
import {
  advance,
  arrangeAnswer,
  commitBatch,
  createSession,
  dailyStats,
  emptyLearning,
  grade,
  pendingReview,
  sentenceParts,
  tasksFor,
} from "../src/lib/model";

const words = validateImport(pilot).words;
describe("vocabulary pilot", () => {
  it("validates ten entries and preserves canonical data through Firestore round trips", () => {
    expect(words).toHaveLength(10);
    for (const w of words) {
      const stored = storedWord(w);
      expect(stored).not.toHaveProperty("exampleEn");
      expect(projectWord(stored)).toEqual(w);
      expect(availableAccents(w)).toHaveLength(1);
      expect(w.examples).toHaveLength(2);
    }
  });
  it("rejects missing practice references, placeholders and mismatched audio text", () => {
    for (const alter of [
      (w: any) => {
        w.practiceExampleId = "missing";
      },
      (w: any) => {
        w.pronunciation.au.audioUrl = "https://audio.example.com/fake.mp3";
      },
      (w: any) => {
        w.pronunciation.au.audioText = "different phrase";
      },
      (w: any) => {
        w.examples[0].gap.acceptedAnswers = ["wrong"];
      },
    ]) {
      const input = structuredClone(pilot);
      alter(input.words[0]);
      expect(() => validateImport(input)).toThrow();
    }
  });
  it("grades inflected gaps separately from base-form recall", () => {
    const w = words.find((w) => w.headword === "make a mistake")!;
    const tasks = tasksFor([w]);
    expect(grade(w, tasks[1], "made a mistake")).toBe(true);
    expect(grade(w, tasks[1], "make a mistake")).toBe(false);
    expect(grade(w, tasks[3], " MAKE   A MISTAKE ")).toBe(true);
    expect(grade(w, tasks[3], "made a mistake")).toBe(false);
  });
  it("accepts both edited word orders without stranding punctuation mid-sentence", () => {
    const w = words.find((w) => w.headword === "take into account")!;
    const parts = sentenceParts(w);
    const reordered = [
      parts[0],
      parts[1],
      ...parts.slice(4),
      parts[2],
      parts[3],
    ];
    const answer = arrangeAnswer(w, reordered);
    expect(answer).toBe("Please take the cost of transport into account.");
    expect(
      grade(w, { id: "a", wordId: w.id, kind: "arrange", round: 2 }, answer),
    ).toBe(true);
  });
  it("completes all four exercise types, retries errors, then reviews the learned batch next day", () => {
    let learning = emptyLearning();
    for (const mode of ["learn", "review"] as const) {
      const day = mode === "learn" ? "2026-10-30" : "2026-10-31";
      const id =
        mode === "learn" ? "pilot-learn" : pendingReview(learning, day)[0].id;
      let s = createSession(words, mode, id, day);
      s = advance(s, false);
      expect(s.completed).toHaveLength(0);
      let attempts = 0;
      while (s.queue.length && attempts++ < 100) {
        const task = s.queue[0],
          w = words.find((w) => w.id === task.wordId)!;
        const answer =
          task.kind === "listen"
            ? w.headword
            : task.kind === "gap"
              ? w.gapAnswers[0]
              : task.kind === "recall"
                ? w.recallAnswers[0]
                : task.kind === "meaning"
                  ? w.meaningVi
                  : arrangeAnswer(w, sentenceParts(w));
        expect(grade(w, task, answer)).toBe(true);
        s = advance(s, true);
      }
      expect(s.completed).toHaveLength(40);
      learning = commitBatch(learning, {
        id,
        mode,
        day,
        wordIds: words.map((w) => w.id),
        seconds: 300,
        completedAt: day + "T09:00:00+07:00",
      });
      expect(pendingReview(learning, day)).toHaveLength(0);
      expect(dailyStats(learning, day).tickets).toBe(1);
    }
  });
});
