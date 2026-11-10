import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { flushSync } from "react-dom";
import {
  Home,
  BookOpen,
  Trophy,
  BarChart3,
  Sun,
  Moon,
  Flame,
  ChevronRight,
  ArrowRight,
  Lock,
  RefreshCw,
  Ticket,
  Settings,
  LogOut,
  ShieldCheck,
  Search,
  Volume2,
  Check,
  Sparkles,
  Heart,
  Clock,
  Plus,
  X,
} from "lucide-react";
import { useApp } from "./lib/useApp";
import { login, logout } from "./lib/firebase";
import {
  type Word,
  type Session as SessionType,
  type BatchRecord,
  type SessionDraft,
  type LearningGroup,
  createSession,
  selectLearningBatch,
  learningGroupOf,
  nextIntroduction,
  makeSessionDraft,
  restoreSession,
  checkpointSession,
  pendingReview,
  dailyStats,
  commitBatch,
  completedRecordFromDraft,
  learnedIds,
  emptyVideo,
  streak,
  petGrowth,
} from "./lib/model";
import {
  Button,
  Modal,
  ProgressBar,
  SectionTitle,
  Empty,
} from "./components/ui";
import Session from "./components/Session";
import { Library, VideoSession } from "./components/Library";
import Progress from "./components/Progress";
import Ranking from "./components/Ranking";
import Admin from "./components/Admin";
import WordDetails from "./components/WordDetails";
import Pet from "./components/Pet";
import { growthStage, petSpecies, petStages, speciesOf } from "./lib/pets";
import { playWordRecording, stopPronunciation } from "./lib/pronunciationAudio";
import { useRanking } from "./lib/useRanking";
const nav = [
  { id: "today", label: "Today", icon: Home },
  { id: "words", label: "Words", icon: BookOpen },
  { id: "ranking", label: "Ranking", icon: Trophy },
  { id: "progress", label: "Progress", icon: BarChart3 },
];
const batchGroups: { id: LearningGroup; label: string }[] = [
  { id: "all", label: "Mixed" },
  { id: "verbs", label: "Verbs" },
  { id: "adjectives", label: "Adjectives" },
  { id: "collocations", label: "Collocations" },
  { id: "nouns", label: "Nouns" },
  { id: "sales", label: "Sales & BizDev" },
  { id: "linking", label: "Linking phrases" },
  { id: "other", label: "Other" },
];
export default function App() {
  const app = useApp();
  const [page, setPage] = useState(location.hash.slice(1) || "today"),
    [theme, setTheme] = useState(
      () =>
        localStorage.getItem("engls-theme") ||
        (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
    ),
    [session, setSession] = useState<SessionType | null>(null),
    [sessionDraft, setSessionDraft] = useState<SessionDraft | null>(null),
    [localDraft, setLocalDraft] = useState<{
      key: string;
      draft: SessionDraft;
    } | null>(null),
    [start, setStart] = useState<"review" | "learn" | null>(null),
    [wordTab, setWordTab] = useState("Learn"),
    [batchGroup, setBatchGroup] = useState<LearningGroup>(() => {
      const saved = localStorage.getItem("engls-batch-group");
      return batchGroups.find((group) => group.id === saved)?.id || "all";
    }),
    [search, setSearch] = useState(""),
    [detail, setDetail] = useState<Word | null>(null),
    [topic, setTopic] = useState<string | null>(null),
    [video, setVideo] = useState<string | null>(null),
    [customize, setCustomize] = useState(false),
    [account, setAccount] = useState(false),
    [discardPrompt, setDiscardPrompt] = useState(false),
    [discardBusy, setDiscardBusy] = useState(false),
    [discardError, setDiscardError] = useState(""),
    [notice, setNotice] = useState("");
  const [petDraft, setPetDraft] = useState(app.data.pet);
  const [previewStage, setPreviewStage] = useState(0);
  const themeTransition = useRef<ViewTransition | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraft = useRef<SessionDraft | null>(null);
  const checkpointWrites = useRef<Set<Promise<void>>>(new Set());
  const discardingBatch = useRef(false);
  const recoveredCompletion = useRef<string | null>(null);
  const { data, words, lessons, profile, demo, today } = app,
    stats = dailyStats(data, today),
    pending = pendingReview(data, today),
    known = learnedIds(data),
    fresh = words.filter((w) => !known.has(w.id)),
    batchPool = fresh.filter(
      (word) => batchGroup === "all" || learningGroupOf(word) === batchGroup,
    ),
    learningBatch = selectLearningBatch(batchPool, today),
    batchGroupLabel =
      batchGroups.find((group) => group.id === batchGroup)?.label || "Mixed",
    draftKey = demo
      ? `engls-session:demo:${app.previewScenario}`
      : app.user
        ? `engls-session:${app.user.uid}`
        : null,
    savedLocal = localDraft?.key === draftKey ? localDraft.draft : null,
    resumeDraft = [savedLocal, data.activeSession]
      .filter((draft): draft is SessionDraft =>
        Boolean(
          draft &&
          data.blockedSessionId !== (draft.attemptId || draft.id) &&
          restoreSession(draft, words),
        ),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .find((draft) => !data.records.some((record) => record.id === draft.id)),
    previewBatch =
      resumeDraft?.mode === "learn"
        ? resumeDraft.wordIds
            .map((id) => words.find((word) => word.id === id))
            .filter((word): word is Word => Boolean(word))
        : learningBatch,
    growth = petGrowth(data, today),
    petStage = growthStage(growth.points),
    completedDays = Object.keys(data.plans).filter(
      (d) => dailyStats(data, d).meal,
    ).length;
  const ranking = useRanking({
    uid: profile?.uid,
    displayName: profile?.displayName,
    data,
    today,
    ready: app.phase === "ready" && app.learningReady,
    visible: page === "ranking",
    demo,
  });
  useEffect(() => {
    cancelDraftTimer();
    latestDraft.current = null;
    if (!draftKey) {
      setLocalDraft(null);
      return;
    }
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || "null");
      setLocalDraft(draft ? { key: draftKey, draft } : null);
    } catch {
      setLocalDraft(null);
    }
  }, [draftKey]);
  useEffect(() => {
    if (discardingBatch.current) return;
    if (!data.blockedSessionId) return;
    if (
      savedLocal &&
      (savedLocal.attemptId || savedLocal.id) === data.blockedSessionId
    ) {
      if (draftKey) localStorage.removeItem(draftKey);
      latestDraft.current = null;
      setLocalDraft(null);
    }
    if (session?.attemptId === data.blockedSessionId) {
      cancelDraftTimer();
      stopPronunciation();
      setSession(null);
      setSessionDraft(null);
      setNotice("This unfinished batch was cleared. You can start again.");
    }
  }, [data.blockedSessionId, savedLocal, session?.attemptId, draftKey]);
  useEffect(() => {
    const draft = savedLocal;
    const record = draft && completedRecordFromDraft(draft);
    if (
      app.phase !== "ready" ||
      session ||
      !draftKey ||
      !record ||
      data.records.some((saved) => saved.id === record.id) ||
      recoveredCompletion.current === record.id
    )
      return;
    recoveredCompletion.current = record.id;
    void app
      .saveCompletedBatch(record)
      .then(() => {
        localStorage.removeItem(draftKey);
        setLocalDraft(null);
        setNotice("Your completed batch and food ticket were saved.");
      })
      .catch(() => {
        setNotice(
          "Your completed batch is still on this device. Try reopening the app to sync it.",
        );
      });
  }, [app.phase, session, draftKey, savedLocal, data.records]);
  useEffect(() => {
    localStorage.setItem("engls-batch-group", batchGroup);
    localStorage.removeItem("engls-batch-topic");
  }, [batchGroup]);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("engls-theme", theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#101923" : "#fff8f2");
  }, [theme]);
  function toggleTheme() {
    if (themeTransition.current) return;
    const next = theme === "light" ? "dark" : "light";
    const apply = () => flushSync(() => setTheme(next));
    if (
      typeof document.startViewTransition === "function" &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      document.documentElement.classList.add("theme-transition");
      const transition = document.startViewTransition(apply);
      themeTransition.current = transition;
      void transition.finished
        .catch(() => {})
        .finally(() => {
          themeTransition.current = null;
          document.documentElement.classList.remove("theme-transition");
        });
    } else apply();
  }
  useEffect(() => {
    const handler = () => {
      if (session) {
        location.hash = page;
        return;
      }
      setPage(location.hash.slice(1) || "today");
      setVideo(null);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, [session, page]);
  useEffect(() => {
    if (app.phase !== "ready") {
      stopPronunciation();
      setSession(null);
      setVideo(null);
      setDetail(null);
      setStart(null);
    }
  }, [app.phase]);
  function go(p: string) {
    if (p === page) return;
    document.documentElement.dataset.routeDirection =
      nav.findIndex((n) => n.id === p) >= nav.findIndex((n) => n.id === page)
        ? "forward"
        : "back";
    location.hash = p;
    setPage(p);
    setVideo(null);
    window.scrollTo(0, 0);
  }
  function rememberDraft(draft: SessionDraft) {
    if (!draftKey) return;
    latestDraft.current = draft;
    localStorage.setItem(draftKey, JSON.stringify(draft));
    setLocalDraft({ key: draftKey, draft });
  }
  function cancelDraftTimer() {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = null;
  }
  function checkpoint(draft: SessionDraft) {
    if (discardingBatch.current) return;
    const previous = latestDraft.current;
    const stageChanged =
      !previous ||
      previous.id !== draft.id ||
      previous.introduced.length !== draft.introduced.length ||
      previous.completed.length !== draft.completed.length ||
      previous.queue[0]?.id !== draft.queue[0]?.id ||
      previous.feedback !== draft.feedback;
    rememberDraft(draft);
    cancelDraftTimer();
    const sync = () => {
      draftTimer.current = null;
      const write = app
        .save((old) => checkpointSession(old, draft), true)
        .catch(() => {
          setNotice(
            "Your place is saved here. Cloud sync will retry when you return.",
          );
        });
      checkpointWrites.current.add(write);
      void write.finally(() => checkpointWrites.current.delete(write));
    };
    if (stageChanged) sync();
    else draftTimer.current = setTimeout(sync, 700);
  }
  async function pauseBatch(draft: SessionDraft) {
    cancelDraftTimer();
    rememberDraft(draft);
    try {
      await app.save((old) => checkpointSession(old, draft), true);
    } catch {
      setNotice(
        "Your place is saved on this device. Cloud sync is unavailable right now.",
      );
    }
  }
  async function discardBatch() {
    if (!resumeDraft) throw Error("No unfinished batch was found.");
    if (resumeDraft.completed.length === 40)
      throw Error("Save your completed batch to keep its ticket.");
    if (discardingBatch.current) return;
    discardingBatch.current = true;
    setDiscardBusy(true);
    setDiscardError("");
    cancelDraftTimer();
    try {
      await Promise.allSettled([...checkpointWrites.current]);
      await app.clearActiveSession(resumeDraft.attemptId || resumeDraft.id);
      if (draftKey) localStorage.removeItem(draftKey);
      latestDraft.current = null;
      setLocalDraft(null);
      setSession(null);
      setSessionDraft(null);
      setDiscardPrompt(false);
      stopPronunciation();
      go("words");
      setNotice("Unfinished batch removed. You can start a new batch.");
    } catch (error) {
      setDiscardError(
        (error as Error).message || "Could not remove the batch.",
      );
      throw error;
    } finally {
      discardingBatch.current = false;
      setDiscardBusy(false);
    }
  }
  function resumeBatch() {
    if (!resumeDraft) return;
    const restored = restoreSession(resumeDraft, words);
    if (!restored) return;
    const current = nextIntroduction(restored);
    const task = restored.queue[0];
    const audioWord = current || words.find((word) => word.id === task?.wordId);
    if (
      resumeDraft.feedback === null &&
      audioWord &&
      (current || task?.kind === "listen" || task?.refresher)
    )
      playWordRecording(audioWord);
    setSessionDraft(resumeDraft);
    latestDraft.current = resumeDraft;
    setSession(restored);
    window.scrollTo(0, 0);
  }
  function begin(mode: "review" | "learn") {
    if (resumeDraft) {
      resumeBatch();
      return;
    }
    if (mode === "learn" && pending.length) {
      setNotice("Finish all required review before learning new words.");
      return;
    }
    setStart(mode);
  }
  function startBatch() {
    if (!start) return;
    const requirement = pending[0];
    const batch =
      start === "review"
        ? requirement?.wordIds
            .map((id) => words.find((w) => w.id === id))
            .filter((w): w is Word => Boolean(w)) || []
        : learningBatch;
    if (batch.length !== 10) {
      setNotice(
        start === "learn"
          ? "Choose a group with at least ten new words, or switch to Mixed."
          : "This review needs ten published words. Ask the administrator to check the content.",
      );
      if (start === "review") setStart(null);
      return;
    }
    const next = createSession(
      batch,
      start,
      start === "review"
        ? requirement.id
        : `learn:${today}:${crypto.randomUUID()}`,
      today,
    );
    playWordRecording(batch[0]);
    checkpoint(
      makeSessionDraft(next, {
        answer: "",
        tokens: [],
        feedback: null,
        seconds: 0,
      }),
    );
    setSessionDraft(null);
    setSession(next);
    setStart(null);
    window.scrollTo(0, 0);
  }
  async function complete(record: BatchRecord) {
    cancelDraftTimer();
    const next = commitBatch(app.data, record);
    await app.saveCompletedBatch(record);
    if (draftKey) localStorage.removeItem(draftKey);
    latestDraft.current = null;
    setLocalDraft(null);
    return dailyStats(next, record.day).meal;
  }
  const save = (f: Parameters<typeof app.save>[0]) => {
    void app.save(f).catch(() => {});
  };
  const selectedLesson = lessons.find((l) => l.id === video);
  const themeButton = (
    <button
      className="icon-btn theme-toggle"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      onClick={toggleTheme}
    >
      {theme === "light" ? <Moon size={21} /> : <Sun size={21} />}
    </button>
  );
  function reloadApp(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    window.location.reload();
  }
  if (app.phase !== "ready")
    return (
      <div className="auth-page">
        <header>
          <a
            className="brand"
            href={window.location.href}
            onClick={reloadApp}
            title="Reload app"
          >
            <BookOpen />
            EnglsMyOwn<span>your little learning space</span>
          </a>
          {themeButton}
        </header>
        <main className="auth-main">
          <div className="auth-art">
            <span className="eyebrow">A LITTLE ENGLISH, EVERY DAY.</span>
            <h1>
              Make room
              <br />
              for a little <em>growth.</em>
            </h1>
            <Pet
              pet={{ name: "Mochi", gender: "unspecified", species: "cat" }}
              theme={theme}
              stage={1}
            />
          </div>
          <div className="auth-card card">
            <span className="brand-mark">
              <BookOpen size={30} />
            </span>
            <h2>
              {app.phase === "loading"
                ? "Getting your space ready…"
                : app.phase === "pending"
                  ? profile?.status === "revoked"
                    ? "Access paused"
                    : "A little patience."
                  : app.phase === "setup"
                    ? "Your space is almost ready."
                    : "Welcome to your own little world."}
            </h2>
            <p>
              {app.phase === "pending"
                ? profile?.status === "revoked"
                  ? "Your access has been revoked. Contact the administrator to return."
                  : "You’ve signed in. Your administrator will approve your account before you can explore the lessons."
                : app.phase === "setup"
                  ? "Firebase hasn’t been connected yet. Follow the setup guide in the repository to enable Google sign-in."
                  : "Learn useful words, find your voice, and grow together with Mochi."}
            </p>
            {app.phase === "login" && (
              <Button
                onClick={() => {
                  void login().catch((e) => app.setError(e.message));
                }}
              >
                Continue with Google <ArrowRight size={18} />
              </Button>
            )}
            {app.phase === "pending" && (
              <>
                <span className="pill">
                  <Clock size={14} />
                  {profile?.status === "revoked"
                    ? "Access revoked"
                    : "Pending approval"}
                </span>
                <Button secondary onClick={() => void logout()}>
                  Sign out
                </Button>
              </>
            )}
            {app.error && (
              <p className="error" role="alert">
                {app.error}
              </p>
            )}
            <p className="small muted">
              A private space. Access is by approval only.
            </p>
          </div>
        </main>
      </div>
    );
  if (session)
    return (
      <Session
        key={session.id}
        initial={session}
        draft={sessionDraft}
        onClose={() => {
          setSession(null);
          setSessionDraft(null);
          go("words");
        }}
        onComplete={complete}
        onCheckpoint={checkpoint}
        onPause={pauseBatch}
        onDiscard={discardBatch}
        demo={demo}
        tickets={stats.tickets}
        required={stats.required}
        pet={data.pet}
        theme={theme}
        petStage={petStage.index}
      />
    );
  if (selectedLesson)
    return (
      <VideoSession
        key={selectedLesson.id}
        lesson={selectedLesson}
        progress={data.videos[selectedLesson.id] || emptyVideo()}
        busy={app.busy}
        onClose={() => setVideo(null)}
        onSave={async (p) => {
          await app.save((old) => ({
            ...old,
            videos: { ...old.videos, [selectedLesson.id]: p },
          }));
        }}
      />
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href={window.location.href}
          onClick={reloadApp}
          title="Reload app"
        >
          <span className="brand-mark">
            <BookOpen size={26} />
          </span>
          <b>EnglsMyOwn</b>
          <small>A little every day.</small>
        </a>
        <span className="sidebar-label">YOUR SPACE</span>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={page === n.id ? "active" : ""}
              onClick={() => go(n.id)}
            >
              <n.icon size={21} />
              {n.label}
              {page === n.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Sparkles size={22} />
          <p>
            Small steps.
            <br />
            <b>Wonderful things.</b>
          </p>
          <span>Growing at your own pace.</span>
        </div>
        {profile?.role === "admin" && (
          <button
            className={"sidebar-admin " + (page === "admin" ? "active" : "")}
            onClick={() => go("admin")}
          >
            <ShieldCheck size={18} />
            Your studio
          </button>
        )}
        <button className="sidebar-account" onClick={() => setAccount(true)}>
          <span className="avatar">{profile?.displayName?.[0] || "D"}</span>
          <span>
            <b>{profile?.displayName?.split(" ")[0]}</b>
            <small>{demo ? "Local preview" : "Your account"}</small>
          </span>
          <Settings size={17} />
        </button>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <a
              className="mobile-brand"
              href={window.location.href}
              onClick={reloadApp}
              title="Reload app"
            >
              EnglsMyOwn
            </a>
            <span className="desktop-breadcrumb">
              Your space <ChevronRight size={13} />{" "}
              {page === "admin"
                ? "Studio"
                : nav.find((n) => n.id === page)?.label || "Today"}
            </span>
          </div>
          <div className="top-actions">
            <span className="streak">
              <Flame size={18} />
              <b>{streak(data, today)}</b>
              <span>day streak</span>
            </span>
            {themeButton}
            <button
              className="avatar"
              aria-label="Account settings"
              onClick={() => setAccount(true)}
            >
              {profile?.displayName?.[0] || "D"}
            </button>
          </div>
        </header>
        {demo && (
          <div className="demo-strip">
            <span className="status-dot" />
            Local preview · Vocabulary pilot<span>Saved on this browser</span>
          </div>
        )}
        {(app.error || notice) && (
          <div className="notice" role="alert">
            {app.error || notice}
            <button
              className="icon-btn"
              aria-label="Dismiss message"
              onClick={() => {
                app.setError("");
                setNotice("");
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="page-scene" key={page}>
          {page === "today" ||
          !["words", "ranking", "videos", "progress", "admin"].includes(
            page,
          ) ? (
            <>
              <div className="page-intro today-intro">
                <span className="eyebrow">
                  {new Date(today + "T12:00:00Z").toLocaleDateString("en", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <h1>
                  Hello, {profile?.displayName?.split(" ")[0] || "friend"}
                  <span className="hello-sun">☀</span>
                </h1>
                <p>A little practice. A little closer to your goals.</p>
              </div>
              <div className="today-layout">
                <section className="pet-card card">
                  <div className="pet-heading">
                    <div>
                      <h2>
                        {data.pet.name}
                        <span className="health-dot" />
                      </h2>
                      <span className="muted small">
                        Your little learning companion
                      </span>
                    </div>
                    <button
                      className="pet-customize"
                      onClick={() => {
                        setPetDraft({ ...data.pet });
                        setPreviewStage(petStage.index);
                        setCustomize(true);
                      }}
                    >
                      <Settings size={15} />
                      Customize
                    </button>
                  </div>
                  <div className="pet-stage">
                    <span className="pet-sparkle first">✦</span>
                    <span className="pet-sparkle second">✧</span>
                    <div className="pet-caption">
                      {stats.meal
                        ? "That was lovely. Thank you!"
                        : "A little learning, a happy tummy."}
                      <Heart size={12} />
                    </div>
                    <Pet pet={data.pet} theme={theme} stage={petStage.index} />
                  </div>
                  <div className="pet-growth">
                    <div>
                      <span className="pill">{petStage.label}</span>
                      <span className="muted small">
                        {completedDays} nourishing{" "}
                        {completedDays === 1 ? "day" : "days"}
                      </span>
                    </div>
                    <ProgressBar
                      value={petStage.percent}
                      label="Progress toward next growth milestone"
                    />
                    <div>
                      <span>
                        {petStage.adult
                          ? "All grown up, always your companion"
                          : `Growing toward ${petStage.next}`}
                      </span>
                      <span>
                        {petStage.adult
                          ? "Fully grown"
                          : `${petStage.earned} / 500 growth`}
                      </span>
                    </div>
                  </div>
                </section>
                <section className="daily-column">
                  <SectionTitle
                    title="A little progress today"
                    aside={
                      <span className="pill">
                        {stats.meal
                          ? "Complete"
                          : `${(pending.length === 0 ? 1 : 0) + (stats.learned > 0 ? 1 : 0)} / 2`}
                      </span>
                    }
                  />
                  <div className="card daily-tasks">
                    <div className="task-item">
                      <div className="task-icon">
                        <RefreshCw size={23} />
                      </div>
                      <div>
                        <h3>Review your words</h3>
                        <p>
                          {stats.total
                            ? `${stats.reviewed} of ${stats.total} words reviewed`
                            : "You’re all caught up"}
                        </p>
                        <ProgressBar
                          value={
                            stats.total
                              ? (stats.reviewed / stats.total) * 100
                              : 100
                          }
                        />
                      </div>
                      {pending.length === 0 && <Check size={20} />}
                    </div>
                    <div className="task-item">
                      <div className="task-icon">
                        <BookOpen size={23} />
                      </div>
                      <div>
                        <h3>Learn 10 new words</h3>
                        <p>
                          {stats.learned
                            ? "Choose another group or topic"
                            : pending.length
                              ? "After your daily review"
                              : "Choose a word group"}
                        </p>
                        <ProgressBar value={stats.learned ? 100 : 0} />
                      </div>
                      {pending.length > 0 ? (
                        <Lock size={18} />
                      ) : stats.learned > 0 ? (
                        <Check size={20} />
                      ) : null}
                    </div>
                    <Button
                      disabled={
                        app.busy ||
                        (!resumeDraft && !pending.length && fresh.length < 10)
                      }
                      onClick={() =>
                        resumeDraft
                          ? resumeBatch()
                          : begin(pending.length ? "review" : "learn")
                      }
                    >
                      {resumeDraft
                        ? resumeDraft.completed.length === 40
                          ? `Finish saving ${resumeDraft.mode === "review" ? "review" : "learning"}`
                          : `Resume ${resumeDraft.mode === "review" ? "review" : "learning"} · ${resumeDraft.completed.length}/40`
                        : pending.length
                          ? "Continue review"
                          : stats.learned
                            ? "Learn another batch"
                            : "Learn 10 new words"}
                      <ArrowRight size={18} />
                    </Button>
                    {!resumeDraft && !pending.length && fresh.length < 10 && (
                      <p className="small muted">
                        More words will appear when your administrator publishes
                        them.
                      </p>
                    )}
                  </div>
                  <div className="meal-card">
                    <div className="meal-icon">
                      <Ticket size={26} />
                    </div>
                    <div>
                      <b>
                        {stats.meal
                          ? "A meal well earned"
                          : "A meal for " + data.pet.name}
                      </b>
                      <p>
                        {stats.tickets} / {stats.required} tickets ·{" "}
                        {stats.meal
                          ? "Fed automatically"
                          : `${stats.required - stats.tickets} more to go`}
                      </p>
                    </div>
                    <div className="ticket-dots">
                      {Array.from(
                        { length: Math.min(stats.required, 5) },
                        (_, i) => (
                          <span
                            key={i}
                            className={i < stats.tickets ? "earned" : ""}
                          />
                        ),
                      )}
                    </div>
                  </div>
                  <div className="daily-quote">
                    <span>“</span>
                    <p>
                      You don’t have to be perfect.
                      <br />
                      Just a little more curious.
                    </p>
                    <small>YOUR DAILY REMINDER</small>
                  </div>
                </section>
              </div>
            </>
          ) : page === "words" ? (
            <>
              <div className="page-intro">
                <span className="eyebrow">WORDS THAT STAY WITH YOU</span>
                <h1>
                  A growing vocabulary.
                  <br />
                  <em>A world of possibilities.</em>
                </h1>
              </div>
              <div className="segmented word-tabs">
                {["Learn", "My words"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setWordTab(t)}
                    className={wordTab === t ? "selected" : ""}
                  >
                    {t === "Learn" ? <BookOpen size={18} /> : <BookmarkIcon />}
                    {t}
                    {t === "My words" && <span>{known.size}</span>}
                  </button>
                ))}
              </div>
              {wordTab === "Learn" ? (
                <>
                  {resumeDraft && (
                    <section className="card resume-batch">
                      <div>
                        <span className="eyebrow">
                          {resumeDraft.completed.length === 40
                            ? "ONE LAST STEP"
                            : "PICK UP WHERE YOU LEFT OFF"}
                        </span>
                        <h2>
                          {resumeDraft.completed.length === 40
                            ? "Your completed batch is ready to save."
                            : resumeDraft.mode === "review"
                              ? "Your review is waiting."
                              : "Your new words are waiting."}
                        </h2>
                        <p>
                          {resumeDraft.mode === "learn" &&
                          resumeDraft.introduced.length < 10
                            ? `${resumeDraft.introduced.length} of 10 words introduced`
                            : `${resumeDraft.completed.length} of 40 tasks complete`}
                          {resumeDraft.answer ? " · Your answer is saved" : ""}
                        </p>
                      </div>
                      <div className="resume-batch-actions">
                        <Button onClick={resumeBatch}>
                          {resumeDraft.completed.length === 40
                            ? "Finish saving"
                            : "Resume batch"}{" "}
                          <ArrowRight size={18} />
                        </Button>
                        {resumeDraft.completed.length < 40 && (
                          <button
                            type="button"
                            className="discard-batch-link"
                            onClick={() => {
                              setDiscardError("");
                              setDiscardPrompt(true);
                            }}
                          >
                            Remove unfinished batch
                          </button>
                        )}
                      </div>
                    </section>
                  )}
                  <div className="words-layout">
                    <div className="words-review-column">
                      <div className="meal-card">
                        <Ticket size={26} />
                        <div>
                          <b>Today’s meal</b>
                          <p>
                            {stats.tickets} / {stats.required} tickets ·{" "}
                            {stats.meal
                              ? "Already enjoyed"
                              : "A little motivation for you both"}
                          </p>
                        </div>
                      </div>
                      <div className="card review-card">
                        <div className="review-card-heading">
                          <div>
                            <h2>Today’s review</h2>
                            <p className="muted">
                              {stats.total} words to review today
                            </p>
                          </div>
                          <span className="round-icon">
                            <RefreshCw />
                          </span>
                        </div>
                        <div className="review-count">
                          <b>{stats.reviewed}</b>
                          <span>/ {stats.total} words reviewed</span>
                        </div>
                        <ProgressBar
                          value={
                            stats.total
                              ? (stats.reviewed / stats.total) * 100
                              : 100
                          }
                        />
                        <Button
                          disabled={
                            app.busy ||
                            (resumeDraft
                              ? resumeDraft.mode !== "review"
                              : !pending.length)
                          }
                          onClick={() => begin("review")}
                        >
                          {resumeDraft?.mode === "review"
                            ? "Resume review"
                            : pending.length
                              ? "Start review"
                              : "All caught up"}
                          {pending.length || resumeDraft?.mode === "review" ? (
                            <ArrowRight size={18} />
                          ) : (
                            <Check size={18} />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="card new-words-card">
                      <span className="eyebrow">YOUR NEXT CHAPTER</span>
                      <div className="book-decoration">
                        <BookOpen size={70} strokeWidth={1.3} />
                        <span>✦</span>
                      </div>
                      <h2>
                        10 new words.
                        <br />
                        So much to say.
                      </h2>
                      <p className="muted">
                        {previewBatch.length
                          ? resumeDraft?.mode === "learn"
                            ? "The ten words in your saved batch"
                            : batchGroupLabel
                          : fresh.length
                            ? `No new words in ${batchGroupLabel} yet`
                            : "New lessons are on their way"}
                      </p>
                      <div className="word-chips">
                        {previewBatch.slice(0, 3).map((w) => (
                          <span key={w.id}>{w.headword}</span>
                        ))}
                      </div>
                      <p className="small muted">
                        {resumeDraft
                          ? "Pick up your paused batch first."
                          : pending.length
                            ? "Finish your remaining review to unlock."
                            : learningBatch.length >= 10
                              ? "Choose your word group before you begin."
                              : fresh.length >= 10
                                ? `Only ${batchPool.length} new words in ${batchGroupLabel}. Choose another group.`
                                : "Ask your administrator to publish more vocabulary."}
                      </p>
                      <Button
                        disabled={
                          (resumeDraft
                            ? resumeDraft.mode !== "learn"
                            : pending.length > 0 || fresh.length < 10) ||
                          app.busy
                        }
                        onClick={() => begin("learn")}
                      >
                        {resumeDraft?.mode === "learn" ? (
                          "Resume learning"
                        ) : pending.length ? (
                          <>
                            <Lock size={17} />
                            Batch locked
                          </>
                        ) : (
                          "Choose batch"
                        )}
                      </Button>
                    </div>
                  </div>
                  <SectionTitle title="Explore your topics" />
                  <div className="topic-grid">
                    {[...new Set(words.map((w) => w.topic))].map((t, i) => (
                      <button
                        className="topic-card card"
                        key={t}
                        onClick={() => {
                          setTopic(t);
                        }}
                      >
                        <span className={"topic-art art-" + i}>
                          {i % 2 ? <BookOpen size={32} /> : <Heart size={32} />}
                        </span>
                        <h3>{t}</h3>
                        <p>
                          {words.filter((w) => w.topic === t).length} published
                          words
                        </p>
                        <ChevronRight size={18} />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <label className="search">
                    <Search size={19} />
                    <input
                      placeholder="Search your words or topics"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  <div className="word-list">
                    {words
                      .filter(
                        (w) =>
                          known.has(w.id) &&
                          `${w.headword} ${w.meaningVi} ${w.topic}`
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                      )
                      .map((w) => (
                        <button
                          className="word-row card"
                          key={w.id}
                          onClick={() => setDetail(w)}
                        >
                          <span className="word-initial">{w.headword[0]}</span>
                          <div>
                            <h3>
                              {w.headword}
                              <span>{w.partOfSpeech}</span>
                            </h3>
                            <p>{w.meaningVi}</p>
                          </div>
                          <span className="pill">{w.cefrLevel}</span>
                          <ChevronRight size={18} />
                        </button>
                      ))}
                  </div>
                  {!words.some(
                    (w) =>
                      known.has(w.id) &&
                      `${w.headword} ${w.meaningVi} ${w.topic}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  ) && (
                    <Empty
                      title={
                        known.size
                          ? "No matching words"
                          : "Your collection starts here"
                      }
                    >
                      {known.size
                        ? "Try a different word or clear the topic search."
                        : "Complete your first new-word batch to add ten words to your collection."}
                    </Empty>
                  )}
                </>
              )}
            </>
          ) : page === "ranking" ? (
            <Ranking
              entries={ranking.entries}
              uid={profile?.uid || ""}
              today={today}
              loading={ranking.loading}
              error={ranking.error}
              onRetry={ranking.retry}
            />
          ) : page === "videos" ? (
            <Library
              lessons={lessons}
              data={data}
              onOpen={(id) => {
                setVideo(id);
                window.scrollTo(0, 0);
              }}
              onSave={(id) =>
                save((old) => ({
                  ...old,
                  savedVideos: old.savedVideos.includes(id)
                    ? old.savedVideos.filter((x) => x !== id)
                    : [...old.savedVideos, id],
                }))
              }
            />
          ) : page === "progress" ? (
            <Progress data={data} />
          ) : profile?.role === "admin" ? (
            <Admin
              demo={demo}
              uid={profile.uid}
              onContentImported={app.refreshContent}
            />
          ) : (
            <Empty title="This is your administrator’s space">
              Return to your learning tabs below.
            </Empty>
          )}
        </div>
        <footer className="desktop-footer">
          Made for your own kind of progress.<span>EnglsMyOwn ✦</span>
        </footer>
      </main>
      <nav
        className="bottom-nav"
        aria-label="Main navigation"
        style={
          {
            "--active-tab": Math.max(
              0,
              nav.findIndex((n) => n.id === page),
            ),
          } as CSSProperties
        }
      >
        <span
          className="bottom-nav-indicator"
          aria-hidden="true"
          style={{ opacity: nav.some((n) => n.id === page) ? 1 : 0 }}
        />
        {nav.map((n) => (
          <button
            key={n.id}
            className={page === n.id ? "active" : ""}
            aria-current={page === n.id ? "page" : undefined}
            onClick={() => go(n.id)}
          >
            <n.icon size={23} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
      {discardPrompt && resumeDraft && (
        <Modal
          title="Remove unfinished batch?"
          onClose={() => !discardBusy && setDiscardPrompt(false)}
        >
          <p>
            This removes your saved place in this batch. You can start the batch
            again from the beginning.
          </p>
          <p className="muted">
            Completed batches and food tickets stay safe. This unfinished batch
            has not earned a ticket.
          </p>
          {discardError && (
            <p className="error" role="alert">
              {discardError}
            </p>
          )}
          <Button
            onClick={() => setDiscardPrompt(false)}
            disabled={discardBusy}
          >
            Keep batch
          </Button>
          <Button
            secondary
            disabled={discardBusy}
            onClick={() => void discardBatch().catch(() => {})}
          >
            {discardBusy ? "Removing…" : "Remove batch"}
          </Button>
        </Modal>
      )}
      {start && (
        <Modal
          title={
            start === "review"
              ? `A little practice. A meal for ${data.pet.name}.`
              : "Meet your next ten words."
          }
          onClose={() => setStart(null)}
        >
          <p>
            {start === "learn"
              ? "Meet all 10 words, then practise four skill rounds (40 tasks)"
              : "10 words · 40 tasks"}
            {" · 1 food ticket"}
          </p>
          {start === "learn" && (
            <div className="batch-picker">
              <h3>Choose a word group</h3>
              <div
                className="batch-group-options"
                role="group"
                aria-label="Word group"
              >
                {batchGroups.map((group) => {
                  const count =
                    group.id === "all"
                      ? fresh.length
                      : fresh.filter(
                          (word) => learningGroupOf(word) === group.id,
                        ).length;
                  if (!count && group.id !== batchGroup && group.id !== "all")
                    return null;
                  return (
                    <button
                      type="button"
                      key={group.id}
                      aria-pressed={batchGroup === group.id}
                      disabled={!count}
                      onClick={() => setBatchGroup(group.id)}
                    >
                      <strong>{group.label}</strong>
                      <span>{count} new</span>
                    </button>
                  );
                })}
              </div>
              {learningBatch.length < 10 && (
                <p className="batch-picker-summary" aria-live="polite">
                  {learningBatch.length} of 10 new words available. Choose
                  another group.
                </p>
              )}
            </div>
          )}
          {start === "review" && (
            <div className="round-list">
              {[
                "Listen & type",
                "Build sentences · 5 gaps + 5 puzzles",
                "Choose the meaning",
                "Recall in English",
              ].map((t, i) => (
                <div key={t}>
                  <span>{i + 1}</span>
                  {t}
                </div>
              ))}
            </div>
          )}
          <p className="notice">
            {start === "review"
              ? "20 seconds per question. Show the answer any time; the question will return later. Your place is saved if you leave."
              : "Your place is saved as you study. Leave or reopen the app to resume."}
          </p>
          <Button
            onClick={startBatch}
            disabled={
              app.busy || (start === "learn" && learningBatch.length < 10)
            }
          >
            Start {start === "review" ? "review" : "learning"}
            <ArrowRight size={18} />
          </Button>
        </Modal>
      )}
      {customize && (
        <Modal title="Make them yours" onClose={() => setCustomize(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void app
                .save((old) => ({
                  ...old,
                  pet: {
                    ...old.pet,
                    name: String(f.get("name")).trim() || "Mochi",
                    gender: String(f.get("gender")),
                    species: speciesOf(petDraft),
                  },
                }))
                .then(() => setCustomize(false))
                .catch(() => {});
            }}
          >
            <div className="pet-custom-preview">
              <Pet pet={petDraft} theme={theme} stage={previewStage} preview />
            </div>
            <fieldset className="companion-options">
              <legend>Your companion</legend>
              <div className="species-options">
                {petSpecies.map((species) => (
                  <button
                    type="button"
                    key={species.id}
                    aria-pressed={speciesOf(petDraft) === species.id}
                    onClick={() =>
                      setPetDraft({ ...petDraft, species: species.id })
                    }
                  >
                    {species.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="companion-options growth-preview-options">
              <legend>Preview growth</legend>
              <div className="growth-preview-stages">
                {petStages.map((label, index) => (
                  <button
                    type="button"
                    key={label}
                    aria-pressed={previewStage === index}
                    onClick={() => setPreviewStage(index)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="small muted">
                A preview of what's ahead. Growth is earned through learning.
              </p>
            </fieldset>
            <label>
              Name
              <input
                name="name"
                value={petDraft.name}
                onChange={(e) =>
                  setPetDraft({ ...petDraft, name: e.target.value })
                }
                maxLength={24}
                required
              />
            </label>
            <label>
              Gender
              <select
                name="gender"
                value={petDraft.gender}
                onChange={(e) =>
                  setPetDraft({ ...petDraft, gender: e.target.value })
                }
              >
                <option value="unspecified">A little mystery</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>
            <Button type="submit" disabled={app.busy}>
              Save companion
            </Button>
          </form>
        </Modal>
      )}
      {topic && (
        <Modal title={topic} onClose={() => setTopic(null)}>
          <p className="muted">
            A preview of this topic. Finish your required review to start a new
            batch.
          </p>
          <div className="word-list">
            {words
              .filter((w) => w.topic === topic)
              .map((w) => (
                <div className="word-row card" key={w.id}>
                  <div>
                    <h3>{w.headword}</h3>
                    <p>{w.meaningVi}</p>
                  </div>
                  <span className="pill">{w.cefrLevel}</span>
                </div>
              ))}
          </div>
        </Modal>
      )}
      {detail && (
        <Modal
          title={detail.headword}
          onClose={() => {
            stopPronunciation();
            setDetail(null);
          }}
          wide
        >
          <WordDetails key={detail.id} word={detail} showTitle={false} />
        </Modal>
      )}
      {account && (
        <Modal title="Your little space" onClose={() => setAccount(false)}>
          <h3>{profile?.displayName}</h3>
          <p className="muted">{profile?.email}</p>
          <p>
            {demo
              ? "Try ten carefully prepared phrases with human recordings. Preview progress stays on this browser; connect Firebase to sync your account."
              : "Your progress belongs to this Google account."}
          </p>
          {profile?.role === "admin" && (
            <Button
              secondary
              onClick={() => {
                setAccount(false);
                go("admin");
              }}
            >
              Open your studio
            </Button>
          )}
          {!demo && (
            <Button
              secondary
              onClick={() => {
                setAccount(false);
                void logout();
              }}
            >
              Sign out
            </Button>
          )}
          {demo && (
            <div className="preview-scenarios">
              <label>
                Preview scenario
                <select
                  value={app.previewScenario}
                  onChange={(e) => {
                    app.choosePreviewScenario(
                      e.target.value as "fresh" | "review",
                    );
                    setAccount(false);
                    setSession(null);
                    setWordTab("Learn");
                    go("words");
                  }}
                >
                  <option value="fresh">Learn ten new phrases</option>
                  <option value="review">Review yesterday’s ten phrases</option>
                </select>
              </label>
              <p className="small muted">
                Each scenario keeps its own progress. The review scenario starts
                with a simulated batch learned yesterday.
              </p>
              <p className="small muted">
                This pilot contains one batch. More new words become available
                after more content is published.
              </p>
            </div>
          )}
          {demo && (
            <Button
              secondary
              disabled={app.busy}
              onClick={() => {
                void app
                  .resetPreview()
                  .then(() => setAccount(false))
                  .catch(() => {});
              }}
            >
              Reset local preview
            </Button>
          )}
        </Modal>
      )}
    </div>
  );
}
function BookmarkIcon() {
  return <BookOpen size={18} />;
}
