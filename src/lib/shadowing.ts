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
  if (!value || typeof value !== "object") throw Error("Choose the pilot cues.json file.");
  const source = value as Record<string, unknown>;
  const lines = source.lines as ShadowingLine[];
  const warmupCues = source.warmupCues as ShadowingLesson["warmupCues"];
  const shadowingCues = source.shadowingCues as ShadowingLesson["shadowingCues"];
  if (
    source.title !== "The Interview Detour" ||
    !positive(source.warmupDuration) ||
    !positive(source.shadowingDuration) ||
    !Array.isArray(lines) || lines.length !== 20 ||
    !Array.isArray(warmupCues) || warmupCues.length !== 20 ||
    !Array.isArray(shadowingCues) || shadowingCues.length !== 20
  ) throw Error("The pilot script or timing data is incomplete.");
  for (let index = 0; index < 20; index++) {
    const line = lines[index];
    const warmup = warmupCues[index];
    const practice = shadowingCues[index];
    if (
      line?.id !== index + 1 ||
      !["Maya", "Ben"].includes(line.speaker) ||
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
    id: shadowingLessonId,
    status: "published",
    title: source.title,
    level: "B1",
    summary: "A wrong train before a job interview.",
    warmupDuration: source.warmupDuration as number,
    shadowingDuration: source.shadowingDuration as number,
    betweenRoundsSeconds: programs.gapSeconds,
    lines: lines.map(({ id, speaker, text, translation, pauseSeconds }) => ({
      id, speaker, text, translation, pauseSeconds,
    })),
    warmupCues,
    shadowingCues,
  };
}

export function programDuration(repeats: RepeatCount) {
  return programs.programs[String(repeats) as keyof typeof programs.programs].duration;
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
  const clamped = Math.max(0, Math.min(time, programDuration(repeats)));
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
    return { phase: "practice" as const, round, line: 20,
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
