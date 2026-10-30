import { pick, randInt, shuffled, type Rng } from '../core/rng';
import type { Riddle } from '../data/types';
import { MINUS, TIMES, type CalcQuestion } from './calc';

/**
 * Énigmes et problèmes générés pour les combats : des familles de questions à paramètres, habillées
 * par phase (personnages, objets et symboles du biome). Il y en a des milliers par niveau, et la
 * mémoire `asked` évite de retomber sur les mêmes. Textes à valider par le parent (A_VALIDER.md).
 */

/** Nombre de questions gardées en mémoire (sauvegarde). */
const ASKED_MEMORY = 400;
const MAX_TRIES = 40;

interface Thing {
  one: string;
  many: string;
}

interface Theme {
  names: readonly string[];
  /** Objets que l'on compte. */
  things: readonly Thing[];
  /** Symboles des suites à compléter. */
  symbols: readonly string[];
  /** Devinettes de la phase : le texte, la réponse, deux mauvais choix, l'explication. */
  guesses: readonly (readonly [string, string, string, string, string])[];
}

const t = (one: string, many: string): Thing => ({ one, many });

const THEMES: readonly Theme[] = [
  {
    names: ['Mère Brique', 'Pâquerette', 'Gaston', 'Rivet'],
    things: [t('pomme', 'pommes'), t('poule', 'poules'), t('botte de foin', 'bottes de foin'), t('pain', 'pains'), t('panier', 'paniers')],
    symbols: ['🍎', '🐔', '🌻', '🌾', '🐄', '🥕'],
    guesses: [
      ['Je tourne avec le vent et je fais de la farine. Qui suis-je ?', 'Un moulin', 'Un puits', 'Un four', 'Le vent fait tourner les ailes du moulin, qui écrase le grain.'],
      ['Je ponds des œufs et je dis « cot cot ». Qui suis-je ?', 'Une poule', 'Une vache', 'Un cochon', 'C’est la poule qui pond et qui fait « cot cot ».'],
      ['Je suis une petite graine et je deviens une grande fleur jaune. Qui suis-je ?', 'Un tournesol', 'Un caillou', 'Un champignon', 'Le tournesol pousse à partir d’une graine.'],
      ['Je suis fait avec de la farine et je sors du four. Qui suis-je ?', 'Le pain', 'Le beurre', 'Le lait', 'Le pain est cuit au four, avec de la farine.'],
      ['J’ai une crête rouge et je chante le matin. Qui suis-je ?', 'Le coq', 'Le mouton', 'Le lapin', 'Le coq chante au lever du soleil.'],
    ],
  },
  {
    names: ['Sage Noisette', 'Pip', 'Tilleul'],
    things: [t('gland', 'glands'), t('champignon', 'champignons'), t('lanterne', 'lanternes'), t('noisette', 'noisettes'), t('feuille', 'feuilles')],
    symbols: ['🍄', '🌰', '🍂', '🌲', '🦉', '🐿️'],
    guesses: [
      ['Je dors le jour et je hulule la nuit. Qui suis-je ?', 'Le hibou', 'L’écureuil', 'Le renard', 'Le hibou chasse la nuit et dort le jour.'],
      ['Je suis tombé d’un chêne et je peux devenir un arbre. Qui suis-je ?', 'Un gland', 'Une pomme', 'Une pierre', 'Le gland est la graine du chêne.'],
      ['J’ai une longue queue touffue et je cache des noisettes. Qui suis-je ?', 'L’écureuil', 'Le hérisson', 'Le loup', 'L’écureuil garde des noisettes pour l’hiver.'],
      ['Je tisse une toile pour attraper les mouches. Qui suis-je ?', 'L’araignée', 'L’abeille', 'Le papillon', 'L’araignée fabrique sa toile avec un fil de soie.'],
      ['Je tombe des arbres en automne. Qui suis-je ?', 'La feuille', 'La neige', 'La branche', 'Beaucoup d’arbres perdent leurs feuilles en automne.'],
    ],
  },
  {
    names: ['Dame Oasia', 'Zéphir', 'Caramel'],
    things: [t('datte', 'dattes'), t('cactus', 'cactus'), t('tonneau', 'tonneaux'), t('seau', 'seaux'), t('tambour', 'tambours')],
    symbols: ['🌵', '🐫', '☀️', '🌴', '🦂', '💧'],
    guesses: [
      ['J’ai une ou deux bosses et je marche dans le désert. Qui suis-je ?', 'Le chameau', 'Le cheval', 'L’âne', 'Le chameau garde ses réserves dans ses bosses.'],
      ['Je pique, je vis dans le désert et je garde l’eau en moi. Qui suis-je ?', 'Le cactus', 'Le palmier', 'Le sapin', 'Le cactus stocke de l’eau dans sa tige.'],
      ['Je suis un coin d’eau et de palmiers au milieu du désert. Qui suis-je ?', 'Une oasis', 'Une dune', 'Un volcan', 'Une oasis, c’est un endroit vert avec de l’eau dans le désert.'],
      ['Le vent me déplace et je suis faite de sable. Qui suis-je ?', 'Une dune', 'Une rivière', 'Une forêt', 'Les dunes sont des collines de sable poussées par le vent.'],
      ['J’ai une queue qui pique et je vis sous les pierres du désert. Qui suis-je ?', 'Le scorpion', 'Le lézard', 'Le serpent', 'Le scorpion a un dard au bout de sa queue.'],
    ],
  },
  {
    names: ['Grand-mère Flocon', 'Nilou', 'Frimas'],
    things: [t('bûche', 'bûches'), t('poisson', 'poissons'), t('flocon', 'flocons'), t('cloche', 'cloches'), t('bonnet', 'bonnets')],
    symbols: ['❄️', '⛄', '🐟', '🧊', '🔔', '🧣'],
    guesses: [
      ['Je suis une maison ronde faite de glace. Qui suis-je ?', 'Un igloo', 'Un chalet', 'Une tente', 'L’igloo est construit avec des blocs de neige et de glace.'],
      ['Quand il fait chaud, je fonds et je deviens de l’eau. Qui suis-je ?', 'La glace', 'La pierre', 'Le bois', 'La glace, c’est de l’eau gelée : elle fond à la chaleur.'],
      ['J’ai une carotte pour nez et je fonds au soleil. Qui suis-je ?', 'Le bonhomme de neige', 'L’épouvantail', 'Le pingouin', 'Le bonhomme de neige est fait de neige, avec une carotte pour nez.'],
      ['Je suis blanc, je tombe du ciel en hiver. Qui suis-je ?', 'Le flocon', 'Le nuage', 'L’oiseau', 'Les flocons de neige tombent quand il fait très froid.'],
      ['Je garde ton cou au chaud en hiver. Qui suis-je ?', 'L’écharpe', 'La ceinture', 'La chaussette', 'L’écharpe s’enroule autour du cou.'],
    ],
  },
  {
    names: ['Capitaine Azur', 'Mistral', 'Le gardien'],
    things: [t('plume', 'plumes'), t('nuage', 'nuages'), t('cristal', 'cristaux'), t('voile', 'voiles'), t('lettre', 'lettres')],
    symbols: ['☁️', '🪶', '⭐', '🌈', '🌙', '💎'],
    guesses: [
      ['J’apparais dans le ciel quand il y a de la pluie et du soleil. Qui suis-je ?', 'L’arc-en-ciel', 'La lune', 'L’éclair', 'L’arc-en-ciel vient du soleil qui traverse les gouttes de pluie.'],
      ['Je guide les bateaux avec ma lumière. Qui suis-je ?', 'Le phare', 'Le moulin', 'Le pont', 'Le phare éclaire la route des bateaux la nuit.'],
      ['Je brille la nuit et je change de forme chaque soir. Qui suis-je ?', 'La lune', 'Le soleil', 'Le nuage', 'La lune semble changer de forme au fil des jours.'],
      ['On ne me voit pas, mais je fais bouger les nuages. Qui suis-je ?', 'Le vent', 'La pluie', 'La neige', 'Le vent pousse les nuages dans le ciel.'],
      ['J’ai des plumes, un bec et je vole. Qui suis-je ?', 'L’oiseau', 'Le poisson', 'Le lapin', 'Seuls les oiseaux ont des plumes et un bec.'],
    ],
  },
  {
    names: ['Braise', 'Cendre', 'Tison'],
    things: [t('braise', 'braises'), t('pierre noire', 'pierres noires'), t('étincelle', 'étincelles'), t('bouclier', 'boucliers'), t('torche', 'torches')],
    symbols: ['🌋', '🔥', '🪨', '⚡', '🐉', '🛡️'],
    guesses: [
      ['Je suis une montagne qui crache du feu. Qui suis-je ?', 'Un volcan', 'Une colline', 'Une falaise', 'Le volcan laisse sortir la lave.'],
      ['Je coule du volcan, très chaude et rouge. Qui suis-je ?', 'La lave', 'La boue', 'La rivière', 'La lave est de la roche fondue.'],
      ['Je suis grand, j’ai des ailes et je crache du feu dans les contes. Qui suis-je ?', 'Le dragon', 'Le griffon', 'Le cheval', 'Le dragon crache du feu dans les légendes.'],
      ['Sans moi, le feu s’éteint : on me respire aussi. Qui suis-je ?', 'L’air', 'L’eau', 'Le sable', 'Le feu a besoin d’air pour brûler.'],
      ['Je sors du feu en volant, toute petite et brillante. Qui suis-je ?', 'L’étincelle', 'La goutte', 'La plume', 'Une étincelle est un petit morceau brûlant qui s’envole.'],
    ],
  },
];

