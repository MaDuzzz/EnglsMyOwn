import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type TouchEvent,
} from "react";
import {
  X,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Check,
  Info,
  AlertCircle,
  Ticket,
  BookOpen,
} from "lucide-react";
import {
  type Session as SessionType,
  type BatchRecord,
  advance,
  grade,
  dayKey,
  normalize,
  shuffledTokens,
  sentenceParts,
  arrangeAnswer,
  nextIntroduction,
  introduceWord,
} from "../lib/model";
import { Button, Road, Modal, ProgressBar } from "./ui";
import Pet from "./Pet";
import type { Companion } from "../lib/pets";
import WordDetails from "./WordDetails";
import PronunciationControls from "./PronunciationControls";
import {
  playWordRecording,
  stopPronunciation,
} from "../lib/pronunciationAudio";
import { playAnswerFeedback, stopFeedbackVoice } from "../lib/feedbackAudio";

function readNextStep(session: SessionType) {
  const introduction = nextIntroduction(session);
  const task = session.queue[0];
  const word =
    introduction || session.words.find((item) => item.id === task?.wordId);
  if (word && (introduction || task?.kind === "listen" || task?.refresher))
    playWordRecording(word);
  else stopPronunciation();
}

const fireworks = Array.from({ length: 18 }, (_, i) => {
  const angle = (i * Math.PI * 2) / 18;
  const radius = 60 + (i % 4) * 17;
  return {
    "--burst-x": `${Math.round(Math.cos(angle) * radius)}px`,
    "--burst-y": `${Math.round(Math.sin(angle) * radius)}px`,
    "--burst-delay": `${(i % 3) * 35}ms`,
  } as CSSProperties;
});

