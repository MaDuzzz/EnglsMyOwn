import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { flushSync } from "react-dom";
import {
  Home,
  BookOpen,
  Play,
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
  createSession,
  pendingReview,
  dailyStats,
  commitBatch,
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
import Admin from "./components/Admin";
import WordDetails from "./components/WordDetails";
import Pet from "./components/Pet";
import { growthStage, petSpecies, petStages, speciesOf } from "./lib/pets";
const nav = [
  { id: "today", label: "Today", icon: Home },
  { id: "words", label: "Words", icon: BookOpen },
  { id: "videos", label: "Videos", icon: Play },
  { id: "progress", label: "Progress", icon: BarChart3 },
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
    [start, setStart] = useState<"review" | "learn" | null>(null),
    [wordTab, setWordTab] = useState("Learn"),
    [search, setSearch] = useState(""),
    [detail, setDetail] = useState<Word | null>(null),
    [topic, setTopic] = useState<string | null>(null),
    [video, setVideo] = useState<string | null>(null),
    [customize, setCustomize] = useState(false),
    [account, setAccount] = useState(false),
    [notice, setNotice] = useState("");
  const [petDraft, setPetDraft] = useState(app.data.pet);
  const [previewStage, setPreviewStage] = useState(0);
  const themeTransition = useRef<ViewTransition | null>(null);
  const { data, words, lessons, profile, demo, today } = app,
    stats = dailyStats(data, today),
    pending = pendingReview(data, today),
    known = learnedIds(data),
    fresh = words.filter((w) => !known.has(w.id)),
    growth = petGrowth(data, today),
    petStage = growthStage(growth.points),
    completedDays = Object.keys(data.plans).filter(
      (d) => dailyStats(data, d).meal,
    ).length;
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
    if (session && session.day !== today) {
      setSession(null);
      setNotice(
        "A new learning day has started. Your unfinished batch has reset.",
      );
    }
  }, [today, session]);
  useEffect(() => {
    if (app.phase !== "ready") {
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
  function begin(mode: "review" | "learn") {
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
        : fresh.slice(0, 10);
    if (batch.length !== 10) {
      setNotice(
        "This batch needs ten published words. Ask the administrator to check the content.",
      );
      setStart(null);
      return;
    }
    setSession(
      createSession(
        batch,
        start,
        start === "review"
          ? requirement.id
          : `learn:${today}:${crypto.randomUUID()}`,
        today,
      ),
    );
    setStart(null);
    window.scrollTo(0, 0);
  }
  async function complete(record: BatchRecord) {
    let meal = false;
    await app.save((old) => {
      const next = commitBatch(old, record);
      meal = dailyStats(next, today).meal;
      return next;
    });
    return meal;
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
  if (app.phase !== "ready")
    return (
      <div className="auth-page">
        <header>
          <a className="brand" href="#today">
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
        onClose={() => {
          setSession(null);
          go("words");
        }}
        onComplete={complete}
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
        <a className="brand" href="#today">
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
            <span className="mobile-brand">EnglsMyOwn</span>
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
          !["words", "videos", "progress", "admin"].includes(page) ? (
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
                            ? "A new batch, made yours"
                            : pending.length
                              ? "After your daily review"
                              : "Your next little discovery"}
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
                        app.busy || (!pending.length && fresh.length < 10)
                      }
                      onClick={() => begin(pending.length ? "review" : "learn")}
                    >
                      {pending.length
                        ? "Continue review"
                        : stats.learned
                          ? "Learn another batch"
                          : "Learn 10 new words"}
                      <ArrowRight size={18} />
                    </Button>
                    {!pending.length && fresh.length < 10 && (
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
                          disabled={!pending.length || app.busy}
                          onClick={() => begin("review")}
                        >
                          {pending.length ? "Start review" : "All caught up"}
                          {pending.length ? (
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
                        {fresh[0]?.topic || "New lessons are on their way"}
                      </p>
                      <div className="word-chips">
                        {fresh.slice(0, 3).map((w) => (
                          <span key={w.id}>{w.headword}</span>
                        ))}
                      </div>
                      <p className="small muted">
                        {pending.length
                          ? "Finish your remaining review to unlock."
                          : fresh.length >= 10
                            ? "Meet each word, then make it yours through practice."
                            : "Ask your administrator to publish more vocabulary."}
                      </p>
                      <Button
                        disabled={
                          pending.length > 0 || fresh.length < 10 || app.busy
                        }
                        onClick={() => begin("learn")}
                      >
                        {pending.length ? (
                          <>
                            <Lock size={17} />
                            Batch locked
                          </>
                        ) : (
                          "Start learning"
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
            <Admin demo={demo} uid={profile.uid} />
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
      {start && (
        <Modal
          title={
            start === "review"
              ? "A little practice. A meal for Mochi."
              : "Meet your next ten words."
          }
          onClose={() => setStart(null)}
        >
          <p>10 words · 40 tasks · 1 food ticket</p>
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
          <p className="notice">
            Leaving or reloading restarts this batch. Completed batches stay
            safe.
          </p>
          <Button onClick={startBatch}>
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
        <Modal title={detail.headword} onClose={() => setDetail(null)} wide>
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
