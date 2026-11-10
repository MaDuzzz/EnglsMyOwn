import { useEffect, useRef, useState } from "react";
import { BookOpen, Flame, Info, PawPrint, Trophy } from "lucide-react";
import {
  addDays,
  currentStreakOf,
  metricValue,
  rankedEntries,
  weekStart,
  weeklyWordsOf,
  type RankingEntry,
  type RankingMetric,
} from "../lib/ranking";
import { loadPetArt } from "./petArt";
import { ProgressBar } from "./ui";

const choices: { id: RankingMetric; label: string }[] = [
  { id: "points", label: "Points" },
  { id: "streak", label: "Streak" },
  { id: "words", label: "Words" },
];
const GOAL = 50;

function PetAvatar({ entry }: { entry: RankingEntry }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setFailed(false);
    void loadPetArt(entry.appearance)
      .then((art) => {
        if (!active || !ref.current) return;
        const context = ref.current.getContext("2d");
        if (!context) return;
        context.clearRect(0, 0, 80, 80);
        context.drawImage(
          art.frames[Math.max(1, entry.petStage)][0],
          0,
          0,
          80,
          80,
        );
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [entry.appearance, entry.petStage]);
  return (
    <span className="ranking-pet" aria-hidden="true">
      {failed ? (
        <PawPrint size={26} />
      ) : (
        <canvas ref={ref} width={80} height={80} />
      )}
    </span>
  );
}

function formattedDate(day: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    ...options,
  });
}

export default function Ranking({
  entries,
  uid,
  today,
  loading,
  error,
  onRetry,
}: {
  entries: RankingEntry[];
  uid: string;
  today: string;
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const [metric, setMetric] = useState<RankingMetric>("points");
  const ranked = rankedEntries(entries, metric, today);
  const mine = ranked.find((entry) => entry.uid === uid);
  const leader = ranked[0];
  const ownValue = mine ? metricValue(mine, metric, today) : 0;
  const leadValue = leader ? metricValue(leader, metric, today) : 0;
  const difference = Math.max(0, leadValue - ownValue);
  const ownCurrent = mine ? currentStreakOf(mine, today) : 0;
  const daysToPersonalBest = Math.max(1, ownValue - ownCurrent + 1);
  const allZero = leadValue === 0;
  const weekKey = weekStart(today);
  const weekEnd = addDays(weekKey, 6);
  const sameMonth = weekKey.slice(0, 7) === weekEnd.slice(0, 7);
  const weekLabel = `${formattedDate(weekKey, { month: "short", day: "numeric" })}–${formattedDate(weekEnd, sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" })}`;
  const monthLabel = formattedDate(`${today.slice(0, 7)}-01`, {
    month: "long",
  });
  const period =
    metric === "points"
      ? `THIS WEEK · ${weekLabel}`
      : metric === "words"
        ? `THIS MONTH · ${monthLabel.toUpperCase()}`
        : "BEST STREAK · ALL TIME";
  const helper =
    metric === "points"
      ? "Weekly points · Mon–Sun"
      : metric === "words"
        ? `New words · ${monthLabel}`
        : "Longest goal-day streak · all time";
  const gap = allZero
    ? "A fresh start for everyone"
    : difference === 0
      ? mine?.rank === 1 &&
        ranked.some(
          (entry) =>
            entry.uid !== uid && metricValue(entry, metric, today) === ownValue,
        )
        ? "Tied for first place"
        : "You’re in first place!"
      : `${difference} ${metric === "points" ? "points" : metric === "words" ? "words" : difference === 1 ? "day" : "days"} to first place`;
  const together = entries.reduce(
    (total, entry) => total + weeklyWordsOf(entry, today),
    0,
  );
  const description =
    metric === "points"
      ? "20 points per new batch · 10 per review batch."
      : metric === "words"
        ? "Only completed new-word batches count."
        : "Your best stays, even when your current streak ends.";

  return (
    <div className="ranking-page">
      <div className="page-intro ranking-intro">
        <span className="eyebrow">YOUR LITTLE LEAGUE</span>
        <h1>Ranking</h1>
        <p>Keep showing up, together.</p>
      </div>
      <section
        className={`card ranking-hero ranking-hero-${metric}`}
        aria-label="Your ranking"
      >
        <div>
          <span className="ranking-period">{period}</span>
          <span className="ranking-hero-label">Your rank</span>
          <strong>
            #{mine?.rank || 1} <small>of {Math.max(1, ranked.length)}</small>
          </strong>
          <ProgressBar
            value={allZero ? 0 : (ownValue / leadValue) * 100}
            label={`Your ${metric} compared with first place`}
          />
          <span className="ranking-gap">{gap}</span>
          {metric === "streak" && (
            <span className="ranking-personal-goal">
              Current {ownCurrent} days · {daysToPersonalBest}{" "}
              {daysToPersonalBest === 1 ? "day" : "days"} to a new personal best
            </span>
          )}
        </div>
        <span className="ranking-hero-icon" aria-hidden="true">
          {metric === "points" ? (
            <Trophy />
          ) : metric === "words" ? (
            <BookOpen />
          ) : (
            <Flame />
          )}
        </span>
      </section>
      <section className="ranking-board" aria-labelledby="ranking-board-title">
        <h2 id="ranking-board-title">Leaderboard</h2>
        <div
          className="ranking-switch"
          role="group"
          aria-label="Ranking metric"
        >
          {choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              aria-pressed={metric === choice.id}
              className={metric === choice.id ? "selected" : ""}
              onClick={() => setMetric(choice.id)}
            >
              {choice.label}
            </button>
          ))}
        </div>
        <p className="ranking-helper" aria-live="polite">{helper}</p>
        <div className="ranking-list">
          {ranked.map((entry) => {
            const value = metricValue(entry, metric, today);
            const secondary =
              metric === "points"
                ? `${entry.weekKey === weekKey ? entry.weekDays : 0} learning days`
                : metric === "words"
                  ? `${value / 10} batches completed`
                  : `Current ${currentStreakOf(entry, today)} days`;
            return (
              <div
                className={`ranking-row card${entry.uid === uid ? " is-you" : ""}`}
                key={entry.uid}
              >
                <span
                  className={`ranking-medal rank-${Math.min(entry.rank, 3)}`}
                  aria-label={`Rank ${entry.rank}`}
                >
                  #{entry.rank}
                </span>
                <PetAvatar entry={entry} />
                <span className="ranking-person">
                  <strong>
                    {entry.uid === uid
                      ? `You · ${entry.displayName}`
                      : entry.displayName}
                  </strong>
                  <small>{secondary}</small>
                </span>
                <strong className="ranking-value">
                  {value}{" "}
                  <small>
                    {metric === "points"
                      ? "pts"
                      : metric === "words"
                        ? "words"
                        : value === 1
                          ? "day"
                          : "days"}
                  </small>
                </strong>
              </div>
            );
          })}
          {loading && (
            <p className="ranking-loading" role="status">
              Finding your league…
            </p>
          )}
        </div>
      </section>
      <section className="card ranking-together" aria-label="Group word goal">
        <div>
          <h2>Together this week</h2>
          <p>
            {together} of {GOAL} new words learned together
          </p>
        </div>
        <span aria-hidden="true" className="ranking-sparkle">
          ✦
        </span>
        <ProgressBar
          value={(together / GOAL) * 100}
          label="Shared weekly new-word goal"
        />
      </section>
      <p className="ranking-note">
        <Info size={16} />
        {description}
      </p>
      {error && (
        <div className="ranking-error" role="alert">
          {error}
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