export default function Session({
  initial,
  onClose,
  onComplete,
  demo,
  tickets,
  required,
  pet,
  theme,
  petStage,
}: {
  initial: SessionType;
  onClose: () => void;
  onComplete: (record: BatchRecord) => Promise<boolean>;
  demo: boolean;
  tickets: number;
  required: number;
  pet: Companion;
  theme: string;
  petStage: number;
}) {
  const [s, setS] = useState(initial),
    [answer, setAnswer] = useState(""),
    [tokens, setTokens] = useState<number[]>([]),
    [feedback, setFeedback] = useState<boolean | null>(null),
    [exit, setExit] = useState(false),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false),
    [meal, setMeal] = useState(false),
    [error, setError] = useState("");
  const seconds = useRef(0),
    lastActivity = useRef(Date.now()),
    swipeStart = useRef<{ x: number; y: number } | null>(null),
    transitioning = useRef(false),
    feedbackRef = useRef<HTMLDivElement>(null);
  const task = s.queue[0],
    introWord = nextIntroduction(s),
    word =
      introWord ||
      (task ? s.words.find((w) => w.id === task.wordId)! : s.words[0]);
  const intro = Boolean(introWord),
    refresher = !intro && Boolean(task?.refresher);
  const advanceReady = Boolean(intro || refresher || feedback !== null);
  useEffect(() => {
    const touch = () => {
      lastActivity.current = Date.now();
    };
    const timer = setInterval(() => {
      if (dayKey() !== s.day) {
        leave();
        return;
      }
      if (
        !document.hidden &&
        !exit &&
        !saved &&
        Date.now() - lastActivity.current < 60000
      )
        seconds.current++;
    }, 1000);
    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
    };
  }, [s.day, exit, saved]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!saved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saved]);
  useEffect(() => {
    if (feedback === null) return;
    feedbackRef.current?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "nearest",
    });
  }, [feedback]);
  function leave() {
    stopPronunciation();
    stopFeedbackVoice();
    onClose();
  }
  function submit() {
    if (feedback !== null || !task) return;
    const correct = grade(word, task, answer);
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    stopPronunciation();
    playAnswerFeedback(correct);
    setFeedback(correct);
  }
  function next() {
    if (feedback === null) return;
    const following = advance(s, feedback);
    stopFeedbackVoice();
    readNextStep(following);
    setS(following);
    setFeedback(null);
    setAnswer("");
    setTokens([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function continueWord() {
    if (!intro && !refresher) return;
    const following = intro
      ? introduceWord(s)
      : {
          ...s,
          queue: s.queue.map((item, i) =>
            i === 0 ? { ...item, refresher: false } : item,
          ),
        };
    readNextStep(following);
    setS(following);
    setAnswer("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function continueStep() {
    if (transitioning.current) return;
    transitioning.current = true;
    if (intro || refresher) continueWord();
    else next();
    requestAnimationFrame(() => {
      transitioning.current = false;
    });
  }
  function onTouchStart(event: TouchEvent<HTMLElement>) {
    if (event.touches.length !== 1) return;
    swipeStart.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  }
  function onTouchEnd(event: TouchEvent<HTMLElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || !advanceReady || exit || complete) return;
    const dx = start.x - event.changedTouches[0].clientX;
    const dy = start.y - event.changedTouches[0].clientY;
    if (dx < 72 || dx < Math.abs(dy) * 1.4) return;
    event.preventDefault();
    continueStep();
  }
  async function finish() {
    setSaving(true);
    setError("");
    try {
      if (dayKey() !== s.day)
        throw Error("A new learning day has started. Please return to Words.");
      const fed = await onComplete({
        id: s.id,
        mode: s.mode,
        day: s.day,
        wordIds: s.words.map((w) => w.id),
        seconds: seconds.current,
        completedAt: new Date().toISOString(),
      });
      setMeal(fed);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  const complete = s.completed.length === 40;
  useEffect(() => {
    if (complete) void finish();
  }, [complete]);
  const displayed =
    s.completed.length +
    (feedback === true && !s.completed.includes(task?.id) ? 1 : 0);
  const parts = sentenceParts(word);
  const tokenOrder = shuffledTokens(parts.length, word.id);
  const choices = [word.meaningVi, ...word.meaningDistractorsVi];
  const offset = word.id.length % 4;
  const options = [...choices.slice(offset), ...choices.slice(0, offset)];
  return (
    <main
      className={"session-page" + (advanceReady ? " can-advance" : "")}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header className="session-header">
        <button
          className="icon-btn"
          aria-label="Leave batch"
          onClick={() => {
            stopPronunciation();
            setExit(true);
          }}
        >
          <ArrowLeft />
        </button>
        <b>
          {complete
            ? "Batch complete"
            : s.mode === "review"
              ? `Review · Round ${s.round} of 4`
              : intro
                ? `Meet the words · ${s.introduced.length + 1} of 10`
                : "Practise new words"}
        </b>
        <button
          className="icon-btn"
          aria-label="Close batch"
          onClick={() => {
            stopPronunciation();
            setExit(true);
          }}
        >
          <X />
        </button>
      </header>
      <Road count={displayed} />
      {complete ? (
        <div className="session-result">
          <span className="eyebrow">ONE LITTLE STEP, EVERY DAY</span>
          <h1>
            {meal
              ? "A happy tummy. A little growth."
              : "You made it to the shop!"}
          </h1>
          {saved && meal ? (
            <div className="result-pet-scene">
              <Pet pet={pet} theme={theme} stage={petStage} preview />
            </div>
          ) : (
            <div className="ticket-hero">
              <Ticket size={70} />
              <strong>+1</strong>
            </div>
          )}
          <div className="card">
            <h2>
              {saved
                ? meal
                  ? `${pet.name} has been fed!`
                  : "One food ticket earned"
                : "40 tasks. All yours."}
            </h2>
            <p>
              {saved
                ? `${Math.min(tickets, required)} / ${required} tickets earned`
                : "Saving your completed batch and food ticket…"}
            </p>
            <ProgressBar value={saved ? (tickets / required) * 100 : 100} />
            {saved && (
              <p>
                {meal
                  ? "Your daily meal was exchanged automatically."
                  : s.mode === "review"
                    ? "Keep going to earn today’s meal."
                    : "Your ten words are now in My words."}
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {saved ? (
            <Button onClick={leave}>Back to Words</Button>
          ) : (
            <Button disabled={saving} onClick={() => void finish()}>
              {saving ? "Saving…" : "Retry saving"}
            </Button>
          )}
          <p className="muted small">
            Completed batches stay safe when you leave.
          </p>
        </div>
      ) : (
        <>
          <div className="exercise-title">
            <span className="eyebrow">
              {intro
                ? `MEET WORD ${s.introduced.length + 1} OF 10`
                : refresher
                  ? "A QUICK REFRESH"
                  : `QUESTION ${s.completed.length + 1} OF 40 · GO AT YOUR OWN PACE`}
            </span>
            <h1>
              {intro
                ? "A new word, a new possibility."
                : refresher
                  ? "Let’s look at this once more."
                  : {
                      listen: "Listen & type",
                      gap: "Fill in the missing word",
                      arrange: "Build the sentence",
                      meaning: "Choose the meaning",
                      recall: "Recall in English",
                    }[task.kind]}
            </h1>
          </div>
          {intro || refresher ? (
            <>
              {intro && (
                <div className="intro-progress">
                  <span>First, meet all ten words. Practice comes next.</span>
                  <ProgressBar
                    value={(s.introduced.length / 10) * 100}
                    label="Words introduced"
                  />
                </div>
              )}
              <div className="card word-intro">
                <WordDetails key={word.id} word={word} />
              </div>
              <div className="word-practice-action">
                <Button onClick={continueStep}>
                  {intro
                    ? s.introduced.length === 9
                      ? "Start practice"
                      : "Next word"
                    : "Try again"}
                </Button>
              </div>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <div className="card exercise-card">
                {task.kind === "listen" ? (
                  <>
                    <h2>What did you hear?</h2>
                    <p className="muted">
                      Listen closely, then type the word or phrase.
                    </p>
                    <PronunciationControls
                      key={word.id}
                      word={word}
                      hideAnswer
                      stopToken={feedback}
                    />
                  </>
                ) : task.kind === "gap" ? (
                  <>
                    <p className="sentence">
                      {word.gapTemplate.replace("{{blank}}", "________")}
                    </p>
                    <p className="muted">{word.exampleVi}</p>
                  </>
                ) : task.kind === "arrange" ? (
                  <>
                    <p className="muted">{word.exampleVi}</p>
                    <div className="sentence-tray" aria-label="Your sentence">
                      {!tokens.length && (
                        <span>Tap the words to build your sentence</span>
                      )}
                      {tokens.map((i, n) => (
                        <button
                          type="button"
                          disabled={feedback !== null}
                          key={i}
                          onClick={() => {
                            const next = tokens.filter((_, j) => j !== n);
                            setTokens(next);
                            setAnswer(
                              arrangeAnswer(
                                word,
                                next.map((k) => parts[k]),
                              ),
                            );
                          }}
                        >
                          {parts[i]}
                        </button>
                      ))}
                    </div>
                    <div className="token-bank">
                      {tokenOrder
                        .filter((i) => !tokens.includes(i))
                        .map((i) => (
                          <button
                            type="button"
                            key={i}
                            disabled={feedback !== null}
                            onClick={() => {
                              const next = [...tokens, i];
                              setTokens(next);
                              setAnswer(
                                arrangeAnswer(
                                  word,
                                  next.map((k) => parts[k]),
                                ),
                              );
                            }}
                          >
                            {parts[i]}
                          </button>
                        ))}
                    </div>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setTokens([]);
                        setAnswer("");
                      }}
                      disabled={feedback !== null}
                    >
                      <RotateCcw size={16} />
                      Start over
                    </button>
                  </>
                ) : task.kind === "meaning" ? (
                  <>
                    <div className="question-word">{word.headword}</div>
                    <p className="muted">
                      {word.partOfSpeech} · {word.exampleEn}
                    </p>
                    <div className="options">
                      {options.map((o, i) => (
                        <button
                          type="button"
                          key={o}
                          aria-pressed={answer === o}
                          disabled={feedback !== null}
                          className={answer === o ? "selected" : ""}
                          onClick={() => setAnswer(o)}
                        >
                          <span>{String.fromCharCode(65 + i)}</span>
                          {o}
                          <span className="radio-dot" />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="question-word vi">{word.meaningVi}</div>
                    <p>{word.recallPromptVi}</p>
                    <small className="pill">
                      {word.partOfSpeech} · Starts with {word.headword[0]}
                    </small>
                  </>
                )}
                {["listen", "gap", "recall"].includes(task.kind) && (
                  <label className="answer-label">
                    Your answer
                    <input
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      autoCapitalize="none"
                      enterKeyHint="done"
                      value={answer}
                      disabled={feedback !== null}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Type the English word or phrase"
                      aria-label="Your answer"
                    />
                  </label>
                )}
              </div>
              {feedback !== null ? (
                <div
                  ref={feedbackRef}
                  className={"feedback " + (feedback ? "correct" : "incorrect")}
                  role="status"
                >
                  {feedback && (
                    <div className="answer-fireworks" aria-hidden="true">
                      {fireworks.map((style, i) => (
                        <i key={i} style={style} />
                      ))}
                    </div>
                  )}
                  <div className="feedback-title">
                    {feedback ? <Check /> : <AlertCircle />}
                    <b>{feedback ? "That’s right!" : "Not quite yet"}</b>
                  </div>
                  <strong>
                    {task.kind === "arrange"
                      ? word.exampleEn
                      : task.kind === "gap"
                        ? word.gapAnswers[0]
                        : task.kind === "meaning"
                          ? word.meaningVi
                          : task.kind === "recall"
                            ? word.recallAnswers[0]
                            : word.headword}
                  </strong>
                  <p>
                    {word.meaningVi} · {word.meaningEn}
                  </p>
                  {(task.kind === "gap" || task.kind === "arrange") &&
                    word.gapExplanationVi && (
                      <p className="answer-explanation" lang="vi">
                        {word.gapExplanationVi}
                      </p>
                    )}
                  {task.kind === "recall" && word.recallExplanationVi && (
                    <p className="answer-explanation" lang="vi">
                      {word.recallExplanationVi}
                    </p>
                  )}
                  {!feedback && (
                    <p className="your-attempt">
                      Your answer: <span>{answer}</span>
                    </p>
                  )}
                  {!feedback && (
                    <small>
                      Check the spelling and meaning. You’ll try this again
                      after other questions, or a short refresh.
                    </small>
                  )}
                </div>
              ) : null}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              {feedback === null ? (
                <Button
                  type="submit"
                  disabled={
                    !normalize(answer) ||
                    (task.kind === "arrange" && tokens.length !== parts.length)
                  }
                >
                  Check answer
                </Button>
              ) : (
                <div className="session-feedback-next">
                  <Button onClick={continueStep}>Continue</Button>
                </div>
              )}
            </form>
          )}
          {advanceReady && (
            <button
              type="button"
              className="swipe-next"
              onClick={continueStep}
              aria-label={
                intro
                  ? s.introduced.length === 9
                    ? "Start practice"
                    : "Next word"
                  : refresher
                    ? "Try again"
                    : "Continue to next question"
              }
            >
              <span>
                <ArrowLeft size={17} /> Swipe left to continue
              </span>
              <strong>
                {intro
                  ? s.introduced.length === 9
                    ? "Start practice"
                    : "Next word"
                  : refresher
                    ? "Try again"
                    : "Continue"}
              </strong>
              <ArrowRight size={18} />
            </button>
          )}
          <p className="session-note">
            <Info size={14} />
            Little steps count. There’s no time limit.
          </p>
        </>
      )}
      {exit && (
        <Modal
          title={saved ? "Leave this result?" : "Leave this batch?"}
          onClose={() => setExit(false)}
        >
          <p>
            {saved
              ? "Your completed batch has been saved."
              : "Your progress in this batch will reset. You’ll start again from the beginning."}
          </p>
          <p className="muted">
            Completed batches and earned tickets stay safe.
          </p>
          <Button onClick={() => setExit(false)}>Keep learning</Button>
          <Button secondary onClick={leave}>
            Leave batch
          </Button>
        </Modal>
      )}
    </main>
  );
}
