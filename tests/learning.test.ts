import { describe, it, expect } from "vitest";
import {
  advance,
  createSession,
  grade,
  dayKey,
  emptyLearning,
  planFor,
  pendingReview,
  commitBatch,
  dailyStats,
  tasksFor,
  petGrowth,
  shuffledTokens,
} from "../src/lib/model";
import { words } from "../src/data/demo";
import { validateImport } from "../src/lib/content";
import canonicalDraft from "../docs/content/vocabulary.example.json";
const batch = words.slice(0, 10);
describe("word sessions", () => {
  it("scrambles seven-word sentences without losing or duplicating tokens", () => {
    const order = shuffledTokens(7, "demo_helpful");
    expect(order).not.toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect([...order].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it("assigns 40 distinct tasks and exactly five of each sentence subtype", () => {
    const tasks = tasksFor(batch);
    expect(new Set(tasks.map((t) => t.id)).size).toBe(40);
    expect(tasks.filter((t) => t.kind === "gap")).toHaveLength(5);
    expect(tasks.filter((t) => t.kind === "arrange")).toHaveLength(5);
  });
  it("keeps a wrong task in the same round after two other questions", () => {
    let s = createSession(batch, "review", "r");
    const id = s.queue[0].id;
    s = advance(s, false);
    expect(s.completed).toHaveLength(0);
    expect(s.queue[2].id).toBe(id);
    expect(s.round).toBe(1);
  });
  it("refreshes at the tail instead of advancing rounds or creating tasks", () => {
    let s = createSession(batch, "review", "r");
    for (let i = 0; i < 9; i++) s = advance(s, true);
    const id = s.queue[0].id;
    s = advance(s, false);
    expect(s.round).toBe(1);
    expect(s.queue[0]).toMatchObject({ id, refresher: true });
    expect(s.completed).toHaveLength(9);
    s = advance(s, true);
    expect(s.round).toBe(2);
    expect(s.queue).toHaveLength(10);
  });
  it("finishes only after all forty tasks and gives no duplicate credit", () => {
    let s = createSession(batch, "review", "r");
    for (let i = 0; i < 40; i++) s = advance(s, true);
    expect(s.completed).toHaveLength(40);
    expect(s.queue).toHaveLength(0);
    expect(advance(s, true).completed).toHaveLength(40);
  });
  it("new learning presents four task types per word and does not count introductions", () => {
    let s = createSession(batch, "learn", "l");
    expect(s.queue.slice(0, 4).every((t) => t.wordId === batch[0].id)).toBe(
      true,
    );
    s = { ...s, introduced: [batch[0].id] };
    expect(s.completed).toHaveLength(0);
  });
  it("normalizes case and whitespace, but rejects spelling errors", () => {
    const t = tasksFor(batch)[0];
    expect(grade(batch[0], t, "  PATIENT  ")).toBe(true);
    expect(grade(batch[0], t, "paitent")).toBe(false);
  });
  it("has Vietnam midnight boundaries", () => {
    expect(dayKey(new Date("2026-10-30T16:59:59Z"))).toBe("2026-10-30");
    expect(dayKey(new Date("2026-10-30T17:00:00Z"))).toBe("2026-10-31");
  });
});
describe("assignment, gating and rewards", () => {
  it("does not award new-word credit twice when two tabs finish the same words", () => {
    const record = {
      id: "tab-a",
      mode: "learn" as const,
      day: "2026-10-30",
      wordIds: batch.map((w) => w.id),
      seconds: 100,
      completedAt: "",
    };
    const once = commitBatch(emptyLearning(), record);
    expect(commitBatch(once, record)).toBe(once);
    expect(() => commitBatch(once, { ...record, id: "tab-b" })).toThrow(
      "already completed",
    );
  });
  const day = "2026-10-30";
  const source = {
    id: "old",
    mode: "learn" as const,
    day: "2026-10-28",
    wordIds: batch.map((w) => w.id),
    seconds: 400,
    completedAt: "",
  };
  it("blocks new learning while older review remains even with no yesterday words", () => {
    const s = { ...emptyLearning(), records: [source] };
    expect(pendingReview(s, day)).toHaveLength(1);
    expect(() => commitBatch(s, { ...source, id: "new", day })).toThrow(
      "Finish all required review",
    );
  });
  it("carries unfinished review forward without duplicate source batches", () => {
    let s = { ...emptyLearning(), records: [source] };
    s.plans["2026-10-29"] = planFor(s, "2026-10-29");
    expect(planFor(s, day)).toHaveLength(1);
    expect(planFor(s, day)[0].id).toContain("2026-10-29");
  });
  it("awards only one ticket per batch and feeds only after review plus new batch", () => {
    let s = { ...emptyLearning(), records: [source] };
    s.plans[day] = planFor(s, day);
    const r = {
      ...source,
      id: s.plans[day][0].id,
      day,
      mode: "review" as const,
    };
    s = commitBatch(s, r);
    expect(dailyStats(s, day)).toMatchObject({
      tickets: 1,
      required: 2,
      meal: false,
    });
    const next = commitBatch(s, r);
    expect(next.records).toHaveLength(2);
    s = commitBatch(s, {
      ...source,
      id: "new",
      day,
      wordIds: words.slice(10).map((w) => w.id),
    });
    expect(dailyStats(s, day)).toMatchObject({
      tickets: 2,
      meal: true,
      learned: 10,
    });
  });
  it("unlocks a true first day without generating phantom review", () => {
    expect(pendingReview(emptyLearning(), day)).toHaveLength(0);
  });
});
describe("publishing validation", () => {
  it("accepts the agreed nested collection format without inventing a CEFR level", () => {
    const result = validateImport({ words: [canonicalDraft], lessons: [] });
    expect(result.words[0].headword).toBe("get along");
    expect(result.words[0].gapAnswers).toEqual(["get along"]);
    expect(result.words[0].cefrLevel).toBe("Unverified");
    expect(result.words[0].status).toBe("draft");
  });
  it("rejects sample content and malformed gap tasks", () => {
    expect(() => validateImport({ words: [words[0]], lessons: [] })).toThrow(
      "Sample",
    );
    expect(() =>
      validateImport({
        words: [
          { ...words[0], id: "real", status: "draft", gapTemplate: "no gap" },
        ],
        lessons: [],
      }),
    ).toThrow("exactly one");
  });
  it("requires a real audio source and distinct distractors", () => {
    expect(() =>
      validateImport({ words: [{ ...words[0], id: "real" }], lessons: [] }),
    ).toThrow("audio source");
    expect(() =>
      validateImport({
        words: [
          {
            ...words[0],
            id: "real",
            meaningDistractorsVi: [words[0].meaningVi, "a", "b"],
          },
        ],
        lessons: [],
      }),
    ).toThrow("distinct");
  });
});
describe("gradual pet growth", () => {
  it("rewards extra effort but cannot reach a milestone in one day", () => {
    const record = {
      id: "a",
      mode: "learn" as const,
      day: "2026-10-30",
      wordIds: batch.map((w) => w.id),
      seconds: 600,
      completedAt: "",
    };
    const first = { ...emptyLearning(), records: [record] };
    const more = { ...first, records: [record, { ...record, id: "b" }] };
    expect(petGrowth(more, record.day).points).toBeGreaterThan(
      petGrowth(first, record.day).points,
    );
    const marathon = {
      ...first,
      records: Array.from({ length: 100 }, (_, i) => ({
        ...record,
        id: String(i),
      })),
    };
    expect(petGrowth(marathon, record.day).milestone).toBe(1);
    expect(petGrowth(marathon, record.day).points).toBe(25);
  });
});
