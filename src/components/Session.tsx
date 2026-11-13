import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
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
  Volume2,
  Timer,
  Eye,
} from "lucide-react";
import {
  type Session as SessionType,
  type BatchRecord,
  type SessionDraft,
  advance,
  grade,
  makeSessionDraft,
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
  playbackSnapshot,
  subscribePlayback,
  stopPronunciation,
} from "../lib/pronunciationAudio";
import {
  playAnswerFeedback,
  playCompletionFanfare,
  prepareCompletionAudio,
  speakPraise,
  speakWord,
  stopFeedbackVoice,
} from "../lib/feedbackAudio";
import { playableAccents } from "../lib/vocabulary";
import { reviewQuestionSeconds } from "../lib/reviewTimer";

function readNextStep(session: SessionType) {
  const introduction = nextIntroduction(session);
  const task = session.queue[0];
  const word =
    introduction || session.words.find((item) => item.id === task?.wordId);
  if (word && (introduction || task?.kind === "listen" || task?.refresher))
    playWordRecording(word);
  else stopPronunciation();
}

const fireworks = Array.from({ length: 24 }, (_, i) => {
  const angle = (i * Math.PI * 2) / 24;
  const radius = 60 + (i % 4) * 17;
  return {
    "--burst-x": `${Math.round(Math.cos(angle) * radius)}px`,
    "--burst-y": `${Math.round(Math.sin(angle) * radius)}px`,
    "--burst-delay": `${(i % 4) * 75}ms`,
  } as CSSProperties;
});