/** Groupes pour l'intrus : les plus simples d'abord. */
const GROUPS: readonly { label: string; words: readonly string[]; hard?: boolean }[] = [
  { label: 'des animaux', words: ['Chat', 'Chien', 'Lapin', 'Cheval', 'Mouton', 'Renard', 'Cochon', 'Tortue'] },
  { label: 'des fruits', words: ['Pomme', 'Poire', 'Banane', 'Fraise', 'Orange', 'Cerise', 'Prune', 'Raisin'] },
  { label: 'des couleurs', words: ['Rouge', 'Bleu', 'Vert', 'Jaune', 'Violet', 'Orange', 'Rose', 'Marron'] },
  { label: 'des vêtements', words: ['Pantalon', 'Chemise', 'Robe', 'Manteau', 'Pull', 'Jupe', 'Short', 'Veste'] },
  { label: 'des légumes', words: ['Carotte', 'Poireau', 'Salade', 'Courgette', 'Navet', 'Haricot', 'Chou', 'Radis'] },
  { label: 'des meubles', words: ['Chaise', 'Table', 'Armoire', 'Lit', 'Bureau', 'Commode', 'Canapé', 'Étagère'] },
  { label: 'des véhicules', words: ['Vélo', 'Voiture', 'Train', 'Bateau', 'Avion', 'Camion', 'Métro', 'Moto'] },
  { label: 'des instruments de musique', words: ['Piano', 'Guitare', 'Flûte', 'Violon', 'Tambour', 'Trompette', 'Harpe'], hard: true },
  { label: 'des outils', words: ['Marteau', 'Scie', 'Pince', 'Tournevis', 'Clé', 'Pelle', 'Râteau'], hard: true },
  { label: 'des métiers', words: ['Boulanger', 'Médecin', 'Maçon', 'Facteur', 'Pompier', 'Fermier', 'Pilote'], hard: true },
  { label: 'des pays', words: ['France', 'Espagne', 'Italie', 'Japon', 'Canada', 'Maroc', 'Brésil'], hard: true },
  { label: 'des planètes', words: ['Mars', 'Vénus', 'Jupiter', 'Saturne', 'Neptune', 'Mercure'], hard: true },
  { label: 'des saisons', words: ['Printemps', 'Été', 'Automne', 'Hiver'], hard: true },
  { label: 'des figures géométriques', words: ['Carré', 'Cercle', 'Triangle', 'Rectangle', 'Losange'], hard: true },
];

