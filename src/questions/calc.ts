import { pick, randInt, shuffled, type Rng } from '../core/rng';
import { NBSP } from '../core/text';

/** Questions de calcul générées (attaques Force), SPEC.md § 8.1. */

export type CalcKind =
  | 'add'
  | 'sub'
  | 'mul'
  | 'div'
  | 'double'
  | 'half'
  | 'complement'
  | 'times10'
  | 'money'
  | 'time'
  | 'twoStep';

export interface CalcQuestion {
  level: number;
  kind: CalcKind;
  prompt: string;
  /** Valeur de la bonne réponse (minutes depuis 0 h pour l'heure). */
  answer: number;
  /** 4 valeurs, la bonne réponse en premier (le mélange se fait à l'affichage). */
  values: number[];
  /** Libellés affichés, dans le même ordre que values. */
  labels: string[];
  explanation: string;
  /** Tables de multiplication travaillées (statistiques, couverture 1 à 10). */
  tables: number[];
}

export const MINUS = '−';
export const TIMES = '×';

export function fmtNumber(n: number): string {
  return n >= 1000 ? `${Math.floor(n / 1000)}${NBSP}${String(n % 1000).padStart(3, '0')}` : String(n);
}

export function fmtEuros(n: number): string {
  return `${n}${NBSP}€`;
}

/** Heure au format « 3 h », « 3 h 30 » (horloge de 1 h à 12 h). */
export function fmtTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}${NBSP}h` : `${h}${NBSP}h${NBSP}${String(m).padStart(2, '0')}`;
}

const MIN_TIME = 60;
const MAX_TIME = 12 * 60 + 59;

interface Spec {
  kind: CalcKind;
  prompt: string;
  answer: number;
  /** Distracteurs plausibles, dans n'importe quel ordre. */
  candidates: number[];
  explanation: string;
  format?: (n: number) => string;
  valid?: (n: number) => boolean;
  tables?: number[];
}

function build(rng: Rng, level: number, spec: Spec): CalcQuestion {
  const format = spec.format ?? fmtNumber;
  const valid = spec.valid ?? ((n: number) => n > 0);
  const ok = (n: number): boolean => Number.isInteger(n) && valid(n) && n !== spec.answer;
  const pool = shuffled(rng, Array.from(new Set(spec.candidates.filter(ok))));
  const chosen = pool.slice(0, 3);
  // Secours : valeurs proches, toujours valides et distinctes.
  for (let k = 1; chosen.length < 3; k++) {
    for (const v of [spec.answer + k, spec.answer - k]) {
      if (chosen.length < 3 && ok(v) && !chosen.includes(v)) chosen.push(v);
    }
  }
  const values = [spec.answer, ...chosen];
  return {
    level,
    kind: spec.kind,
    prompt: spec.prompt,
    answer: spec.answer,
    values,
    labels: values.map(format),
    explanation: spec.explanation,
    tables: spec.tables ?? [],
  };
}

/** Explication par étapes : 45 + 38 : 45 + 30 = 75, puis 75 + 8 = 83. */
function stepsExplanation(a: number, b: number, op: '+' | '-'): string {
  const sign = op === '+' ? '+' : MINUS;
  const r = op === '+' ? a + b : a - b;
  const parts = [Math.floor(b / 100) * 100, Math.floor((b % 100) / 10) * 10, b % 10].filter((p) => p > 0);
  if (parts.length <= 1 || b < 10) return `${fmtNumber(a)} ${sign} ${fmtNumber(b)} = ${fmtNumber(r)}`;
  let acc = a;
  const steps: string[] = [];
  for (const p of parts) {
    const next = op === '+' ? acc + p : acc - p;
    steps.push(`${fmtNumber(acc)} ${sign} ${fmtNumber(p)} = ${fmtNumber(next)}`);
    acc = next;
  }
  return `${fmtNumber(a)} ${sign} ${fmtNumber(b)} : ${steps.join(', puis ')}`;
}

function add(a: number, b: number): Spec {
  const r = a + b;
  return {
    kind: 'add',
    prompt: `${fmtNumber(a)} + ${fmtNumber(b)} = ?`,
    answer: r,
    candidates: [r + 1, r - 1, r + 10, r - 10, Math.abs(a - b), r + 2, r - 2],
    explanation: stepsExplanation(a, b, '+'),
  };
}

function sub(a: number, b: number): Spec {
  const r = a - b;
  return {
    kind: 'sub',
    prompt: `${fmtNumber(a)} ${MINUS} ${fmtNumber(b)} = ?`,
    answer: r,
    candidates: [r + 1, r - 1, r + 10, r - 10, a + b, r + 2, r - 2],
    explanation: stepsExplanation(a, b, '-'),
  };
}

function mul(rng: Rng, table: number, n: number): Spec {
  const r = table * n;
  const [x, y] = rng() < 0.5 ? [n, table] : [table, n];
  return {
    kind: 'mul',
    prompt: `${x} ${TIMES} ${y} = ?`,
    answer: r,
    candidates: [table * (n + 1), table * (n - 1), (table + 1) * n, (table - 1) * n, r + 1, r - 1, r + 10, r - 10, table + n],
    explanation: `${x} ${TIMES} ${y} = ${fmtNumber(r)}`,
    tables: [table],
  };
}

// ---------- Niveaux ----------

function level1(rng: Rng): Spec {
  const k = rng();
  if (k < 0.35) {
    const a = randInt(rng, 1, 15);
    return add(a, randInt(rng, 1, 20 - a));
  }
  if (k < 0.7) {
    const a = randInt(rng, 5, 20);
    return sub(a, randInt(rng, 1, a - 1));
  }
  return mul(rng, pick(rng, [1, 2, 5, 10]), randInt(rng, 1, 10));
}

function level2(rng: Rng): Spec {
  const k = rng();
  if (k < 0.25) {
    // Addition sans retenue jusqu'à 100.
    const ta = randInt(rng, 1, 8);
    const ua = randInt(rng, 0, 9);
    const tb = randInt(rng, 1, 9 - ta);
    const ub = randInt(rng, 0, 9 - ua);
    return add(ta * 10 + ua, tb * 10 + ub);
  }
  if (k < 0.5) {
    // Soustraction sans retenue.
    const ta = randInt(rng, 2, 9);
    const ua = randInt(rng, 0, 9);
    const tb = randInt(rng, 1, ta - 1);
    const ub = randInt(rng, 0, ua);
    return sub(ta * 10 + ua, tb * 10 + ub);
  }
  if (k < 0.75) return mul(rng, pick(rng, [3, 4]), randInt(rng, 1, 10));
  const n = randInt(rng, 5, 50);
  const r = n * 2;
  return {
    kind: 'double',
    prompt: `Quel est le double de ${n} ?`,
    answer: r,
    candidates: [r + 1, r - 1, r + 10, r - 10, r + 2, n + 10, n],
    explanation: `Le double de ${n}, c'est ${n} + ${n} = ${fmtNumber(r)}.`,
    tables: [2],
  };
}

