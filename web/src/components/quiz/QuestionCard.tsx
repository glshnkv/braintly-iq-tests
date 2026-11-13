"use client";

import { useEffect, type ReactNode } from "react";
import { MonoLabel } from "@/components/ui";
import type { PublicQuestion } from "@/lib/quiz/types";
import { FigureView } from "./FigureView";

const LETTERS = "ABCDEF";

/**
 * Lets desktop users answer with the keyboard: A–F or 1–6 (physical keys, so it works
 * in any layout). Unbound while `disabled`.
 */
export function useChoiceKeys(count: number, disabled: boolean, onSelect: (index: number) => void) {
  useEffect(() => {
    if (disabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]")) return;
      const m = /^(?:Key([A-F])|Digit([1-6]))$/.exec(e.code);
      if (!m) return;
      const index = m[1] ? LETTERS.indexOf(m[1]) : Number(m[2]) - 1;
      if (index < count) {
        e.preventDefault();
        onSelect(index);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, disabled, onSelect]);
}

/** A single answer tile (text answers, gender, age…): filled, with a key hint on the left. */
export function ChoiceRow({
  label,
  index,
  selected,
  disabled,
  onSelect,
  tone = "soft",
}: {
  label: ReactNode;
  index: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  /** Use "white" when the row sits on a gray surface. */
  tone?: "soft" | "white";
}) {
  const idle = tone === "soft" ? "bg-gray-soft hover:bg-gray" : "bg-white hover:bg-white/70";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`group flex w-full min-h-14 items-center gap-3.5 rounded-control px-3 py-2.5 text-left text-[17px] font-semibold tracking-[-0.01em] transition-[background-color,color,transform] duration-200 active:scale-[0.99] disabled:cursor-default ${
        selected ? "bg-orange text-white" : `${idle} ${disabled ? "text-ink/45" : ""}`
      }`}
    >
      <span
        aria-hidden
        className={`grid place-items-center size-8 shrink-0 rounded-[10px] font-mono text-xs transition-colors ${
          selected ? "bg-white/20 text-white" : tone === "soft" ? "bg-white text-ink/45 group-hover:text-ink" : "bg-gray-soft text-ink/45"
        }`}
      >
        {LETTERS[index]}
      </span>
      <span className="leading-snug">{label}</span>
    </button>
  );
}

function Prompt({ question }: { question: PublicQuestion }) {
  const c = question.content;
  return (
    <>
      <h2 className="text-[1.55rem] sm:text-[1.75rem] font-bold leading-[1.18] tracking-[-0.03em] text-balance">{c.prompt}</h2>
      {c.kind === "sequence" && (
        <p className="mt-5 inline-flex rounded-tile bg-gray-soft px-5 py-3 text-[2.1rem] font-extrabold tracking-[-0.02em] tabular-nums">
          {c.sequence}
        </p>
      )}
      {c.kind === "matrix" && (
        <div className="mt-5 grid grid-cols-3 gap-1.5 w-full max-w-[216px] text-ink">
          {c.grid.map((cell, i) => (
            <div key={i} className={`aspect-square grid place-items-center rounded-xl p-1.5 ${cell ? "bg-gray-soft" : "bg-orange-soft"}`}>
              {cell ? <FigureView figure={cell} /> : <span className="text-3xl font-extrabold text-orange">?</span>}
            </div>
          ))}
        </div>
      )}
      {c.kind === "figure" && (
        <div className="mt-5 w-28 rounded-tile bg-gray-soft p-3 text-ink">
          <FigureView figure={c.figure} />
        </div>
      )}
    </>
  );
}

interface Props {
  question: PublicQuestion;
  label: string;
  /** Shown after the label as " / 25". */
  total?: number;
  hint: string;
  selected: number | null;
  disabled: boolean;
  onSelect: (index: number) => void;
  /** Answer with A–F / 1–6. Off on the landing, where a stray key press shouldn't start the test. */
  keys?: boolean;
}

/** Card body for a test question: label, prompt, optional visual, answer options. */
export function QuestionCard({ question, label, total, hint, selected, disabled, onSelect, keys = true }: Props) {
  const isFigure = question.options[0]?.kind === "figure";
  useChoiceKeys(question.options.length, disabled || !keys, onSelect);
  return (
    <div className="flex flex-col">
      <MonoLabel>
        {label}
        {total !== undefined && <span className="text-ink/35"> / {total}</span>}
      </MonoLabel>
      <div className="mt-4">
        <Prompt question={question} />
      </div>
      <MonoLabel muted className="mt-7">
        {hint}
      </MonoLabel>
      <div role="radiogroup" aria-label={question.content.prompt} className={`mt-3 grid gap-2 ${isFigure ? "grid-cols-3" : ""}`}>
        {question.options.map((option, i) =>
          option.kind === "figure" ? (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={selected === i}
              disabled={disabled}
              onClick={() => onSelect(i)}
              className={`relative flex h-[5.5rem] sm:h-24 items-center justify-center rounded-control p-3 transition-[background-color,color,transform] duration-200 active:scale-[0.98] disabled:cursor-default ${
                selected === i ? "bg-orange text-white" : "bg-gray-soft text-ink hover:bg-gray"
              }`}
            >
              <FigureView figure={option.figure} className="!h-full !w-auto" />
              <span className={`absolute left-2.5 top-2 font-mono text-[11px] ${selected === i ? "text-white/80" : "text-ink/35"}`}>
                {LETTERS[i]}
              </span>
            </button>
          ) : (
            <ChoiceRow key={i} index={i} label={option.label} selected={selected === i} disabled={disabled} onSelect={() => onSelect(i)} />
          ),
        )}
      </div>
    </div>
  );
}
