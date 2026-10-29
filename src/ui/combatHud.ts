import type { CombatGolem, CombatMonster } from '../combat/turn/turnCombat';
import { formatText } from '../core/text';
import { TYPE_ICON, TYPE_NAME, type AttackInfo, type AttackType, type BossStage } from '../data/creatures';
import { PORTRAITS } from '../entities/models';
import { paintPortrait } from './dialog';
import { el } from './dom';

/**
 * Interface du combat au tour par tour (SPEC.md § 7.2), en DOM au-dessus de l'arène 3D :
 * monstre en haut (PV, icône de faiblesse), golem en bas à gauche, attaques en bas à droite
 * (icône du type, nom, badge 🔢 ou 🧩), bouton « Changer », fiche 📒 des faiblesses.
 */

/** Textes d'interface nouveaux (à valider). */
export const TEXT_WEAK_AGAINST = 'Faible contre';
export const TEXT_SWITCH = 'Changer';
export const TEXT_SHEET = 'Faiblesses';
export const TEXT_SHEET_TITLE = '📒 Les faiblesses';
export const TEXT_SHEET_HINT = 'Les attaques avec ✔ visent la faiblesse : elles font plus de dégâts.';
export const TEXT_SHEET_NONE = 'Aucune de tes attaques n’a cette icône : choisis ton attaque 🧩, la plus forte !';

export type CombatChoice = { kind: 'attack'; attack: AttackInfo } | { kind: 'switch'; golemId: string };

function bar(): { root: HTMLDivElement; fill: HTMLDivElement; text: HTMLSpanElement } {
  const fill = el('div', { className: 'hp-fill' });
  const text = el('span', { className: 'combat-hp-text' });
  return { root: el('div', { className: 'hp-bar combat-hp' }, [fill]), fill, text };
}

export class CombatHud {
  readonly root: HTMLDivElement;
  private readonly monsterName = el('div', { className: 'combat-name', testId: 'combat-monster-name' });
  private readonly weakIcon = el('span', { className: 'combat-weak-icon', testId: 'combat-weakness' });
  private readonly monsterBar = bar();
  private readonly monsterPips = el('div', { className: 'combat-pips' });
  private readonly golemName = el('div', { className: 'combat-name', testId: 'combat-golem-name' });
  private readonly golemBar = bar();
  private readonly golemPips = el('div', { className: 'combat-pips' });
  private readonly actions = el('div', { className: 'combat-actions', testId: 'combat-actions' });
  private readonly banner = el('div', { className: 'combat-banner hidden', testId: 'combat-banner' });
  private readonly sheetBtn: HTMLButtonElement;
  private sheetData: { golems: CombatGolem[]; stage: BossStage; monster: string } | null = null;
  private bannerTimer = 0;

  constructor(
    private readonly layer: HTMLElement,
    private readonly playerName: string,
    sheetAvailable: boolean,
  ) {
    this.sheetBtn = el('button', { className: 'combat-sheet-btn', aria: TEXT_SHEET, testId: 'combat-sheet' }, [el('span', { text: '📒' })]);
    this.sheetBtn.type = 'button';
    this.sheetBtn.classList.toggle('hidden', !sheetAvailable);
    this.sheetBtn.addEventListener('click', () => void this.showSheet());
    const monsterCard = el('div', { className: 'combat-card combat-monster' }, [
      el('div', { className: 'combat-card-head' }, [this.monsterName, el('div', { className: 'combat-weak' }, [el('span', { className: 'combat-weak-label', text: TEXT_WEAK_AGAINST }), this.weakIcon])]),
      this.monsterBar.root,
      el('div', { className: 'combat-card-foot' }, [this.monsterPips, this.monsterBar.text]),
    ]);
    const golemCard = el('div', { className: 'combat-card combat-golem' }, [
      this.golemName,
      this.golemBar.root,
      el('div', { className: 'combat-card-foot' }, [this.golemPips, this.golemBar.text]),
    ]);
    this.root = el('div', { className: 'combat-screen', testId: 'combat' }, [monsterCard, golemCard, this.actions, this.banner, this.sheetBtn]);
    layer.appendChild(this.root);
  }

  setMonster(m: CombatMonster, stage: BossStage, remaining: number, total: number): void {
    this.monsterName.textContent = m.name;
    this.weakIcon.textContent = `${TYPE_ICON[stage.weakness]} ${TYPE_NAME[stage.weakness]}`;
    this.monsterBar.fill.style.width = `${(Math.max(0, m.hp) / m.maxHp) * 100}%`;
    this.monsterBar.text.textContent = `${Math.max(0, m.hp)} / ${m.maxHp}`;
    this.pips(this.monsterPips, remaining, total, 'monster');
  }

  setGolem(g: CombatGolem, alive: number, total: number): void {
    this.golemName.textContent = g.name;
    this.golemBar.fill.style.width = `${(Math.max(0, g.hp) / g.maxHp) * 100}%`;
    this.golemBar.text.textContent = `${Math.max(0, g.hp)} / ${g.maxHp}`;
    this.pips(this.golemPips, alive, total, 'golem');
  }

  /** Données de la fiche 📒 (mise à jour à chaque tour). */
  setSheet(golems: CombatGolem[], stage: BossStage, monster: string): void {
    this.sheetData = { golems, stage, monster };
  }

  showSheetButton(): void {
    this.sheetBtn.classList.remove('hidden');
  }

