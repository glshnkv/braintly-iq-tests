import type { PublicQuestion } from "@/lib/quiz/types";
import { FigureView } from "./FigureView";

interface Props {
  question: PublicQuestion;
  selected: number | null;
  disabled: boolean;
  onSelect: (index: number) => void;
}

const LETTERS = "ABCDEF";

function Prompt({ question }: { question: PublicQuestion }) {
  const c = question.content;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold leading-snug text-center">{c.prompt}</h1>
      {c.kind === "sequence" && (
        <p className="text-center text-3xl font-bold tracking-wide tabular-nums">{c.sequence}</p>
      )}
      {c.kind === "matrix" && (
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-surface p-2 text-foreground mx-auto w-full max-w-[300px]">
          {c.grid.map((cell, i) => (
            <div key={i} className="aspect-square rounded-lg bg-white grid place-items-center p-1.5">
              {cell ? <FigureView figure={cell} /> : <span className="text-3xl font-bold text-accent">?</span>}
            </div>
          ))}
        </div>
      )}
      {c.kind === "figure" && (
        <div className="mx-auto w-40 rounded-2xl bg-surface p-3 text-foreground">
          <FigureView figure={c.figure} />
        </div>
      )}
    </div>
  );
}

export function QuestionView({ question, selected, disabled, onSelect }: Props) {
  const isFigure = question.options[0]?.kind === "figure";
  return (
    <div className="flex flex-col gap-6 animate-fade-up" key={question.id}>
      <Prompt question={question} />
      <div className={isFigure ? "grid grid-cols-3 gap-2" : "flex flex-col gap-2"}>
        {question.options.map((option, i) => {
          const active = selected === i;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(i)}
              aria-pressed={active}
              className={`rounded-2xl border-2 transition-colors text-left disabled:cursor-default ${
                active ? "border-brand bg-brand-soft" : "border-line bg-white hover:border-brand/60"
              } ${isFigure ? "p-2 text-foreground" : "min-h-14 px-4 py-3 flex items-center gap-3 text-lg"}`}
            >
              {option.kind === "figure" ? (
                <>
                  <FigureView figure={option.figure} />
                  <span className="block text-center text-xs text-muted mt-1">{LETTERS[i]}</span>
                </>
              ) : (
                <>
                  <span className="grid place-items-center size-7 shrink-0 rounded-full bg-surface text-xs font-semibold text-muted">
                    {LETTERS[i]}
                  </span>
                  <span>{option.label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