function Celebration({ complete = false }: { complete?: boolean }) {
  return (
    <div
      className={"celebration-sky" + (complete ? " is-complete" : "")}
      aria-hidden="true"
    >
      {[0, 1, 2].map((burst) => (
        <div className="celebration-burst" key={burst}>
          {fireworks.map((style, i) => (
            <i key={i} style={style} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Session({
  initial,
  draft,
  onClose,
  onComplete,
  onCheckpoint,
  onPause,
  onDiscard,
  demo,
  tickets,
  required,
  pet,
  theme,
  petStage,
}: {
  initial: SessionType;
  draft?: SessionDraft | null;
  onClose: () => void;
  onComplete: (record: BatchRecord) => Promise<boolean>;
  onCheckpoint: (draft: SessionDraft) => void;
  onPause: (draft: SessionDraft) => Promise<void>;
  onDiscard: () => Promise<void>;
  demo: boolean;
  tickets: number;
  required: number;
  pet: Companion;
  theme: string;
  petStage: number;
}) {
  const [s, setS] = useState(initial),
    [answer, setAnswer] = useState(draft?.answer || ""),
    [tokens, setTokens] = useState<number[]>(draft?.tokens || []),
    [feedback, setFeedback] = useState<boolean | null>(draft?.feedback ?? null),
    [exit, setExit] = useState(false),
    [discardError, setDiscardError] = useState(""),
    [meaningForThisAttempt, setMeaningForThisAttempt] = useState(false),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false),
    [meal, setMeal] = useState(false),
    [error, setError] = useState("");
  const [timer, setTimer] = useState({
      taskId: initial.queue[0]?.id || "",
      remaining: initial.queue[0]
        ? reviewQuestionSeconds(initial.queue[0].kind)
        : 0,
    }),
    [revealReason, setRevealReason] = useState<"wrong" | "skip" | "timeout">(
      draft?.feedback === false && !normalize(draft.answer) ? "skip" : "wrong",
    );
  const seconds = useRef(draft?.seconds || 0),
    lastActivity = useRef(Date.now()),
    checkpointRef = useRef(onCheckpoint),
    finishBusy = useRef(false),
    transitioning = useRef(false),
    wordCard = useRef<HTMLDivElement>(null),
    wordDrag = useRef<{
      id: number;
      x: number;
      y: number;
      offset: number;
    } | null>(null),
    wordAnimation = useRef<Animation | null>(null),
    enterNextWord = useRef(false),
    slidePanel = useRef<HTMLElement | null>(null),
    panelDrag = useRef<{
      id: number;
      x: number;
      y: number;
      offset: number;
    } | null>(null),
    panelAnimation = useRef<Animation | null>(null),
    enterNextPanel = useRef(false),
    feedbackRef = useRef<HTMLDivElement>(null),
    completionPlayed = useRef(false),
    completionRecord = useRef<BatchRecord | null>(null),
    gradedRef = useRef(
      draft?.feedback !== null && draft?.feedback !== undefined,
    );
  const task = s.queue[0],
    introWord = nextIntroduction(s),
    word =
      introWord ||
      (task ? s.words.find((w) => w.id === task.wordId)! : s.words[0]);
  const intro = Boolean(introWord),
    refresher = !intro && Boolean(task?.refresher),
    complete = s.completed.length === 40;
  const playback = useSyncExternalStore(
    subscribePlayback,
    playbackSnapshot,
    playbackSnapshot,
  );
  const textFallback = task?.kind === "listen" && meaningForThisAttempt;
  const audioWaiting =
    task?.kind === "listen" &&
    !textFallback &&
    playback.key === word.id &&
    (playback.status === "loading" || playback.status === "error");
  const timedQuestion =
    s.mode === "review" && !intro && !refresher && !complete && !!task;
  const questionSeconds = task ? reviewQuestionSeconds(task.kind) : 0;
  const remaining =
    timer.taskId === task?.id ? timer.remaining : questionSeconds;
  const advanceReady = Boolean(intro || refresher || feedback !== null);
  checkpointRef.current = onCheckpoint;
  function snapshot() {
    return makeSessionDraft(s, {
      answer,
      tokens,
      feedback,
      seconds: seconds.current,
    });
  }
  useLayoutEffect(() => {
    if (!saved) checkpointRef.current(snapshot());
  }, [s, answer, tokens, feedback, saved]);
  useEffect(() => {
    const touch = () => {
      lastActivity.current = Date.now();
    };
    const timer = setInterval(() => {
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
  }, [exit, saved]);
  useEffect(() => {
    const persist = () => {
      if (!saved) checkpointRef.current(snapshot());
    };
    window.addEventListener("pagehide", persist);
    return () => window.removeEventListener("pagehide", persist);
  }, [s, answer, tokens, feedback, saved]);
  useEffect(() => {
    if (
      s.mode !== "review" ||
      task?.kind !== "listen" ||
      feedback !== null ||
      textFallback
    )
      return;
    if (!playableAccents(word).length) return;
    const playback = playbackSnapshot();
    if (
      playback.key !== word.id ||
      (playback.status !== "loading" && playback.status !== "playing")
    )
      playWordRecording(word);
  }, [s.mode, task?.id, feedback, word, textFallback]);
  useEffect(() => {
    if (feedback === null) return;
    feedbackRef.current?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "nearest",
    });
  }, [feedback]);
  useEffect(() => {
    if (
      !timedQuestion ||
      !task ||
      feedback !== null ||
      exit ||
      remaining === 0 ||
      audioWaiting
    )
      return;
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      setTimer((current) => ({
        taskId: task.id,
        remaining: Math.max(
          0,
          (current.taskId === task.id
            ? current.remaining
            : reviewQuestionSeconds(task.kind)) - 1,
        ),
      }));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timedQuestion, task?.id, feedback, exit, remaining === 0, audioWaiting]);
  useEffect(() => {
    if (timedQuestion && !exit && remaining === 0 && feedback === null)
      revealAnswer("timeout");
  }, [timedQuestion, task?.id, remaining, feedback, exit]);
  useLayoutEffect(() => {
    if (!enterNextWord.current) return;
    enterNextWord.current = false;
    const card = wordCard.current;
    if (!card || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    card.animate(
      [
        { transform: "translate3d(48px, 0, 0)", opacity: 0 },
        { transform: "translate3d(0, 0, 0)", opacity: 1 },
      ],
      { duration: 340, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
  }, [introWord?.id]);
  useLayoutEffect(() => {
    if (!enterNextPanel.current) return;
    enterNextPanel.current = false;
    const panel = slidePanel.current;
    if (!panel || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    panel.animate(
      [
        { transform: "translate3d(48px, 0, 0)", opacity: 0 },
        { transform: "translate3d(0, 0, 0)", opacity: 1 },
      ],
      { duration: 340, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
  }, [s]);
  useEffect(
    () => () => {
      wordAnimation.current?.cancel();
      panelAnimation.current?.cancel();
    },
    [],
  );
  async function leave() {
    stopPronunciation();
    stopFeedbackVoice();
    if (saved) {
      onClose();
      return;
    }
    setSaving(true);
    await onPause(snapshot());
    onClose();
  }
  async function discard() {
    setSaving(true);
    setDiscardError("");
    try {
      await onDiscard();
    } catch (error) {
      setDiscardError(
        (error as Error).message || "Could not remove the batch.",
      );
      setSaving(false);
    }
  }
  function submit(selectedAnswer = answer) {
    if (feedback !== null || gradedRef.current || !task) return;
    gradedRef.current = true;
    const correct = grade(word, task, selectedAnswer);
    if (correct && s.completed.length === 39) prepareCompletionAudio();
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    stopPronunciation();
    const hasPronunciation =
      correct && !textFallback && playableAccents(word).length > 0;
    if (hasPronunciation)
      playWordRecording(word, {
        onEnded: speakPraise,
        onError: () => speakWord(word.headword, speakPraise),
      });
    else if (correct) speakWord(word.headword, speakPraise);
    playAnswerFeedback(correct, false);
    setRevealReason("wrong");
    setFeedback(correct);
  }
  function revealAnswer(reason: "skip" | "timeout") {
    if (feedback !== null || gradedRef.current || !task) return;
    gradedRef.current = true;
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    stopPronunciation();
    setRevealReason(reason);
    setFeedback(false);
  }
  function celebrateCompletion() {
    if (completionPlayed.current) return;
    completionPlayed.current = true;
    playCompletionFanfare();
  }
  function next(audioStarted = false) {
    if (feedback === null) return;
    const following = advance(s, feedback);
    if (!audioStarted) {
      stopFeedbackVoice();
      readNextStep(following);
    }
    if (following.completed.length === 40) celebrateCompletion();
    gradedRef.current = false;
    setTimer({
      taskId: following.queue[0]?.id || "",
      remaining: following.queue[0]
        ? reviewQuestionSeconds(following.queue[0].kind)
        : 0,
    });
    setS(following);
    setFeedback(null);
    setMeaningForThisAttempt(false);
    setAnswer("");
    setTokens([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function continueWord(audioStarted = false) {
    if (!intro && !refresher) return;
    const following = intro
      ? introduceWord(s)
      : {
          ...s,
          queue: s.queue.map((item, i) =>
            i === 0 ? { ...item, refresher: false } : item,
          ),
        };
    if (!audioStarted) readNextStep(following);
    if (refresher && task)
      setTimer({ taskId: task.id, remaining: questionSeconds });
    setS(following);
    setMeaningForThisAttempt(false);
    setAnswer("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function slideToNextWord() {
    if (!intro || transitioning.current) return;
    const following = introduceWord(s);
    // Start the next recording in the swipe/tap gesture for iOS audio playback.
    readNextStep(following);
    const card = wordCard.current;
    const offset = wordDrag.current?.offset || 0;
    wordDrag.current = null;
    if (
      !card ||
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !card.animate
    ) {
      setS(following);
      setAnswer("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    transitioning.current = true;
    const animation = card.animate(
      [
        {
          transform: `translate3d(${offset}px, 0, 0) rotate(${offset * 0.008}deg)`,
          opacity: Math.max(0.68, 1 + offset / 450),
        },
        {
          transform: `translate3d(${-card.clientWidth - 55}px, 0, 0) rotate(-4deg)`,
          opacity: 0,
        },
      ],
      { duration: 280, easing: "cubic-bezier(.3,.7,.2,1)", fill: "forwards" },
    );
    wordAnimation.current = animation;
    void animation.finished
      .then(() => {
        if (wordAnimation.current !== animation) return;
        card.style.visibility = "hidden";
        wordAnimation.current = null;
        animation.cancel();
        enterNextWord.current = true;
        setS(following);
        setAnswer("");
        window.scrollTo({ top: 0, behavior: "smooth" });
        requestAnimationFrame(() => {
          transitioning.current = false;
        });
      })
      .catch(() => {
        transitioning.current = false;
      });
  }
  function onWordPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      transitioning.current ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      (event.target as HTMLElement).closest("button, a, input, select")
    )
      return;
    if (event.pointerType === "mouse") event.preventDefault();
    wordDrag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offset: 0,
    };
  }
  function onWordPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = wordDrag.current;
    const card = wordCard.current;
    if (!drag || !card || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dy) > Math.abs(dx) * 1.2 && drag.offset === 0) {
      wordDrag.current = null;
      return;
    }
    if (dx >= -8 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
    if (!card.hasPointerCapture(event.pointerId))
      card.setPointerCapture(event.pointerId);
    drag.offset = Math.max(-card.clientWidth, dx);
    card.style.userSelect = "none";
    card.style.transform = `translate3d(${drag.offset}px, 0, 0) rotate(${drag.offset * 0.008}deg)`;
    card.style.opacity = String(Math.max(0.68, 1 + drag.offset / 450));
  }
  function onWordPointerUp(
    event: ReactPointerEvent<HTMLDivElement>,
    cancelled = false,
  ) {
    const drag = wordDrag.current;
    const card = wordCard.current;
    if (!drag || !card || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (card.hasPointerCapture(event.pointerId))
      card.releasePointerCapture(event.pointerId);
    card.style.userSelect = "";
    if (!cancelled && dx < -80 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      event.preventDefault();
      slideToNextWord();
      return;
    }
    wordDrag.current = null;
    const from = card.style.transform;
    const opacity = card.style.opacity || "1";
    card.style.transform = "";
    card.style.opacity = "";
    if (from && !matchMedia("(prefers-reduced-motion: reduce)").matches)
      card.animate(
        [
          { transform: from, opacity },
          { transform: "translate3d(0, 0, 0)", opacity: 1 },
        ],
        { duration: 190, easing: "ease-out" },
      );
  }
  function advanceStep(audioStarted = false) {
    if (intro || refresher) continueWord(audioStarted);
    else next(audioStarted);
  }
  function continueStep() {
    if (transitioning.current) return;
    transitioning.current = true;
    advanceStep();
    requestAnimationFrame(() => {
      transitioning.current = false;
    });
  }
  function slideToNextPanel() {
    if (!advanceReady || intro || transitioning.current) return;
    const panel = slidePanel.current;
    const offset = panelDrag.current?.offset || 0;
    panelDrag.current = null;
    if (
      !panel ||
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !panel.animate
    ) {
      continueStep();
      return;
    }
    // Play the next listening prompt during the gesture for iPhone Safari.
    const following = refresher
      ? {
          ...s,
          queue: s.queue.map((item, i) =>
            i === 0 ? { ...item, refresher: false } : item,
          ),
        }
      : advance(s, feedback!);
    stopFeedbackVoice();
    readNextStep(following);
    transitioning.current = true;
    const animation = panel.animate(
      [
        {
          transform: `translate3d(${offset}px, 0, 0) rotate(${offset * 0.008}deg)`,
          opacity: Math.max(0.68, 1 + offset / 450),
        },
        {
          transform: `translate3d(${-panel.clientWidth - 55}px, 0, 0) rotate(-4deg)`,
          opacity: 0,
        },
      ],
      { duration: 280, easing: "cubic-bezier(.3,.7,.2,1)", fill: "forwards" },
    );
    panelAnimation.current = animation;
    if (following.completed.length === 40) celebrateCompletion();
    void animation.finished
      .then(() => {
        if (panelAnimation.current !== animation) return;
        panel.style.visibility = "hidden";
        panelAnimation.current = null;
        animation.cancel();
        enterNextPanel.current = true;
        advanceStep(true);
        requestAnimationFrame(() => {
          transitioning.current = false;
        });
      })
      .catch(() => {
        panel.style.transform = "";
        panel.style.opacity = "";
        transitioning.current = false;
      });
  }
  function onPanelPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (
      !advanceReady ||
      intro ||
      exit ||
      transitioning.current ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      (event.target as HTMLElement).closest("button, a, input, select")
    )
      return;
    panelDrag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offset: 0,
    };
  }
  function onPanelPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = panelDrag.current;
    const panel = slidePanel.current;
    if (!drag || !panel || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dy) > Math.abs(dx) * 1.2 && drag.offset === 0) {
      panelDrag.current = null;
      return;
    }
    if (dx >= -8 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
    if (!panel.hasPointerCapture(event.pointerId))
      panel.setPointerCapture(event.pointerId);
    drag.offset = Math.max(-panel.clientWidth, dx);
    panel.style.userSelect = "none";
    panel.style.transform = `translate3d(${drag.offset}px, 0, 0) rotate(${drag.offset * 0.008}deg)`;
    panel.style.opacity = String(Math.max(0.68, 1 + drag.offset / 450));
  }
  function onPanelPointerUp(
    event: ReactPointerEvent<HTMLElement>,
    cancelled = false,
  ) {
    const drag = panelDrag.current;
    const panel = slidePanel.current;
    if (!drag || !panel || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (panel.hasPointerCapture(event.pointerId))
      panel.releasePointerCapture(event.pointerId);
    panel.style.userSelect = "";
    if (!cancelled && dx < -80 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      event.preventDefault();
      slideToNextPanel();
      return;
    }
    panelDrag.current = null;
    const from = panel.style.transform;
    const opacity = panel.style.opacity || "1";
    panel.style.transform = "";
    panel.style.opacity = "";
    if (from && !matchMedia("(prefers-reduced-motion: reduce)").matches)
      panel.animate(
        [
          { transform: from, opacity },
          { transform: "translate3d(0, 0, 0)", opacity: 1 },
        ],
        { duration: 190, easing: "ease-out" },
      );
  }
  async function finish() {
    if (finishBusy.current || saved) return;
    finishBusy.current = true;
    setSaving(true);
    setError("");
    try {
      completionRecord.current ??= {
        id: s.id,
        mode: s.mode,
        day: s.day,
        wordIds: s.words.map((w) => w.id),
        seconds: seconds.current,
        completedAt: new Date().toISOString(),
      };
      const fed = await onComplete(completionRecord.current);
      setMeal(fed);
      setSaved(true);
      celebrateCompletion();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      finishBusy.current = false;
      setSaving(false);
    }
  }
  useEffect(() => {
    if (complete) void finish();
  }, [complete]);
  useEffect(() => {
    if (complete) celebrateCompletion();
  }, [complete]);
  const displayed =
    s.completed.length +
    (feedback === true && !s.completed.includes(task?.id) ? 1 : 0);
  const parts = sentenceParts(word);
  const tokenOrder = shuffledTokens(parts.length, word.id);
  const choices = [word.meaningVi, ...word.meaningDistractorsVi];
  const choiceOrder = shuffledTokens(choices.length, `${s.id}:${task?.id}`);
  const options = choiceOrder.map(
    (_, index) =>
      choices[choiceOrder[(index + (task?.attempt || 0)) % choices.length]],
  );
  return (
    <main className={"session-page" + (intro ? " is-word-intro" : "")}>
      <header className="session-header">
        <button
          className="icon-btn"
          aria-label="Leave batch"
          disabled={complete && !saved && !error}
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
                : `Practice · Round ${s.round} of 4`}
        </b>
        <button
          className="icon-btn"
          aria-label="Close batch"
          disabled={complete && !saved && !error}
          onClick={() => {
            stopPronunciation();
            setExit(true);
          }}
        >
          <X />
        </button>
      </header>
      <Road count={displayed} />
      {(feedback === true || complete) && <Celebration complete={complete} />}
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
                : error
                  ? "Completed on this device. Cloud save needs another try."
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
            {saved
              ? "Completed batches stay safe when you leave."
              : "Keep this app installed until your completed batch is saved."}
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
                  : `QUESTION ${s.completed.length + 1} OF 40${timedQuestion ? ` · ${questionSeconds} SECONDS` : ""}`}
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
            {timedQuestion && feedback === null && (
              <div
                className={
                  "question-timer" + (remaining <= 5 ? " is-urgent" : "")
                }
              >
                <div className="question-timer-label">
                  <Timer size={16} aria-hidden="true" />
                  <span>
                    {audioWaiting ? "Waiting for audio" : "Time to answer"}
                  </span>
                  <strong
                    role="timer"
                    aria-label={`${remaining} seconds remaining`}
                  >
                    {remaining}s
                  </strong>
                  <button
                    type="button"
                    className="question-reveal"
                    aria-label="Show answer"
                    title="Show answer"
                    onClick={() => revealAnswer("skip")}
                  >
                    <Eye size={19} aria-hidden="true" />
                  </button>
                </div>
                <div className="question-timer-track" aria-hidden="true">
                  <span
                    style={{
                      width: `${(remaining / questionSeconds) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
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
              <div
                ref={(node) => {
                  if (intro) wordCard.current = node;
                  else slidePanel.current = node;
                }}
                key={
                  intro ? word.id : `refresher:${task.id}:${task.attempt || 0}`
                }
                className={
                  "card word-intro" +
                  (intro ? " is-swipeable" : " session-slide is-swipeable")
                }
                onPointerDown={intro ? onWordPointerDown : onPanelPointerDown}
                onPointerMove={intro ? onWordPointerMove : onPanelPointerMove}
                onPointerUp={intro ? onWordPointerUp : onPanelPointerUp}
                onPointerCancel={(event) =>
                  intro
                    ? onWordPointerUp(event, true)
                    : onPanelPointerUp(event, true)
                }
              >
                <WordDetails key={word.id} word={word} />
              </div>
              <div className="word-practice-action">
                <Button onClick={intro ? slideToNextWord : continueStep}>
                  {intro
                    ? s.introduced.length === 9
                      ? "Start practice"
                      : "Next word"
                    : "Try again"}
                  {intro && <ArrowRight size={16} />}
                </Button>
              </div>
            </>
          ) : (
            <form
              ref={(node) => {
                slidePanel.current = node;
              }}
              key={`${task.id}:${task.attempt || 0}`}
              className={
                "session-slide" + (advanceReady ? " is-swipeable" : "")
              }
              onPointerDown={advanceReady ? onPanelPointerDown : undefined}
              onPointerMove={advanceReady ? onPanelPointerMove : undefined}
              onPointerUp={advanceReady ? onPanelPointerUp : undefined}
              onPointerCancel={
                advanceReady
                  ? (event) => onPanelPointerUp(event, true)
                  : undefined
              }
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <div className="card exercise-card">
                {task.kind === "listen" ? (
                  <>
                    {textFallback ? (
                      <div className="audio-fallback">
                        <h2>Recall the word instead</h2>
                        <p className="muted">
                          Type the English word or phrase that matches this
                          meaning. Audio will return on your next attempt.
                        </p>
                        <p lang="vi">{word.meaningVi}</p>
                        <p className="muted">{word.meaningEn}</p>
                        <small className="pill">
                          {word.partOfSpeech} · Starts with {word.headword[0]}
                        </small>
                      </div>
                    ) : (
                      <>
                        <h2>What did you hear?</h2>
                        <p className="muted">
                          Listen closely, then type the word or phrase.
                        </p>
                        <PronunciationControls
                          key={word.id}
                          word={word}
                          hideAnswer
                        />
                        {feedback === null && (
                          <button
                            type="button"
                            className="audio-fallback-button"
                            onClick={() => {
                              stopPronunciation();
                              setMeaningForThisAttempt(true);
                            }}
                          >
                            Can’t hear it? Use the meaning instead
                          </button>
                        )}
                      </>
                    )}
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
                          onClick={() => {
                            setAnswer(o);
                            submit(o);
                          }}
                        >
                          <span>{String.fromCharCode(65 + i)}</span>
                          {o.toLocaleLowerCase("vi-VN")}
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
                  <div className="feedback-title">
                    {feedback ? <Check /> : <AlertCircle />}
                    <b>
                      {feedback
                        ? "That’s right! ✦"
                        : revealReason === "timeout"
                          ? "Time’s up — here’s the answer"
                          : revealReason === "skip"
                            ? "Here’s the answer"
                            : "Not quite yet"}
                    </b>
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
                  {playableAccents(word).length > 0 && (
                    <button
                      type="button"
                      className="feedback-replay"
                      onClick={() => playWordRecording(word)}
                    >
                      <Volume2 size={16} /> Hear the word again
                    </button>
                  )}
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
                  {!feedback &&
                    revealReason === "wrong" &&
                    normalize(answer) && (
                      <p className="your-attempt">
                        Your answer: <span>{answer}</span>
                      </p>
                    )}
                  {!feedback && (
                    <small>
                      {revealReason === "wrong"
                        ? "Check the spelling and meaning. You’ll try this again after other questions, or a short refresh."
                        : "Take a moment to learn it. This question will return after other questions or a short refresh."}
                    </small>
                  )}
                </div>
              ) : null}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              {feedback === null && task.kind !== "meaning" ? (
                <div className="question-actions">
                  <Button
                    type="submit"
                    disabled={
                      !normalize(answer) ||
                      (task.kind === "arrange" &&
                        tokens.length !== parts.length)
                    }
                  >
                    Check answer
                  </Button>
                </div>
              ) : feedback !== null ? (
                <div className="session-feedback-next">
                  <Button onClick={continueStep}>Continue</Button>
                </div>
              ) : null}
            </form>
          )}
          <p className="session-note">
            <Info size={14} />
            {s.mode === "review"
              ? `${questionSeconds} seconds for this question. You can reveal an answer and try it again later.`
              : "Little steps count. There’s no time limit."}
          </p>
        </>
      )}
      {exit && (
        <Modal
          title={saved ? "Leave this result?" : "Save your place?"}
          onClose={() => !saving && setExit(false)}
        >
          <p>
            {saved
              ? "Your completed batch has been saved."
              : "Your word, answer and task progress will be here when you return."}
          </p>
          <p className="muted">
            You can resume from Words on this or another signed-in device.
          </p>
          {discardError && (
            <p className="error" role="alert">
              {discardError}
            </p>
          )}
          <Button disabled={saving} onClick={() => setExit(false)}>
            Keep learning
          </Button>
          <Button secondary disabled={saving} onClick={() => void leave()}>
            {saving ? "Saving…" : "Save & leave"}
          </Button>
          {!saved && !complete && (
            <button
              type="button"
              className="discard-batch-link"
              disabled={saving}
              onClick={() => void discard()}
            >
              Remove this unfinished batch
            </button>
          )}
          {!saved && !complete && (
            <p className="muted small">
              Removes your saved place. Completed batches and tickets stay safe.
            </p>
          )}
        </Modal>
      )}
    </main>
  );
}