const OPPOSITES: readonly (readonly [string, string])[] = [
  ['chaud', 'froid'], ['grand', 'petit'], ['rapide', 'lent'], ['haut', 'bas'], ['jour', 'nuit'], ['propre', 'sale'], ['plein', 'vide'], ['long', 'court'],
  ['lourd', 'léger'], ['ouvert', 'fermé'], ['facile', 'difficile'], ['jeune', 'vieux'], ['doux', 'rugueux'], ['sec', 'mouillé'], ['fort', 'faible'], ['large', 'étroit'],
  ['riche', 'pauvre'], ['gentil', 'méchant'], ['clair', 'sombre'], ['devant', 'derrière'], ['dessus', 'dessous'], ['loin', 'près'], ['entrer', 'sortir'], ['monter', 'descendre'],
  ['acheter', 'vendre'], ['allumer', 'éteindre'], ['gagner', 'perdre'], ['commencer', 'finir'], ['courageux', 'peureux'], ['bruyant', 'silencieux'], ['tôt', 'tard'], ['premier', 'dernier'],
  ['dur', 'mou'], ['épais', 'mince'], ['joyeux', 'triste'], ['vrai', 'faux'], ['avant', 'après'], ['intérieur', 'extérieur'], ['remplir', 'vider'], ['attacher', 'détacher'],
];

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const COMPARES = [['court', 'vite'], ['saute', 'haut'], ['chante', 'fort'], ['nage', 'vite'], ['lance', 'loin']] as const;
const SHAPES = [['triangle', 'triangles', 3], ['carré', 'carrés', 4], ['pentagone', 'pentagones', 5], ['hexagone', 'hexagones', 6]] as const;
const LEGS = [['poule', 'poules', 2], ['canard', 'canards', 2], ['lapin', 'lapins', 4], ['chat', 'chats', 4], ['araignée', 'araignées', 8]] as const;

