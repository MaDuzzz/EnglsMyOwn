import type { RichVocabulary } from "./vocabulary";
export type Mode = "review" | "learn";
export type Word = RichVocabulary & {
  sourceRef?: string;
  cefrSource?: string;
  id: string;
  headword: string;
  partOfSpeech: string;
  cefrLevel: string;
  topic: string;
  meaningEn: string;
  meaningVi: string;
  ipaUS: string;
  ipaUK: string;
  audioUS?: string;
  audioUK?: string;
  commonPattern: string;
  exampleEn: string;
  exampleVi: string;
  gapTemplate: string;
  acceptedSpellings: string[];
  gapAnswers: string[];
  recallPromptVi: string;
  recallAnswers: string[];
  gapExplanationVi?: string;
  recallExplanationVi?: string;
  sentenceTokens?: string[];
  arrangementAnswers?: string[];
  meaningDistractorsVi: string[];
  status: "published" | "draft";
};
export type Lesson = {
  id: string;
  title: string;
  topic: string;
  level: string;
  duration: string;
  driveFileId: string;
  palette: string;
  lines: { id: string; time: string; en: string; vi: string }[];
  status: "published" | "draft";
};
export type BatchRecord = {
  id: string;
  mode: Mode;
  day: string;
  wordIds: string[];
  seconds: number;
  completedAt: string;
};
export type Requirement = { id: string; sourceId: string; wordIds: string[] };
export type VideoProgress = {
  step: number;
  listens: number;
  watches: number;
  saved: string[];
  drafts: Record<string, string>;
  muted: boolean;
  quizDone: string[];
  completed: boolean;
};
export type Learning = {
  records: BatchRecord[];
  plans: Record<string, Requirement[]>;
  videos: Record<string, VideoProgress>;
  savedVideos: string[];
  pet: { name: string; color: string; gender: string; pattern: string };
};
export const emptyLearning = (): Learning => ({
  records: [],
  plans: {},
  videos: {},
  savedVideos: [],
  pet: {
    name: "Mochi",
    color: "cream",
    gender: "unspecified",
    pattern: "solid",
  },
});
export const emptyVideo = (): VideoProgress => ({
  step: 0,
  listens: 0,
  watches: 0,
  saved: [],
  drafts: {},
  muted: false,
  quizDone: [],
  completed: false,
});
export function dayKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function previousDay(day: string): string {
  return new Date(new Date(day + "T00:00:00Z").getTime() - 86400000)
    .toISOString()
    .slice(0, 10);
}
export function planFor(s: Learning, day: string): Requirement[] {
  if (s.plans[day]) return s.plans[day];
  const done = new Set(s.records.map((r) => r.id));
  const pending = Object.entries(s.plans)
    .filter(([d]) => d < day)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, rs]) => rs)
    .filter((r) => !done.has(r.id));
  const sources = s.records.filter((r) => r.mode === "learn" && r.day < day);
  const dates = [
    ...new Set(sources.map((r) => r.day).filter((d) => d < previousDay(day))),
  ].sort();
  const seed = [...day].reduce((a, c) => a * 31 + c.charCodeAt(0), 0) >>> 0;
  const older = dates.length ? dates[seed % dates.length] : undefined;
  const chosen = sources
    .filter((r) => r.day === previousDay(day) || r.day === older)
    .map((r) => ({
      id: `review:${day}:${r.id}`,
      sourceId: r.id,
      wordIds: r.wordIds,
    }));
  const seen = new Set<string>();
  return [...pending, ...chosen].filter((r) => {
    if (seen.has(r.sourceId)) return false;
    seen.add(r.sourceId);
    return true;
  });
}
export function pendingReview(s: Learning, day = dayKey()) {
  const done = new Set(s.records.map((r) => r.id));
  return planFor(s, day).filter((r) => !done.has(r.id));
}
export function dailyStats(s: Learning, day = dayKey()) {
  const plan = planFor(s, day),
    done = new Set(s.records.map((r) => r.id));
  const reviewed = plan.filter((r) => done.has(r.id)).length;
  const learned = s.records.filter(
    (r) => r.day === day && r.mode === "learn",
  ).length;
  return {
    total: plan.length * 10,
    reviewed: reviewed * 10,
    tickets: reviewed + Math.min(learned, 1),
    required: plan.length + 1,
    meal: reviewed === plan.length && learned > 0,
    learned: learned * 10,
  };
}
export function commitBatch(s: Learning, record: BatchRecord): Learning {
  if (s.records.some((r) => r.id === record.id)) return s;
  if (record.wordIds.length !== 10 || new Set(record.wordIds).size !== 10)
    throw Error("A batch must contain ten unique words.");
  if (record.mode === "learn" && pendingReview(s, record.day).length)
    throw Error("Finish all required review first.");
  if (
    record.mode === "learn" &&
    record.wordIds.some((id) => learnedIds(s).has(id))
  )
    throw Error(
      "These words were already completed in another session. Return to Words to choose a fresh batch.",
    );
  return { ...s, records: [...s.records, record] };
}
export const normalize = (s: string) =>
  s
    .normalize("NFC")
    .replace(/[‘’]/g, "'")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
