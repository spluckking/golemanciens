// Parseur de CONTENU.md (sections A, B, C et G). Utilisé par le script de génération
// des données et par le test de correspondance. Syntaxe TypeScript « effaçable » :
// ce fichier s'exécute directement avec Node.
import type { Content, LumiblocLineKey, Outro, Riddle, StoryText } from '../src/data/types.ts';

const LUMIBLOC_KEYS: Record<string, LumiblocLineKey> = {
  'Tutoriel (déplacement)': 'tutorialMove',
  'Tutoriel (caisse)': 'tutorialCrate',
  'Éclosion': 'hatching',
  "Premier combat d'arène": 'firstArena',
  'Faiblesse': 'weakness',
  'Erreur en combat': 'combatMistake',
  'Défaite': 'defeat',
  "Premier objet d'évolution": 'firstEvolutionItem',
  'Repas': 'meal',
  'Galaxie': 'galaxy',
  'Pause': 'pause',
  // Épreuve des Étoiles (révision 1.7).
  'Épreuve des Étoiles, début': 'starsStart',
  'Épreuve des Étoiles, 4e étoile': 'stars4',
  'Épreuve des Étoiles, 8e étoile': 'stars8',
  'Épreuve des Étoiles, erreur': 'starsMistake',
  'Épreuve des Étoiles, fin': 'starsEnd',
  'Épreuve des Étoiles, bouton pour partir': 'starsLater',
};

const CHOICE = /^\s*- \[(x| )\] (.+)$/;

function section(lines: string[], letter: string): string[] {
  const start = lines.findIndex((l) => l.startsWith(`## ${letter}. `));
  if (start < 0) throw new Error(`Section ${letter} introuvable dans CONTENU.md`);
  let end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  if (end < 0) end = lines.length;
  return lines.slice(start + 1, end);
}

function parseStories(lines: string[]): StoryText[] {
  const stories: StoryText[] = [];
  let current: StoryText | null = null;
  let inQuestions = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const head = /^### (T\d) — (.+)$/.exec(line);
    if (head) {
      current = { id: head[1], title: head[2], paragraphs: [], questions: [] };
      stories.push(current);
      inQuestions = false;
      continue;
    }
    if (!current || line.trim() === '' || line === '---') continue;
    if (line === '**Questions**') {
      inQuestions = true;
      continue;
    }
    if (!inQuestions) {
      current.paragraphs.push(line.trim());
      continue;
    }
    const q = /^\d+\. (.+)$/.exec(line);
    if (q) {
      current.questions.push({ text: q[1], choices: [], answer: -1 });
      continue;
    }
    const c = CHOICE.exec(line);
    const last = current.questions[current.questions.length - 1];
    if (c && last) {
      if (c[1] === 'x') last.answer = last.choices.length;
      last.choices.push(c[2]);
      continue;
    }
    throw new Error(`Ligne inattendue dans ${current.id} : ${line}`);
  }
  return stories;
}

function parseOutros(lines: string[]): Outro[] {
  const outros: Outro[] = [];
  for (const line of lines) {
    const m = /^- \*\*(O\d) \((.+?)\)\*\* : (.+)$/.exec(line.trimEnd());
    if (m) outros.push({ id: m[1], when: m[2], text: m[3] });
  }
  return outros;
}

function parseRiddles(lines: string[]): Riddle[] {
  const riddles: Riddle[] = [];
  let level = 0;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const lv = /^### Niveau (\d)$/.exec(line);
    if (lv) {
      level = Number(lv[1]);
      continue;
    }
    const head = /^\*\*(E\d-\d\d)\*\* (.+)$/.exec(line);
    if (head) {
      riddles.push({ id: head[1], level, text: head[2], choices: [], answer: -1, explanation: '' });
      continue;
    }
    const last = riddles[riddles.length - 1];
    const c = CHOICE.exec(line);
    if (c && last) {
      if (c[1] === 'x') last.answer = last.choices.length;
      last.choices.push(c[2]);
      continue;
    }
    const ex = /^> Explication : (.+)$/.exec(line);
    if (ex && last) last.explanation = ex[1];
  }
  return riddles;
}

function parseLumibloc(lines: string[]): Record<LumiblocLineKey, string> {
  const out: Partial<Record<LumiblocLineKey, string>> = {};
  for (const line of lines) {
    const m = /^- \*\*(.+?)\*\* : « (.+) »$/.exec(line.trimEnd());
    if (!m) continue;
    const key = LUMIBLOC_KEYS[m[1]];
    if (!key) throw new Error(`Réplique de Lumibloc inconnue : ${m[1]}`);
    out[key] = m[2];
  }
  for (const key of Object.values(LUMIBLOC_KEYS)) {
    if (!out[key]) throw new Error(`Réplique de Lumibloc manquante : ${key}`);
  }
  return out as Record<LumiblocLineKey, string>;
}

export function parseContenu(markdown: string): Content {
  const lines = markdown.split(/\r?\n/);
  return {
    stories: parseStories(section(lines, 'A')),
    outros: parseOutros(section(lines, 'B')),
    riddles: parseRiddles(section(lines, 'C')),
    lumibloc: parseLumibloc(section(lines, 'G')),
  };
}
