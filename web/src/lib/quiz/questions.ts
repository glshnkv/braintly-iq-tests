import "server-only";
import { isRotationOf, mirror, rotate, type Cell } from "./polyomino";
import type { Difficulty, Figure, LocalizedText, OptionContent, Question } from "./types";

/* ---------------------------------- helpers --------------------------------- */

const t = (ru: string, en: string): LocalizedText => ({ ru, en });
const txt = (label: string | LocalizedText): OptionContent => ({ kind: "text", label });
const fig = (figure: Figure): OptionContent => ({ kind: "figure", figure });
const poly = (cells: Cell[]): Figure => ({ type: "polyomino", cells });

const PROMPTS = {
  matrix: t("Какая фигура пропущена?", "Which figure completes the pattern?"),
  next: t("Какое число следующее?", "What number comes next?"),
  rotation: t(
    "Какой вариант — это та же фигура, только повёрнутая (без отражения)?",
    "Which option is the same shape, only rotated (not flipped)?",
  ),
  digits: t("Какую последовательность вы видели?", "Which sequence did you see?"),
};

/** Inserts the correct option at a fixed position so the answer key never depends on runtime randomness. */
function withCorrectAt(correct: OptionContent, distractors: OptionContent[], position: number) {
  const options = [...distractors];
  options.splice(position, 0, correct);
  return { options, correctIndex: position };
}

function spatialQuestion(params: {
  id: string;
  difficulty: Difficulty;
  expectedCorrectPct: number;
  base: Cell[];
  correctRotation: number;
  mirroredRotations: number[];
  decoy: Cell[];
  position: number;
}): Question {
  const { base } = params;
  if (!params.mirroredRotations.every((r) => !isRotationOf(base, rotate(mirror(base), r)))) {
    throw new Error(`Spatial question ${params.id}: base shape must be chiral`);
  }
  const distractors = [
    ...params.mirroredRotations.map((r) => fig(poly(rotate(mirror(base), r)))),
    fig(poly(params.decoy)),
  ];
  return {
    id: params.id,
    scale: "spatial",
    difficulty: params.difficulty,
    expectedCorrectPct: params.expectedCorrectPct,
    content: { kind: "figure", prompt: PROMPTS.rotation, figure: poly(base) },
    ...withCorrectAt(fig(poly(rotate(base, params.correctRotation))), distractors, params.position),
  };
}

/* ---------------------------------- logic ---------------------------------- */

const logic: Question[] = [
  {
    id: "logic-1",
    scale: "logic",
    difficulty: 1,
    expectedCorrectPct: 88,
    content: {
      kind: "text",
      prompt: t(
        "Какое слово лишнее: яблоко, груша, морковь, слива, персик?",
        "Which word doesn't belong: apple, pear, carrot, plum, peach?",
      ),
    },
    options: [txt(t("Груша", "Pear")), txt(t("Морковь", "Carrot")), txt(t("Слива", "Plum")), txt(t("Персик", "Peach"))],
    correctIndex: 1,
  },
  {
    id: "logic-2",
    scale: "logic",
    difficulty: 2,
    expectedCorrectPct: 68,
    content: {
      kind: "text",
      prompt: t(
        "Все блумы — разлы. Все разлы — ласы. Верно ли, что все блумы — ласы?",
        "All bloops are razzies. All razzies are lazzies. Are all bloops definitely lazzies?",
      ),
    },
    options: [txt(t("Да", "Yes")), txt(t("Нет", "No")), txt(t("Нельзя определить", "Can't tell"))],
    correctIndex: 0,
  },
  {
    id: "logic-3",
    scale: "logic",
    difficulty: 3,
    expectedCorrectPct: 42,
    content: {
      kind: "text",
      prompt: t(
        "Все розы — цветы. Некоторые цветы быстро вянут. Следует ли, что некоторые розы быстро вянут?",
        "All roses are flowers. Some flowers fade quickly. Does it follow that some roses fade quickly?",
      ),
    },
    options: [txt(t("Да", "Yes")), txt(t("Нет", "No")), txt(t("Нельзя определить", "Can't tell"))],
    correctIndex: 2,
  },
  {
    id: "logic-4",
    scale: "logic",
    difficulty: 4,
    expectedCorrectPct: 34,
    content: {
      kind: "text",
      prompt: t(
        "Маша выше Оли. Оля выше Кати. Катя выше Лены. Аня выше Кати, но ниже Оли. Кто третий по росту?",
        "Mia is taller than Olivia. Olivia is taller than Kate. Kate is taller than Lily. Anna is taller than Kate but shorter than Olivia. Who is the third tallest?",
      ),
    },
    options: [
      txt(t("Оля", "Olivia")),
      txt(t("Катя", "Kate")),
      txt(t("Аня", "Anna")),
      txt(t("Лена", "Lily")),
      txt(t("Маша", "Mia")),
    ],
    correctIndex: 2,
  },
  {
    id: "logic-5",
    scale: "logic",
    difficulty: 5,
    expectedCorrectPct: 22,
    content: {
      kind: "text",
      prompt: t(
        "Мяч и бита вместе стоят 110 ₽. Бита дороже мяча на 100 ₽. Сколько стоит мяч?",
        "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?",
      ),
    },
    options: [
      txt(t("10 ₽", "10¢")),
      txt(t("5 ₽", "5¢")),
      txt(t("1 ₽", "1¢")),
      txt(t("15 ₽", "15¢")),
    ],
    correctIndex: 1,
  },
];

