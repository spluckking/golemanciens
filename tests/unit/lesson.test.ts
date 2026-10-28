import { describe, expect, it } from 'vitest';
import { LessonQuiz, lessonQuiz } from '../../src/combat/turn/lesson';
import { createRng } from '../../src/core/rng';

describe('quiz des faiblesses', () => {
  it('3 questions, 3 choix distincts, une seule bonne réponse, une explication — sur 500 tirages', () => {
    const rng = createRng(5);
    for (let i = 0; i < 500; i++) {
      for (const owned of [['pierre'], ['mousse']] as const) {
        const quiz = lessonQuiz(owned, 1, rng);
        expect(quiz).toHaveLength(3);
        for (const q of quiz) {
          expect(q.choices).toHaveLength(3);
          expect(new Set(q.choices).size).toBe(3);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(3);
          expect(q.explanation.length).toBeGreaterThan(10);
        }
      }
    }
  });

  it('la bonne attaque a l’icône de la faiblesse citée', () => {
    const rng = createRng(6);
    for (let i = 0; i < 200; i++) {
      const [q1] = lessonQuiz(['pierre'], 1, rng);
      const icon = q1.prompt.match(/contre (\S+)/)![1];
      expect(q1.choices[q1.answer].startsWith(icon)).toBe(true);
      expect(q1.choices.filter((c) => c.startsWith(icon))).toHaveLength(1);
    }
  });

  it('il faut tout réussir : une question ratée revient à la fin', () => {
    const quiz = new LessonQuiz(lessonQuiz(['mousse'], 1, createRng(7)));
    const first = quiz.current!;
    expect(quiz.answer((first.answer + 1) % 3)).toBe(false);
    expect(quiz.mistakes).toBe(1);
    expect(quiz.current).not.toBe(first);
    while (!quiz.done) quiz.answer(quiz.current!.answer);
    expect(quiz.done).toBe(true);
  });
});