function level3(rng: Rng): Spec {
  const k = rng();
  if (k < 0.25) {
    // Addition avec retenue jusqu'à 100.
    const ua = randInt(rng, 1, 9);
    const ub = randInt(rng, 10 - ua, 9);
    const ta = randInt(rng, 1, 7);
    const tb = randInt(rng, 0, 8 - ta);
    const a = ta * 10 + ua;
    const b = tb * 10 + ub;
    const s = add(a, b);
    s.candidates.unshift(a + b - 10);
    return s;
  }
  if (k < 0.5) {
    // Soustraction avec retenue.
    const ua = randInt(rng, 0, 8);
    const ub = randInt(rng, ua + 1, 9);
    const ta = randInt(rng, 2, 9);
    const tb = randInt(rng, 1, ta - 1);
    const a = ta * 10 + ua;
    const b = tb * 10 + ub;
    const s = sub(a, b);
    s.candidates.unshift(a - b + 10);
    return s;
  }
  if (k < 0.75) return mul(rng, 6, randInt(rng, 1, 10));
  const n = randInt(rng, 2, 50) * 2;
  const r = n / 2;
  return {
    kind: 'half',
    prompt: `Quelle est la moitié de ${n} ?`,
    answer: r,
    candidates: [r + 1, r - 1, r + 10, r - 10, r + 2, r - 2, n - 2],
    explanation: `La moitié de ${n}, c'est ${r}, car ${r} + ${r} = ${n}.`,
    tables: [2],
  };
}