type Draft = Pick<Riddle, 'text' | 'explanation'> & { good: string; bad: string[] };
type Family = (rng: Rng, level: number, theme: Theme, phase: number) => Draft | null;

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, x: Thing): string => `${n} ${n > 1 ? x.many : x.one}`;

/** Deux mauvaises réponses chiffrées, proches de la bonne et positives. */
function nearby(rng: Rng, answer: number, spread: number[] = [1, 2, 3, 10]): string[] {
  const pool = shuffled(rng, spread.flatMap((d) => [answer + d, answer - d]).filter((n) => n > 0 && n !== answer));
  return [String(pool[0]), String(pool[1])];
}

const number = (rng: Rng, text: string, answer: number, explanation: string, spread?: number[]): Draft => ({ text, good: String(answer), bad: nearby(rng, answer, spread), explanation });

/** Suite de nombres : le pas grandit avec le niveau. */
const sequence: Family = (rng, level, _theme, phase) => {
  // Les suites de chaque phase démarrent dans leur propre dizaine.
  const base = 10 * phase;
  if (level >= 5) {
    const a = randInt(rng, 1, 3) + phase;
    const k = pick(rng, [2, 3]);
    const s = [a, a * k, a * k ** 2, a * k ** 3];
    return number(rng, `Quel nombre vient après : ${s.join(', ')}… ?`, s[3] * k, `On multiplie par ${k} à chaque fois : ${s[3]} ${TIMES} ${k} = ${s[3] * k}.`, [1, 2, 5, 10]);
  }
  if (level === 4) {
    const up = randInt(rng, 3, 7);
    const down = randInt(rng, 1, up - 1);
    const a = base + randInt(rng, 1, 9);
    const s = [a, a + up, a + up - down, a + 2 * up - down, a + 2 * up - 2 * down];
    return number(rng, `Quel nombre vient après : ${s.join(', ')}… ?`, s[4] + up, `On ajoute ${up}, puis on enlève ${down}, à tour de rôle : ${s[4]} + ${up} = ${s[4] + up}.`);
  }
  const [low, high] = ([[1, 2], [2, 5], [3, 9]] as const)[level - 1];
  const d = randInt(rng, low, high);
  const descending = level >= 2 && rng() < 0.4;
  const a = base + (descending ? d * 5 : 0) + randInt(rng, 1, 9);
  const step = descending ? -d : d;
  const s = [0, 1, 2, 3].map((i) => a + i * step);
  const verb = descending ? `On enlève ${d}` : `On ajoute ${d}`;
  return number(rng, `Quel nombre vient après : ${s.join(', ')}… ?`, s[3] + step, `${verb} à chaque fois : la suite continue avec ${s[3] + step}.`);
};

