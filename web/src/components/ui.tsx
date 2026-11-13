import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/* ---------------------------------- buttons ---------------------------------- */

export type ButtonVariant = "ink" | "accent" | "soft" | "white" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  ink: "bg-ink text-white hover:bg-[#2b2b2b]",
  accent: "bg-orange text-white hover:bg-orange-dark",
  soft: "bg-gray-soft text-ink hover:bg-gray",
  white: "bg-white text-ink hover:bg-white/85",
  ghost: "text-ink/60 hover:text-ink hover:bg-ink/[0.04]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm gap-2",
  md: "h-12 px-6 text-[15px] gap-2.5",
  lg: "h-14 px-7 text-base gap-3",
};

/** Shared recipe so <button>, <a> and <Link> look identical. Pills only — no outlines. */
export function buttonClass({
  variant = "ink",
  size = "md",
  block = false,
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string } = {}) {
  return [
    "group/btn inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-[-0.01em] whitespace-nowrap select-none",
    "transition-[background-color,color,transform] duration-200 active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-45",
    VARIANTS[variant],
    SIZES[size],
    block ? "w-full" : "",
    className,
  ].join(" ");
}

/** Arrow that nudges forward when its button is hovered. */
export function ArrowRight({ className = "size-[18px]" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={`${className} transition-transform duration-200 group-hover/btn:translate-x-0.5`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Full width (the default inside the funnel's narrow column). */
  block?: boolean;
  arrow?: boolean;
};

export function Button({ variant, size = "lg", block = true, arrow, className, children, ...props }: ButtonProps) {
  return (
    <button type="button" {...props} className={buttonClass({ variant, size, block, className })}>
      {children}
      {arrow && <ArrowRight />}
    </button>
  );
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  arrow?: boolean;
};

/** Button-styled link. In-page anchors (#…) render a plain <a>, routes go through next/link. */
export function LinkButton({ href, variant, size = "md", block = false, arrow, className, children, ...props }: LinkButtonProps) {
  const cls = buttonClass({ variant, size, block, className });
  const content = (
    <>
      {children}
      {arrow && <ArrowRight />}
    </>
  );
  return href.startsWith("#") ? (
    <a href={href} className={cls} {...props}>
      {content}
    </a>
  ) : (
    <Link href={href} className={cls} {...props}>
      {content}
    </Link>
  );
}

/* ---------------------------------- surfaces --------------------------------- */

/** White card on the gray stage. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-card bg-white p-6 sm:p-8 ${className}`}>{children}</section>;
}

/** Small uppercase mono label, e.g. "QUESTION 01". */
export function MonoLabel({ children, muted = false, className = "" }: { children: ReactNode; muted?: boolean; className?: string }) {
  return <p className={`text-label ${muted ? "text-ink/40" : "text-ink"} ${className}`}>{children}</p>;
}

export type ChipTone = "ink" | "soft" | "white" | "orange";

const CHIP_TONES: Record<ChipTone, string> = {
  ink: "bg-ink text-white",
  soft: "bg-gray-soft text-ink",
  white: "bg-white text-ink",
  orange: "bg-orange-soft text-orange-dark",
};

export function Chip({ children, tone = "soft", className = "" }: { children: ReactNode; tone?: ChipTone; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ${CHIP_TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Redacted({ width, height = "0.9em", className = "" }: { width: number | string; height?: number | string; className?: string }) {
  return <span aria-hidden className={`redacted ${className}`} style={{ width, height }} />;
}

/* ----------------------------------- forms ----------------------------------- */

export function Field({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between gap-3 text-[13px] font-semibold text-ink/60">
        {label}
        {hint && <span className="font-medium text-ink/35">{hint}</span>}
      </span>
      <input
        {...props}
        className="h-14 w-full rounded-control bg-gray-soft px-5 text-[17px] font-medium text-ink placeholder:text-ink/30 outline-none transition-[background-color,box-shadow] hover:bg-gray focus:bg-white focus:shadow-[inset_0_0_0_2px_var(--ink)] aria-invalid:shadow-[inset_0_0_0_2px_var(--orange)] tabular-nums"
      />
    </label>
  );
}

/* ---------------------------------- feedback --------------------------------- */

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-4 py-24 text-ink/50">
      <span aria-hidden className="dot-pulse flex gap-1.5">
        <span className="size-2 rounded-full bg-ink" />
        <span className="size-2 rounded-full bg-ink" />
        <span className="size-2 rounded-full bg-ink" />
      </span>
      <span className="text-label">{label}</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="mx-auto w-full max-w-[480px] rounded-tile bg-white p-5 flex flex-col gap-4 animate-fade-up">
      <div className="flex gap-3">
        <span aria-hidden className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-orange text-[13px] font-extrabold text-white">
          !
        </span>
        <p className="font-medium leading-snug">{message}</p>
      </div>
      {onRetry && (
        <Button variant="soft" size="md" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

/* ----------------------------------- icons ----------------------------------- */

export function CheckIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function CloseIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <path d="M7 7l10 10M17 7L7 17" />
    </svg>
  );
}

export function LockIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="10.5" width="14" height="10" rx="3" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  );
}

/** Four-point star used for achievements and accents. */
export function StarIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.5c.5 5.2 2.9 8 9.5 9.5-6.6 1.5-9 4.3-9.5 9.5-.5-5.2-2.9-8-9.5-9.5 6.6-1.5 9-4.3 9.5-9.5z" />
    </svg>
  );
}
