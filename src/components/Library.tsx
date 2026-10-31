import { useState } from "react";
import {
  Search,
  Bookmark,
  Play,
  SlidersHorizontal,
  Check,
  ArrowLeft,
  ExternalLink,
  VolumeX,
} from "lucide-react";
import {
  type Lesson,
  type Learning,
  type VideoProgress,
  emptyVideo,
  normalize,
} from "../lib/model";
import { Button, Empty, ProgressBar, SectionTitle } from "./ui";
export function Scene({
  palette,
  large = false,
}: {
  palette: string;
  large?: boolean;
}) {
  return (
    <div
      className={`scene ${palette} ${large ? "large" : ""}`}
      aria-hidden="true"
    >
      <div className="scene-window" />
      <div className="scene-person one" />
      <div className="scene-person two" />
      <div className="scene-table" />
      <span className="scene-cup">☕</span>
      <span className="scene-bubble">hello.</span>
    </div>
  );
}
export function Library({
  lessons,
  data,
  onOpen,
  onSave,
}: {
  lessons: Lesson[];
  data: Learning;
  onOpen: (id: string) => void;
  onSave: (id: string) => void;
}) {
  const [q, setQ] = useState(""),
    [tab, setTab] = useState("All"),
    [filters, setFilters] = useState(false),
    [level, setLevel] = useState("All"),
    [topic, setTopic] = useState("All");
  const current = lessons.find(
    (l) => data.videos[l.id] && !data.videos[l.id].completed,
  );
  const items = lessons.filter(
    (l) =>
      (tab !== "Saved" || data.savedVideos.includes(l.id)) &&
      (tab !== "Completed" || data.videos[l.id]?.completed) &&
      (level === "All" || l.level === level) &&
      (topic === "All" || l.topic === topic) &&
      `${l.title} ${l.topic}`.toLowerCase().includes(q.toLowerCase()) &&
      !(
        tab === "All" &&
        !q &&
        level === "All" &&
        topic === "All" &&
        l.id === current?.id
      ),
  );
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">LISTEN. NOTICE. MAKE IT YOURS.</span>
        <h1>
          Small scenes.
          <br />
          <em>Real conversations.</em>
        </h1>
        <p>Find the words for your everyday moments.</p>
      </div>
      {current && (
        <section>
          <SectionTitle title="Continue learning" />
          <div className="continue-card card">
            <Scene palette={current.palette} large />
            <div>
              <span className="pill">
                {current.level} · {current.duration}
              </span>
              <h2>{current.title}</h2>
              <p>{data.videos[current.id].step} of 6 steps completed</p>
              <ProgressBar value={(data.videos[current.id].step / 6) * 100} />
              <Button onClick={() => onOpen(current.id)}>
                Continue learning <Play size={17} />
              </Button>
            </div>
          </div>
        </section>
      )}
      <SectionTitle
        title="Explore videos"
        aside={
          <span className="muted small">
            {lessons.length} little conversations
          </span>
        }
      />
      <div className="search-row">
        <label className="search">
          <Search size={19} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search videos or topics"
          />
        </label>
        <button
          className="icon-btn bordered"
          aria-label="Filter videos"
          aria-expanded={filters}
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal />
        </button>
      </div>
      {filters && (
        <div className="filter-row">
          <label>
            Level
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              {["All", ...new Set(lessons.map((l) => l.level))].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Topic
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              {["All", ...new Set(lessons.map((l) => l.topic))].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="chips">
        {["All", "Saved", "Completed"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="video-grid">
        {items.map((l) => (
          <article className="video-card card" key={l.id}>
            <button className="video-link" onClick={() => onOpen(l.id)}>
              <div className="video-thumbnail">
                <Scene palette={l.palette} />
                <span className="duration">{l.duration}</span>
              </div>
              <div>
                <span className="eyebrow">{l.topic}</span>
                <h3>{l.title}</h3>
                <span className="pill">{l.level}</span>
                {data.videos[l.id]?.completed && (
                  <span className="completed-label">
                    <Check size={13} />
                    Completed
                  </span>
                )}
              </div>
            </button>
            <button
              className={
                "icon-btn bookmark " +
                (data.savedVideos.includes(l.id) ? "active" : "")
              }
              aria-label={`Save ${l.title}`}
              aria-pressed={data.savedVideos.includes(l.id)}
              onClick={() => onSave(l.id)}
            >
              <Bookmark size={20} />
            </button>
          </article>
        ))}
      </div>
      {!items.length && (
        <Empty title="A little quiet here">
          {lessons.length
            ? "Try another search or filter."
            : "Your administrator hasn’t published any video lessons yet."}
        </Empty>
      )}
      <p className="footnote">
        Optional practice · Not required for your streak
      </p>
    </>
  );
}
const steps = [
  "Listen",
  "Watch & collect",
  "Translate",
  "Shadow",
  "Speak",
  "Review",
];
export function VideoSession({
  lesson,
  progress,
  onSave,
  onClose,
  busy,
}: {
  lesson: Lesson;
  progress: VideoProgress;
  onSave: (p: VideoProgress) => Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  const [p, setP] = useState(progress),
    [error, setError] = useState(""),
    [showPlayer, setShowPlayer] = useState(true),
    [translation, setTranslation] = useState(false),
    [draftAnswer, setDraftAnswer] = useState(""),
    [quizFeedback, setQuizFeedback] = useState<boolean | null>(null);
  const saved = lesson.lines.filter((l) => p.saved.includes(l.id));
  const line = saved.find((l) => !p.quizDone.includes(l.id));
  async function update(next: VideoProgress) {
    setError("");
    try {
      await onSave(next);
      setP(next);
    } catch {
      setError("Could not save your progress. Please try again.");
    }
  }
  async function leave() {
    setError("");
    try {
      await onSave(p);
      onClose();
    } catch {
      setError("Could not save your draft. Please try again before leaving.");
    }
  }
  const canNext =
    p.step === 0
      ? p.listens >= 2
      : p.step === 1
        ? p.watches >= 2 && saved.length > 0
        : p.step === 2
          ? saved.every((l) => p.drafts[l.id]?.trim())
          : p.step === 4
            ? p.muted
            : true;
  return (
    <main className="video-session">
      <header className="session-header">
        <button
          className="icon-btn"
          aria-label="Back to videos"
          disabled={busy}
          onClick={() => void leave()}
        >
          <ArrowLeft />
        </button>
        <b>{lesson.title}</b>
        <span className="pill">{lesson.level}</span>
      </header>
      <div className="video-steps">
        {steps.map((s, i) => (
          <div
            key={s}
            className={
              i === p.step ? "current" : i < p.step || p.completed ? "done" : ""
            }
          >
            <span>
              {i < p.step || p.completed ? <Check size={15} /> : i + 1}
            </span>
            <small>{s}</small>
          </div>
        ))}
      </div>
      {p.completed ? (
        <div className="card celebration">
          <span className="eyebrow">A CONVERSATION TO KEEP</span>
          <h1>That’s a wrap.</h1>
          <p>You’ve completed all six steps of “{lesson.title}”.</p>
          <Button onClick={onClose}>Back to Videos</Button>
        </div>
      ) : (
        <>
          <span className="eyebrow">STEP {p.step + 1} OF 6</span>
          <h1>
            {
              [
                "Listen before you look.",
                "Little phrases. Big possibilities.",
                "Find the meaning.",
                "Make their words your own.",
                "Your voice. Their scene.",
                "Let’s make it stick.",
              ][p.step]
            }
          </h1>
          <p className="muted">
            {
              [
                "Start the player, then hide the picture and listen. Confirm each full listen yourself.",
                "Watch twice. Save the lines you’d like to make your own.",
                "Use the timestamps to replay lines manually, then write what they mean.",
                "Manually replay each saved line. Match the rhythm, stress and feeling.",
                "Mute the Drive player yourself before speaking. Scroll the script at your own pace.",
                "Recall the first word of each sentence you saved.",
              ][p.step]
            }
          </p>
          {p.step !== 5 && (
            <>
              <div
                className={"drive-frame " + (!showPlayer ? "concealed" : "")}
              >
                {lesson.driveFileId ? (
                  <iframe
                    title={lesson.title}
                    src={`https://drive.google.com/file/d/${encodeURIComponent(lesson.driveFileId)}/preview`}
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                ) : (
                  <div className="media-placeholder">
                    <Play size={36} />
                    <b>Video preview</b>
                    <span>
                      This sample has no media attached.
                      <br />
                      Published lessons use your Drive videos.
                    </span>
                  </div>
                )}
                {!showPlayer && (
                  <div className="audio-cover">
                    <VolumeX />
                    <span>Picture hidden · Keep listening</span>
                  </div>
                )}
              </div>
              <div className="player-tools">
                {p.step === 0 && (
                  <button
                    className="text-button"
                    onClick={() => setShowPlayer(!showPlayer)}
                  >
                    {showPlayer ? "Hide picture" : "Show player controls"}
                  </button>
                )}
                {lesson.driveFileId && (
                  <a
                    href={`https://drive.google.com/file/d/${encodeURIComponent(lesson.driveFileId)}/view`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Drive <ExternalLink size={14} />
                  </a>
                )}
              </div>
              <p className="small muted">
                Use the Drive controls to play, seek and mute. Access is managed
                separately from your app account.
              </p>
            </>
          )}
          {p.step < 2 ? (
            <>
              <div className="card confirmation">
                <span>
                  {p.step === 0 ? p.listens : p.watches} / 2{" "}
                  {p.step === 0 ? "listens" : "watches"} confirmed
                </span>
                <Button
                  secondary
                  disabled={busy || (p.step === 0 ? p.listens : p.watches) >= 2}
                  onClick={() =>
                    void update({
                      ...p,
                      [p.step === 0 ? "listens" : "watches"]: Math.min(
                        2,
                        (p.step === 0 ? p.listens : p.watches) + 1,
                      ),
                    })
                  }
                >
                  I finished one {p.step === 0 ? "listen" : "watch"}
                </Button>
                <small>
                  Self-reported · playback is not tracked automatically
                </small>
              </div>
              {p.step === 1 && (
                <div className="transcript">
                  {lesson.lines.map((l) => (
                    <button
                      key={l.id}
                      className={
                        "transcript-line " +
                        (p.saved.includes(l.id) ? "selected" : "")
                      }
                      disabled={busy}
                      onClick={() =>
                        void update({
                          ...p,
                          saved: p.saved.includes(l.id)
                            ? p.saved.filter((id) => id !== l.id)
                            : [...p.saved, l.id],
                        })
                      }
                    >
                      <time>{l.time}</time>
                      <span>{l.en}</span>
                      <Bookmark size={20} />
                    </button>
                  ))}
                  <p className="muted small">
                    Save at least one line to continue.
                  </p>
                </div>
              )}
            </>
          ) : p.step === 2 ? (
            <>
              {saved.map((l) => (
                <div className="card translation-card" key={l.id}>
                  <time>{l.time}</time>
                  <h3>{l.en}</h3>
                  <label>
                    Your Vietnamese interpretation
                    <textarea
                      value={p.drafts[l.id] || ""}
                      onChange={(e) =>
                        setP({
                          ...p,
                          drafts: { ...p.drafts, [l.id]: e.target.value },
                        })
                      }
                      placeholder="Write what this means in context…"
                    />
                  </label>
                  {translation && <p className="translation">{l.vi}</p>}
                </div>
              ))}
              <button
                className="text-button"
                onClick={() => setTranslation(!translation)}
              >
                {translation ? "Hide" : "Show"} suggested translations
              </button>
            </>
          ) : p.step === 3 ? (
            <div className="transcript">
              {saved.map((l) => (
                <div className="transcript-line" key={l.id}>
                  <time>{l.time}</time>
                  <span>
                    {l.en}
                    <small>{l.vi}</small>
                  </span>
                </div>
              ))}
              <p className="small muted">
                Replay each timestamp in the player. Try saying the line three
                times.
              </p>
            </div>
          ) : p.step === 4 ? (
            <>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={p.muted}
                  onChange={(e) =>
                    void update({ ...p, muted: e.target.checked })
                  }
                />
                I have muted the Drive player
              </label>
              <div className="transcript">
                {lesson.lines.map((l) => (
                  <div className="transcript-line" key={l.id}>
                    <time>{l.time}</time>
                    <span>{l.en}</span>
                  </div>
                ))}
              </div>
            </>
          ) : line ? (
            <div className="card">
              <p className="muted">
                {p.quizDone.length + 1} of {saved.length} · Fill in the missing
                word
              </p>
              <h2>_____ {line.en.split(" ").slice(1).join(" ")}</h2>
              <p className="translation">{line.vi}</p>
              <label>
                Your answer
                <input
                  value={draftAnswer}
                  disabled={quizFeedback === true}
                  onChange={(e) => {
                    setDraftAnswer(e.target.value);
                    setQuizFeedback(null);
                  }}
                />
              </label>
              <Button
                disabled={!draftAnswer.trim()}
                onClick={() =>
                  setQuizFeedback(
                    normalize(draftAnswer) === normalize(line.en.split(" ")[0]),
                  )
                }
              >
                Check answer
              </Button>
              {quizFeedback !== null && (
                <p role="status">
                  {quizFeedback
                    ? "That’s right!"
                    : `Try again. The sentence begins with “${line.en.split(" ")[0]}”.`}
                </p>
              )}
              {quizFeedback && (
                <Button
                  onClick={() => {
                    void update({ ...p, quizDone: [...p.quizDone, line.id] });
                    setDraftAnswer("");
                    setQuizFeedback(null);
                  }}
                >
                  Next
                </Button>
              )}
            </div>
          ) : (
            <div className="card">
              <h2>All your saved lines reviewed.</h2>
              <p>Come back and use them in a real conversation.</p>
            </div>
          )}
          {error && <p className="error">{error}</p>}
          <div className="video-actions">
            {p.step > 0 && (
              <Button
                secondary
                disabled={busy}
                onClick={() => void update({ ...p, step: p.step - 1 })}
              >
                Previous step
              </Button>
            )}
            {p.step < 5 ? (
              <Button
                disabled={!canNext || busy}
                onClick={() => {
                  void update({ ...p, step: p.step + 1 });
                  setShowPlayer(true);
                  setTranslation(false);
                  window.scrollTo(0, 0);
                }}
              >
                {busy
                  ? "Saving…"
                  : p.step === 3
                    ? "I practised these lines"
                    : "Save & continue"}
              </Button>
            ) : (
              <Button
                disabled={Boolean(line) || busy}
                onClick={() => void update({ ...p, completed: true })}
              >
                Finish lesson
              </Button>
            )}
          </div>
        </>
      )}
    </main>
  );
}
