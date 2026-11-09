import { useState, useSyncExternalStore } from "react";
import { LoaderCircle, Volume2, Turtle, RotateCcw } from "lucide-react";
import type { Word } from "../lib/model";
import {
  accentLabels,
  playableAccents,
  pronunciationsFor,
  type Accent,
} from "../lib/vocabulary";
import {
  hasBundledAudio,
  playWordPronunciation,
  playbackSnapshot,
  subscribePlayback,
} from "../lib/pronunciationAudio";

export default function PronunciationControls({
  word,
  hideAnswer = false,
}: {
  word: Word;
  hideAnswer?: boolean;
}) {
  const sources = pronunciationsFor(word);
  const accents = playableAccents(word);
  const [choice, setChoice] = useState<Accent>(accents[0] || "us");
  const accent = accents.includes(choice) ? choice : accents[0];
  const source = accent ? sources[accent] : undefined;
  const playback = useSyncExternalStore(
    subscribePlayback,
    playbackSnapshot,
    playbackSnapshot,
  );
  const active = playback.key === word.id && playback.accent === accent;
  const state = active ? playback.status : "idle";
  const voiceLabel =
    active && playback.source === "youdao"
      ? "Youdao voice"
      : active && playback.source === "google"
        ? "Google voice"
        : active && playback.source === "device"
          ? "Device voice"
          : active && playback.source === "bundled"
            ? "App audio"
            : source?.voiceType === "human"
              ? "Human recording"
              : source?.audioUrl
                ? "Synthetic voice"
                : accent && hasBundledAudio(word, accent)
                  ? "App audio"
                  : "Generated pronunciation";
  return (
    <div
      className={
        "pronunciation-player" + (hideAnswer ? " listening-player" : "")
      }
    >
      {accents.length > 0 ? (
        <>
          <div className="pronunciation-heading">
            <div className="accent-options" aria-label="Pronunciation accent">
              {accents.map((a) => (
                <button
                  type="button"
                  key={a}
                  aria-pressed={accent === a}
                  onClick={() => {
                    setChoice(a);
                    playWordPronunciation(word, a);
                  }}
                >
                  {a.toUpperCase()}
                  <span>{accentLabels[a]}</span>
                </button>
              ))}
            </div>
            <span className="recording-label">{voiceLabel}</span>
          </div>
          {!hideAnswer && source?.ipa && (
            <p className="phonetic" lang="en">
              {source.ipa}
              {source.ipaStatus === "editorial" && (
                <small title="Broad transcription prepared for this lesson; regional sounds can vary.">
                  Broad IPA
                </small>
              )}
            </p>
          )}
          <div className="pronunciation-actions">
            <button
              type="button"
              className="play-pronunciation"
              onClick={() => accent && playWordPronunciation(word, accent)}
              aria-label="Play pronunciation"
            >
              {state === "loading" ? (
                <LoaderCircle className="spin" size={20} />
              ) : (
                <Volume2 size={20} />
              )}
              {state === "loading"
                ? "Loading…"
                : state === "playing"
                  ? "Play again"
                  : "Listen"}
            </button>
            <button
              type="button"
              className="slow-pronunciation"
              onClick={() =>
                accent && playWordPronunciation(word, accent, true)
              }
            >
              <Turtle size={20} />
              Slow
            </button>
          </div>
          {state === "error" && (
            <div className="audio-error" role="alert">
              <span>
                Pronunciation could not play. Check your connection and try
                again.
              </span>
              <button
                type="button"
                onClick={() => accent && playWordPronunciation(word, accent)}
              >
                <RotateCcw size={16} />
                Retry audio
              </button>
            </div>
          )}
          {!hideAnswer && source?.sourceUrl && (
            <details className="audio-credit">
              <summary>Recording credits</summary>
              <p>
                {source.speaker} ·{" "}
                <a href={source.sourceUrl} target="_blank" rel="noreferrer">
                  Original recording
                </a>
                {source.licenseUrl && (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      href={source.licenseUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.license}
                    </a>
                  </>
                )}
              </p>
              <p>
                Audio served unchanged from Wikimedia. Slow playback changes
                playback speed only.
              </p>
            </details>
          )}
        </>
      ) : (
        <p className="muted">
          Pronunciation is not available for this entry yet.
        </p>
      )}
    </div>
  );
}