/* --------------------------------- numbers --------------------------------- */

const numbers: Question[] = [
  {
    id: "numbers-1",
    scale: "numbers",
    difficulty: 1,
    expectedCorrectPct: 92,
    content: { kind: "sequence", prompt: PROMPTS.next, sequence: "2, 4, 6, 8, ?" },
    ...withCorrectAt(txt("10"), [txt("9"), txt("12"), txt("16")], 0),
  },
  {
    id: "numbers-2",
    scale: "numbers",
    difficulty: 2,
    expectedCorrectPct: 74,
    content: { kind: "sequence", prompt: PROMPTS.next, sequence: "3, 6, 12, 24, ?" },
    ...withCorrectAt(txt("48"), [txt("36"), txt("30"), txt("42")], 2),
  },
  {
    id: "numbers-3",
    scale: "numbers",
    difficulty: 3,
    expectedCorrectPct: 55,
    content: { kind: "sequence", prompt: PROMPTS.next, sequence: "1, 1, 2, 3, 5, 8, ?" },
    ...withCorrectAt(txt("13"), [txt("11"), txt("12"), txt("16")], 1),
  },
  {
    id: "numbers-4",
    scale: "numbers",
    difficulty: 4,
    expectedCorrectPct: 36,
    content: { kind: "sequence", prompt: PROMPTS.next, sequence: "2, 5, 10, 17, 26, ?" },
    ...withCorrectAt(txt("37"), [txt("35"), txt("36"), txt("39")], 3),
  },
  {
    id: "numbers-5",
    scale: "numbers",
    difficulty: 5,
    expectedCorrectPct: 18,
    content: { kind: "sequence", prompt: PROMPTS.next, sequence: "8, 6, 9, 23, 87, ?" },
    ...withCorrectAt(txt("429"), [txt("348"), txt("261"), txt("435")], 0),
  },
];

/* --------------------------------- patterns -------------------------------- */

const shapes = (kind: Figure & { type: "shapes" }): Figure => kind;

