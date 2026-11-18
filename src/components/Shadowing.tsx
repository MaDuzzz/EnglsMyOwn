import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Clock3, Eye,
  Moon, Pause, RotateCcw, Sun, Volume2,
} from "lucide-react";
import { auth, db } from "../lib/firebase";
import {
  formatAudioTime, programDuration, repeatChoices,
  shadowingPosition, validateShadowingImport,
  type RepeatCount, type ShadowingLesson,
} from "../lib/shadowing";
import { Button, Empty } from "./ui";

type SavedPlace = { repeats: RepeatCount; time: number; updatedAt: number };
const audioBase = import.meta.env.VITE_SHADOWING_API_BASE?.replace(/\/$/, "") || "";

function savedPlace(key: string, lesson: ShadowingLesson): SavedPlace | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    if (
      repeatChoices.includes(value?.repeats) &&
      Number.isFinite(value?.time) && value.time >= 0 &&
      value.time < programDuration(lesson, value.repeats) - 2
    ) return value;
  } catch { /* Ignore an old or damaged local checkpoint. */ }
  return null;
}

function formatEstimate(lesson: ShadowingLesson, repeats: RepeatCount) {
  return `About ${Math.round(programDuration(lesson, repeats) / 60)} min`;
}

function RepeatOptions({ lesson, value, onChange }: {
  lesson: ShadowingLesson;
  value: RepeatCount;
  onChange: (choice: RepeatCount) => void;
}) {
  return <div className="shadow-repeat-options" role="group" aria-label="Practice rounds">
    {repeatChoices.map((choice) => <button
      key={choice}
      type="button"
      className={value === choice ? "selected" : ""}
      aria-pressed={value === choice}
      onClick={() => onChange(choice)}
    ><b>{choice}×</b><small>{formatEstimate(lesson, choice)}</small></button>)}
  </div>;
}

function Waveform({ active = false }: { active?: boolean }) {
  const heights = [8, 12, 18, 27, 38, 29, 22, 42, 62, 78, 55, 39, 28, 20, 31, 46, 27, 18, 12, 8];
  return <div className={`shadow-wave ${active ? "active" : ""}`} aria-hidden="true">
    {heights.map((height, index) => <span key={index} style={{ height }} />)}
  </div>;
}

