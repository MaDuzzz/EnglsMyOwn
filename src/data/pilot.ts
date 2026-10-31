import source from "../../content/vocabulary-pilot-v2.json";
import { validateImport } from "../lib/content";
import {
  dayKey,
  emptyLearning,
  previousDay,
  type Learning,
} from "../lib/model";

// Development-only import. Authenticated production reads canonical entries from Firestore.
export const { words, lessons } = validateImport(source);
export function pilotLearning(
  scenario: "fresh" | "review" = "fresh",
): Learning {
  const learning = emptyLearning();
  if (scenario === "review") {
    const day = previousDay(dayKey());
    learning.records = [
      {
        id: "pilot-yesterday",
        mode: "learn",
        day,
        wordIds: words.map((w) => w.id),
        seconds: 600,
        completedAt: `${day}T08:00:00+07:00`,
      },
    ];
  }
  return learning;
}