const patterns: Question[] = [
  {
    id: "patterns-1",
    scale: "patterns",
    difficulty: 1,
    expectedCorrectPct: 90,
    content: {
      kind: "matrix",
      prompt: PROMPTS.matrix,
      grid: [
        shapes({ type: "shapes", kind: "circle", fill: "solid", count: 1 }),
        shapes({ type: "shapes", kind: "circle", fill: "solid", count: 2 }),
        shapes({ type: "shapes", kind: "circle", fill: "solid", count: 3 }),
        shapes({ type: "shapes", kind: "square", fill: "solid", count: 1 }),
        shapes({ type: "shapes", kind: "square", fill: "solid", count: 2 }),
        shapes({ type: "shapes", kind: "square", fill: "solid", count: 3 }),
        shapes({ type: "shapes", kind: "triangle", fill: "solid", count: 1 }),
        shapes({ type: "shapes", kind: "triangle", fill: "solid", count: 2 }),
        null,
      ],
    },
    ...withCorrectAt(
      fig({ type: "shapes", kind: "triangle", fill: "solid", count: 3 }),
      [
        fig({ type: "shapes", kind: "triangle", fill: "solid", count: 2 }),
        fig({ type: "shapes", kind: "square", fill: "solid", count: 3 }),
        fig({ type: "shapes", kind: "triangle", fill: "outline", count: 3 }),
        fig({ type: "shapes", kind: "circle", fill: "solid", count: 3 }),
        fig({ type: "shapes", kind: "triangle", fill: "solid", count: 4 }),
      ],
      2,
    ),
  },
  {
    id: "patterns-2",
    scale: "patterns",
    difficulty: 2,
    expectedCorrectPct: 70,
    content: {
      kind: "matrix",
      prompt: PROMPTS.matrix,
      grid: [0, 45, 90, 45, 90, 135, 90, 135, null].map((rotation) =>
        rotation === null ? null : shapes({ type: "shapes", kind: "arrow", fill: "solid", rotation }),
      ),
    },
    ...withCorrectAt(
      fig({ type: "shapes", kind: "arrow", fill: "solid", rotation: 180 }),
      [135, 225, 90, 270, 0].map((rotation) => fig({ type: "shapes", kind: "arrow", fill: "solid", rotation })),
      4,
    ),
  },
  {
    id: "patterns-3",
    scale: "patterns",
    difficulty: 3,
    expectedCorrectPct: 48,
    content: {
      kind: "matrix",
      prompt: PROMPTS.matrix,
      grid: [
        shapes({ type: "shapes", kind: "circle", fill: "solid" }),
        shapes({ type: "shapes", kind: "square", fill: "outline" }),
        shapes({ type: "shapes", kind: "triangle", fill: "light" }),
        shapes({ type: "shapes", kind: "square", fill: "light" }),
        shapes({ type: "shapes", kind: "triangle", fill: "solid" }),
        shapes({ type: "shapes", kind: "circle", fill: "outline" }),
        shapes({ type: "shapes", kind: "triangle", fill: "outline" }),
        shapes({ type: "shapes", kind: "circle", fill: "light" }),
        null,
      ],
    },
    ...withCorrectAt(
      fig({ type: "shapes", kind: "square", fill: "solid" }),
      [
        fig({ type: "shapes", kind: "square", fill: "outline" }),
        fig({ type: "shapes", kind: "square", fill: "light" }),
        fig({ type: "shapes", kind: "circle", fill: "solid" }),
        fig({ type: "shapes", kind: "triangle", fill: "solid" }),
        fig({ type: "shapes", kind: "diamond", fill: "solid" }),
      ],
      3,
    ),
  },
  {
    id: "patterns-4",
    scale: "patterns",
    difficulty: 4,
    expectedCorrectPct: 32,
    content: {
      kind: "matrix",
      prompt: t(
        "Третья фигура в ряду получается из первых двух по одному правилу. Какая пропущена?",
        "The third figure in each row is made from the first two by one rule. Which is missing?",
      ),
      grid: [
        { type: "segments", segments: ["top"] },
        { type: "segments", segments: ["left"] },
        { type: "segments", segments: ["top", "left"] },
        { type: "segments", segments: ["top", "right"] },
        { type: "segments", segments: ["right", "bottom"] },
        { type: "segments", segments: ["top", "bottom"] },
        { type: "segments", segments: ["left", "diag"] },
        { type: "segments", segments: ["diag", "bottom"] },
        null,
      ],
    },
    ...withCorrectAt(
      fig({ type: "segments", segments: ["left", "bottom"] }),
      [
        fig({ type: "segments", segments: ["left", "diag", "bottom"] }),
        fig({ type: "segments", segments: ["diag"] }),
        fig({ type: "segments", segments: ["left"] }),
        fig({ type: "segments", segments: ["right", "bottom"] }),
        fig({ type: "segments", segments: ["top", "left"] }),
      ],
      1,
    ),
  },
  {
    id: "patterns-5",
    scale: "patterns",
    difficulty: 5,
    expectedCorrectPct: 20,
    content: {
      kind: "matrix",
      prompt: PROMPTS.matrix,
      grid: [
        [3, 1], [4, 1], [5, 1],
        [4, 2], [5, 2], [6, 2],
        [5, 3], [6, 3], null,
      ].map((cell) =>
        cell === null ? null : shapes({ type: "shapes", kind: "polygon", fill: "outline", sides: cell[0], dots: cell[1] }),
      ),
    },
    ...withCorrectAt(
      fig({ type: "shapes", kind: "polygon", fill: "outline", sides: 7, dots: 3 }),
      [
        [7, 2],
        [6, 3],
        [8, 3],
        [7, 4],
        [5, 3],
      ].map(([sides, dots]) => fig({ type: "shapes", kind: "polygon", fill: "outline", sides, dots })),
      5,
    ),
  },
];

/* --------------------------------- spatial --------------------------------- */