/** Motif d'images qui se répète. */
const pattern: Family = (rng, level, theme) => {
  const size = Math.min(4, 2 + Math.floor(level / 2));
  const motif = shuffled(rng, [...theme.symbols]).slice(0, size);
  const shown = randInt(rng, size * 2 - 1, size * 2 + 1);
  const row = Array.from({ length: shown }, (_, i) => motif[i % size]);
  const good = motif[shown % size];
  const bad = shuffled(rng, theme.symbols.filter((s) => s !== good)).slice(0, 2);
  return { text: `Quelle image vient après : ${row.join(' ')} … ?`, good, bad, explanation: `Le motif ${motif.join(' ')} se répète, donc c’est ${good}.` };
};

/** Trouve l'intrus. */
const oddOne: Family = (rng, level, _theme, phase) => {
  const groups = shuffled(rng, GROUPS.filter((g) => (level >= 3 ? true : !g.hard)));
  // Le groupe principal change avec la phase : les mêmes listes ne reviennent pas d'un biome à l'autre.
  const main = pick(rng, GROUPS.filter((g, i) => (level >= 3 || !g.hard) && i % 3 === phase % 3));
  const other = groups.filter((g) => g !== main).find((g) => g.words.every((w) => !main.words.includes(w)));
  if (!other) return null;
  const words = shuffled(rng, [...main.words]).slice(0, 3);
  const good = pick(rng, other.words);
  return {
    text: `Trouve l’intrus : ${shuffled(rng, [...words, good]).join(', ').toLowerCase()}.`,
    good,
    bad: words.slice(0, 2),
    explanation: `${capitalize(words.join(', ').toLowerCase())} sont ${main.label}, mais pas « ${good.toLowerCase()} ».`,
  };
};

/** Contraires. */
const opposite: Family = (rng, _level, _theme, phase) => {
  const own = OPPOSITES.filter((_, i) => i % THEMES.length === phase - 1);
  const pairs = [pick(rng, own), ...shuffled(rng, OPPOSITES.filter((p) => !own.includes(p)))];
  const [a, b] = rng() < 0.5 ? pairs[0] : [pairs[0][1], pairs[0][0]];
  return { text: `Quel est le contraire de « ${a} » ?`, good: capitalize(b), bad: [capitalize(pairs[1][0]), capitalize(pairs[2][1])], explanation: `Le contraire de ${a}, c’est ${b}.` };
};

/** Trois personnages à comparer. */
const compare: Family = (rng, level, theme) => {
  const names = shuffled(rng, [...theme.names]).slice(0, 3);
  if (names.length < 3) return null;
  const [verb, how] = pick(rng, COMPARES);
  const [a, b, c] = names;
  const askTop = rng() < 0.5;
  const good = askTop ? a : c;
  const facts = level >= 4 ? `${c} ${verb} moins ${how} que ${b}. ${a} ${verb} plus ${how} que ${b}.` : `${a} ${verb} plus ${how} que ${b}. ${b} ${verb} plus ${how} que ${c}.`;
  return { text: `${facts} Qui ${verb} le ${askTop ? 'plus' : 'moins'} ${how} ?`, good, bad: [b, askTop ? c : a], explanation: `Du premier au dernier : ${a}, puis ${b}, puis ${c}.` };
};