function level4(rng: Rng): Spec {
  const k = rng();
  if (k < 0.2) {
    const a = randInt(rng, 11, 89) * 10;
    const b = randInt(rng, 1, Math.floor((1000 - a) / 100)) * 100;
    const r = a + b;
    const h = Math.floor(a / 100) * 100;
    const rest = a - h;
    return {
      kind: 'add',
      prompt: `${fmtNumber(a)} + ${fmtNumber(b)} = ?`,
      answer: r,
      candidates: [r + 100, r - 100, r + 10, r - 10, a + b / 10, r + 1],
      explanation:
        rest > 0 && h > 0
          ? `${a} + ${b} : ${h} + ${b} = ${fmtNumber(h + b)}, puis ${fmtNumber(h + b)} + ${rest} = ${fmtNumber(r)}`
          : `${fmtNumber(a)} + ${fmtNumber(b)} = ${fmtNumber(r)}`,
    };
  }
  if (k < 0.4) {
    const a = randInt(rng, 2, 10) * 100;
    const b = randInt(rng, 1, a / 10 - 1) * 10;
    const s = sub(a, b);
    s.candidates.push(a - b + 100, a - b - 100);
    return s;
  }
  if (k < 0.75) return mul(rng, pick(rng, [7, 8, 9]), randInt(rng, 1, 10));
  const n = randInt(rng, 11, 99);
  const r = 100 - n;
  // Erreur classique : compléter chaque chiffre à 10 (64 → 46).
  const digitError = (10 - (n % 10)) % 10 + 10 * (10 - Math.floor(n / 10));
  return {
    kind: 'complement',
    prompt: `Combien faut-il ajouter à ${n} pour faire 100 ?`,
    answer: r,
    candidates: [digitError, r + 10, r - 10, r + 1, r - 1, r + 2],
    explanation: `${n} + ${r} = 100`,
  };
}

const MONEY_ITEMS = [
  ['une pomme', 'pommes'],
  ['un pain', 'pains'],
  ['une lanterne', 'lanternes'],
  ['un pot de miel', 'pots de miel'],
] as const;

function money(rng: Rng): Spec {
  const t = rng();
  if (t < 0.4) {
    const [one, many] = pick(rng, MONEY_ITEMS);
    const p = randInt(rng, 2, 9);
    const n = randInt(rng, 2, 5);
    const r = p * n;
    return {
      kind: 'money',
      prompt: `Au marché de Ferme-des-Blocs, ${one} coûte ${fmtEuros(p)}. Combien coûtent ${n} ${many} ?`,
      answer: r,
      candidates: [r + p, r - p, r + 1, r - 1, p + n, r + 10],
      explanation: `${n} ${TIMES} ${p} = ${r}, donc ${n} ${many} coûtent ${fmtEuros(r)}.`,
      format: fmtEuros,
      tables: [p],
    };
  }
  if (t < 0.7) {
    const m = pick(rng, [10, 20, 50]);
    const p = randInt(rng, 2, m - 1);
    const r = m - p;
    return {
      kind: 'money',
      prompt: `Tu as ${fmtEuros(m)}. Tu achètes une cape à ${fmtEuros(p)}. Combien d'euros te reste-t-il ?`,
      answer: r,
      candidates: [r + 1, r - 1, r + 10, r - 10, m + p, r + 2],
      explanation: `${m} ${MINUS} ${p} = ${r}, il te reste ${fmtEuros(r)}.`,
      format: fmtEuros,
    };
  }
  const a = randInt(rng, 5, 40);
  const b = randInt(rng, 5, 40);
  const r = a + b;
  return {
    kind: 'money',
    prompt: `Un bâton coûte ${fmtEuros(a)} et un chapeau coûte ${fmtEuros(b)}. Combien faut-il payer en tout ?`,
    answer: r,
    candidates: [r + 1, r - 1, r + 10, r - 10, Math.abs(a - b), r + 2],
    explanation: `${stepsExplanation(a, b, '+')}, il faut payer ${fmtEuros(r)}.`,
    format: fmtEuros,
  };
}

function time(rng: Rng): Spec {
  const start = randInt(rng, 1, 11) * 60 + pick(rng, [0, 30]);
  const d = pick(rng, [15, 30]);
  const r = start + d;
  const s = fmtTime(start);
  const prompts = [
    `Il est ${s}. Le golem fait une sieste de ${d} minutes. À quelle heure se réveille-t-il ?`,
    `Le cours de Lumibloc commence à ${s}. Il dure ${d} minutes. À quelle heure finit-il ?`,
    `Il est ${s}. Quelle heure sera-t-il dans ${d} minutes ?`,
  ];
  return {
    kind: 'time',
    prompt: pick(rng, prompts),
    answer: r,
    candidates: [r + 15, r - 15, r + 30, r - 30, r + 60, r - 60, start - d],
    explanation: `${s} + ${d} minutes = ${fmtTime(r)}`,
    format: fmtTime,
    valid: (n) => n >= MIN_TIME && n <= MAX_TIME,
  };
}