export default function Shadowing({
  demo, uid, theme, onToggleTheme,
}: {
  demo: boolean;
  uid: string;
  theme: string;
  onToggleTheme: () => void;
}) {
  const [lessons, setLessons] = useState<ShadowingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeLesson, setActiveLesson] = useState<ShadowingLesson | null>(null);
  const [visibleLesson, setVisibleLesson] = useState(0);
  const [places, setPlaces] = useState<Record<string, SavedPlace | null>>({});
  const [selections, setSelections] = useState<Record<string, RepeatCount>>({});
  const carouselRef = useRef<HTMLDivElement>(null);
  const keyFor = (id: string) => `engls-shadowing:v1:${uid}:${id}`;
  const placeFor = (lesson: ShadowingLesson) =>
    Object.prototype.hasOwnProperty.call(places, lesson.id)
      ? places[lesson.id] : savedPlace(keyFor(lesson.id), lesson);
  const selectionFor = (lesson: ShadowingLesson) =>
    selections[lesson.id] || placeFor(lesson)?.repeats || 1;
  useEffect(() => {
    let active = true;
    setLoading(true);
    const promise = demo && import.meta.env.DEV
      ? fetch(`${import.meta.env.BASE_URL}design/shadowing/pilot-01-audio/cues.json`)
          .then(async (response) => {
            if (!response.ok) throw Error("Local Shadowing pilot cues are missing.");
            return [validateShadowingImport(await response.json())];
          })
      : db
        ? getDocs(query(collection(db, "shadowingLessons"), where("status", "==", "published")))
            .then((snapshot) => snapshot.docs.map((item) => ({
              ...item.data(), id: item.id,
            } as ShadowingLesson)).sort((a, b) => a.id.localeCompare(b.id)))
        : Promise.resolve([]);
    void promise.then((result) => {
      if (active) setLessons(result);
    }).catch((error) => {
      if (active) setLoadError((error as Error).message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [demo]);
  useLayoutEffect(() => {
    if (activeLesson || !lessons.length) return;
    const track = carouselRef.current;
    const card = track?.children[visibleLesson] as HTMLElement | undefined;
    if (track && card) track.scrollLeft = card.offsetLeft - (track.children[0] as HTMLElement).offsetLeft;
  }, [activeLesson, lessons.length]);
  const slideTo = (index: number) => {
    const track = carouselRef.current;
    const card = track?.children[index] as HTMLElement | undefined;
    if (!track || !card) return;
    track.scrollTo({
      left: track.scrollLeft + card.getBoundingClientRect().left - track.getBoundingClientRect().left,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };
  const updateVisibleLesson = () => {
    const track = carouselRef.current;
    if (!track) return;
    const left = track.getBoundingClientRect().left;
    const cards = Array.from(track.children) as HTMLElement[];
    const nearest = cards.reduce((best, card, index) =>
      Math.abs(card.getBoundingClientRect().left - left) <
      Math.abs(cards[best].getBoundingClientRect().left - left) ? index : best, 0);
    setVisibleLesson(nearest);
  };
  return <>
    {!activeLesson ? <>
      <div className="page-intro shadow-intro">
        <span className="eyebrow">LISTEN & SPEAK</span>
        <h1>Shadowing</h1>
        <p>Hear a line. Say it back. Keep moving.</p>
      </div>
      {loadError && <p role="alert" className="error">{loadError}</p>}
      {loading ? <div className="card shadow-library-card">Getting your listening space ready…</div>
        : lessons.length ? <>
          <div className="shadow-carousel">
            <div className="shadow-carousel-heading">
              <div><span className="eyebrow">CHOOSE A STORY</span><strong>{visibleLesson + 1} / {lessons.length}</strong></div>
              <div className="shadow-carousel-actions">
                <button type="button" aria-label="Previous lesson" disabled={visibleLesson === 0}
                  onClick={() => slideTo(visibleLesson - 1)}><ChevronLeft size={21} /></button>
                <button type="button" aria-label="Next lesson" disabled={visibleLesson === lessons.length - 1}
                  onClick={() => slideTo(visibleLesson + 1)}><ChevronRight size={21} /></button>
              </div>
            </div>
            <div className="shadow-carousel-track" ref={carouselRef} onScroll={updateVisibleLesson}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === "ArrowRight") { event.preventDefault(); slideTo(Math.min(visibleLesson + 1, lessons.length - 1)); }
                if (event.key === "ArrowLeft") { event.preventDefault(); slideTo(Math.max(visibleLesson - 1, 0)); }
              }}
              role="region" aria-roledescription="carousel" aria-label="Shadowing lessons" tabIndex={0}>
          {lessons.map((lesson, index) => {
            const saved = placeFor(lesson);
            const selectedRepeats = selectionFor(lesson);
            return <section className="card shadow-library-card shadow-carousel-card" key={lesson.id}
              aria-label={`${index + 1} of ${lessons.length}: ${lesson.title}`}>
            <Waveform />
            <span className="pill">{lesson.level} · {lesson.lines.length} lines</span>
            <h2>{lesson.title}</h2>
            <p>{lesson.summary}</p>
            <div className="shadow-phase-chips">
              <span>1 · Listen once · {formatAudioTime(lesson.warmupDuration)}</span>
              <span>2 · Shadow together · {formatAudioTime(lesson.shadowingDuration)}</span>
            </div>
            <div className="shadow-library-repeat">
              <b>Choose your practice rounds</b>
              <RepeatOptions lesson={lesson} value={selectedRepeats}
                onChange={(choice) => setSelections((current) => ({ ...current, [lesson.id]: choice }))} />
            </div>
            {saved && selectedRepeats === saved.repeats &&
              <p className="shadow-resume-note">Your place is saved · {formatAudioTime(saved.time)} into {saved.repeats}×</p>}
            {saved && selectedRepeats !== saved.repeats &&
              <p className="shadow-resume-note">This choice starts a new session from the beginning.</p>}
            <Button onClick={() => setActiveLesson(lesson)}>
              {saved && selectedRepeats === saved.repeats ? "Continue listening" : `Start ${selectedRepeats}× practice`}<ArrowRight size={18} />
            </Button>
          </section>;
          })}
            </div>
          </div>
          <section className="card shadow-how">
            <h2>How it works</h2>
            <p><b>1</b> Listen to the full conversation</p>
            <p><b>2</b> Repeat each line, then hear it again</p>
          </section>
          <p className="footnote">Optional practice · No tickets or streak required</p>
        </> : <Empty title="The next story is on its way">
          The administrator can publish a Shadowing lesson from Your studio.
        </Empty>}
    </> : <ShadowingPlayer
      key={activeLesson.id}
      lesson={activeLesson}
      demo={demo}
      storageKey={keyFor(activeLesson.id)}
      saved={placeFor(activeLesson)}
      onSaved={(place) => setPlaces((current) => ({ ...current, [activeLesson.id]: place }))}
      initialRepeats={selectionFor(activeLesson)}
      onRepeatsChange={(choice) => setSelections((current) => ({ ...current, [activeLesson.id]: choice }))}
      onClose={() => setActiveLesson(null)}
      theme={theme}
      onToggleTheme={onToggleTheme}
    />}
  </>;
}

function ShadowingPlayer({
  lesson, demo, storageKey, saved, onSaved, initialRepeats, onRepeatsChange,
  onClose, theme, onToggleTheme,
}: {
  lesson: ShadowingLesson;
  demo: boolean;
  storageKey: string;
  saved: SavedPlace | null;
  onSaved: (place: SavedPlace | null) => void;
  initialRepeats: RepeatCount;
  onRepeatsChange: (choice: RepeatCount) => void;
  onClose: () => void;
  theme: string;
  onToggleTheme: () => void;
}) {
  const [repeats, setRepeats] = useState<RepeatCount>(initialRepeats);
  const [started, setStarted] = useState(false);
  const [source, setSource] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState("");
  const [time, setTime] = useState(saved?.repeats === initialRepeats ? saved.time : 0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [complete, setComplete] = useState(false);
  const [meaning, setMeaning] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const savedSecond = useRef(-1);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const retryTime = useRef<number | null>(null);
  const initialTime = saved?.repeats === repeats ? saved.time : 0;
  const position = shadowingPosition(lesson, time, repeats);
  const activeLine = lesson.lines[position.line - 1];
  const totalDuration = programDuration(lesson, repeats);

  useEffect(() => {
    let active = true;
    setSource("");
    setReady(false);
    setError("");
    setPreparing(true);
    if (demo && import.meta.env.DEV) {
      setSource(`${import.meta.env.BASE_URL}design/shadowing/${lesson.id}-audio/program-${repeats}x.m4a`);
      setPreparing(false);
      return () => { active = false; };
    }
    if (!audioBase || !auth?.currentUser) {
      setError("The audio service is not connected yet.");
      setPreparing(false);
      return () => { active = false; };
    }
    void auth.currentUser.getIdToken().then((token) => fetch(`${audioBase}/v1/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lessonId: lesson.id, repeats }),
    })).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw Error(body.error || "Could not prepare the audio.");
      if (active) setSource(body.url);
    }).catch((cause) => {
      if (active) setError((cause as Error).message);
    }).finally(() => {
      if (active) setPreparing(false);
    });
    return () => { active = false; };
  }, [demo, lesson.id, repeats, loadAttempt]);

  useEffect(() => {
    const list = transcriptRef.current;
    const item = list?.querySelector<HTMLElement>(`[data-line="${position.line}"]`);
    if (list && item) {
      const target = item.offsetTop - list.offsetTop - list.clientHeight / 2 + item.clientHeight / 2;
      list.scrollTo({ top: target, behavior: "smooth" });
    }
    setMeaning(false);
  }, [position.line]);

  function checkpoint(current: number) {
    if (!started || complete) return;
    const second = Math.floor(current);
    if (second === savedSecond.current) return;
    savedSecond.current = second;
    const place = { repeats, time: current, updatedAt: Date.now() };
    localStorage.setItem(storageKey, JSON.stringify(place));
    onSaved(place);
  }
  function onMetadata() {
    const audio = audioRef.current;
    if (!audio) return;
    const resumeAt = retryTime.current ?? (!started ? initialTime : 0);
    if (resumeAt > 0) audio.currentTime = resumeAt;
    retryTime.current = null;
    setTime(audio.currentTime);
    setReady(true);
  }
  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !ready) return;
    setError("");
    try {
      if (audio.paused) {
        await audio.play();
        setStarted(true);
      } else audio.pause();
    } catch {
      setError("Playback could not start. Check your connection and try again.");
    }
  }
  function seek(delta: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || totalDuration, audio.currentTime + delta));
    setTime(audio.currentTime);
    checkpoint(audio.currentTime);
  }
  function close() {
    audioRef.current?.pause();
    checkpoint(audioRef.current?.currentTime || time);
    onClose();
  }
  function restart() {
    localStorage.removeItem(storageKey);
    onSaved(null);
    setComplete(false);
    setStarted(false);
    setTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  }
  function changeRepeats(choice: RepeatCount) {
    if (choice === repeats) return;
    audioRef.current?.pause();
    setStarted(false);
    setPlaying(false);
    setComplete(false);
    setRepeats(choice);
    onRepeatsChange(choice);
    setTime(saved?.repeats === choice ? saved.time : 0);
    savedSecond.current = -1;
    retryTime.current = null;
  }

  return <div className="shadow-player">
    <header className="shadow-player-header">
      <button className="icon-btn" aria-label="Back to Shadowing" onClick={close}><ArrowLeft /></button>
      <b>Listen & speak</b>
      <button className="icon-btn" aria-label="Change theme" onClick={onToggleTheme}>
        {theme === "light" ? <Moon /> : <Sun />}
      </button>
    </header>
    <audio
      ref={audioRef}
      src={source || undefined}
      preload="metadata"
      onLoadedMetadata={onMetadata}
      onTimeUpdate={(event) => {
        const current = event.currentTarget.currentTime;
        setTime(current);
        checkpoint(current);
      }}
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onEnded={() => {
        setPlaying(false);
        setComplete(true);
        localStorage.removeItem(storageKey);
        onSaved(null);
      }}
      onError={() => {
        if (source) setError("Audio could not load. Check your connection and try again.");
      }}
    />
    {complete ? <main className="shadow-complete">
      <div className="shadow-complete-icon"><Check size={46} /></div>
      <span className="eyebrow">ONE LITTLE STEP, EVERY DAY</span>
      <h1>You gave every line a voice.</h1>
      <p>{repeats} full {repeats === 1 ? "round" : "rounds"} of shadowing complete.</p>
      <Button onClick={restart}><RotateCcw size={18} /> Practice again</Button>
      <Button secondary onClick={close}>Back to Shadowing</Button>
    </main> : <main className="shadow-player-main">
      <div className="shadow-player-heading">
        <h1>{lesson.title}</h1>
        <p>{lesson.level} · {lesson.lines.length} lines · {formatAudioTime(totalDuration)}</p>
      </div>
      <section className={`card shadow-setup ${started ? "shadow-setup-compact" : ""}`}>
        <h2>Practice rounds</h2>
        {!started && <p className="muted">Listen to the whole story once, then shadow every line. Practice repeats automatically.</p>}
        <RepeatOptions lesson={lesson} value={repeats} onChange={changeRepeats} />
        {started && <p className="muted">Changing rounds stops this session and starts the new length from the beginning.</p>}
        {!started && initialTime > 0 && <p className="shadow-resume-note">Continue from {formatAudioTime(initialTime)}, or choose another length to start over.</p>}
      </section>
      <div className="shadow-phase-switch" aria-label="Listening phase">
        <span className={position.phase === "warmup" ? "selected" : ""}>1 · Listen once</span>
        <span className={position.phase === "practice" ? "selected" : ""}>2 · Shadow together</span>
      </div>
      <section className="card shadow-audio-card">
        <div className="shadow-audio-track">
          <Waveform active={playing} />
          <div className="shadow-time-row">
            <span>{formatAudioTime(time)}</span>
            <input type="range" min={0} max={totalDuration} value={Math.min(time, totalDuration)} step={0.1}
              aria-label="Audio position" onChange={(event) => {
                const audio = audioRef.current;
                if (!audio) return;
                audio.currentTime = Number(event.target.value);
                setTime(audio.currentTime);
                checkpoint(audio.currentTime);
              }} />
            <span>{formatAudioTime(totalDuration)}</span>
          </div>
        </div>
      </section>
      {error && <div className="shadow-retry" role="alert">
        <p className="error">{error}</p>
        <button onClick={() => {
          retryTime.current = audioRef.current?.currentTime || time;
          setLoadAttempt((value) => value + 1);
        }}>Try audio again</button>
      </div>}
      {preparing && <p className="small muted">Preparing your private audio…</p>}
      {position.phase === "practice" && <p className="shadow-round"><Clock3 size={15} /> Round {position.round} of {repeats}</p>}
      <section className="card shadow-line-card">
        <div className="shadow-line-top">
          <span>{activeLine.speaker.toUpperCase()} · LINE {position.line} OF {lesson.lines.length}</span>
          <button className="text-button" onClick={() => setMeaning((value) => !value)} aria-pressed={meaning}>
            <Eye size={17} /> {meaning ? "Hide meaning" : "Show meaning"}
          </button>
        </div>
        <h2>{activeLine.text}</h2>
        {meaning && <p className="shadow-translation">{activeLine.translation}</p>}
        {position.phase === "practice" && <div className="shadow-stages">
          {["0.75× Listen", "Your turn", "1× Replay", "Next line"].map((stage) =>
            <span key={stage} className={position.stage === stage ? "active" : ""}>
              {stage === "Your turn" && position.stage === stage ? `${Math.ceil(position.remaining)}s · ` : ""}{stage}
            </span>)}
        </div>}
      </section>
      <section className="card shadow-transcript">
        <h2>Transcript</h2>
        <div ref={transcriptRef} className="shadow-transcript-list">
          {lesson.lines.map((line) => <div key={line.id} data-line={line.id} className={line.id === position.line ? "active" : ""}>
            <span>{line.id}</span><b>{line.speaker}</b><p>{line.text}</p>
          </div>)}
        </div>
      </section>
      <div className="shadow-controls">
        <button onClick={() => seek(-10)} aria-label="Back ten seconds">−10s</button>
        <button className="primary" onClick={() => void togglePlayback()} disabled={!ready}>
          {playing ? <Pause size={18} fill="currentColor" /> : <Volume2 size={18} />}
          {playing ? "Pause" : started ? "Continue" : "Start listening"}
        </button>
        <button onClick={() => seek(10)} aria-label="Forward ten seconds">+10s</button>
      </div>
      <p className="shadow-safety">Set your rounds before you travel. Keep your phone away while moving.</p>
    </main>}
  </div>;
}