/** Jours et mois. */
const calendar: Family = (rng, level, theme) => {
  const who = pick(rng, theme.names);
  const months = level >= 3 && rng() < 0.5;
  const list = months ? MONTHS : DAYS;
  const i = randInt(rng, 0, list.length - 1);
  const shift = level >= 4 ? randInt(rng, 4, list.length + 3) : randInt(rng, 2, 4);
  const back = level >= 2 && rng() < 0.4;
  const good = list[(i + (back ? list.length * 2 - shift : shift)) % list.length];
  const bad = shuffled(rng, list.filter((x) => x !== good && x !== list[i])).slice(0, 2);
  const text = months
    ? `${who} regarde le calendrier : nous sommes en ${list[i]}. Quel mois ${back ? `était-ce il y a ${shift} mois` : `sera-t-on dans ${shift} mois`} ?`
    : `${who} regarde le calendrier : nous sommes ${list[i]}. Quel jour ${back ? `était-ce il y a ${shift} jours` : `serons-nous dans ${shift} jours`} ?`;
  return { text, good: capitalize(good), bad: bad.map(capitalize), explanation: `En comptant ${shift} ${months ? 'mois' : 'jours'} ${back ? 'en arrière' : 'en avant'} depuis ${list[i]}, on arrive à ${good}.` };
};

/** Nombre mystère. */
const mystery: Family = (rng, level, theme) => {
  const who = pick(rng, theme.names);
  const n = randInt(rng, 3, 9 + level * 3);
  if (level >= 4) {
    const plus = randInt(rng, 1, 9);
    return number(rng, `${who} pense à un nombre, le double, puis ajoute ${plus}. Cela fait ${n * 2 + plus}. Quel est ce nombre ?`, n, `${n * 2 + plus} ${MINUS} ${plus} = ${n * 2}, et la moitié de ${n * 2} est ${n}.`);
  }
  const plus = randInt(rng, 2, 6 + level * 3);
  return number(rng, `${who} pense à un nombre et lui ajoute ${plus}. Cela fait ${n + plus}. Quel est ce nombre ?`, n, `${n + plus} ${MINUS} ${plus} = ${n}.`);
};

/** Pattes des animaux. */
const legs: Family = (rng, level, theme) => {
  const who = pick(rng, theme.names);
  const [a, b] = shuffled(rng, [...LEGS]);
  const x = randInt(rng, 2, 2 + level);
  const y = randInt(rng, 1, 1 + level);
  const total = x * a[2] + y * b[2];
  const label = (n: number, k: (typeof LEGS)[number]): string => `${n} ${n > 1 ? k[1] : k[0]}`;
  return number(rng, `${who} voit ${label(x, a)} et ${label(y, b)}. Combien de pattes en tout ?`, total, `${x} ${TIMES} ${a[2]} = ${x * a[2]}, ${y} ${TIMES} ${b[2]} = ${y * b[2]}, et ${x * a[2]} + ${y * b[2]} = ${total}.`, [1, 2, 4]);
};

/** Côtés des figures. */
const sides: Family = (rng, level, theme) => {
  const who = pick(rng, theme.names);
  const [a, b] = shuffled(rng, [...SHAPES]);
  const x = randInt(rng, 1, 1 + level);
  const y = randInt(rng, 1, level);
  const total = x * a[2] + y * b[2];
  const label = (n: number, k: (typeof SHAPES)[number]): string => `${n} ${n > 1 ? k[1] : k[0]}`;
  return number(rng, `${who} dessine ${label(x, a)} et ${label(y, b)}. Combien de côtés en tout ?`, total, `${x} ${TIMES} ${a[2]} = ${x * a[2]}, ${y} ${TIMES} ${b[2]} = ${y * b[2]}, et ${x * a[2]} + ${y * b[2]} = ${total}.`, [1, 2, 3]);
};

/** Âges. */
const ages: Family = (rng, level, theme) => {
  const who = pick(rng, theme.names);
  const age = randInt(rng, 6, 12);
  const gap = randInt(rng, 2, 6);
  const years = randInt(rng, 2, 3 + level);
  return number(rng, `${who} a ${age} ans. Sa sœur a ${gap} ans de plus. Quel âge aura sa sœur dans ${years} ans ?`, age + gap + years, `${age} + ${gap} = ${age + gap}, puis ${age + gap} + ${years} = ${age + gap + years}.`);
};

