import { CHECKPOINTS, type CheckpointId } from '../core/checkpoints';
import type { GameState, Settings } from '../core/gameState';
import { CALC_KIND_NAMES, formatPlayTime, mostMissedTables, rate } from '../core/stats';
import { CONTENT } from '../data/content';
import type { CalcKind } from '../questions/calc';
import { el } from './dom';

/**
 * Menu parent (SPEC.md § 14) : code à 4 chiffres, puis statistiques, réglages, mode test
 * et sauvegarde. Textes destinés au parent (nouveaux, à valider).
 */

export interface ParentActions {
  state: GameState;
  /** Enregistre la partie après un changement. */
  save: () => Promise<boolean>;
  /** Réglages modifiés : FPS, volumes… */
  applySettings: () => void;
  exportFile: () => void;
  /** Importe un fichier ; retourne un message d'erreur, ou null (la page se recharge). */
  importFile: (text: string) => Promise<string | null>;
  reset: () => Promise<void>;
  checkpoint: (id: CheckpointId) => Promise<void>;
  /** Demande à voir la fin du jeu (outro O6 et générique) une fois le menu fermé. */
  previewFinale: () => void;
}

function button(text: string, testId: string, className = 'btn-parent'): HTMLButtonElement {
  const b = el('button', { className, text, testId });
  b.type = 'button';
  return b;
}

// ---------- Code ----------

/** Pavé numérique : résout true si le bon code est saisi, false si on annule. */
export function askParentCode(layer: HTMLElement, code: string): Promise<boolean> {
  return new Promise((resolve) => {
    let typed = '';
    const display = el('div', { className: 'pin-display', testId: 'pin-display' });
    const message = el('p', { className: 'pin-message', text: 'Code parent' });
    const render = (): void => {
      display.textContent = '●'.repeat(typed.length) + '○'.repeat(4 - typed.length);
    };
    const finish = (ok: boolean): void => {
      root.remove();
      resolve(ok);
    };
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✕'].map((k) => {
      const b = button(k, `pin-${k === '⌫' ? 'del' : k === '✕' ? 'cancel' : k}`, 'pin-key');
      b.addEventListener('click', () => {
        if (k === '✕') return finish(false);
        if (k === '⌫') typed = typed.slice(0, -1);
        else if (typed.length < 4) typed += k;
        render();
        if (typed.length === 4) {
          if (typed === code) return finish(true);
          message.textContent = 'Ce n’est pas le bon code.';
          display.classList.remove('shake');
          void display.offsetWidth;
          display.classList.add('shake');
          typed = '';
          setTimeout(render, 300);
        }
      });
      return b;
    });
    render();
    const card = el('div', { className: 'card pin-card' }, [message, display, el('div', { className: 'pin-pad' }, keys)]);
    const root = el('div', { className: 'screen screen-message', testId: 'parent-pin' }, [card]);
    layer.appendChild(root);
  });
}

// ---------- Onglets ----------

function row(label: string, value: string): HTMLElement {
  return el('div', { className: 'pm-row' }, [el('span', { text: label }), el('strong', { text: value })]);
}

function percent(r: number | null): string {
  return r === null ? '—' : `${r} %`;
}

function statsPanel(s: GameState): HTMLElement {
  const reading = CONTENT.stories
    .filter((st) => s.readingStats[st.id])
    .map((st) => {
      const r = s.readingStats[st.id];
      return row(`${st.id} — ${st.title}`, `${r.reads} lecture${r.reads > 1 ? 's' : ''} · ${percent(rate({ asked: r.asked, correct: r.correct }))}`);
    });
  const levels = Object.entries(s.stats.calcLevels).sort(([a], [b]) => Number(a) - Number(b));
  const kinds = Object.entries(s.stats.calcKinds).sort(([, a], [, b]) => b.asked - a.asked);
  const riddles = Object.entries(s.stats.riddleLevels).sort(([a], [b]) => Number(a) - Number(b));
  const missed = mostMissedTables(s.stats);
  const none = (text: string): HTMLElement => el('p', { className: 'pm-empty', text });
  return el('div', { className: 'pm-panel', testId: 'parent-stats' }, [
    row('Temps de jeu', formatPlayTime(s.playTimeS)),
    el('h3', { className: 'journal-section', text: 'Lecture' }),
    ...(reading.length ? reading : [none('Aucun texte lu pour l’instant.')]),
    el('h3', { className: 'journal-section', text: 'Calcul — par niveau' }),
    ...(levels.length ? levels.map(([l, t]) => row(`Niveau ${l}`, `${t.asked} question${t.asked > 1 ? 's' : ''} · ${percent(rate(t))}`)) : [none('Pas encore de calcul.')]),
    el('h3', { className: 'journal-section', text: 'Calcul — par type' }),
    ...(kinds.length ? kinds.map(([k, t]) => row(CALC_KIND_NAMES[k as CalcKind] ?? k, `${t.asked} · ${percent(rate(t))}`)) : [none('Pas encore de calcul.')]),
    el('h3', { className: 'journal-section', text: 'Tables les plus ratées' }),
    ...(missed.length ? missed.map((m) => row(`Table de ${m.table}`, `${m.missed} erreur${m.missed > 1 ? 's' : ''} sur ${m.asked}`)) : [none('Aucune table ratée pour l’instant.')]),
    el('h3', { className: 'journal-section', text: 'Énigmes — par niveau' }),
    ...(riddles.length ? riddles.map(([l, t]) => row(`Niveau ${l}`, `${t.asked} · ${percent(rate(t))}`)) : [none('Pas encore d’énigme.')]),
  ]);
}

