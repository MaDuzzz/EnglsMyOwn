import { describe, expect, it } from "vitest";
import { statSync } from "node:fs";
import { resolve } from "node:path";
import bundledAudio from "../src/data/bundledAudio.json";
import pilot from "../content/vocabulary-pilot-v2.json";
import { validateImport } from "../src/lib/content";
import {
  audioCandidates,
  hasBundledAudio,
  preferredAccent,
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
    expect(audioCandidates(word, "us")[0].url).toContain("v=kokoro-heart-v1");
    const recorded = {
      ...word,
      pronunciation: {
        us: {
          ipa: "/kənˈtɪndʒənt ˈwɜːkfɔːrs/",
          audioUrl: "https://example.com/recording.mp3",
        },
      },
    };
    expect(audioCandidates(recorded, "us").map(({ source }) => source)).toEqual(
      ["bundled", "recording", "youdao", "google"],
    );
    const australianRecording = {
      ...word,
      pronunciation: {
        au: {
          ipa: "/kənˈtɪndʒənt/",
          audioUrl: "https://example.com/australian.mp3",
        },
      },
    };
    expect(preferredAccent(australianRecording)).toBe("us");
    expect(hasBundledAudio({ ...word, headword: "another phrase" }, "us")).toBe(
      false,
    );
  });
});