function level5(rng: Rng): Spec {
  const k = rng();
  if (k < 0.25) {
    // Addition jusqu'à 1000 avec au moins une retenue.
    let a = 0;
    let b = 0;
    do {
      a = randInt(rng, 100, 799);
      b = randInt(rng, 100, 1000 - a);
    } while ((a % 10) + (b % 10) < 10 && (a % 100) + (b % 100) < 100);
    const s = add(a, b);
    s.candidates.push(a + b - 10, a + b + 100, a + b - 100);
    return s;
  }
  if (k < 0.6) return mul(rng, randInt(rng, 1, 10), randInt(rng, 1, 10));
  if (k < 0.8) return money(rng);
  return time(rng);
}

function twoStep(rng: Rng): Spec {
  const t = rng();
  if (t < 0.4) {
    const a = randInt(rng, 2, 5);
    const b = randInt(rng, 3, 10);
    const total = a * b;
    const c = randInt(rng, 1, Math.min(9, total - 1));
    const r = total - c;
    return {
      kind: 'twoStep',
      prompt: `Le golem ramasse ${a} sacs de ${b} pommes. Il en mange ${c}. Combien de pommes lui reste-t-il ?`,
      answer: r,
      candidates: [total, total + c, r + 1, r - 1, r + 10, a + b - c],
      explanation: `${a} ${TIMES} ${b} = ${total}, puis ${total} ${MINUS} ${c} = ${r}.`,
      tables: [b],
    };
  }
  if (t < 0.7) {
    const a = randInt(rng, 20, 60);
    const b = randInt(rng, 5, a - 5);
    const c = randInt(rng, 5, 20);
    const x = a - b;
    const r = x + c;
    return {
      kind: 'twoStep',
      prompt: `Mère Brique a ${a} œufs. Elle en vend ${b}, puis ses poules en pondent ${c}. Combien d'œufs a-t-elle maintenant ?`,
      answer: r,
      candidates: [x, a + b + c, x - c, r + 1, r - 1, r + 10],
      explanation: `${a} ${MINUS} ${b} = ${x}, puis ${x} + ${c} = ${r}.`,
    };
  }
  const a = randInt(rng, 10, 40);
  const b = randInt(rng, 5, 20);
  const c = randInt(rng, 3, Math.min(25, a + b - 1));
  const x = a + b;
  const r = x - c;
  return {
    kind: 'twoStep',
    prompt: `Pâquerette a ${a} billes. Elle en gagne ${b}, puis elle en donne ${c} à Gaston. Combien de billes a-t-elle maintenant ?`,
    answer: r,
    candidates: [x, x + c, a - b + c, r + 1, r - 1, r + 10],
    explanation: `${a} + ${b} = ${x}, puis ${x} ${MINUS} ${c} = ${r}.`,
  };
}

function level6(rng: Rng): Spec {
  const k = rng();
  if (k < 0.35) return twoStep(rng);
  if (k < 0.65) {
    const by100 = rng() < 0.35;
    const n = by100 ? randInt(rng, 2, 9) : randInt(rng, 2, 99);
    const f = by100 ? 100 : 10;
    const r = n * f;
    return {
      kind: 'times10',
      prompt: `${n} ${TIMES} ${f} = ?`,
      answer: r,
      candidates: [r * 10, n * (by100 ? 10 : 100), r + f, r - f, n + f, r + 1],
      explanation: `Multiplier par ${f}, c'est ajouter ${by100 ? 'deux zéros' : 'un zéro'} : ${n} ${TIMES} ${f} = ${fmtNumber(r)}.`,
      valid: (v) => v > 0 && v <= 10000,
    };
  }
  const friends = randInt(rng, 2, 10);
  const each = randInt(rng, 2, 10);
  const total = friends * each;
  const things = pick(rng, ['billes', 'pommes', 'graines', 'cailloux brillants']);
  return {
    kind: 'div',
    prompt: `Pâquerette partage ${total} ${things} entre ${friends} amis. Chacun en reçoit autant. Combien de ${things} reçoit chaque ami ?`,
    answer: each,
    candidates: [each + 1, each - 1, friends, each + 2, each - 2, total - friends],
    explanation: `${friends} ${TIMES} ${each} = ${total}, donc chaque ami reçoit ${each} ${things}.`,
    tables: [friends],
  };
}

