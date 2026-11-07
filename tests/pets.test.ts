import { describe, expect, it } from "vitest";
import {
  appearanceOf,
  growthStage,
  keyedPixel,
  speciesOf,
} from "../src/lib/pets";
describe("companion appearance compatibility", () => {
  it("keeps existing accounts as cats and handles unknown legacy values", () => {
    expect(speciesOf({})).toBe("cat");
    expect(speciesOf({ species: "unknown" })).toBe("cat");
    expect(speciesOf({ species: "tiger" })).toBe("tiger");
  });
  it("only gives a mane to a selected male lion", () => {
    const lion = { name: "Mochi", species: "lion" as const };
    expect(appearanceOf({ ...lion, gender: "male" })).toBe("lion");
    expect(appearanceOf({ ...lion, gender: "female" })).toBe("lioness");
    expect(appearanceOf({ ...lion, gender: "unspecified" })).toBe("lioness");
  });
  it("advances at existing milestones and keeps adult progress complete", () => {
    expect(growthStage(499).index).toBe(0);
    expect(growthStage(500)).toMatchObject({
      index: 1,
      percent: 0,
      label: "Baby",
    });
    expect(growthStage(1500).label).toBe("Young adult");
    expect(growthStage(2000)).toMatchObject({
      index: 4,
      percent: 100,
      adult: true,
    });
    expect(growthStage(3500)).toMatchObject({
      index: 4,
      percent: 100,
      adult: true,
    });
    expect(growthStage(NaN).index).toBe(0);
  });
  it("removes source backing without erasing cream fur or slate fabric", () => {
    expect(keyedPixel(0, 255, 0, 255)[3]).toBe(0);
    expect(keyedPixel(245, 220, 195, 255)).toEqual([245, 220, 195, 255]);
    expect(keyedPixel(100, 120, 145, 255)).toEqual([100, 120, 145, 255]);
    const edge = keyedPixel(80, 120, 75, 255);
    expect(edge[3]).toBeGreaterThan(0);
    expect(edge[3]).toBeLessThan(255);
    expect(edge[1]).toBeLessThanOrEqual(Math.max(edge[0], edge[2]));
  });
});
