import { useEffect, useState, useSyncExternalStore } from "react";
import { LoaderCircle, Volume2, Turtle, RotateCcw } from "lucide-react";
import type { Word } from "../lib/model";
import {
  accentLabels,
  availableAccents,
  pronunciationsFor,
  type Accent,
} from "../lib/vocabulary";
import {
  playPronunciation,
  playbackSnapshot,
  stopPronunciation,
  subscribePlayback,
} from "../lib/pronunciationAudio";

export default function PronunciationControls({
  word,
  hideAnswer = false,
  stopToken,
}: {
  word: Word;
  hideAnswer?: boolean;
  stopToken?: unknown;
}) {
  const sources = pronunciationsFor(word);
  const accents = availableAccents(word);
  const [choice, setChoice] = useState<Accent>(accents[0] || "us");
  const accent = accents.includes(choice) ? choice : accents[0];
  const source = accent ? sources[accent] : undefined;
  const playback = useSyncExternalStore(
    subscribePlayback,
    playbackSnapshot,
    playbackSnapshot,
  );
  const state = playback.url === source?.audioUrl ? playback.status : "idle";
  useEffect(() => {
    if (stopToken !== null && stopToken !== undefined) stopPronunciation();
  }, [stopToken]);

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
                    playPronunciation(sources[a]?.audioUrl || "");
                  }}
                >
                  {a.toUpperCase()}
                  <span>{accentLabels[a]}</span>
                </button>
              ))}
            </div>
            <span className="recording-label">
              {source?.voiceType === "human"
                ? "Human recording"
                : source?.voiceType === "tts"
                  ? "Synthetic voice"
                  : "Pronunciation"}
            </span>
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
              onClick={() => playPronunciation(source?.audioUrl || "")}
              aria-label={hideAnswer ? "Play recording" : "Play pronunciation"}
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
              onClick={() => playPronunciation(source?.audioUrl || "", true)}
            >
              <Turtle size={20} />
              Slow
            </button>
          </div>
          {state === "error" && (
            <div className="audio-error" role="alert">
              <span>
                Audio could not load. Check your connection and try again.
              </span>
              <button
                type="button"
                onClick={() => playPronunciation(source?.audioUrl || "")}
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
