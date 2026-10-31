import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Volume2, Turtle, RotateCcw } from "lucide-react";
import type { Word } from "../lib/model";
import {
  accentLabels,
  availableAccents,
  pronunciationsFor,
  type Accent,
} from "../lib/vocabulary";

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
  const audio = useRef<HTMLAudioElement>(null);
  const request = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">(
    "idle",
  );

  function stop() {
    request.current++;
    if (timeout.current) clearTimeout(timeout.current);
    audio.current?.pause();
    setState("idle");
  }
  useEffect(() => {
    stop();
    const player = audio.current;
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      request.current++;
      if (timeout.current) clearTimeout(timeout.current);
      player?.pause();
      document.removeEventListener("visibilitychange", hide);
    };
  }, [word.id, source?.audioUrl, stopToken]);

  async function play(slow = false) {
    const player = audio.current;
    if (!source?.audioUrl || !player) return;
    stop();
    const current = ++request.current;
    setState("loading");
    player.currentTime = 0;
    player.playbackRate = slow ? 0.75 : 1;
    player.preservesPitch = true;
    timeout.current = setTimeout(() => {
      if (request.current !== current) return;
      request.current++;
      player.pause();
      setState("error");
    }, 15000);
    try {
      await player.play();
      if (request.current !== current) return;
      if (timeout.current) clearTimeout(timeout.current);
      setState("playing");
    } catch {
      if (request.current === current) {
        if (timeout.current) clearTimeout(timeout.current);
        setState("error");
      }
    }
  }

  return (
    <div
      className={
        "pronunciation-player" + (hideAnswer ? " listening-player" : "")
      }
    >
      <audio
        ref={audio}
        src={source?.audioUrl || undefined}
        preload="none"
        onEnded={() => setState("idle")}
      />
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
                    stop();
                    setChoice(a);
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
              onClick={() => void play()}
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
              onClick={() => void play(true)}
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
              <button type="button" onClick={() => void play()}>
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
