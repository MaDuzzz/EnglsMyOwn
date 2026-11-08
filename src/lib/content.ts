import { normalize, type Word, type Lesson } from "./model";
import {
  availableAccents,
  pronunciationsFor,
  type VocabularyEntry,
} from "./vocabulary";
const text = (v: unknown) => typeof v === "string" && v.trim().length > 0;
const list = (v: unknown) => Array.isArray(v) && v.every(text);
// Canonical entries are stored without these derived exercise fields.
// Rebuild the projection on import and Firestore reads, never edit both copies.
export function projectWord(raw: unknown): Word {
  const w = raw as Record<string, any>;
  if (!w || !Array.isArray(w.examples)) return raw as Word;
  const example =
    (w.schemaVersion === 2
      ? w.examples.find((e: any) => e?.id === w.practiceExampleId)
      : w.examples[0]) || {};
  return {
    ...w,
    cefrLevel: w.cefrLevel || (w.status === "draft" ? "Unverified" : ""),
    topic: w.topic || w.topicIds?.[0] || "",
    ipaUS: w.pronunciation?.us?.ipa || "",
    ipaUK: w.pronunciation?.uk?.ipa || "",
    audioUS: w.pronunciation?.us?.audioUrl || "",
    audioUK: w.pronunciation?.uk?.audioUrl || "",
    commonPattern: w.commonPatterns?.[0] || "",
    exampleEn: example.textEn || "",
    exampleVi: example.textVi || "",
    gapTemplate: example.gap?.template || "",
    gapAnswers: example.gap?.acceptedAnswers || [],
    recallPromptVi: w.recall?.promptVi || example.recall?.promptVi || "",
    recallAnswers:
      w.recall?.acceptedAnswers || example.recall?.acceptedAnswers || [],
    gapExplanationVi: example.gap?.explanationVi || "",
    recallExplanationVi: w.recall?.explanationVi || "",
    sentenceTokens: example.sentenceTokens || [],
    arrangementAnswers: example.arrangementAnswers || [example.textEn || ""],
  } as Word;
}

export function storedWord(word: Word): VocabularyEntry | Word {
  if (word.schemaVersion !== 2) return word;
  const {
    ipaUS,
    ipaUK,
    audioUS,
    audioUK,
    commonPattern,
    exampleEn,
    exampleVi,
    gapTemplate,
    gapAnswers,
    recallPromptVi,
    recallAnswers,
    gapExplanationVi,
    recallExplanationVi,
    sentenceTokens,
    arrangementAnswers,
    ...canonical
  } = word;
  return canonical as VocabularyEntry;
}

const https = (value: unknown) => {
  if (!text(value)) return false;
  try {
    const url = new URL(value as string);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !/(^|\.)example\.(com|org|net)$/.test(url.hostname) &&
      url.hostname !== "drive.google.com"
    );
  } catch {
    return false;
  }
};
const sentenceWords = (s: string) =>
  normalize(s)
    .replace(/[.!?]+$/, "")
    .split(" ")
    .sort()
    .join(" ");

