import { shuffled, type Rng } from '../../core/rng';
import {
  BOSSES,
  GOLEMS,
  MONSTERS,
  TYPE_ICON,
  TYPE_NAME,
  unlockedAttacks,
  type AttackInfo,
  type AttackType,
  type GolemSpecies,
} from '../../data/creatures';

/**
 * Leçon des faiblesses (SPEC.md § 7.1, révision 1.4), après la première défaite : Lumibloc
 * explique en quelques bulles, puis un QCM de 3 questions construites à partir des monstres
 * de la phase et des golems du joueur. Les textes sont nouveaux (à valider par le parent).
 */

export const LESSON_LINES: readonly string[] = [
  'Chaque attaque a une icône : 🪨, 🌿, ☀️… C’est son type.',
  'Au-dessus du monstre, l’icône montre sa faiblesse. Choisis une attaque avec la même icône : elle fait plus de dégâts !',
  'Pour t’aider, le bouton 📒 te rappelle les faiblesses pendant les combats. Petit quiz pour vérifier !',
];

/** Une question du quiz : 3 choix, une seule bonne réponse, une explication courte. */
export interface LessonQuestion {
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
}

/** « le Slime », « l’Araignée » ; « du Slime », « de l’Araignée » (élision devant une voyelle). */
const vowel = (name: string): boolean => /^[AEIOUYÉÈÊaeiouyéèê]/.test(name);
const le = (name: string): string => (vowel(name) ? `l’${name}` : `le ${name}`);
const du = (name: string): string => (vowel(name) ? `de l’${name}` : `du ${name}`);
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const typeLabel = (t: AttackType): string => `${TYPE_ICON[t]} ${TYPE_NAME[t]}`;
const attackLabel = (a: AttackInfo): string => `${TYPE_ICON[a.type]} ${a.name}`;

/** Ennemis de la phase qu'on peut citer : monstres et boss, avec leur faiblesse. */
function enemies(phase: number): { name: string; weakness: AttackType }[] {
  const monsters = Object.values(MONSTERS).filter((m) => m.phase === phase);
  const bosses = Object.values(BOSSES).filter((b) => b.phase === phase).map((b) => ({ name: b.name, weakness: b.stages[0].weakness }));
  return [...monsters.map((m) => ({ name: m.name, weakness: m.weakness })), ...bosses];
}

/** Attaques que l'on peut proposer : celles des golems du joueur, puis celles des autres golems de la phase. */
function attackPool(owned: readonly GolemSpecies[], phase: number): AttackInfo[] {
  const species = [...owned, ...(Object.keys(GOLEMS) as GolemSpecies[]).filter((s) => GOLEMS[s].phase <= phase && !owned.includes(s))];
  return species.flatMap((s) => unlockedAttacks(s, 1));
}

function mix(rng: Rng, prompt: string, right: string, wrong: string[], explanation: string): LessonQuestion {
  const choices = shuffled(rng, [right, ...wrong.slice(0, 2)]);
  return { prompt, choices, answer: choices.indexOf(right), explanation };
}

/** Le quiz : quelle attaque choisir, quelle icône est la faiblesse, et ce que fait la faiblesse. */
export function lessonQuiz(owned: readonly GolemSpecies[], phase: number, rng: Rng): LessonQuestion[] {
  const foes = shuffled(rng, enemies(phase));
  const pool = attackPool(owned, phase);
  const types = [...new Set(pool.map((a) => a.type))];

  // 1. Choisir l'attaque qui vise la faiblesse (parmi des attaques de types différents).
  const foe1 = foes.find((f) => pool.some((a) => a.type === f.weakness)) ?? foes[0];
  const good = pool.find((a) => a.type === foe1.weakness)!;
  const others = shuffled(
    rng,
    pool.filter((a) => a.type !== foe1.weakness),
  ).filter((a, i, list) => list.findIndex((b) => b.type === a.type) === i);
  const q1 = mix(
    rng,
    `${cap(le(foe1.name))} est faible contre ${typeLabel(foe1.weakness)}. Quelle attaque choisis-tu ?`,
    attackLabel(good),
    others.map(attackLabel),
    `${good.name} a l’icône ${TYPE_ICON[good.type]}, comme la faiblesse ${du(foe1.name)}.`,
  );

  // 2. Lire l'icône de faiblesse d'un monstre.
  const foe2 = foes.find((f) => f !== foe1) ?? foe1;
  const q2 = mix(
    rng,
    `Quelle est la faiblesse ${du(foe2.name)} ?`,
    typeLabel(foe2.weakness),
    shuffled(
      rng,
      types.filter((t) => t !== foe2.weakness),
    ).map(typeLabel),
    `L’icône au-dessus ${du(foe2.name)} est ${TYPE_ICON[foe2.weakness]} : c’est sa faiblesse.`,
  );

  // 3. Ce que fait une attaque qui vise la faiblesse.
  const q3 = mix(
    rng,
    'Une attaque avec la même icône que la faiblesse du monstre…',
    'fait plus de dégâts',
    ['fait moins de dégâts', 'ne fait aucun dégât'],
    'Viser la faiblesse fait plus de dégâts : « Super efficace ! »',
  );
  return [q1, q2, q3];
}

/**
 * Déroulé du quiz : il faut tout réussir. Une question ratée revient à la fin (après la
 * bonne réponse et l'explication), jusqu'à ce que toutes soient justes.
 */
export class LessonQuiz {
  private readonly queue: LessonQuestion[];
  mistakes = 0;

  constructor(questions: readonly LessonQuestion[]) {
    this.queue = questions.slice();
  }

  get current(): LessonQuestion | null {
    return this.queue[0] ?? null;
  }

  get done(): boolean {
    return this.queue.length === 0;
  }

  /** Réponse à la question courante (index dans ses choix). */
  answer(choice: number): boolean {
    const q = this.queue.shift();
    if (!q) throw new Error('Quiz terminé');
    if (choice === q.answer) return true;
    this.mistakes++;
    this.queue.push(q);
    return false;
  }
}
