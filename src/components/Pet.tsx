import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PawPrint } from "lucide-react";
import {
  appearanceOf,
  petStages,
  speciesOf,
  type Companion,
} from "../lib/pets";
import { loadPetArt, type PetArt } from "./petArt";
type Display = { art: PetArt; stage: number; id: number };
function Frames({
  display,
  happy,
  blinking,
  leaving = false,
}: {
  display: Display;
  happy: boolean;
  blinking: boolean;
  leaving?: boolean;
}) {
  const base = useRef<HTMLCanvasElement>(null),
    blink = useRef<HTMLCanvasElement>(null),
    smile = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    [base, blink, smile].forEach((ref, row) => {
      const canvas = ref.current;
      if (!canvas) return;
      const context = canvas.getContext("2d")!;
      context.clearRect(0, 0, 384, 384);
      context.drawImage(display.art.frames[display.stage][row], 0, 0);
    });
  }, [display]);
  return (
    <div
      className={
        "pet-art-frame" + (leaving ? " pet-art-leaving" : " pet-art-entering")
      }
      data-happy={happy}
      data-blinking={blinking}
      aria-hidden="true"
    >
      <canvas ref={base} width={384} height={384} />
      <canvas
        ref={blink}
        className="pet-blink-frame"
        width={384}
        height={384}
      />
      <canvas
        ref={smile}
        className="pet-smile-frame"
        width={384}
        height={384}
      />
    </div>
  );
}
export default function Pet({
  pet,
  theme: _theme,
  stage = 0,
  preview = false,
}: {
  pet: Companion;
  theme: string;
  stage?: number;
  preview?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    current = useRef<Display | null>(null),
    serial = useRef(0);
  const happyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [display, setDisplay] = useState<Display | null>(null),
    [previous, setPrevious] = useState<Display | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0),
    [happy, setHappy] = useState(false),
    [blinking, setBlinking] = useState(false),
    [active, setActive] = useState(!document.hidden),
    [reduced, setReduced] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  const key = appearanceOf(pet),
    index = Math.max(
      0,
      Math.min(4, Number.isFinite(stage) ? Math.floor(stage) : 0),
    );
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    setHappy(false);
    setBlinking(false);
    loadPetArt(key)
      .then((art) => {
        if (!alive) return;
        const next = { art, stage: index, id: ++serial.current };
        setPrevious(current.current);
        current.current = next;
        setDisplay(next);
        setLoading(false);
      })
      .catch(() => {
        if (alive) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [key, index, retry]);
  useEffect(() => {
    if (!previous) return;
    const timer = setTimeout(() => setPrevious(null), reduced ? 0 : 1150);
    return () => clearTimeout(timer);
  }, [previous, reduced]);
  useEffect(() => {
    let visible = true;
    const update = () => setActive(visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    if (host.current) observer.observe(host.current);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    document.addEventListener("visibilitychange", update);
    media.addEventListener("change", change);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      media.removeEventListener("change", change);
      clearTimeout(happyTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!active || reduced || !display || happy || loading) {
      setBlinking(false);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          setBlinking(true);
          timer = setTimeout(() => {
            setBlinking(false);
            schedule();
          }, 220);
        },
        4000 + Math.random() * 3000,
      );
    };
    schedule();
    return () => clearTimeout(timer);
  }, [active, reduced, display, happy, loading]);
  useEffect(() => {
    if (!active) {
      clearTimeout(happyTimer.current);
      setHappy(false);
    }
  }, [active]);
  function greet() {
    if (error) {
      setRetry((value) => value + 1);
      return;
    }
    clearTimeout(happyTimer.current);
    setBlinking(false);
    setHappy(true);
    happyTimer.current = setTimeout(() => setHappy(false), 1450);
  }
  return (
    <div
      ref={host}
      className={
        "pet-world pet-illustrated" + (preview ? " pet-world-preview" : "")
      }
      data-species={speciesOf(pet)}
      data-stage={index}
      data-expression={happy ? "happy" : blinking ? "blink" : "rest"}
    >
      {previous && (
        <Frames
          key={previous.id}
          display={previous}
          happy={false}
          blinking={false}
          leaving
        />
      )}
      {display && (
        <Frames
          key={display.id}
          display={display}
          happy={happy}
          blinking={blinking}
        />
      )}
      {!display && (
        <div className="pet-art-placeholder" aria-hidden="true">
          <PawPrint size={34} />
        </div>
      )}
      <button
        type="button"
        className="pet-interaction"
        disabled={loading}
        aria-label={error ? `Retry loading ${pet.name}` : `Pet ${pet.name}`}
        onClick={greet}
      >
        <span className="sr-only">
          {pet.name}, your {petStages[index].toLowerCase()} {speciesOf(pet)}{" "}
          companion.
        </span>
      </button>
      <span className="pet-interaction-hint">
        {error
          ? "Couldn't load your companion · Tap to retry"
          : loading
            ? "Getting cozy…"
            : happy
              ? "A little love, just for you"
              : "Tap to say hello"}
      </span>
    </div>
  );
}
