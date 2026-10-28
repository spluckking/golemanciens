/**
 * Découpage d'un texte d'histoire en sous-titres de cinématique (SPEC.md § 9.4).
 * Le texte reste mot pour mot celui de CONTENU.md : on ne fait que le couper en phrases,
 * puis regrouper ces phrases plan par plan.
 */

/** Une phrase se termine par . ! ? ou …, éventuellement suivie du guillemet fermant ». */
const SENTENCE = /[^]*?[.!?…]+(?:[\s  ]*»)?(?=\s|$)/gy;

export function splitSentences(text: string): string[] {
  const out: string[] = [];
  const src = text.trim();
  SENTENCE.lastIndex = 0;
  let last = 0;
  for (let m = SENTENCE.exec(src); m; m = SENTENCE.exec(src)) {
    out.push(m[0].trim());
    last = SENTENCE.lastIndex;
    while (last < src.length && /\s/.test(src[last])) last++;
    SENTENCE.lastIndex = last;
  }
  // Reste sans ponctuation finale : c'est une phrase quand même.
  if (last < src.length) out.push(src.slice(last).trim());
  return out.filter((s) => s.length > 0);
}

/** Toutes les phrases d'un texte, dans l'ordre des paragraphes. */
export function storySentences(paragraphs: readonly string[]): string[] {
  return paragraphs.flatMap(splitSentences);
}

/**
 * Regroupe les phrases en sous-titres : counts[i] = nombre de phrases du plan i.
 * Le total doit couvrir exactement le texte.
 */
export function groupCaptions(sentences: readonly string[], counts: readonly number[]): string[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total !== sentences.length) throw new Error(`Le scénario couvre ${total} phrases, le texte en a ${sentences.length}`);
  const out: string[] = [];
  let i = 0;
  for (const n of counts) {
    if (n < 1) throw new Error('Un plan doit avoir au moins une phrase');
    out.push(sentences.slice(i, i + n).join(' '));
    i += n;
  }
  return out;
}

/** Temps de lecture minimal avant d'afficher ▶ : environ 3 mots par seconde, au moins 2,5 s. */
export function readingSeconds(caption: string): number {
  const words = caption.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  return Math.max(2.5, words / 3);
}
