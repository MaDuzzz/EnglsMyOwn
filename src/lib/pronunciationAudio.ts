import type { Word } from "./model";
import { availableAccents, pronunciationsFor } from "./vocabulary";

type Playback = {
  url: string;
  status: "idle" | "loading" | "playing" | "error";
};
type PlaybackCallbacks = { onEnded?: () => void; onError?: () => void };

let player: HTMLAudioElement | undefined;
let playback: Playback = { url: "", status: "idle" };
let generation = 0;
let timeout: ReturnType<typeof setTimeout> | undefined;
let callbacks: PlaybackCallbacks = {};
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

function clearPlayback() {
  generation++;
  callbacks = {};
  if (timeout) clearTimeout(timeout);
  timeout = undefined;
  player?.pause();
}

export function stopPronunciation() {
  clearPlayback();
  publish({ url: "", status: "idle" });
}

export function playPronunciation(
  url: string,
  slow = false,
  onPlayback?: PlaybackCallbacks,
) {
  if (!url) return;
  if (!player) {
    player = new Audio();
    player.preload = "auto";
    player.addEventListener("ended", () => {
      const onEnded = callbacks.onEnded;
      callbacks = {};
      publish({ url: playback.url, status: "idle" });
      onEnded?.();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopPronunciation();
    });
  }
  clearPlayback();
  callbacks = onPlayback || {};
  const current = ++generation;
  const fail = () => {
    if (generation !== current) return;
    const onError = callbacks.onError;
    clearPlayback();
    publish({ url, status: "error" });
    onError?.();
  };
  player.src = url;
  player.playbackRate = slow ? 0.75 : 1;
  player.preservesPitch = true;
  publish({ url, status: "loading" });
  timeout = setTimeout(fail, 15000);
  // play() is called directly from the Start/Continue/swipe event on iOS.
  void player.play().then(() => {
    if (generation !== current) return;
    if (timeout) clearTimeout(timeout);
    timeout = undefined;
    publish({ url, status: "playing" });
  }, fail);
}

export function playWordRecording(word: Word, callbacks?: PlaybackCallbacks) {
  const accent = availableAccents(word)[0];
  const url = accent && pronunciationsFor(word)[accent]?.audioUrl;
  if (url) playPronunciation(url, false, callbacks);
  else {
    stopPronunciation();
    callbacks?.onError?.();
  }
}
