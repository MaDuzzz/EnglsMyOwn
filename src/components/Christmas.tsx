import { useEffect, useState, type CSSProperties } from "react";

const asset = (name: string) =>
  `${import.meta.env.BASE_URL}assets/christmas/${name}`;

export function ChristmasWordmark() {
  return (
    <span className="christmas-wordmark">
      <span>EnglsMyOwn</span>
      <svg
        className="christmas-wordmark-snow"
        viewBox="0 0 180 20"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className="snow-shadow"
          d="M0 11 Q10 7 19 10 Q26 12 34 7 Q39 4 46 9 Q53 12 61 7 Q66 4 73 9 Q80 12 89 7 Q95 4 101 9 Q108 12 117 7 Q123 4 129 10 Q138 12 146 7 Q152 4 158 9 Q170 11 180 7 L180 20 H0Z"
        />
        <path
          className="snow-top"
          d="M0 9 Q8 5 18 8 Q25 11 34 6 Q40 3 46 8 Q53 11 61 6 Q67 3 73 8 Q81 11 89 6 Q95 3 101 8 Q108 11 117 6 Q123 3 129 9 Q137 11 146 6 Q152 3 159 8 Q170 10 180 6 L180 18 H0Z"
        />
      </svg>
      <img
        className="christmas-cane christmas-cane-light"
        src={asset("cane-light.png")}
        alt=""
        aria-hidden="true"
      />
      <img
        className="christmas-cane christmas-cane-dark"
        src={asset("cane-dark.png")}
        alt=""
        aria-hidden="true"
      />
    </span>
  );
}

export function ChristmasTree() {
  return (
    <span className="christmas-tree" aria-hidden="true">
      <img
        className="christmas-tree-light"
        src={asset("tree-light.png")}
        alt=""
      />
      <img
        className="christmas-tree-dark"
        src={asset("tree-dark.png")}
        alt=""
      />
    </span>
  );
}

export function ChristmasReindeer() {
  return (
    <img
      className="christmas-reindeer"
      src={asset("reindeer.png")}
      alt=""
      aria-hidden="true"
    />
  );
}

const flakes = [
  [4, 8, 18, 2, -14],
  [12, 5, 22, 13, 12],
  [20, 7, 20, 8, -16],
  [27, 4, 24, 17, 15],
  [35, 8, 23, 3, -12],
  [43, 5, 19, 14, 17],
  [51, 6, 25, 9, -11],
  [59, 4, 21, 19, 14],
  [67, 7, 26, 6, -15],
  [74, 5, 20, 16, 13],
  [82, 8, 23, 11, -12],
  [89, 4, 27, 4, 17],
  [96, 6, 22, 18, -15],
] as const;

export function Snowfall({ pet = false }: { pet?: boolean }) {
  const [paused, setPaused] = useState(() => document.hidden);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div
      className={`christmas-snow ${pet ? "christmas-snow-pet" : ""}`}
      data-paused={paused}
      aria-hidden="true"
    >
      {flakes
        .slice(0, pet ? 7 : flakes.length)
        .map(([left, size, duration, delay, drift], index) => (
          <span
            key={index}
            className="christmas-flake"
            style={
              {
                left: `${pet ? (left * 1.37) % 98 : left}%`,
                width: size,
                height: size,
                animationDuration: `${pet ? duration * 0.72 : duration}s`,
                animationDelay: `-${delay}s`,
                "--snow-drift": `${drift}px`,
                "--snow-still": `${(index * 17 + 11) % 82}%`,
              } as CSSProperties
            }
          />
        ))}
    </div>
  );
}
