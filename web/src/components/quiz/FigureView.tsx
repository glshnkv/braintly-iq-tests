import type { Figure, Segment, ShapeCell } from "@/lib/quiz/types";

const SIZE = 100;
const STROKE = 5;

function regularPolygon(cx: number, cy: number, r: number, sides: number, rotationDeg = 0): string {
  return Array.from({ length: sides }, (_, i) => {
    const a = ((rotationDeg - 90 + (360 / sides) * i) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

function fillProps(fill: ShapeCell["fill"]) {
  switch (fill) {
    case "solid":
      return { fill: "currentColor", stroke: "currentColor", strokeWidth: STROKE / 2 };
    case "light":
      return { fill: "currentColor", fillOpacity: 0.25, stroke: "currentColor", strokeWidth: STROKE };
    case "outline":
      return { fill: "none", stroke: "currentColor", strokeWidth: STROKE };
  }
}

function Shape({ cell, cx, cy, r }: { cell: ShapeCell; cx: number; cy: number; r: number }) {
  const props = fillProps(cell.fill);
  const rotate = cell.rotation ? `rotate(${cell.rotation} ${cx} ${cy})` : undefined;
  switch (cell.kind) {
    case "circle":
      return <circle cx={cx} cy={cy} r={r * 0.9} {...props} />;
    case "square":
      return <rect x={cx - r * 0.8} y={cy - r * 0.8} width={r * 1.6} height={r * 1.6} transform={rotate} {...props} />;
    case "triangle":
      return <polygon points={regularPolygon(cx, cy + r * 0.15, r, 3, cell.rotation)} {...props} />;
    case "diamond":
      return <polygon points={regularPolygon(cx, cy, r, 4, cell.rotation)} {...props} />;
    case "arrow": {
      const w = r * 0.35;
      const points = [
        [cx, cy - r],
        [cx + r * 0.75, cy - r * 0.1],
        [cx + w, cy - r * 0.1],
        [cx + w, cy + r],
        [cx - w, cy + r],
        [cx - w, cy - r * 0.1],
        [cx - r * 0.75, cy - r * 0.1],
      ]
        .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
        .join(" ");
      return <polygon points={points} transform={rotate} {...props} />;
    }
    case "polygon": {
      const dots = cell.dots ?? 0;
      const spacing = r * 0.38;
      return (
        <g>
          <polygon points={regularPolygon(cx, cy, r, cell.sides ?? 5, cell.rotation)} {...props} />
          {Array.from({ length: dots }, (_, i) => (
            <circle key={i} cx={cx + (i - (dots - 1) / 2) * spacing} cy={cy} r={r * 0.11} fill="currentColor" />
          ))}
        </g>
      );
    }
  }
}

function ShapesFigure({ cell }: { cell: ShapeCell }) {
  const count = cell.count ?? 1;
  const r = count === 1 ? 34 : count === 2 ? 22 : count === 3 ? 15 : 11;
  const gap = (SIZE - 16) / count;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Shape key={i} cell={cell} cx={count === 1 ? 50 : 8 + gap * (i + 0.5)} cy={50} r={r} />
      ))}
    </>
  );
}

const SEGMENT_LINES: Record<Segment, [number, number, number, number]> = {
  top: [15, 15, 85, 15],
  right: [85, 15, 85, 85],
  bottom: [15, 85, 85, 85],
  left: [15, 15, 15, 85],
  diag: [15, 15, 85, 85],
};

function SegmentsFigure({ segments }: { segments: Segment[] }) {
  return (
    <>
      <rect x={15} y={15} width={70} height={70} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={2} strokeDasharray="4 4" />
      {segments.map((s) => {
        const [x1, y1, x2, y2] = SEGMENT_LINES[s];
        return <line key={s} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={STROKE + 1} strokeLinecap="round" />;
      })}
    </>
  );
}

function PolyominoFigure({ cells }: { cells: [number, number][] }) {
  const w = Math.max(...cells.map(([x]) => x)) + 1;
  const h = Math.max(...cells.map(([, y]) => y)) + 1;
  const unit = (SIZE - 20) / Math.max(w, h, 3);
  const ox = (SIZE - w * unit) / 2;
  const oy = (SIZE - h * unit) / 2;
  return (
    <>
      {cells.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={ox + x * unit}
          y={oy + y * unit}
          width={unit}
          height={unit}
          rx={2}
          fill="currentColor"
          stroke="white"
          strokeWidth={2}
        />
      ))}
    </>
  );
}

export function FigureView({ figure, className = "" }: { figure: Figure; className?: string }) {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={`w-full h-auto ${className}`} aria-hidden>
      {figure.type === "shapes" && <ShapesFigure cell={figure} />}
      {figure.type === "segments" && <SegmentsFigure segments={figure.segments} />}
      {figure.type === "polyomino" && <PolyominoFigure cells={figure.cells} />}
    </svg>
  );
}
