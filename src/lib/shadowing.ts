import programs from "../../design/shadowing/pilot-01-audio/programs.json";

export const shadowingLessonId = "pilot-01";
export const repeatChoices = [1, 3, 5, 7] as const;
export type RepeatCount = (typeof repeatChoices)[number];

export type ShadowingLine = {
  id: number;
  speaker: string;
  text: string;
  translation: string;
  pauseSeconds: number;
};
export type ShadowingLesson = {
  id: string;
  status: "published";
  title: string;
  level: string;
  summary: string;
  warmupDuration: number;
  shadowingDuration: number;
  betweenRoundsSeconds: number;
  programDurations?: Record<"1" | "3" | "5" | "7", number>;
  lines: ShadowingLine[];
  warmupCues: { line: number; start: number; end: number }[];
  shadowingCues: {
    line: number;
    firstStart: number;
    firstEnd: number;
    replayStart: number;
    replayEnd: number;
  }[];
};

const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export function validateShadowingImport(value: unknown): ShadowingLesson {
  if (!value || typeof value !== "object") throw Error("Choose a Shadowing cues.json file.");
  const source = value as Record<string, unknown>;
  const pilot = source.title === "The Interview Detour" && !source.id;
  const id = pilot ? shadowingLessonId : source.id;
  const level = pilot ? "B1" : source.level;
  const summary = pilot ? "A wrong train before a job interview." : source.summary;
  const betweenRoundsSeconds = pilot ? programs.gapSeconds : source.betweenRoundsSeconds;
  const programDurations = pilot
    ? Object.fromEntries(repeatChoices.map((count) => [String(count),
        programs.programs[String(count) as keyof typeof programs.programs].duration]))
    : source.programDurations;
  const lines = source.lines as ShadowingLine[];
  const warmupCues = source.warmupCues as ShadowingLesson["warmupCues"];
  const shadowingCues = source.shadowingCues as ShadowingLesson["shadowingCues"];
  if (
    typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 64 ||
    typeof source.title !== "string" || !source.title.trim() || source.title.length > 100 ||
    typeof level !== "string" || !/^(A2|B1|B2|C1)$/.test(level) ||
    typeof summary !== "string" || !summary.trim() || summary.length > 180 ||
    !positive(source.warmupDuration) ||
    !positive(source.shadowingDuration) ||
    !positive(betweenRoundsSeconds) || betweenRoundsSeconds > 20 ||
    !programDurations || typeof programDurations !== "object" ||
    !repeatChoices.every((count) => positive(
      (programDurations as Record<string, unknown>)[String(count)])) ||
    !Array.isArray(lines) || lines.length < 8 || lines.length > 40 ||
    !Array.isArray(warmupCues) || warmupCues.length !== lines.length ||
    !Array.isArray(shadowingCues) || shadowingCues.length !== lines.length
  ) throw Error("The Shadowing lesson or timing data is incomplete.");
  for (const count of repeatChoices) {
    const expected = (source.warmupDuration as number) + count * (source.shadowingDuration as number)
      + (count - 1) * (betweenRoundsSeconds as number);
    if (Math.abs((programDurations as Record<string, number>)[String(count)] - expected) > 2)
      throw Error(`The ${count}× audio duration does not match its timing map.`);
  }
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const warmup = warmupCues[index];
    const practice = shadowingCues[index];
    if (
      line?.id !== index + 1 ||
      typeof line.speaker !== "string" ||
      !/^[A-Za-z][A-Za-z '\-]{0,40}$/.test(line.speaker) ||
      typeof line.text !== "string" || !line.text.trim() ||
      typeof line.translation !== "string" || !line.translation.trim() ||
      line.text.length > 300 || line.translation.length > 400 ||
      !positive(line.pauseSeconds) ||
      warmup?.line !== line.id ||
      !positive(warmup.start) || !positive(warmup.end) ||
      warmup.end <= warmup.start || warmup.end > source.warmupDuration ||
      (index > 0 && warmup.start < warmupCues[index - 1].start) ||
      practice?.line !== line.id ||
      !positive(practice.firstStart) || !positive(practice.firstEnd) ||
      !positive(practice.replayStart) || !positive(practice.replayEnd) ||
      !(practice.firstStart < practice.firstEnd &&
        practice.firstEnd < practice.replayStart &&
        practice.replayStart < practice.replayEnd) ||
      practice.replayEnd > source.shadowingDuration ||
      (index > 0 && practice.firstStart < shadowingCues[index - 1].replayEnd)
    ) throw Error(`Line ${index + 1} is missing valid text or audio cues.`);
  }
  return {
    id: id as string,
    status: "published",
    title: source.title,
    level: level as string,
    summary: summary as string,
    warmupDuration: source.warmupDuration as number,
    shadowingDuration: source.shadowingDuration as number,
    betweenRoundsSeconds: betweenRoundsSeconds as number,
    programDurations: programDurations as ShadowingLesson["programDurations"],
    lines: lines.map(({ id, speaker, text, translation, pauseSeconds }) => ({
      id, speaker, text, translation, pauseSeconds,
    })),
    warmupCues,
    shadowingCues,
  };
}

export function programDuration(lesson: ShadowingLesson, repeats: RepeatCount) {
  return lesson.programDurations?.[String(repeats) as "1" | "3" | "5" | "7"]
    ?? (lesson.id === shadowingLessonId
      ? programs.programs[String(repeats) as keyof typeof programs.programs].duration
      : lesson.warmupDuration + repeats * lesson.shadowingDuration
        + (repeats - 1) * lesson.betweenRoundsSeconds);
}

export function formatAudioTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export function shadowingPosition(
  lesson: ShadowingLesson,
  time: number,
  repeats: RepeatCount,
) {
  const clamped = Math.max(0, Math.min(time, programDuration(lesson, repeats)));
  if (clamped < lesson.warmupDuration) {
    const cue = [...lesson.warmupCues].reverse().find((item) => item.start <= clamped);
    return { phase: "warmup" as const, round: 0, line: cue?.line || 1,
      stage: "Listen to the full conversation", remaining: 0 };
  }
  const length = lesson.shadowingDuration + lesson.betweenRoundsSeconds;
  const elapsed = clamped - lesson.warmupDuration;
  const round = Math.min(repeats, Math.floor(elapsed / length) + 1);
  const inside = elapsed - (round - 1) * length;
  if (inside >= lesson.shadowingDuration) {
    return { phase: "practice" as const, round, line: lesson.lines.length,
      stage: "Next round", remaining: Math.max(0, length - inside) };
  }
  const cue = [...lesson.shadowingCues].reverse().find((item) => item.firstStart <= inside)
    || lesson.shadowingCues[0];
  if (inside < cue.firstEnd)
    return { phase: "practice" as const, round, line: cue.line,
      stage: "0.75× Listen", remaining: 0 };
  if (inside < cue.replayStart)
    return { phase: "practice" as const, round, line: cue.line,
      stage: "Your turn", remaining: cue.replayStart - inside };
  if (inside < cue.replayEnd)
    return { phase: "practice" as const, round, line: cue.line,
      stage: "1× Replay", remaining: 0 };
  return { phase: "practice" as const, round, line: cue.line,
    stage: "Next line", remaining: 0 };
}
