export type Accent = "us" | "uk" | "au";
export const accentLabels: Record<Accent, string> = {
  us: "American English",
  uk: "British English",
  au: "Australian English",
};
export type Pronunciation = {
  ipa?: string | null;
  ipaStatus?: "reference" | "editorial";
  audioUrl?: string | null;
  audioText?: string;
  voiceType?: "human" | "tts";
  speaker?: string;
  sourceUrl?: string;
  license?: string;
  licenseUrl?: string;
  checkedAt?: string;
  checkMethod?: string;
};
export type WordForm = { label: string; text: string };
export type CommonMistake = {
  incorrect: string;
  correct: string;
  explanationVi: string;
};
export type RelatedExpression = {
  text: string;
  relation: "synonym" | "antonym" | "related" | "contrast";
  noteVi: string;
  wordId?: string;
};
export type WordExample = {
  id: string;
  context: string;
  textEn: string;
  textVi: string;
  targetText: string;
  audioUrl?: string | null;
  gap?: {
    template: string;
    acceptedAnswers: string[];
    explanationVi: string;
  };
  sentenceTokens?: string[];
  arrangementAnswers?: string[];
};
export type VocabularyEntry = {
  schemaVersion: 2;
  contentVersion: number;
  id: string;
  headword: string;
  senseKey: string;
  itemType: "word" | "phrase" | "collocation" | "phrasal_verb" | "idiom";
  partOfSpeech: string;
  meaningEn: string;
  meaningVi: string;
  cefrLevel: string | null;
  cefrStatus: "estimated" | "verified" | "unverified";
  cefrSource: string;
  topicIds: string[];
  topic: string;
  pronunciation: Partial<Record<Accent, Pronunciation>>;
  audioMode?: "on-demand";
  commonPatterns: string[];
  forms: WordForm[];
  register: "neutral" | "formal" | "informal";
  usageNotes: string;
  usageNotesVi: string;
  commonMistakes: CommonMistake[];
  relatedExpressions: RelatedExpression[];
  tags: string[];
  acceptedSpellings: string[];
  meaningDistractorsVi: string[];
  examples: WordExample[];
  practiceExampleId: string;
  recall: {
    promptVi: string;
    acceptedAnswers: string[];
    explanationVi: string;
  };
  sourceRef: string;
  sourceUrl: string;
  reviewedAt: string;
  status: "draft" | "published";
};

export type RichVocabulary = Partial<
  Omit<VocabularyEntry, "cefrLevel" | "status" | "schemaVersion">
> & { schemaVersion?: 1 | 2 };

export function pronunciationsFor(word: {
  pronunciation?: Partial<Record<Accent, Pronunciation>>;
  ipaUS?: string;
  ipaUK?: string;
  audioUS?: string;
  audioUK?: string;
}): Partial<Record<Accent, Pronunciation>> {
  if (word.pronunciation) return word.pronunciation;
  return {
    ...(word.audioUS || word.ipaUS
      ? { us: { ipa: word.ipaUS, audioUrl: word.audioUS } }
      : {}),
    ...(word.audioUK || word.ipaUK
      ? { uk: { ipa: word.ipaUK, audioUrl: word.audioUK } }
      : {}),
  };
}

export function availableAccents(
  word: Parameters<typeof pronunciationsFor>[0],
) {
  const sources = pronunciationsFor(word);
  return (["us", "uk", "au"] as const).filter((a) => sources[a]?.audioUrl);
}

export function playableAccents(
  word: Parameters<typeof pronunciationsFor>[0] & { audioMode?: string },
): Accent[] {
  const recorded = availableAccents(word);
  return word.audioMode === "on-demand" && !recorded.includes("us")
    ? [...recorded, "us"]
    : recorded;
}