/** Partage avec un reste. */
const sharing: Family = (rng, level, theme) => {
  const who = pick(rng, theme.names);
  const thing = pick(rng, theme.things);
  const parts = randInt(rng, 2, 3 + level);
  const each = randInt(rng, 2, 6 + level);
  const rest = randInt(rng, 1, parts - 1);
  const total = parts * each + rest;
  return number(rng, `${who} partage ${plural(total, thing)} entre ${parts} amis, autant pour chacun. Combien en reste-t-il ?`, rest, `${parts} ${TIMES} ${each} = ${parts * each}, et ${total} ${MINUS} ${parts * each} = ${rest}.`, [1, 2, 3, 4]);
};

/** Devinettes de la phase. */
const guess: Family = (rng, _level, theme) => {
  const [text, good, bad1, bad2, explanation] = pick(rng, theme.guesses);
  return { text, good, bad: [bad1, bad2], explanation };
};

const FAMILIES: readonly (readonly [Family, number])[] = [
  [sequence, 1], [pattern, 1], [oddOne, 1], [opposite, 1], [calendar, 1], [guess, 1],
  [mystery, 2], [compare, 2], [legs, 2], [sides, 2],
  [ages, 3], [sharing, 3],
];

function buildRiddle(level: number, phase: number, rng: Rng): Riddle | null {
  const theme = THEMES[Math.max(1, Math.min(THEMES.length, phase)) - 1];
  const family = pick(rng, FAMILIES.filter(([, min]) => min <= level))[0];
  const draft = family(rng, level, theme, Math.max(1, Math.min(THEMES.length, phase)));
  if (!draft) return null;
  return { id: `gen-${draft.text}`, level, text: draft.text, choices: [draft.good, ...draft.bad], answer: 0, explanation: draft.explanation };
}

/** Mémoire courte : ces questions ne reviennent pas tant qu'elles y sont. */
function remember(asked: string[], key: string): void {
  asked.push(key);
  if (asked.length > ASKED_MEMORY) asked.splice(0, asked.length - ASKED_MEMORY);
}

/** Une énigme de combat, jamais posée récemment. */
export function generateRiddle(level: number, phase: number, asked: string[], rng: Rng): Riddle {
  let riddle: Riddle | null = null;
  for (let i = 0; i < MAX_TRIES; i++) {
    const next = buildRiddle(level, phase, rng);
    if (!next) continue;
    riddle = next;
    if (!asked.includes(next.text)) break;
  }
  const out = riddle ?? { id: 'gen-repli', level, text: 'Quel est le contraire de « chaud » ?', choices: ['Froid', 'Grand', 'Vide'], answer: 0, explanation: 'Le contraire de chaud, c’est froid.' };
  remember(asked, out.text);
  return out;
}

const STORIES: Record<'+' | typeof MINUS | typeof TIMES, (n: string, a: number, b: number, x: Thing) => string> = {
  '+': (n, a, b, x) => `${n} a ${plural(a, x)}. On lui en donne ${b}. Combien en a ${n} maintenant ?`,
  [MINUS]: (n, a, b, x) => `${n} a ${plural(a, x)}. ${n} en donne ${b}. Combien lui en reste-t-il ?`,
  [TIMES]: (n, a, b, x) => `${n} prépare ${a} sacs de ${plural(b, x)}. Combien de ${x.many} en tout ?`,
};

/** Calcul habillé selon la phase, une fois sur trois : mêmes nombres, mais raconté avec les objets du biome. */
export function tellCalc(q: CalcQuestion, phase: number, rng: Rng): CalcQuestion {
  const m = /^(\d+) ([+−×]) (\d+) = \?$/.exec(q.prompt);
  if (!m || rng() > 1 / 3) return q;
  const theme = THEMES[Math.max(1, Math.min(THEMES.length, phase)) - 1];
  return { ...q, prompt: STORIES[m[2] as keyof typeof STORIES](pick(rng, theme.names), Number(m[1]), Number(m[3]), pick(rng, theme.things)) };
}

/** Un calcul pas encore posé récemment (les petits niveaux offrent moins de combinaisons). */
export function freshCalc(generate: () => CalcQuestion, phase: number, asked: string[], rng: Rng): CalcQuestion {
  let q = generate();
  for (let i = 0; i < MAX_TRIES && asked.includes(q.prompt); i++) q = generate();
  remember(asked, q.prompt);
  return tellCalc(q, phase, rng);
}