  private pips(box: HTMLElement, alive: number, total: number, kind: string): void {
    if (box.childElementCount !== total) {
      box.replaceChildren(...Array.from({ length: total }, () => el('span', { className: `combat-pip pip-${kind}` })));
    }
    Array.from(box.children).forEach((p, i) => p.classList.toggle('out', i >= alive));
  }

  /** Attend le choix du joueur : une attaque, ou un changement de golem. */
  choose(attacks: AttackInfo[], stage: BossStage, bench: CombatGolem[], forcedSwitch: boolean): Promise<CombatChoice> {
    return new Promise((resolve) => {
      const done = (c: CombatChoice): void => {
        this.actions.replaceChildren();
        resolve(c);
      };
      const buttons: HTMLElement[] = [];
      if (!forcedSwitch) {
        for (const a of attacks) {
          const super_ = a.type === stage.weakness;
          const b = el('button', { className: `combat-attack type-${a.type} slot-${a.slot}`, testId: `attack-${a.slot}` }, [
            el('span', { className: 'combat-attack-type', text: TYPE_ICON[a.type] }),
            el('span', { className: 'combat-attack-name', text: a.name }),
            el('span', { className: 'combat-attack-badge', text: a.kind === 'force' ? '🔢' : '🧩' }),
          ]);
          b.type = 'button';
          b.dataset.super = String(super_);
          b.addEventListener('click', () => done({ kind: 'attack', attack: a }));
          buttons.push(b);
        }
      }
      if (bench.length > 0) {
        for (const g of bench) {
          const b = el('button', { className: 'combat-switch', testId: `switch-${g.id}` }, [
            el('span', { className: 'combat-attack-type', text: '🔁' }),
            el('span', { className: 'combat-attack-name', text: `${TEXT_SWITCH} : ${g.name}` }),
            el('span', { className: 'combat-attack-badge', text: `${g.hp}/${g.maxHp}` }),
          ]);
          b.type = 'button';
          b.addEventListener('click', () => done({ kind: 'switch', golemId: g.id }));
          buttons.push(b);
        }
      }
      this.actions.replaceChildren(...buttons);
    });
  }

  /** Message au centre (« Le Zombie attaque : Bras tendus ! », « Super efficace ! »). */
  announce(text: string, seconds = 1.6, kind = ''): void {
    this.banner.textContent = formatText(text, this.playerName);
    this.banner.className = `combat-banner ${kind}`;
    void this.banner.offsetWidth;
    this.banner.classList.add('show');
    this.bannerTimer = seconds;
  }

  /** Chiffre qui s'envole au-dessus de la carte du monstre ou du golem. */
  float(target: 'monster' | 'golem', text: string, kind = ''): void {
    const node = el('div', { className: `combat-float ${target} ${kind}`, text });
    this.root.appendChild(node);
    setTimeout(() => node.remove(), 1200);
  }

  /** Bulle de Lumibloc pendant le combat : on la ferme avec « OK ». */
  lumibloc(text: string): Promise<void> {
    return new Promise((resolve) => {
      const ok = el('button', { className: 'btn-big', text: 'OK', testId: 'combat-lumibloc-ok' });
      ok.type = 'button';
      const card = el('div', { className: 'card combat-lumibloc', testId: 'combat-lumibloc' }, [
        el('div', { className: 'dialog-portrait' }, [paintPortrait(PORTRAITS.lumibloc)]),
        el('p', { className: 'combat-lumibloc-text', text: formatText(text, this.playerName) }),
        ok,
      ]);
      const screen = el('div', { className: 'screen screen-lumibloc' }, [card]);
      ok.addEventListener('click', () => {
        screen.remove();
        resolve();
      });
      this.layer.appendChild(screen);
    });
  }

  /** Fiche des faiblesses : la faiblesse du monstre, et les attaques des golems qui la visent. */
  showSheet(): Promise<void> {
    return new Promise((resolve) => {
      const data = this.sheetData;
      if (!data) {
        resolve();
        return;
      }
      const w: AttackType = data.stage.weakness;
      const rows = data.golems.flatMap((g) =>
        g.attacks.map((a) =>
          el('li', { className: a.type === w ? 'sheet-row sheet-good' : 'sheet-row' }, [
            el('span', { text: TYPE_ICON[a.type] }),
            el('span', { text: `${g.name} : ${a.name}` }),
            el('span', { className: 'sheet-mark', text: a.type === w ? '✔' : '' }),
          ]),
        ),
      );
      const close = el('button', { className: 'btn-big', text: 'Fermer', testId: 'sheet-close' });
      close.type = 'button';
      const card = el('div', { className: 'card sheet-card', testId: 'weakness-sheet' }, [
        el('h2', { className: 'card-title', text: TEXT_SHEET_TITLE }),
        el('p', { className: 'sheet-weak', text: `${data.monster} : ${TEXT_WEAK_AGAINST.toLowerCase()} ${TYPE_ICON[w]} ${TYPE_NAME[w]}` }),
        el('ul', { className: 'sheet-list' }, rows),
        el('p', { className: 'sheet-hint', text: data.golems.some((g) => g.attacks.some((a) => a.type === w)) ? TEXT_SHEET_HINT : TEXT_SHEET_NONE }),
        close,
      ]);
      const screen = el('div', { className: 'screen screen-message' }, [card]);
      close.addEventListener('click', () => {
        screen.remove();
        resolve();
      });
      this.layer.appendChild(screen);
    });
  }

  update(dt: number): void {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.banner.classList.remove('show');
    }
  }

  dispose(): void {
    this.root.remove();
  }
}
