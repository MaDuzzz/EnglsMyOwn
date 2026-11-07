import { useEffect, useRef, useState } from "react";
import {
  X,
  ArrowLeft,
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
} from "../lib/model";
import { Button, Road, Modal, ProgressBar } from "./ui";
import Pet from "./Pet";
import type { Companion } from "../lib/pets";
import WordDetails from "./WordDetails";
import PronunciationControls from "./PronunciationControls";
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
    lastActivity = useRef(Date.now());
  const task = s.queue[0],
    word = task ? s.words.find((w) => w.id === task.wordId)! : s.words[0];
  const intro = task && s.mode === "learn" && !s.introduced.includes(word.id),
    refresher = Boolean(task?.refresher);
  useEffect(() => {
    const touch = () => {
      lastActivity.current = Date.now();
    };
    const timer = setInterval(() => {
      if (dayKey() !== s.day) {
        onClose();
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
  function submit() {
    if (feedback !== null || !task) return;
    const correct = grade(word, task, answer);
    setFeedback(correct);
  }
  function next() {
    if (feedback === null) return;
    setS(advance(s, feedback));
    setFeedback(null);
    setAnswer("");
    setTokens([]);
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
    <main className="session-page">
      <header className="session-header">
        <button
          className="icon-btn"
          aria-label="Leave batch"
          onClick={() => setExit(true)}
        >
          <ArrowLeft />
        </button>
        <b>
          {complete
            ? "Batch complete"
            : s.mode === "review"
              ? `Review · Round ${s.round} of 4`
              : "Learn new words"}
        </b>
        <button
          className="icon-btn"
          aria-label="Close batch"
          onClick={() => setExit(true)}
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
            <Button onClick={onClose}>Back to Words</Button>
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
                ? "MEET YOUR NEXT WORD"
                : refresher
                  ? "A QUICK REFRESH"
                  : `QUESTION ${(s.completed.length % 10) + 1} · GO AT YOUR OWN PACE`}
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
              <div className="card word-intro">
                <WordDetails key={word.id} word={word} />
              </div>
              <div className="word-practice-action">
                <Button
                  onClick={() => {
                    setS({
                      ...s,
                      introduced: [...s.introduced, word.id],
                      queue: s.queue.map((t, i) =>
                        i === 0 ? { ...t, refresher: false } : t,
                      ),
                    });
                    setAnswer("");
                  }}
                >
                  {intro
                    ? word.headword.includes(" ")
                      ? "Practise this phrase"
                      : "Practise this word"
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
                  className={"feedback " + (feedback ? "correct" : "incorrect")}
                  role="status"
                >
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
                <Button onClick={next}>Continue</Button>
              )}
            </form>
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
          <Button secondary onClick={onClose}>
            Leave batch
          </Button>
        </Modal>
      )}
    </main>
  );
}
