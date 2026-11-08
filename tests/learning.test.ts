import { describe, it, expect } from "vitest";
import {
  advance,
  createSession,
  selectLearningBatch,
  learningGroupOf,
  wordTopicKeys,
  makeSessionDraft,
  restoreSession,
  checkpointSession,
  nextIntroduction,
  introduceWord,
  grade,
  dayKey,
  emptyLearning,
  planFor,
  pendingReview,
  commitBatch,
  preserveCompletedBatches,
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
  it("keeps imported files in their word groups and fills a chosen topic to ten", () => {
    const verbs = Array.from({ length: 12 }, (_, index) => ({
      ...batch[0],
      id: `verb-${index}`,
      itemType: "word" as const,
      partOfSpeech: "verb",
      topicIds: index < 4 ? ["finance, office_work"] : ["general"],
    }));
    const collocation = {
      ...batch[0],
      id: "colloc-099",
      itemType: "idiom" as const,
      partOfSpeech: "noun",
    };
    expect(learningGroupOf(collocation)).toBe("collocations");
    expect(learningGroupOf(verbs[0])).toBe("verbs");
    expect(learningGroupOf({ ...collocation, id: "noun-157" })).toBe("nouns");
    expect(wordTopicKeys(verbs[0])).toEqual(["finance", "office work"]);
    const selected = selectLearningBatch(verbs, "2026-11-08", 10, "finance");
    expect(selected).toHaveLength(10);
    expect(
      selected
        .slice(0, 4)
        .every((word) => wordTopicKeys(word).includes("finance")),
    ).toBe(true);
    expect(
      selected
        .slice(4)
        .every((word) => wordTopicKeys(word).includes("general")),
    ).toBe(true);
    expect(new Set(selected.map((word) => word.id)).size).toBe(10);
  });
  it("keeps the second completed review when an older progress snapshot arrives", () => {
    const day = "2026-11-08";
    const wordIds = batch.map((word) => word.id);
    const first = {
      id: "review:first",
      mode: "review" as const,
      day,
      wordIds,
      seconds: 180,
      completedAt: "2026-11-08T08:00:00+07:00",
    };
    const second = {
      ...first,
      id: "review:second",
      completedAt: "2026-11-08T09:00:00+07:00",
    };
    const finishedDraft = makeSessionDraft(
      {
        ...createSession(batch, "review", second.id, day),
        queue: [],
        completed: tasksFor(batch).map((task) => task.id),
        round: 4,
      },
      { answer: "", tokens: [], feedback: null, seconds: 180 },
    );
    const old = {
      ...emptyLearning(),
      records: [first],
      activeSession: finishedDraft,
      plans: {
        [day]: [
          { id: first.id, sourceId: "learn:first", wordIds },
          { id: second.id, sourceId: "learn:second", wordIds },
        ],
      },
    };
    const committed = commitBatch(old, second);
    expect(committed.activeSession).toBeNull();
    expect(preserveCompletedBatches(committed, old)).toBe(committed);
    expect(preserveCompletedBatches(old, committed)).toBe(committed);
    expect(dailyStats(committed, day)).toMatchObject({
      reviewed: 20,
      total: 20,
      tickets: 2,
    });
    expect(pendingReview(committed, day)).toHaveLength(0);
  });
  it("mixes available word types without depending on import order", () => {
    const pool = ["adjective", "verb", "collocation"].flatMap((kind) =>
      Array.from({ length: 12 }, (_, i) => ({
        ...batch[0],
        id: `${kind}-${i}`,
        itemType:
          kind === "collocation" ? ("collocation" as const) : ("word" as const),
        partOfSpeech: kind === "collocation" ? "verb" : kind,
      })),
    );
    const selected = selectLearningBatch(pool, "2026-11-07");
    expect(selected).toHaveLength(10);
    expect(new Set(selected.map((word) => word.id)).size).toBe(10);
    expect(new Set(selected.map((word) => word.id.split("-")[0])).size).toBe(3);
    expect(
      selectLearningBatch([...pool].reverse(), "2026-11-07").map((w) => w.id),
    ).toEqual(selected.map((word) => word.id));
    expect(selectLearningBatch(pool.slice(0, 10), "2026-11-07")).toHaveLength(
      10,
    );
  });
  it("restores the exact question, introduction and typed answer", () => {
    let session = createSession(batch, "learn", "unfinished");
    session = introduceWord(introduceWord(session));
    const draft = makeSessionDraft(
      session,
      { answer: "take", tokens: [2, 0], feedback: false, seconds: 137 },
      1234,
    );
    expect(restoreSession(draft, batch)).toEqual({ ...session, seconds: 137 });
    expect(draft).toMatchObject({
      answer: "take",
      tokens: [2, 0],
      feedback: false,
    });
    expect(restoreSession(draft, batch.slice(1))).toBeNull();
    expect(
      restoreSession(
        { ...draft, queue: [null] } as unknown as typeof draft,
        batch,
      ),
    ).toBeNull();
    expect(restoreSession({ ...draft, updatedAt: NaN }, batch)).toBeNull();
    const saved = checkpointSession(emptyLearning(), draft);
    expect(checkpointSession(saved, { ...draft, updatedAt: 1200 })).toBe(saved);
    expect(
      commitBatch(saved, {
        id: "unfinished",
        mode: "learn",
        day: "2026-11-07",
        wordIds: batch.map((word) => word.id),
        seconds: 137,
        completedAt: "",
      }).activeSession,
    ).toBeNull();
  });
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
  it("introduces all ten words before any practice task earns progress", () => {
    let s = createSession(batch, "learn", "l");
    expect(s.queue).toHaveLength(10);
    expect(s.queue.map((task) => task.wordId)).toEqual(batch.map((w) => w.id));
    expect(s.queue.every((task) => task.kind === "listen")).toBe(true);
    for (const word of batch) {
      expect(nextIntroduction(s)?.id).toBe(word.id);
      s = introduceWord(s);
      expect(s.queue[0].wordId).toBe(batch[0].id);
      expect(s.completed).toHaveLength(0);
    }
    expect(nextIntroduction(s)).toBeUndefined();
    expect(introduceWord(s)).toBe(s);
    s = advance(s, true);
    expect(s.completed).toHaveLength(1);
  });
  it("practises new words in four skill rounds without repeating a word immediately", () => {
    let s = createSession(batch, "learn", "l");
    for (let round = 1; round <= 4; round++) {
      expect(s.round).toBe(round);
      expect(s.queue).toHaveLength(10);
      expect(s.queue.map((task) => task.wordId)).toEqual(
        batch.map((word) => word.id),
      );
      expect(s.queue.every((task) => task.round === round)).toBe(true);
      for (let i = 0; i < 10; i++) s = advance(s, true);
    }
    expect(s.completed).toHaveLength(40);
    expect(s.queue).toHaveLength(0);
  });
  it("keeps wrong new-word answers within their skill round", () => {
    let s = createSession(batch, "learn", "l");
    const wrong = s.queue[0].id;
    s = advance(s, false);
    expect(s.queue[2].id).toBe(wrong);
    for (let i = 0; i < 9; i++) s = advance(s, true);
    expect(s.round).toBe(1);
    expect(s.completed).toHaveLength(9);
    expect(s.queue).toHaveLength(1);
    s = advance(s, true);
    expect(s.round).toBe(2);
    expect(s.completed).toHaveLength(10);
  });
  it("migrates an old per-word learning queue while preserving the current answer", () => {
    const oldQueue = tasksFor(batch);
    const oldSession = {
      ...createSession(batch, "learn", "legacy"),
      queue: oldQueue.slice(2),
      completed: oldQueue.slice(0, 2).map((task) => task.id),
      introduced: batch.map((word) => word.id),
    };
    const draft = makeSessionDraft(oldSession, {
      answer: "partial",
      tokens: [],
      feedback: null,
      seconds: 30,
    });
    const restored = restoreSession(draft, batch)!;
    expect(restored.queue[0].id).toBe(oldQueue[2].id);
    expect(restored.completed).toEqual(oldSession.completed);
    expect(restored.queue.slice(1).every((task) => task.round === 1)).toBe(
      true,
    );
    const next = advance(restored, true);
    expect(next.round).toBe(1);
    expect(next.queue[0].round).toBe(1);
    expect(draft.answer).toBe("partial");
    let retried = advance(restored, false);
    expect(retried.queue.every((task) => task.round === 1)).toBe(true);
    for (let i = 0; i < 9; i++) retried = advance(retried, true);
    expect(retried.round).toBe(2);
    for (let i = 0; i < 9; i++) retried = advance(retried, true);
    expect(retried.round).toBe(3);
    expect(retried.queue.some((task) => task.id === oldQueue[2].id)).toBe(true);
  });
  it("starts a saved legacy introduction with the new listening round", () => {
    const legacy = {
      ...createSession(batch, "learn", "old-intro"),
      queue: tasksFor(batch),
    };
    const draft = makeSessionDraft(legacy, {
      answer: "",
      tokens: [],
      feedback: null,
      seconds: 5,
    });
    const restored = restoreSession(draft, batch)!;
    expect(restored.queue).toHaveLength(10);
    expect(restored.queue.every((task) => task.round === 1)).toBe(true);
    expect(nextIntroduction(restored)?.id).toBe(batch[0].id);
  });
  it("review begins directly with listening questions", () => {
    const s = createSession(batch, "review", "r");
    expect(nextIntroduction(s)).toBeUndefined();
    expect(s.queue[0].kind).toBe("listen");
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
