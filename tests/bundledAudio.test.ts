import { describe, expect, it } from "vitest";
import { statSync } from "node:fs";
import { resolve } from "node:path";
import bundledAudio from "../src/data/bundledAudio.json";
import pilot from "../content/vocabulary-pilot-v2.json";
import { validateImport } from "../src/lib/content";
import {
  audioCandidates,
  hasBundledAudio,
} from "../src/lib/pronunciationAudio";

const sample = validateImport(pilot).words[0];

describe("bundled pronunciation", () => {
  it("ships a playable file for each published on-demand entry", () => {
    expect(Object.keys(bundledAudio)).toHaveLength(1050);
    for (const id of Object.keys(bundledAudio)) {
      expect(
        statSync(resolve(`public/audio/words/${id}.m4a`)).size,
      ).toBeGreaterThan(1000);
    }
  });

  it("uses matching local audio first and avoids a stale recording for changed text", () => {
    const word = {
      ...sample,
      id: "noun-157",
      headword: "contingent workforce",
      audioMode: "on-demand" as const,
      pronunciation: { us: { ipa: "/kənˈtɪndʒənt ˈwɜːkfɔːrs/" } },
    };
    expect(hasBundledAudio(word, "us")).toBe(true);
    expect(audioCandidates(word, "us").map(({ source }) => source)).toEqual([
      "bundled",
      "youdao",
      "google",
    ]);
    expect(audioCandidates(word, "us")[0].url).toContain(
      "/audio/words/noun-157.m4a",
    );
    expect(hasBundledAudio({ ...word, headword: "another phrase" }, "us")).toBe(
      false,
    );
  });
});