/** Réglage chiffré avec − et +. */
export function stepper(label: string, testId: string, get: () => number, set: (v: number) => void, min: number, max: number, step: number, unit = ''): HTMLElement {
  const value = el('strong', { className: 'pm-value', testId: `${testId}-value` });
  const render = (): void => {
    value.textContent = `${get()}${unit}`;
  };
  const minus = button('−', `${testId}-minus`, 'pm-step');
  const plus = button('+', `${testId}-plus`, 'pm-step');
  minus.addEventListener('click', () => {
    set(Math.max(min, get() - step));
    render();
  });
  plus.addEventListener('click', () => {
    set(Math.min(max, get() + step));
    render();
  });
  render();
  return el('div', { className: 'pm-row' }, [el('span', { text: label }), el('div', { className: 'pm-stepper' }, [minus, value, plus])]);
}

function toggle(label: string, testId: string, get: () => boolean, set: (v: boolean) => void): HTMLElement {
  const b = button('', testId, 'pm-toggle');
  const render = (): void => {
    b.textContent = get() ? 'Oui' : 'Non';
    b.classList.toggle('on', get());
  };
  b.addEventListener('click', () => {
    set(!get());
    render();
  });
  render();
  return el('div', { className: 'pm-row' }, [el('span', { text: label }), b]);
}

function settingsPanel(a: ParentActions, changed: () => void): HTMLElement {
  const st: Settings = a.state.settings;
  const levels = a.state.levels;
  const set = <K extends keyof Settings>(k: K) => (v: Settings[K]): void => {
    st[k] = v;
    changed();
  };
  const codeInput = el('input', { className: 'pm-code', testId: 'parent-code-input', aria: 'Nouveau code' });
  codeInput.type = 'text';
  codeInput.inputMode = 'numeric';
  codeInput.maxLength = 4;
  const codeMsg = el('span', { className: 'pm-note' });
  const codeBtn = button('Changer le code', 'parent-code-save');
  codeBtn.addEventListener('click', () => {
    if (!/^\d{4}$/.test(codeInput.value)) {
      codeMsg.textContent = 'Il faut 4 chiffres.';
      return;
    }
    st.parentCode = codeInput.value;
    codeInput.value = '';
    codeMsg.textContent = 'Code changé.';
    changed();
  });
  return el('div', { className: 'pm-panel', testId: 'parent-settings' }, [
    el('h3', { className: 'journal-section', text: 'Difficulté' }),
    stepper('Niveau de calcul', 'set-calc', () => levels.calc.level, (v) => {
      levels.calc = { level: v, wins: 0, losses: 0 };
      st.calcStart = v;
      changed();
    }, 1, 6, 1),
    stepper('Niveau des énigmes', 'set-riddle', () => levels.riddle.level, (v) => {
      levels.riddle = { level: v, wins: 0, losses: 0 };
      st.riddleStart = v;
      changed();
    }, 1, 5, 1),
    el('p', { className: 'pm-note', text: 'Le niveau s’adapte ensuite tout seul : +1 après 3 réussites, −1 après 2 erreurs.' }),
    el('h3', { className: 'journal-section', text: 'Rappel de pause' }),
    toggle('Rappel activé', 'set-pause', () => st.pauseReminder, set('pauseReminder')),
    stepper('Après', 'set-pause-min', () => st.pauseMinutes, set('pauseMinutes'), 10, 90, 5, ' min'),
    el('h3', { className: 'journal-section', text: 'Son' }),
    stepper('Musique', 'set-music', () => Math.round(st.musicVolume * 100), (v) => set('musicVolume')(v / 100), 0, 100, 10, ' %'),
    stepper('Bruitages', 'set-sfx', () => Math.round(st.sfxVolume * 100), (v) => set('sfxVolume')(v / 100), 0, 100, 10, ' %'),
    el('h3', { className: 'journal-section', text: 'Affichage' }),
    toggle('Afficher les FPS', 'set-fps', () => st.showFps, set('showFps')),
    el('h3', { className: 'journal-section', text: 'Code parent' }),
    el('div', { className: 'pm-row' }, [codeInput, codeBtn, codeMsg]),
  ]);
}