function validateRichEntry(w: Word) {
  if (w.schemaVersion === undefined || w.schemaVersion === 1) return;
  if (w.schemaVersion !== 2) throw Error(`${w.id}: unsupported schemaVersion.`);
  const fail = (message: string): never => {
    throw Error(`${w.id}: ${message}`);
  };
  if (!Number.isInteger(w.contentVersion) || w.contentVersion! < 1)
    fail("contentVersion must be a positive integer.");
  for (const k of ["senseKey", "usageNotes", "usageNotesVi"] as const)
    if (!text(w[k])) fail(`missing ${k}.`);
  if (
    !["word", "phrase", "collocation", "phrasal_verb", "idiom"].includes(
      w.itemType || "",
    )
  )
    fail("invalid itemType.");
  if (
    ![
      "noun",
      "verb",
      "adjective",
      "adverb",
      "pronoun",
      "determiner",
      "preposition",
      "conjunction",
      "interjection",
      "other",
    ].includes(w.partOfSpeech)
  )
    fail("use a grammatical partOfSpeech such as verb or noun.");
  if (!["neutral", "formal", "informal"].includes(w.register || ""))
    fail("invalid register.");
  if (
    !["estimated", "verified", "unverified"].includes(w.cefrStatus || "") ||
    (w.status === "published" && w.cefrStatus === "unverified")
  )
    fail("declare whether the CEFR level is estimated or verified.");
  for (const k of ["topicIds", "commonPatterns", "tags"] as const)
    if (!list(w[k]) || (k !== "tags" && !w[k]!.length))
      fail(`${k} must be an array of text values.`);
  if (
    !Array.isArray(w.forms) ||
    w.forms.some((f) => !f || !text(f.label) || !text(f.text))
  )
    fail("forms need label and text.");
  if (
    !Array.isArray(w.commonMistakes) ||
    w.commonMistakes.some(
      (m) =>
        !m || !text(m.incorrect) || !text(m.correct) || !text(m.explanationVi),
    )
  )
    fail("commonMistakes need incorrect, correct and explanationVi.");
  if (
    !Array.isArray(w.relatedExpressions) ||
    w.relatedExpressions.some(
      (r) =>
        !r ||
        !text(r.text) ||
        !text(r.noteVi) ||
        !["synonym", "antonym", "related", "contrast"].includes(r.relation),
    )
  )
    fail("invalid relatedExpressions.");
  if (
    !w.pronunciation ||
    typeof w.pronunciation !== "object" ||
    Array.isArray(w.pronunciation)
  )
    fail("pronunciation must be an object keyed by us, uk or au.");
  if (w.audioMode !== undefined && w.audioMode !== "on-demand")
    fail("invalid audioMode.");
  for (const [accent, p] of Object.entries(w.pronunciation!)) {
    if (!["us", "uk", "au"].includes(accent) || !p || typeof p !== "object")
      fail("invalid pronunciation accent.");
    if (p.ipa && !["editorial", "reference"].includes(p.ipaStatus || ""))
      fail(`${accent}: declare the IPA source status.`);
    if (p.audioUrl) {
      if (!https(p.audioUrl))
        fail(
          `${accent}: use a direct HTTPS audio URL, not a placeholder or Drive preview.`,
        );
      if (
        !text(p.audioText) ||
        !w.acceptedSpellings.some(
          (a) => normalize(a) === normalize(p.audioText!),
        )
      )
        fail(`${accent}: audioText must match an accepted listening answer.`);
      if (!["human", "tts"].includes(p.voiceType || "") || !text(p.speaker))
        fail(`${accent}: identify the voice and speaker.`);
      if (!https(p.sourceUrl) || !text(p.license) || !https(p.licenseUrl))
        fail(`${accent}: provide the audio source and license.`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(p.checkedAt || "") ||
        !text(p.checkMethod)
      )
        fail(`${accent}: record how and when the audio was checked.`);
    }
  }
  if (!Array.isArray(w.examples) || !w.examples.length)
    fail("provide at least one example.");
  const exampleIds = new Set<string>();
  for (const e of w.examples!) {
    if (!e || !text(e.id) || exampleIds.has(e.id))
      fail("example IDs must be unique.");
    exampleIds.add(e.id);
    for (const k of ["context", "textEn", "textVi", "targetText"] as const)
      if (!text(e[k])) fail(`${e.id}: missing ${k}.`);
    if (!normalize(e.textEn).includes(normalize(e.targetText)))
      fail(`${e.id}: targetText must occur in the example.`);
    if (e.audioUrl && !https(e.audioUrl))
      fail(`${e.id}: invalid example audio URL.`);
    if (e.gap) {
      if (
        !text(e.gap.template) ||
        e.gap.template.split("{{blank}}").length !== 2 ||
        !list(e.gap.acceptedAnswers) ||
        !e.gap.acceptedAnswers.length ||
        !text(e.gap.explanationVi)
      )
        fail(`${e.id}: provide one {{blank}}, answers and explanationVi.`);
      if (
        normalize(
          e.gap.template.replace("{{blank}}", e.gap.acceptedAnswers[0]),
        ) !== normalize(e.textEn)
      )
        fail(
          `${e.id}: the main gap answer must recreate the example sentence.`,
        );
    }
    if (
      e.sentenceTokens &&
      (!list(e.sentenceTokens) ||
        normalize(e.sentenceTokens.join(" ")) !== normalize(e.textEn))
    )
      fail(`${e.id}: tokens must recreate the example in order.`);
    if (
      e.arrangementAnswers &&
      (!list(e.arrangementAnswers) ||
        !e.arrangementAnswers.length ||
        e.arrangementAnswers.some(
          (a) => sentenceWords(a) !== sentenceWords(e.textEn),
        ))
    )
      fail(`${e.id}: arrangement answers must use the same words.`);
  }
  const practice = w.examples!.find((e) => e.id === w.practiceExampleId);
  if (!practice?.gap || !practice.sentenceTokens?.length)
    fail(
      "practiceExampleId must select an example with gap and sentenceTokens.",
    );
  if (
    !w.recall ||
    !text(w.recall.promptVi) ||
    !list(w.recall.acceptedAnswers) ||
    !w.recall.acceptedAnswers.length ||
    !text(w.recall.explanationVi)
  )
    fail("recall needs promptVi, acceptedAnswers and explanationVi.");
  if (
    w.status === "published" &&
    (!https(w.sourceUrl) || !/^\d{4}-\d{2}-\d{2}$/.test(w.reviewedAt || ""))
  )
    fail("provide sourceUrl and reviewedAt before publishing.");
}
export function validateImport(value: unknown): {
  words: Word[];
  lessons: Lesson[];
} {
  if (!value || typeof value !== "object")
    throw Error("Expected an object with words and lessons arrays.");
  const input = value as { words?: unknown[]; lessons?: unknown[] };
  const data = { words: input.words, lessons: input.lessons ?? [] };
  if (!Array.isArray(data.words) || !Array.isArray(data.lessons))
    throw Error("words must be an array; lessons is an optional array.");
  if (data.words.length + data.lessons.length > 400)
    throw Error("Import at most 400 items at a time.");
  data.words = data.words.map(projectWord);
  const ids = new Set<string>();
  for (const raw of data.words) {
    const w = raw as Word;
    if (!w || !text(w.id) || !/^[-a-zA-Z0-9_]+$/.test(w.id) || ids.has(w.id))
      throw Error(
        "Word IDs must be unique letters, numbers, dashes or underscores.",
      );
    ids.add(w.id);
    for (const k of [
      "headword",
      "partOfSpeech",
      "cefrLevel",
      "topic",
      "meaningEn",
      "meaningVi",
      "commonPattern",
      "exampleEn",
      "exampleVi",
      "gapTemplate",
      "recallPromptVi",
    ] as const)
      if (!text(w[k])) throw Error(`${w.id}: missing ${k}.`);
    if (
      !["A1", "A2", "B1", "B2", "C1", "C2"].includes(w.cefrLevel) &&
      !(w.status === "draft" && w.cefrLevel === "Unverified")
    )
      throw Error(`${w.id}: invalid level.`);
    for (const k of [
      "acceptedSpellings",
      "gapAnswers",
      "recallAnswers",
      "meaningDistractorsVi",
    ] as const)
      if (!list(w[k]) || !w[k].length) throw Error(`${w.id}: invalid ${k}.`);
    if (
      w.meaningDistractorsVi.length !== 3 ||
      new Set([w.meaningVi, ...w.meaningDistractorsVi].map(normalize)).size !==
        4
    )
      throw Error(`${w.id}: provide three distinct wrong meanings.`);
    if (w.gapTemplate.split("{{blank}}").length !== 2)
      throw Error(`${w.id}: exactly one {{blank}} is required.`);
    if (!["draft", "published"].includes(w.status))
      throw Error(`${w.id}: invalid status.`);
    if (w.status === "published") {
      if (w.id.startsWith("demo_") || w.id.startsWith("sample_"))
        throw Error("Sample content cannot be published.");
      const pronunciations = pronunciationsFor(w);
      const hasRecording = availableAccents(w).some(
        (a) =>
          https(pronunciations[a]?.audioUrl) && text(pronunciations[a]?.ipa),
      );
      const hasOnDemandAudio =
        w.audioMode === "on-demand" && text(pronunciations.us?.ipa);
      if (!hasRecording && !hasOnDemandAudio)
        throw Error(
          `${w.id}: provide a verified HTTPS audio source with IPA or enable on-demand audio with US IPA.`,
        );
      if (!text(w.sourceRef) || !text(w.cefrSource))
        throw Error(
          `${w.id}: provide reviewed content and CEFR source references.`,
        );
    }
    validateRichEntry(w);
  }
  ids.clear();
  for (const raw of data.lessons) {
    const l = raw as Lesson;
    if (!l || !text(l.id) || !/^[-a-zA-Z0-9_]+$/.test(l.id) || ids.has(l.id))
      throw Error("Invalid or duplicate lesson ID.");
    ids.add(l.id);
    for (const k of ["title", "topic", "level", "duration"] as const)
      if (!text(l[k])) throw Error(`${l.id}: missing ${k}.`);
    if (!["draft", "published"].includes(l.status))
      throw Error(`${l.id}: invalid status.`);
    if (
      !Array.isArray(l.lines) ||
      !l.lines.length ||
      l.lines.some(
        (r) =>
          !r ||
          !text(r.id) ||
          !text(r.en) ||
          !text(r.vi) ||
          !/^\d+:\d{2}$/.test(r.time),
      )
    )
      throw Error(`${l.id}: invalid transcript.`);
    if (new Set(l.lines.map((r) => r.id)).size !== l.lines.length)
      throw Error(`${l.id}: duplicate line IDs.`);
    if (l.status === "published" && !/^[-\w]{10,}$/.test(l.driveFileId))
      throw Error(`${l.id}: valid Drive file ID required.`);
    if (
      l.status === "published" &&
      !["A1", "A2", "B1", "B2", "C1", "C2"].includes(l.level)
    )
      throw Error(`${l.id}: invalid level.`);
  }
  return data as { words: Word[]; lessons: Lesson[] };
}
