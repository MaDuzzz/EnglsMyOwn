import type { RichVocabulary } from "./vocabulary";
import type { PetSpecies } from "./pets";
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
  pet: {
    name: string;
    color: string;
    gender: string;
    pattern: string;
    species?: PetSpecies;
  };
  activeSession?: SessionDraft | null;
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
  activeSession: null,
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
  return {
    ...s,
    records: [...s.records, record],
    activeSession: s.activeSession?.id === record.id ? null : s.activeSession,
  };
}
// Completed batches are append-only. A delayed Firestore snapshot must not
// replace a batch that this device has already confirmed as saved.
export function preserveCompletedBatches(
  current: Learning,
  incoming: Learning,
): Learning {
  const incomingIds = new Set(incoming.records.map((record) => record.id));
  return current.records.some((record) => !incomingIds.has(record.id))
    ? current
    : incoming;
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
export type SessionDraft = {
  version: 1;
  id: string;
  mode: Mode;
  day: string;
  wordIds: string[];
  queue: Task[];
  completed: string[];
  introduced: string[];
  round: number;
  answer: string;
  tokens: number[];
  feedback: boolean | null;
  seconds: number;
  updatedAt: number;
};

function hash(value: string) {
  let result = 2166136261;
  for (const character of value)
    result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}
export type LearningGroup =
  "all" | "verbs" | "adjectives" | "collocations" | "nouns" | "other";
export function learningGroupOf(word: Word): Exclude<LearningGroup, "all"> {
  if (/^colloc[-_]/i.test(word.id)) return "collocations";
  if (/^adj[-_]/i.test(word.id)) return "adjectives";
  if (/^verb[-_]/i.test(word.id)) return "verbs";
  if (/^noun[-_]/i.test(word.id)) return "nouns";
  if (word.itemType && word.itemType !== "word") return "collocations";
  const part = word.partOfSpeech.toLowerCase();
  if (/adject|\badj\b/.test(part)) return "adjectives";
  if (/\bverb\b/.test(part)) return "verbs";
  if (/\bnoun\b/.test(part)) return "nouns";
  return "other";
}
export function wordTopicKeys(word: Word): string[] {
  const values = word.topicIds?.length ? word.topicIds : [word.topic];
  return [
    ...new Set(
      values
        .flatMap((value) => value.split(","))
        .map((value) =>
          value.trim().replaceAll("_", " ").replace(/\s+/g, " ").toLowerCase(),
        )
        .filter(Boolean),
    ),
  ];
}
function wordKind(word: Word) {
  if (word.itemType && word.itemType !== "word") return word.itemType;
  const part = word.partOfSpeech.toLowerCase();
  if (/adject|\badj\b/.test(part)) return "adjective";
  if (/\bverb\b/.test(part)) return "verb";
  if (/\bnoun\b/.test(part)) return "noun";
  if (/\badverb\b/.test(part)) return "adverb";
  return part || "word";
}
export function selectLearningBatch(
  words: Word[],
  day: string,
  size = 10,
  topic = "",
) {
  const focused = topic
    ? words.filter((word) => wordTopicKeys(word).includes(topic))
    : words;
  const selected = pickLearningBatch(focused, day, size);
  if (selected.length < size) {
    const chosen = new Set(selected.map((word) => word.id));
    selected.push(
      ...pickLearningBatch(
        words.filter((word) => !chosen.has(word.id)),
        day,
        size - selected.length,
      ),
    );
  }
  return selected;
}
function pickLearningBatch(words: Word[], day: string, size: number) {
  const groups = new Map<string, Word[]>();
  for (const word of words) {
    const kind = wordKind(word);
    groups.set(kind, [...(groups.get(kind) || []), word]);
  }
  const kinds = [...groups.keys()].sort(
    (a, b) => hash(`${day}:${a}`) - hash(`${day}:${b}`) || a.localeCompare(b),
  );
  for (const [kind, group] of groups)
    group.sort(
      (a, b) =>
        hash(`${day}:${kind}:${a.id}`) - hash(`${day}:${kind}:${b.id}`) ||
        a.id.localeCompare(b.id),
    );
  const selected: Word[] = [];
  while (selected.length < size && kinds.length) {
    for (let i = 0; i < kinds.length && selected.length < size;) {
      const group = groups.get(kinds[i])!;
      const word = group.shift();
      if (word) selected.push(word);
      if (!group.length) kinds.splice(i, 1);
      else i++;
    }
  }
  return selected;
}

export function makeSessionDraft(
  session: Session,
  input: Pick<SessionDraft, "answer" | "tokens" | "feedback" | "seconds">,
  updatedAt = Date.now(),
): SessionDraft {
  return {
    version: 1,
    id: session.id,
    mode: session.mode,
    day: session.day,
    wordIds: session.words.map((word) => word.id),
    queue: session.queue,
    completed: session.completed,
    introduced: session.introduced,
    round: session.round,
    ...input,
    updatedAt,
  };
}

export function restoreSession(
  draft: SessionDraft,
  catalog: Word[],
): Session | null {
  if (
    draft?.version !== 1 ||
    typeof draft.id !== "string" ||
    !draft.id ||
    !["learn", "review"].includes(draft.mode) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.day) ||
    !Array.isArray(draft.wordIds) ||
    draft.wordIds.length !== 10 ||
    !draft.wordIds.every((id) => typeof id === "string") ||
    new Set(draft.wordIds).size !== 10 ||
    !Array.isArray(draft.queue) ||
    draft.queue.length > 40 ||
    !draft.queue.every(
      (task) =>
        task &&
        typeof task === "object" &&
        typeof task.id === "string" &&
        typeof task.wordId === "string" &&
        Number.isInteger(task.round) &&
        (task.refresher === undefined || typeof task.refresher === "boolean"),
    ) ||
    !Array.isArray(draft.completed) ||
    draft.completed.length > 40 ||
    !draft.completed.every((id) => typeof id === "string") ||
    !Array.isArray(draft.introduced) ||
    draft.introduced.length > 10 ||
    !draft.introduced.every((id) => typeof id === "string") ||
    !Number.isInteger(draft.round) ||
    draft.round < 1 ||
    draft.round > 4 ||
    typeof draft.answer !== "string" ||
    draft.answer.length > 500 ||
    !Array.isArray(draft.tokens) ||
    draft.tokens.length > 50 ||
    !draft.tokens.every((token) => Number.isInteger(token) && token >= 0) ||
    ![true, false, null].includes(draft.feedback) ||
    !Number.isFinite(draft.seconds) ||
    draft.seconds < 0 ||
    !Number.isSafeInteger(draft.updatedAt) ||
    draft.updatedAt < 0
  )
    return null;
  const byId = new Map(catalog.map((word) => [word.id, word]));
  const words = draft.wordIds.map((id) => byId.get(id));
  if (words.some((word) => !word)) return null;
  const validTasks = new Map(
    tasksFor(words as Word[]).map((task) => [task.id, task]),
  );
  if (
    draft.queue.some(
      (task) =>
        !validTasks.has(task.id) ||
        validTasks.get(task.id)?.wordId !== task.wordId ||
        validTasks.get(task.id)?.kind !== task.kind ||
        validTasks.get(task.id)?.round !== task.round,
    ) ||
    draft.completed.some((id) => !validTasks.has(id)) ||
    draft.introduced.some((id) => !draft.wordIds.includes(id))
  )
    return null;
  const sessionWords = words as Word[];
  const oldLearningOrder =
    draft.mode === "learn" &&
    (draft.queue.length > 10 ||
      draft.queue.some((task) => task.round !== draft.queue[0]?.round) ||
      (draft.queue[0] && draft.round !== draft.queue[0].round));
  let queue = draft.queue;
  let round = draft.round;
  if (oldLearningOrder) {
    const unfinished = tasksFor(sessionWords).filter(
      (task) => !draft.completed.includes(task.id),
    );
    const firstRound = Math.min(...unfinished.map((task) => task.round));
    const current = draft.introduced.length === 10 ? draft.queue[0] : undefined;
    const roundTasks = unfinished.filter(
      (task) => task.round === firstRound && task.id !== current?.id,
    );
    queue = current ? [current, ...roundTasks] : roundTasks;
    round = queue[0]?.round || firstRound;
  }
  return {
    id: draft.id,
    mode: draft.mode,
    day: draft.day,
    words: sessionWords,
    queue,
    completed: draft.completed,
    introduced: draft.introduced,
    round,
    seconds: draft.seconds,
  };
}
export function checkpointSession(
  learning: Learning,
  draft: SessionDraft,
): Learning {
  if (learning.records.some((record) => record.id === draft.id))
    return learning;
  if ((learning.activeSession?.updatedAt || 0) > draft.updatedAt)
    return learning;
  return { ...learning, activeSession: draft };
}
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
    queue: all.filter((t) => t.round === 1),
    completed: [],
    introduced: [],
    round: 1,
    seconds: 0,
  };
}
export function nextIntroduction(s: Session): Word | undefined {
  if (s.mode !== "learn") return undefined;
  const seen = new Set(s.introduced);
  return s.words.find((word) => !seen.has(word.id));
}
export function introduceWord(s: Session): Session {
  const word = nextIntroduction(s);
  return word ? { ...s, introduced: [...s.introduced, word.id] } : s;
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
  } else if (!queue.length || queue[0].round === task.round) {
    const index = Math.min(2, queue.length);
    queue.splice(index, 0, { ...task, refresher: index < 2 });
  }
  if (!queue.length && completed.length < 40) {
    const unfinished = tasksFor(s.words).filter(
      (candidate) => !completed.includes(candidate.id),
    );
    round = Math.min(...unfinished.map((candidate) => candidate.round));
    queue = unfinished.filter((candidate) => candidate.round === round);
  }
  if (queue.length) round = queue[0].round;
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
