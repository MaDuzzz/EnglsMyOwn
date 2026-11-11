import {
  dailyStats,
  petGrowth,
  previousDay,
  streak,
  type Learning,
} from "./model";
import { appearanceOf, growthStage } from "./pets";

export type RankingMetric = "points" | "streak" | "words";
export type RankingEntry = {
  uid: string;
  displayName: string;
  appearance: "cat" | "dog" | "lion" | "lioness" | "tiger";
  petStage: number;
  petName?: string;
  petAgeDays?: number;
  weekKey: string;
  weekPoints: number;
  weekDays: number;
  weekWords: number;
  monthKey: string;
  monthWords: number;
  bestStreak: number;
  currentStreak: number;
  lastGoalDay: string;
  updatedDay: string;
};

export function weekStart(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, count: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function bestStreakOf(data: Learning): {
  best: number;
  lastGoalDay: string;
} {
  // A goal day necessarily includes a completed new-word batch. Check only
  // those dates instead of scanning every date since the first account login.
  const days = [
    ...new Set(
      data.records.filter((r) => r.mode === "learn").map((r) => r.day),
    ),
  ]
    .filter((day) => dailyStats(data, day).meal)
    .sort();
  let best = 0;
  let run = 0;
  let previous = "";
  for (const day of days) {
    run = previous === previousDay(day) ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return { best, lastGoalDay: previous };
}

export function rankingEntry(
  uid: string,
  displayName: string,
  data: Learning,
  today: string,
): RankingEntry {
  const weekKey = weekStart(today);
  const monthKey = today.slice(0, 7);
  const unique = [
    ...new Map(data.records.map((record) => [record.id, record])).values(),
  ];
  const weekly = unique.filter(
    (record) => record.day >= weekKey && record.day <= today,
  );
  const monthly = unique.filter(
    (record) => record.day.startsWith(monthKey) && record.day <= today,
  );
  const { best, lastGoalDay } = bestStreakOf(data);
  const growth = petGrowth(data, today);
  return {
    uid,
    displayName: displayName.trim().slice(0, 40) || "Learner",
    appearance: appearanceOf(data.pet),
    petStage: growthStage(growth.points).index,
    petName: data.pet.name.trim().slice(0, 24) || "Mochi",
    petAgeDays: growth.ageDays,
    weekKey,
    weekPoints: weekly.reduce(
      (sum, record) => sum + (record.mode === "learn" ? 20 : 10),
      0,
    ),
    weekDays: new Set(weekly.map((record) => record.day)).size,
    weekWords: weekly.filter((record) => record.mode === "learn").length * 10,
    monthKey,
    monthWords: monthly.filter((record) => record.mode === "learn").length * 10,
    bestStreak: best,
    currentStreak: streak(data, today),
    lastGoalDay,
    updatedDay: today,
  };
}

export function metricValue(
  entry: RankingEntry,
  metric: RankingMetric,
  today: string,
): number {
  if (metric === "streak") return entry.bestStreak;
  if (metric === "words")
    return entry.monthKey === today.slice(0, 7) ? entry.monthWords : 0;
  return entry.weekKey === weekStart(today) ? entry.weekPoints : 0;
}

export function currentStreakOf(entry: RankingEntry, today: string): number {
  return entry.lastGoalDay === today || entry.lastGoalDay === previousDay(today)
    ? entry.currentStreak
    : 0;
}

export function weeklyWordsOf(entry: RankingEntry, today: string): number {
  return entry.weekKey === weekStart(today) ? entry.weekWords : 0;
}

export function rankedEntries(
  entries: RankingEntry[],
  metric: RankingMetric,
  today: string,
) {
  const ordered = [...entries].sort(
    (a, b) =>
      metricValue(b, metric, today) - metricValue(a, metric, today) ||
      a.displayName.localeCompare(b.displayName) ||
      a.uid.localeCompare(b.uid),
  );
  return ordered.map((entry, index) => ({
    ...entry,
    rank:
      index > 0 &&
      metricValue(entry, metric, today) ===
        metricValue(ordered[index - 1], metric, today)
        ? ordered.findIndex(
            (candidate) =>
              metricValue(candidate, metric, today) ===
              metricValue(entry, metric, today),
          ) + 1
        : index + 1,
  }));
}
