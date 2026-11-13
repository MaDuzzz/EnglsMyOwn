import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("batch completion sound", () => {
  it("preloads and plays a local media clip for iPhone audio playback", async () => {
    const played = vi.fn(async () => {});
    const loaded = vi.fn();
    const instances: FakeAudio[] = [];
    class FakeAudio {
      preload = "";
      readyState = 1;
      currentTime = 1;
      volume = 1;
      constructor(readonly src: string) {
        instances.push(this);
      }
      pause() {}
      load() {
        loaded();
      }
      play() {
        return played();
      }
    }
    vi.stubGlobal("Audio", FakeAudio);
    const { prepareCompletionAudio, playCompletionFanfare } =
      await import("../src/lib/feedbackAudio");

    prepareCompletionAudio();
    expect(loaded).toHaveBeenCalledOnce();
    expect(played).not.toHaveBeenCalled();
    playCompletionFanfare();

    expect(instances).toHaveLength(1);
    expect(instances[0].src).toMatch(/audio\/celebration-fanfare\.wav$/);
    expect(instances[0].currentTime).toBe(0);
    expect(played).toHaveBeenCalledOnce();
  });
});
