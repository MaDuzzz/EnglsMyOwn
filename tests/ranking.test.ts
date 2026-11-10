import { describe, expect, it } from "vitest";
import { emptyLearning, type BatchRecord } from "../src/lib/model";
import {
  bestStreakOf,
  currentStreakOf,
  metricValue,
  rankedEntries,
  rankingEntry,
  weekStart,
  weeklyWordsOf,
} from "../src/lib/ranking";

function completed(day: string, mode: "learn" | "review"): BatchRecord {
  return {
    id: `${mode}:${day}`,
    mode,
    day,
    wordIds: Array.from(
      { length: 10 },
      (_, index) => `${day}-${mode}-${index}`,
    ),
    seconds: 120,
    completedAt: `${day}T12:00:00+07:00`,
  };
}

describe("ranking summaries", () => {
  it("counts completed batches in Vietnam's Monday week and calendar month", () => {
    const learning = emptyLearning();
    learning.records = [
      completed("2026-10-31", "learn"),
      completed("2026-11-01", "learn"),
      completed("2026-11-02", "learn"),
      completed("2026-11-04", "learn"),
      completed("2026-11-04", "review"),
    ];
    for (const record of learning.records) learning.plans[record.day] = [];
    const entry = rankingEntry("learner", "Dung", learning, "2026-11-05");
    expect(weekStart("2026-11-01")).toBe("2026-10-26");
    expect(entry).toMatchObject({
      weekKey: "2026-11-02",
      weekPoints: 50,
      weekDays: 2,
      weekWords: 20,
      monthKey: "2026-11",
      monthWords: 30,
      bestStreak: 3,
      currentStreak: 1,
      lastGoalDay: "2026-11-04",
    });
    expect(bestStreakOf(learning).best).toBe(3);
    expect(metricValue(entry, "words", "2026-12-01")).toBe(0);
    expect(metricValue(entry, "points", "2026-11-09")).toBe(0);
    expect(metricValue(entry, "streak", "2026-12-01")).toBe(3);
    expect(weeklyWordsOf(entry, "2026-11-09")).toBe(0);
    expect(currentStreakOf(entry, "2026-11-06")).toBe(0);
  });

  it("keeps best streak after a break and gives equal scores the same rank", () => {
    const learning = emptyLearning();
    const days = ["2026-11-01", "2026-11-02", "2026-11-03"];
    learning.records = days.map((day) => completed(day, "learn"));
    days.forEach((day) => {
      learning.plans[day] = [];
    });
    const a = rankingEntry("a", "A", learning, "2026-11-10");
    const b = { ...a, uid: "b", displayName: "B" };
    const c = { ...a, uid: "c", displayName: "C", bestStreak: 1 };
    expect(a.bestStreak).toBe(3);
    expect(a.currentStreak).toBe(0);
    expect(
      rankedEntries([c, b, a], "streak", "2026-11-10").map(
        (entry) => entry.rank,
      ),
    ).toEqual([1, 1, 3]);
  });
});
