import type { Task } from "./model";

const secondsBySkill: Record<Task["kind"], number> = {
  listen: 20,
  gap: 45,
  arrange: 60,
  meaning: 20,
  recall: 45,
};

export function reviewQuestionSeconds(kind: Task["kind"]): number {
  return secondsBySkill[kind];
}
