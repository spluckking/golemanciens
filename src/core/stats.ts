import type { CalcKind, CalcQuestion } from '../questions/calc';
import type { PlayStats, Tally } from './gameState';

/**
 * Statistiques du menu parent (SPEC.md § 14) : réussite en calcul par niveau et par type
 * d'opération, tables de multiplication les plus ratées, énigmes par niveau.
 */

function add(map: Record<string, Tally>, key: string | number, correct: boolean): void {
  const t = (map[String(key)] ??= { asked: 0, correct: 0 });
  t.asked++;
  if (correct) t.correct++;
}

export function recordCalc(stats: PlayStats, q: CalcQuestion, correct: boolean): void {
  add(stats.calcLevels, q.level, correct);
  add(stats.calcKinds, q.kind, correct);
  for (const t of q.tables) add(stats.tables, t, correct);
}

export function recordRiddle(stats: PlayStats, level: number, correct: boolean): void {
  add(stats.riddleLevels, level, correct);
}

/** Taux de réussite en pourcentage arrondi, ou null si aucune question. */
export function rate(t: Tally | undefined): number | null {
  return t && t.asked > 0 ? Math.round((t.correct / t.asked) * 100) : null;
}

/** Les tables les plus ratées (au moins une erreur), de la plus ratée à la moins ratée. */
export function mostMissedTables(stats: PlayStats, count = 3): { table: number; missed: number; asked: number }[] {
  return Object.entries(stats.tables)
    .map(([table, t]) => ({ table: Number(table), missed: t.asked - t.correct, asked: t.asked }))
    .filter((x) => x.missed > 0)
    .sort((a, b) => b.missed - a.missed || b.missed / b.asked - a.missed / a.asked || a.table - b.table)
    .slice(0, count);
}

/** Noms des types d'opération pour le parent. */
export const CALC_KIND_NAMES: Record<CalcKind, string> = {
  add: 'Additions',
  sub: 'Soustractions',
  mul: 'Tables de multiplication',
  div: 'Partages',
  double: 'Doubles',
  half: 'Moitiés',
  complement: 'Compléments à 100',
  times10: '× 10 et × 100',
  money: 'Monnaie',
  time: 'Heures',
  twoStep: 'Problèmes à 2 étapes',
};

/** « 1 h 05 min », « 12 min ». */
export function formatPlayTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}
