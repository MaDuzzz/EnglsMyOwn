import { useEffect, useRef, useState } from "react";
import type { createPetScene } from "./petScene";
import { asset } from "./ui";

type PetAppearance = { name: string; color: string; pattern: string };
export default function Pet({
  pet,
  theme,
  preview = false,
}: {
  pet: PetAppearance;
  theme: string;
  preview?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createPetScene> | null>(null);
  const latest = useRef({ color: pet.color, pattern: pet.pattern, theme });
  latest.current = { color: pet.color, pattern: pet.pattern, theme };
  const [ready, setReady] = useState(false),
    [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    import("./petScene")
      .then(({ createPetScene }) => {
        if (!active || !host.current) return;
        try {
          scene.current = createPetScene(host.current, latest.current, () => {
            if (active) {
              setUnavailable(true);
              setReady(false);
            }
          });
          setReady(true);
        } catch {
          setUnavailable(true);
        }
      })
      .catch(() => {
        if (active) setUnavailable(true);
      });
    return () => {
      active = false;
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);
  useEffect(() => {
    scene.current?.update(latest.current);
  }, [pet.color, pet.pattern, theme]);
  return (
    <div className={"pet-world" + (preview ? " pet-world-preview" : "")}>
      <div ref={host} className="pet-canvas" aria-hidden="true" />
      {!ready && (
        <img
          className={"pet-fallback pet-" + pet.color}
          src={asset("mochi.png")}
          alt=""
        />
      )}
      <button
        type="button"
        className="pet-interaction"
        aria-label={`Pet ${pet.name}`}
        onClick={() => scene.current?.greet()}
        onPointerMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          scene.current?.look(
            (e.clientX - box.left) / box.width - 0.5,
            (e.clientY - box.top) / box.height - 0.5,
          );
        }}
        onPointerLeave={() => scene.current?.look(0, 0)}
      >
        <span className="sr-only">
          {pet.name}, your little learning companion.
        </span>
      </button>
      <span className="pet-interaction-hint">
        {unavailable
          ? "Your little companion"
          : ready
            ? "Tap to say hello"
            : "Getting comfy…"}
      </span>
    </div>
  );
}
