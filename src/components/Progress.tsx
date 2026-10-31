import { useState } from "react";
import {
  BookOpen,
  Clock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { type Learning, dayKey, dailyStats, learnedIds } from "../lib/model";
import { SectionTitle } from "./ui";
export default function Progress({ data }: { data: Learning }) {
  const now = dayKey();
  const [month, setMonth] = useState(now.slice(0, 7)),
    [range, setRange] = useState(7);
  const year = Number(month.slice(0, 4)),
    m = Number(month.slice(5));
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate(),
    offset = (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7;
  const dates = Array.from({ length: range }, (_, i) =>
    new Date(
      new Date(now + "T00:00:00Z").getTime() - (range - i - 1) * 86400000,
    )
      .toISOString()
      .slice(0, 10),
  );
  const series = dates.map((d) => ({
    d,
    minutes: Math.round(
      data.records
        .filter((r) => r.day === d)
        .reduce((a, r) => a + r.seconds, 0) / 60,
    ),
    words:
      data.records.filter((r) => r.day === d && r.mode === "learn").length * 10,
  }));
  const maxTime = Math.max(30, ...series.map((s) => s.minutes)),
    maxWords = Math.max(10, ...series.map((s) => s.words));
  const x = (i: number) => 40 + i * (530 / (range - 1));
  const path = series
    .map(
      (s, i) => `${i ? "L" : "M"}${x(i)},${185 - (s.words / maxWords) * 145}`,
    )
    .join(" ");
  function move(n: number) {
    setMonth(new Date(Date.UTC(year, m - 1 + n, 1)).toISOString().slice(0, 7));
  }
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">YOUR EFFORT IS ADDING UP</span>
        <h1>
          Look how far
          <br />
          <em>you’ve come.</em>
        </h1>
        <p>Small steps deserve to be seen.</p>
      </div>
      <div className="stats-grid">
        <div className="card stat">
          <BookOpen />
          <span>Words learned</span>
          <strong>{learnedIds(data).size}</strong>
          <small>One word at a time</small>
        </div>
        <div className="card stat">
          <Clock />
          <span>Study time</span>
          <strong>
            {Math.round(data.records.reduce((a, r) => a + r.seconds, 0) / 60)}
            <small> min</small>
          </strong>
          <small>Active time in completed batches</small>
        </div>
        <div className="card stat">
          <CalendarDays />
          <span>Goals completed</span>
          <strong>
            {
              Object.keys(data.plans).filter((d) => dailyStats(data, d).meal)
                .length
            }
          </strong>
          <small>A little every day</small>
        </div>
      </div>
      <div className="progress-layout">
        <section className="card activity-chart">
          <SectionTitle
            title="Your learning rhythm"
            aside={
              <select
                aria-label="Chart range"
                value={range}
                onChange={(e) => setRange(Number(e.target.value))}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            }
          />
          <div className="chart-legend">
            <span>
              <i />
              Study time · min
            </span>
            <span>
              <i />
              New words
            </span>
          </div>
          <svg
            role="img"
            aria-label="Study time as bars and new words as a line. Exact daily values in table below."
            viewBox="0 0 610 235"
            className="chart"
          >
            <text x="0" y="15">
              min
            </text>
            <text x="575" y="15">
              words
            </text>
            {[0, 1, 2, 3].map((n) => (
              <g key={n}>
                <line
                  x1="35"
                  x2="575"
                  y1={40 + (n * 145) / 3}
                  y2={40 + (n * 145) / 3}
                  stroke="var(--border)"
                  strokeDasharray="3 5"
                />
                <text x="1" y={44 + (n * 145) / 3}>
                  {Math.round(maxTime * (1 - n / 3))}
                </text>
                <text x="585" y={44 + (n * 145) / 3}>
                  {Math.round(maxWords * (1 - n / 3))}
                </text>
              </g>
            ))}
            {series.map((s, i) => (
              <g key={s.d}>
                <rect
                  x={x(i) - Math.min(16, 180 / range)}
                  width={Math.min(32, 360 / range)}
                  y={185 - (s.minutes / maxTime) * 145}
                  height={(s.minutes / maxTime) * 145}
                  rx="5"
                  fill="var(--chart-bar)"
                />
                {(range === 7 || i % 5 === 0) && (
                  <text textAnchor="middle" x={x(i)} y="216">
                    {new Date(s.d + "T12:00:00Z").toLocaleDateString("en", {
                      day: "numeric",
                      month: range === 7 ? undefined : "short",
                    })}
                  </text>
                )}
              </g>
            ))}
            <path d={path} fill="none" stroke="var(--accent)" strokeWidth="3" />
            {range === 7 &&
              series.map((s, i) => (
                <circle
                  key={s.d}
                  cx={x(i)}
                  cy={185 - (s.words / maxWords) * 145}
                  r="4"
                  fill="var(--surface)"
                  stroke="var(--accent)"
                  strokeWidth="2"
                />
              ))}
          </svg>
          <details>
            <summary>View daily numbers</summary>
            <table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Minutes</th>
                  <th>New words</th>
                </tr>
              </thead>
              <tbody>
                {series.map((s) => (
                  <tr key={s.d}>
                    <td>{s.d}</td>
                    <td>{s.minutes}</td>
                    <td>{s.words}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>
        <section className="card calendar-card">
          <SectionTitle title="A month of little wins" />
          <div className="calendar-header">
            <button
              className="icon-btn"
              onClick={() => move(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <b>
              {new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </b>
            <button
              className="icon-btn"
              disabled={month >= now.slice(0, 7)}
              onClick={() => move(1)}
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="calendar">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i} className="weekday">
                {d}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={"empty" + i} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const d = `${month}-${String(i + 1).padStart(2, "0")}`,
                count = data.records.filter((r) => r.day === d).length;
              return (
                <div
                  key={d}
                  title={`${d}: ${count} batches completed`}
                  className={`calendar-day intensity-${Math.min(3, count)} ${d === now ? "today" : ""} ${d > now ? "future" : ""}`}
                >
                  <span>{i + 1}</span>
                </div>
              );
            })}
          </div>
          <div className="heat-legend">
            <small>Less</small>
            {[0, 1, 2, 3].map((i) => (
              <i key={i} className={"intensity-" + i} />
            ))}
            <small>More</small>
          </div>
        </section>
      </div>
      <div className="card quiet-note">
        <TrendingUp />
        <div>
          <b>Your own pace is a good pace.</b>
          <p>Your progress is personal. Keep showing up for yourself.</p>
        </div>
      </div>
    </>
  );
}
