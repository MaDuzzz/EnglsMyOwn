export const petSpecies = [
  { id: "cat", label: "Cat" },
  { id: "dog", label: "Dog" },
  { id: "lion", label: "Lion" },
  { id: "tiger", label: "Tiger" },
] as const;
export type PetSpecies = (typeof petSpecies)[number]["id"];
export const petStages = [
  "Newborn",
  "Baby",
  "Junior",
  "Young adult",
  "Adult",
] as const;
export type Companion = { name: string; gender: string; species?: PetSpecies };
export function speciesOf(pet: { species?: unknown }): PetSpecies {
  return petSpecies.some((s) => s.id === pet.species)
    ? (pet.species as PetSpecies)
    : "cat";
}
export function appearanceOf(pet: Companion) {
  const species = speciesOf(pet);
  return species === "lion" && pet.gender !== "male" ? "lioness" : species;
}
export function growthStage(points: number) {
  const safe = Number.isFinite(points) ? Math.max(0, points) : 0;
  const index = Math.min(4, Math.floor(safe / 500)),
    adult = index === 4;
  return {
    index,
    label: petStages[index],
    next: petStages[index + 1],
    earned: adult ? 500 : Math.floor(safe % 500),
    percent: adult ? 100 : (safe % 500) / 5,
    adult,
  };
}
export function keyedPixel(r: number, g: number, b: number, alpha: number) {
  const green = g - Math.max(r, b);
  if (green <= 8 || g < 90) return [r, g, b, alpha];
  const t = Math.min(1, Math.max(0, (green - 8) / 62));
  return [
    r,
    Math.min(g, Math.max(r, b)),
    b,
    Math.round(alpha * (1 - t * t * (3 - 2 * t))),
  ];
}