function testPanel(a: ParentActions, changed: () => void, closeMenu: () => void): HTMLElement {
  const food = button('+10 🍎', 'parent-add-food');
  const foodValue = el('strong', { text: `🍎 ${a.state.food}`, testId: 'parent-food' });
  food.addEventListener('click', () => {
    a.state.food += 10;
    foodValue.textContent = `🍎 ${a.state.food}`;
    changed();
  });
  const finale = button('Voir la fin du jeu', 'parent-finale');
  finale.addEventListener('click', () => {
    a.previewFinale();
    closeMenu();
  });
  return el('div', { className: 'pm-panel', testId: 'parent-test' }, [
    el('h3', { className: 'journal-section', text: 'Aller à un moment du chapitre 1' }),
    el('p', { className: 'pm-note', text: 'La partie est remplacée par un état cohérent (prénom, réglages et statistiques gardés), puis le jeu redémarre.' }),
    el(
      'div',
      { className: 'pm-buttons' },
      CHECKPOINTS.map((c) => {
        const b = button(c.label, `checkpoint-${c.id}`);
        b.addEventListener('click', () => void a.checkpoint(c.id));
        return b;
      }),
    ),
    el('h3', { className: 'journal-section', text: 'Nourriture' }),
    el('div', { className: 'pm-row' }, [foodValue, food]),
    el('h3', { className: 'journal-section', text: 'Fin du jeu' }),
    el('p', { className: 'pm-note', text: 'Joue la cinématique de fin (O6) et le générique, sans les ajouter au journal.' }),
    el('div', { className: 'pm-buttons' }, [finale]),
  ]);
}

function savePanel(a: ParentActions): HTMLElement {
  const message = el('p', { className: 'pm-note', testId: 'parent-save-message' });
  const exportBtn = button('Exporter la partie (fichier)', 'parent-export');
  exportBtn.addEventListener('click', () => {
    a.exportFile();
    message.textContent = 'Fichier enregistré dans les téléchargements.';
  });
  const fileInput = el('input', { className: 'hidden', testId: 'parent-import-file' });
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  const importBtn = button('Importer une partie…', 'parent-import');
  importBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    void file.text().then(async (text) => {
      const error = await a.importFile(text);
      if (error) message.textContent = error;
    });
  });
  // Réinitialisation : deux confirmations.
  const reset = button('Tout effacer…', 'parent-reset', 'btn-parent danger');
  let step = 0;
  reset.addEventListener('click', () => {
    step++;
    if (step === 1) {
      reset.textContent = 'Effacer la partie ? Touche encore pour confirmer.';
    } else if (step === 2) {
      reset.textContent = 'Vraiment tout effacer ? C’est définitif.';
    } else void a.reset();
  });
  return el('div', { className: 'pm-panel', testId: 'parent-save' }, [
    el('h3', { className: 'journal-section', text: 'Sauvegarde' }),
    el('div', { className: 'pm-buttons' }, [exportBtn, importBtn, fileInput]),
    message,
    el('h3', { className: 'journal-section', text: 'Recommencer à zéro' }),
    reset,
  ]);
}

/** Menu parent, à onglets ; résout à la fermeture (les réglages sont enregistrés au fur et à mesure). */
export function openParentMenu(layer: HTMLElement, a: ParentActions): Promise<void> {
  return new Promise((resolve) => {
    const changed = (): void => {
      a.applySettings();
      void a.save();
    };
    const closeMenu = (): void => {
      root.remove();
      resolve();
    };
    const tabs: [string, string, () => HTMLElement][] = [
      ['stats', 'Statistiques', () => statsPanel(a.state)],
      ['settings', 'Réglages', () => settingsPanel(a, changed)],
      ['test', 'Mode test', () => testPanel(a, changed, closeMenu)],
      ['save', 'Sauvegarde', () => savePanel(a)],
    ];
    const content = el('div', { className: 'pm-content' });
    const tabButtons = tabs.map(([id, label, render]) => {
      const b = button(label, `parent-tab-${id}`, 'pm-tab');
      b.addEventListener('click', () => {
        tabButtons.forEach((t) => t.classList.toggle('active', t === b));
        content.replaceChildren(render());
      });
      return b;
    });
    const close = button('Fermer', 'parent-close', 'btn-big');
    const card = el('div', { className: 'card parent-card' }, [el('h2', { className: 'card-title', text: '👪 Menu parent' }), el('div', { className: 'pm-tabs' }, tabButtons), content, close]);
    const root = el('div', { className: 'screen screen-message', testId: 'parent-menu' }, [card]);
    close.addEventListener('click', closeMenu);
    layer.appendChild(root);
    tabButtons[0].click();
  });
}
