import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { X, ArrowRight, Store, PersonStanding } from "lucide-react";
export const asset = (name: string) =>
  import.meta.env.BASE_URL + "assets/" + name;
export function Button({
  children,
  onClick,
  disabled = false,
  secondary = false,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  secondary?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={"button " + (secondary ? "secondary" : "primary")}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label || "Progress"}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty card">
      <div className="empty-icon">✦</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={"modal" + (wide ? " word-detail-modal" : "")}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Road({ count }: { count: number }) {
  const path = useRef<SVGPathElement>(null);
  const progressPath = useRef<SVGPathElement>(null);
  const person = useRef<SVGGElement>(null);
  const position = useRef(count);
  const positioned = useRef(false);
  useLayoutEffect(() => {
    const curve = path.current;
    const walker = person.current;
    const line = progressPath.current;
    if (!curve || !walker || !line) return;
    const destination = Math.min(40, Math.max(0, count));
    const place = (value: number) => {
      const point = curve.getPointAtLength(
        (curve.getTotalLength() * value) / 40,
      );
      walker.setAttribute("transform", `translate(${point.x} ${point.y})`);
      line.setAttribute("stroke-dasharray", `${value} 40`);
      position.current = value;
    };
    if (
      !positioned.current ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      place(destination);
      positioned.current = true;
      return;
    }
    const from = position.current;
    const started = performance.now();
    let frame = 0;
    walker.classList.add("is-walking");
    const animate = (now: number) => {
      const t = Math.min(1, (now - started) / 660);
      const eased = t * t * (3 - 2 * t);
      place(from + (destination - from) * eased);
      if (t < 1) frame = requestAnimationFrame(animate);
      else walker.classList.remove("is-walking");
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      walker.classList.remove("is-walking");
    };
  }, [count]);
  return (
    <div className="road">
      <svg viewBox="0 -12 380 134" aria-hidden="true">
        <path
          ref={path}
          d="M15 90 C65 105 80 36 135 54 S220 114 265 81 S320 68 345 76"
          stroke="var(--track)"
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
        />
        <path
          ref={progressPath}
          pathLength="40"
          d="M15 90 C65 105 80 36 135 54 S220 114 265 81 S320 68 345 76"
          stroke="var(--accent)"
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="0 40"
        />
        <g ref={person} className="walker" transform="translate(15 90)">
          <g className="walker-doodle">
            <circle cx="0" cy="-28" r="7" fill="var(--bg)" />
            <circle cx="0" cy="-28" r="5" fill="var(--accent)" />
            <path
              d="M0-21v12m0-10-7 7m7-7 8 6M0-9-6 9m6-18 7 18"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>
        </g>
      </svg>
      <div className="road-shop">
        <Store size={31} />
        <span>SHOP</span>
      </div>
      <small>
        <b>{count}</b> / 40 completed
      </small>
    </div>
  );
}
export function SectionTitle({
  title,
  aside,
}: {
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {aside}
    </div>
  );
}
export function NextLabel({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ArrowRight size={18} />
    </>
  );
}