export function shuffledTokens(length: number, seedText: string): number[] {
  const order = Array.from({ length }, (_, i) => i);
  let seed =
    [...seedText].reduce((n, c) => Math.imul(n, 31) + c.charCodeAt(0), 17) >>>
    0;
  for (let i = length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (length > 1 && order.every((value, i) => value === i))
    [order[0], order[1]] = [order[1], order[0]];
  return order;
}
export type Task = {
  id: string;
  wordId: string;
  kind: "listen" | "gap" | "arrange" | "meaning" | "recall";
  round: number;
  refresher?: boolean;
};
export type Session = {
  id: string;
  mode: Mode;
  day: string;
  words: Word[];
  queue: Task[];
  completed: string[];
  introduced: string[];
  round: number;
  seconds: number;
};
export function tasksFor(words: Word[]): Task[] {
  return words.flatMap((w, i) =>
    ["listen", i % 2 === 0 ? "gap" : "arrange", "meaning", "recall"].map(
      (kind, j) => ({
        id: `${w.id}:${j}`,
        wordId: w.id,
        kind: kind as Task["kind"],
        round: j + 1,
      }),
    ),
  );
}
export function createSession(
  words: Word[],
  mode: Mode,
  id: string,
  day = dayKey(),
): Session {
  if (words.length !== 10) throw Error("This batch needs ten words.");
  const all = tasksFor(words);
  return {
    id,
    mode,
    day,
    words,
    queue: mode === "review" ? all.filter((t) => t.round === 1) : all,
    completed: [],
    introduced: [],
    round: 1,
    seconds: 0,
  };
}
export function grade(word: Word, task: Task, answer: string) {
  const expected =
    task.kind === "listen"
      ? word.acceptedSpellings
      : task.kind === "gap"
        ? word.gapAnswers
        : task.kind === "recall"
          ? word.recallAnswers
          : task.kind === "meaning"
            ? [word.meaningVi]
            : word.arrangementAnswers || [word.exampleEn];
  return expected.some((a) => normalize(a) === normalize(answer));
}
export function sentenceParts(word: Word): string[] {
  const tokens = word.sentenceTokens?.length
    ? word.sentenceTokens
    : word.exampleEn.split(/\s+/);
  return tokens.map((t) => t.replace(/[.!?]+$/, ""));
}
export function arrangeAnswer(word: Word, parts: string[]): string {
  if (!parts.length) return "";
  return parts.join(" ") + (word.exampleEn.match(/[.!?]+$/)?.[0] || "");
}
export function advance(s: Session, correct: boolean): Session {
  const task = s.queue[0];
  if (!task) return s;
  let queue = s.queue.slice(1);
  let completed = [...s.completed];
  let round = s.round;
  if (correct) {
    if (!completed.includes(task.id)) completed.push(task.id);
  } else {
    const index = Math.min(2, queue.length);
    queue.splice(index, 0, { ...task, refresher: index < 2 });
  }
  if (!queue.length && s.mode === "review" && round < 4) {
    round++;
    queue = tasksFor(s.words).filter(
      (t) => t.round === round && !completed.includes(t.id),
    );
  }
  return { ...s, queue, completed, round };
}
export function learnedIds(s: Learning) {
  return new Set(
    s.records.filter((r) => r.mode === "learn").flatMap((r) => r.wordIds),
  );
}
// Pilot tuning: effort adds growth, with a calendar-age ceiling so a pet
// cannot mature in one marathon session. Not an assessment of proficiency.
export function petGrowth(s: Learning, today = dayKey()) {
  const first = s.records.map((r) => r.day).sort()[0];
  const age = first
    ? Math.max(
        1,
        Math.floor((Date.parse(today) - Date.parse(first)) / 86400000) + 1,
      )
    : 0;
  const effort = s.records.reduce(
    (sum, r) =>
      sum + (r.mode === "learn" ? 10 : 7) + Math.max(0, r.seconds) / 600,
    0,
  );
  const points = Math.min(effort, age * 25);
  const milestone = Math.floor(points / 500) + 1;
  return { points: Math.floor(points), percent: (points % 500) / 5, milestone };
}
export function streak(s: Learning, day = dayKey()) {
  let count = 0;
  let d = dailyStats(s, day).meal ? day : previousDay(day);
  while (dailyStats(s, d).meal && count < 10000) {
    count++;
    d = previousDay(d);
  }
  return count;
}
