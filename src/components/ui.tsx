import { useEffect, useRef, type ReactNode } from "react";
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
  const person = useRef<SVGGElement>(null);
  useEffect(() => {
    if (path.current && person.current) {
      const point = path.current.getPointAtLength(
        (path.current.getTotalLength() * count) / 40,
      );
      person.current.style.transform = `translate(${point.x}px, ${point.y - 6}px)`;
    }
  }, [count]);
  return (
    <div className="road">
      <svg viewBox="0 0 380 88" aria-hidden="true">
        <path
          d="M15 64 C65 80 80 10 135 28 S220 88 265 55 S320 42 345 50"
          stroke="var(--track)"
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
        />
        <path
          ref={path}
          pathLength="40"
          d="M15 64 C65 80 80 10 135 28 S220 88 265 55 S320 42 345 50"
          stroke="var(--accent)"
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${count} 40`}
        />
        <g
          ref={person}
          className="walker"
          style={{ transform: "translate(15px,58px)" }}
        >
          <circle cx="0" cy="-28" r="5" fill="var(--accent)" />
          <path
            d="M0-21v12m0-10-7 7m7-7 8 6M0-9-6 9m6-18 7 18"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
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