const LEVELS: Record<number, (rng: Rng) => Spec> = {
  1: level1,
  2: level2,
  3: level3,
  4: level4,
  5: level5,
  6: level6,
};

// ---------- Niveau 7 « défi » (révision 1.7, Épreuve des Étoiles seulement) ----------

/** Nombre à 2 chiffres × 1 chiffre (jusqu'à 49 × 9), expliqué en dizaines et unités. */
function bigTimes(rng: Rng): Spec {
  let a = 0;
  do a = randInt(rng, 12, 49);
  while (a % 10 === 0);
  const b = randInt(rng, 3, 9);
  const r = a * b;
  const tens = Math.floor(a / 10) * 10;
  const units = a % 10;
  return {
    kind: 'mul',
    prompt: `${a} ${TIMES} ${b} = ?`,
    answer: r,
    candidates: [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, r + 10, r - 10, tens * b + units, r + 1, r - 1],
    explanation: `${a} ${TIMES} ${b} : ${tens} ${TIMES} ${b} = ${tens * b}, puis ${units} ${TIMES} ${b} = ${units * b}, et ${tens * b} + ${units * b} = ${fmtNumber(r)}.`,
    tables: [b],
  };
}

/** Partage exact jusqu'à 100 par 2 à 9 (« 72 étoiles en 8 groupes »). */
function bigShare(rng: Rng): Spec {
  const groups = randInt(rng, 2, 9);
  const each = randInt(rng, Math.max(3, Math.ceil(20 / groups)), Math.floor(100 / groups));
  const total = groups * each;
  const things = pick(rng, ['étoiles', 'flocons', 'plumes', 'cristaux']);
  return {
    kind: 'div',
    prompt: `Lumibloc range ${total} ${things} en ${groups} groupes égaux. Combien de ${things} y a-t-il dans chaque groupe ?`,
    answer: each,
    candidates: [each + 1, each - 1, each + 2, each - 2, each + 10, groups, total - groups],
    explanation: `${groups} ${TIMES} ${each} = ${total}, donc chaque groupe a ${each} ${things}.`,
    tables: [groups],
  };
}

/** Problème à 2 étapes avec des centaines, résultat jusqu'à 1000. */
function bigTwoStep(rng: Rng): Spec {
  if (rng() < 0.5) {
    const a = randInt(rng, 3, 9) * 50;
    const b = randInt(rng, 1, a / 50 - 1) * 50 + randInt(rng, 0, 1) * 20;
    const x = a - b;
    const c = randInt(rng, 1, Math.floor((1000 - x) / 10)) * 10;
    const r = x + c;
    return {
      kind: 'twoStep',
      prompt: `Le Capitaine Azur a ${a} plumes. Il en donne ${b} aux harpies, puis il en trouve ${c}. Combien de plumes a-t-il maintenant ?`,
      answer: r,
      candidates: [x, a + b + c, x - c, r + 10, r - 10, r + 100, r - 100],
      explanation: `${a} ${MINUS} ${b} = ${x}, puis ${x} + ${c} = ${fmtNumber(r)}.`,
    };
  }
  const n = randInt(rng, 2, 4);
  const per = randInt(rng, 11, 24) * 10;
  const total = n * per;
  const c = randInt(rng, 1, Math.min(20, Math.floor((1000 - total) / 5))) * 5;
  const r = total + c;
  return {
    kind: 'twoStep',
    prompt: `Un golem porte ${n} caisses de ${per} cristaux, puis il en ramasse encore ${c}. Combien de cristaux porte-t-il en tout ?`,
    answer: r,
    candidates: [total, total - c, per + c, r + 10, r - 10, r + 100, r - 100],
    explanation: `${n} ${TIMES} ${per} = ${total}, puis ${total} + ${c} = ${fmtNumber(r)}.`,
    tables: [n],
  };
}

function level7(rng: Rng): Spec {
  const k = rng();
  if (k < 0.4) return bigTimes(rng);
  if (k < 0.7) return bigShare(rng);
  return bigTwoStep(rng);
}

/** Niveau 7 « défi » : jamais atteint par l'adaptation, réservé à l'Épreuve des Étoiles (SPEC § 8.3). */
export const CHALLENGE_LEVEL = 7;

export function generateChallengeCalc(rng: Rng): CalcQuestion {
  return build(rng, CHALLENGE_LEVEL, level7(rng));
}

export function generateCalc(level: number, rng: Rng): CalcQuestion {
  const lv = Math.max(1, Math.min(6, Math.round(level)));
  return build(rng, lv, LEVELS[lv](rng));
}
