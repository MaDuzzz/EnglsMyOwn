import type { Word } from "./model";
import { playableAccents, pronunciationsFor, type Accent } from "./vocabulary";
import bundledAudio from "../data/bundledAudio.json";

type AudioSource = "recording" | "bundled" | "youdao" | "google" | "device";
type Playback = {
  key: string;
  accent: Accent | null;
  url: string;
  source: AudioSource | null;
  status: "idle" | "loading" | "playing" | "error";
};
type PlaybackCallbacks = { onEnded?: () => void; onError?: () => void };
type Candidate = { url: string; source: Exclude<AudioSource, "device"> };

let player: HTMLAudioElement | undefined;
let utterance: SpeechSynthesisUtterance | undefined;
let playback: Playback = {
  key: "",
  accent: null,
  url: "",
  source: null,
  status: "idle",
};
let generation = 0;
let timeout: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function publish(next: Playback) {
  playback = next;
  listeners.forEach((listener) => listener());
}

export function playbackSnapshot() {
  return playback;
}

export function subscribePlayback(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function clearTimeoutIfNeeded() {
  if (timeout) clearTimeout(timeout);
  timeout = undefined;
}

function clearPlayback() {
  generation++;
  clearTimeoutIfNeeded();
  if (player) {
    player.onerror = null;
    player.onended = null;
    player.onplaying = null;
    player.onwaiting = null;
    player.onstalled = null;
    player.pause();
  }
  if (utterance && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    utterance = undefined;
  }
}

export function stopPronunciation() {
  clearPlayback();
  publish({ key: "", accent: null, url: "", source: null, status: "idle" });
}

export function hasBundledAudio(word: Word, accent: Accent): boolean {
  return (
    accent === "us" &&
    (bundledAudio as Record<string, string>)[word.id] === word.headword
  );
}

export function audioCandidates(word: Word, accent: Accent): Candidate[] {
  const recorded = pronunciationsFor(word)[accent]?.audioUrl;
  const bundled = hasBundledAudio(word, accent);
  if (!recorded && !bundled && word.audioMode !== "on-demand") return [];
  const result: Candidate[] = [];
  if (recorded) result.push({ url: recorded, source: "recording" });
  if (bundled) {
    const base = import.meta.env.BASE_URL || "/";
    result.push({
      url: `${base}audio/words/${encodeURIComponent(word.id)}.m4a`,
      source: "bundled",
    });
  }
  if (accent === "us" || accent === "uk") {
    const youdao = new URL("https://dict.youdao.com/dictvoice");
    youdao.searchParams.set("audio", word.headword);
    youdao.searchParams.set("type", accent === "us" ? "2" : "1");
    result.push({ url: youdao.href, source: "youdao" });
    const google = new URL("https://translate.google.com/translate_tts");
    google.searchParams.set("ie", "UTF-8");
    google.searchParams.set("tl", accent === "us" ? "en" : "en-GB");
    google.searchParams.set("client", "tw-ob");
    google.searchParams.set("q", word.headword);
    result.push({ url: google.href, source: "google" });
  }
  return result;
}

export function playWordPronunciation(
  word: Word,
  accent: Accent,
  slow = false,
  callbacks: PlaybackCallbacks = {},
) {
  const candidates = audioCandidates(word, accent);
  if (!candidates.length && word.audioMode !== "on-demand") {
    stopPronunciation();
    callbacks.onError?.();
    return;
  }
  clearPlayback();
  const current = ++generation;
  let index = 0;
  const key = word.id;
  const state = (
    status: Playback["status"],
    source: AudioSource | null,
    url = "",
  ): Playback => ({ key, accent, url, source, status });
  const failed = () => {
    if (generation !== current) return;
    clearPlayback();
    publish(state("error", null));
    callbacks.onError?.();
  };
  const ended = (source: AudioSource, url = "") => {
    if (generation !== current) return;
    clearTimeoutIfNeeded();
    utterance = undefined;
    publish(state("idle", source, url));
    callbacks.onEnded?.();
  };
  const speakOnDevice = () => {
    if (!("speechSynthesis" in window)) {
      failed();
      return;
    }
    try {
      const speech = window.speechSynthesis;
      speech.cancel();
      const next = new SpeechSynthesisUtterance(word.headword);
      const lang =
        accent === "uk" ? "en-GB" : accent === "au" ? "en-AU" : "en-US";
      next.lang = lang;
      next.rate = slow ? 0.7 : 0.9;
      const voice = speech
        .getVoices()
        .find((v) => v.lang.toLowerCase() === lang.toLowerCase());
      if (voice) next.voice = voice;
      utterance = next;
      next.onstart = () => {
        if (generation !== current) return;
        clearTimeoutIfNeeded();
        publish(state("playing", "device"));
      };
      next.onend = () => ended("device");
      next.onerror = failed;
      publish(state("loading", "device"));
      timeout = setTimeout(failed, 6000);
      speech.speak(next);
    } catch {
      failed();
    }
  };
  const tryNext = () => {
    if (generation !== current) return;
    clearTimeoutIfNeeded();
    const candidate = candidates[index++];
    if (!candidate) {
      speakOnDevice();
      return;
    }
    if (!player) {
      player = new Audio();
      player.preload = "auto";
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopPronunciation();
      });
    }
    const audio = player;
    const loadTimeout = candidate.source === "bundled" ? 4000 : 5000;
    let settled = false;
    const nextOnFailure = () => {
      if (settled || generation !== current) return;
      settled = true;
      audio.pause();
      tryNext();
    };
    audio.onerror = nextOnFailure;
    audio.onended = () => ended(candidate.source, candidate.url);
    audio.onwaiting = () => {
      clearTimeoutIfNeeded();
      timeout = setTimeout(nextOnFailure, loadTimeout);
    };
    audio.onstalled = audio.onwaiting;
    audio.onplaying = () => {
      if (generation !== current || settled) return;
      clearTimeoutIfNeeded();
      publish(state("playing", candidate.source, candidate.url));
    };
    audio.src = candidate.url;
    audio.playbackRate = slow ? 0.75 : 1;
    audio.preservesPitch = true;
    publish(state("loading", candidate.source, candidate.url));
    timeout = setTimeout(nextOnFailure, loadTimeout);
    void audio.play().catch(nextOnFailure);
  };
  tryNext();
}

export function playWordRecording(word: Word, callbacks?: PlaybackCallbacks) {
  const accent = playableAccents(word)[0];
  if (accent) playWordPronunciation(word, accent, false, callbacks);
  else {
    stopPronunciation();
    callbacks?.onError?.();
  }
}
