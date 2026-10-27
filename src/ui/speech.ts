/** Lecture à voix haute des dialogues (Web Speech API, fr-FR). */

let frenchVoice: SpeechSynthesisVoice | null = null;
const listeners: (() => void)[] = [];

function refresh(): void {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  frenchVoice = voices.find((v) => v.lang === 'fr-FR') ?? voices.find((v) => v.lang.startsWith('fr')) ?? null;
  for (const l of listeners) l();
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refresh();
  window.speechSynthesis.addEventListener('voiceschanged', refresh);
}

export function hasFrenchVoice(): boolean {
  return frenchVoice !== null;
}

/** Prévient quand la liste des voix change (elle arrive parfois après le chargement). */
export function onVoicesChanged(listener: () => void): void {
  listeners.push(listener);
}

export function speak(text: string): void {
  if (!frenchVoice) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = frenchVoice;
  u.lang = frenchVoice.lang;
  u.rate = 0.95;
  synth.speak(u);
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