const spatial: Question[] = [
  spatialQuestion({
    id: "spatial-1",
    difficulty: 1,
    expectedCorrectPct: 85,
    base: [[0, 0], [0, 1], [0, 2], [1, 2]],
    correctRotation: 1,
    mirroredRotations: [0, 2],
    decoy: [[0, 0], [1, 0], [1, 1], [2, 1]],
    position: 1,
  }),
  spatialQuestion({
    id: "spatial-2",
    difficulty: 2,
    expectedCorrectPct: 66,
    base: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]],
    correctRotation: 1,
    mirroredRotations: [0, 1],
    decoy: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 1]],
    position: 3,
  }),
  spatialQuestion({
    id: "spatial-3",
    difficulty: 3,
    expectedCorrectPct: 47,
    base: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [2, 3]],
    correctRotation: 2,
    mirroredRotations: [1, 2, 3],
    decoy: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
    position: 0,
  }),
  spatialQuestion({
    id: "spatial-4",
    difficulty: 4,
    expectedCorrectPct: 33,
    base: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2], [3, 2], [2, 3]],
    correctRotation: 3,
    mirroredRotations: [0, 1, 3],
    decoy: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2], [3, 2], [3, 3]],
    position: 2,
  }),
  spatialQuestion({
    id: "spatial-5",
    difficulty: 5,
    expectedCorrectPct: 21,
    base: [[0, 0], [1, 0], [2, 0], [2, 1], [1, 2], [2, 2], [3, 2], [1, 3]],
    correctRotation: 1,
    mirroredRotations: [1, 2, 3],
    decoy: [[0, 0], [1, 0], [2, 0], [2, 1], [1, 2], [2, 2], [3, 2], [2, 3]],
    position: 3,
  }),
];

/* --------------------------------- memory ---------------------------------- */

const memory: Question[] = [
  {
    id: "memory-1",
    scale: "memory",
    difficulty: 1,
    expectedCorrectPct: 90,
    content: { kind: "memory", prompt: PROMPTS.digits, stimulus: ["5", "8", "2", "9"], showMs: 3000 },
    ...withCorrectAt(txt("5 8 2 9"), [txt("5 8 9 2"), txt("5 2 8 9"), txt("8 5 2 9")], 0),
  },
  {
    id: "memory-2",
    scale: "memory",
    difficulty: 2,
    expectedCorrectPct: 72,
    content: { kind: "memory", prompt: PROMPTS.digits, stimulus: ["3", "7", "1", "6", "4"], showMs: 3500 },
    ...withCorrectAt(txt("3 7 1 6 4"), [txt("3 7 1 4 6"), txt("3 1 7 6 4"), txt("3 7 6 1 4")], 2),
  },
  {
    id: "memory-3",
    scale: "memory",
    difficulty: 3,
    expectedCorrectPct: 56,
    content: {
      kind: "memory",
      prompt: t("Какого слова не было в списке?", "Which word was NOT on the list?"),
      stimulus: [t("дом", "house"), t("река", "river"), t("лампа", "lamp"), t("кот", "cat"), t("облако", "cloud")],
      showMs: 4500,
    },
    options: [
      txt(t("река", "river")),
      txt(t("лампа", "lamp")),
      txt(t("окно", "window")),
      txt(t("кот", "cat")),
      txt(t("облако", "cloud")),
    ],
    correctIndex: 2,
  },
  {
    id: "memory-4",
    scale: "memory",
    difficulty: 4,
    expectedCorrectPct: 38,
    content: {
      kind: "memory",
      prompt: PROMPTS.digits,
      stimulus: ["9", "2", "6", "4", "8", "1", "5"],
      showMs: 4500,
    },
    ...withCorrectAt(
      txt("9 2 6 4 8 1 5"),
      [txt("9 2 4 6 8 1 5"), txt("9 2 6 4 8 5 1"), txt("9 6 2 4 8 1 5")],
      1,
    ),
  },
  {
    id: "memory-5",
    scale: "memory",
    difficulty: 5,
    expectedCorrectPct: 24,
    content: {
      kind: "memory",
      prompt: t("Выберите эти цифры в обратном порядке", "Pick these digits in reverse order"),
      stimulus: ["4", "1", "9", "7", "3"],
      showMs: 4000,
    },
    ...withCorrectAt(txt("3 7 9 1 4"), [txt("3 7 1 9 4"), txt("3 1 9 7 4"), txt("4 1 9 7 3")], 3),
  },
];

/* ---------------------------------- bank ----------------------------------- */

const ALL: Question[] = [...logic, ...numbers, ...patterns, ...spatial, ...memory];

/**
 * Presentation order: difficulty tiers grow from 1 to 5, and scales rotate inside a tier
 * so the user never sees the same task type twice in a row.
 */
const SCALE_ROTATION = ["logic", "patterns", "numbers", "spatial", "memory"] as const;

export const QUESTIONS: Question[] = ([1, 2, 3, 4, 5] as const).flatMap((difficulty, tier) =>
  SCALE_ROTATION.map((_, i) => SCALE_ROTATION[(i + tier) % SCALE_ROTATION.length]).map((scale) => {
    const q = ALL.find((item) => item.scale === scale && item.difficulty === difficulty);
    if (!q) throw new Error(`Missing question for ${scale}/${difficulty}`);
    return q;
  }),
);

export const QUESTIONS_BY_ID = new Map(QUESTIONS.map((q, index) => [q.id, { question: q, number: index + 1 }]));
