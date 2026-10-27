import { shuffled, type Rng } from '../core/rng';
import type { Riddle, ReadingQuestion } from '../data/types';
import type { CalcQuestion } from './calc';

/** Question prête à afficher : choix mélangés, quelle que soit sa source. */
export interface QuestionView {
  badge: 'calc' | 'riddle' | 'reading';
  prompt: string;
  choices: string[];
  correctIndex: number;
  /** Index d'origine de chaque choix affiché (pour retrouver la réponse dans les données). */
  sourceIndex: number[];
  explanation?: string;
}

function mix(rng: Rng, badge: QuestionView['badge'], prompt: string, labels: string[], answer: number, explanation?: string): QuestionView {
  const order = shuffled(rng, labels.map((_, i) => i));
  return {
    badge,
    prompt,
    choices: order.map((i) => labels[i]),
    correctIndex: order.indexOf(answer),
    sourceIndex: order,
    explanation,
  };
}

export function presentCalc(q: CalcQuestion, rng: Rng): QuestionView {
  return mix(rng, 'calc', q.prompt, q.labels, 0, q.explanation);
}

export function presentRiddle(r: Riddle, rng: Rng): QuestionView {
  return mix(rng, 'riddle', r.text, r.choices, r.answer, r.explanation);
}

export function presentReading(q: ReadingQuestion, rng: Rng): QuestionView {
  return mix(rng, 'reading', q.text, q.choices, q.answer);
}
