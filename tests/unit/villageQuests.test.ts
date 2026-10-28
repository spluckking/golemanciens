import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QUESTS_P1 } from '../../src/data/quests';
import { QuestBook, createQuestLog, questLine } from '../../src/quests/villageQuests';

const names = { mereBrique: 'Mère Brique', paquerette: 'Pâquerette', gaston: 'Gaston' } as const;
const npcName = (id: keyof typeof names): string => names[id];

function book(): QuestBook {
  const b = new QuestBook(createQuestLog());
  b.unlockAll();
  return b;
}

describe('contenu des quêtes de la phase 1', () => {
  it('3 obligatoires et 2 facultatives, titres et personnages de CONTENU.md', () => {
    const md = readFileSync('CONTENU.md', 'utf8');
    expect(QUESTS_P1.filter((q) => q.mandatory).map((q) => q.id)).toEqual(['R1', 'R2', 'R3']);
    expect(QUESTS_P1.filter((q) => !q.mandatory).map((q) => q.id)).toEqual(['O1', 'O2']);
    for (const q of QUESTS_P1) {
      expect(md).toContain(`**${q.id} ${q.title}**`);
      expect(q.request.length).toBeGreaterThan(10);
      expect(q.thanks.length).toBeGreaterThan(10);
    }
    expect(md).toContain('ramener 3 poules');
    expect(md).toContain('cueillir 5 fleurs jaunes');
  });
});

describe('déroulé d’une quête', () => {
  it('verrouillées avant l’éclosion, puis proposées', () => {
    const b = new QuestBook(createQuestLog());
    expect(b.talk('mereBrique')).toEqual({ kind: 'none' });
    expect(b.marker('mereBrique')).toBeNull();
    b.unlockAll();
    expect(b.marker('mereBrique')).toBe('give');
  });

  it('accepter, avancer, rendre : +5 🍎 pour une obligatoire', () => {
    const b = book();
    const r = b.talk('mereBrique');
    expect(r.kind).toBe('request');
    expect(r.kind === 'request' && r.quest.id).toBe('R1');
    b.increment('R1');
    b.increment('R1');
    expect(b.state('R1')).toEqual({ status: 'active', progress: 2 });
    expect(b.talk('mereBrique').kind).toBe('request'); // elle propose ensuite R3
    expect(b.talk('mereBrique').kind).toBe('reminder');
    b.increment('R1');
    expect(b.state('R1').status).toBe('ready');
    expect(b.marker('mereBrique')).toBe('return');
    expect(b.talk('mereBrique')).toMatchObject({ kind: 'thanks', reward: 5 });
    expect(b.state('R1').status).toBe('done');
  });

  it('le panier : prêt dès qu’on l’accepte, et on le rend à Gaston', () => {
    const b = book();
    expect(b.talk('paquerette')).toMatchObject({ kind: 'request', quest: { id: 'R2' } });
    expect(b.state('R2').status).toBe('ready');
    expect(b.marker('gaston')).toBe('return');
    expect(b.talk('gaston')).toMatchObject({ kind: 'thanks', quest: { id: 'R2' }, reward: 5 });
  });

  it('le bouquet se rend à Mère Brique : +3 🍎 pour une facultative', () => {
    const b = book();
    b.talk('paquerette'); // R2 d'abord (obligatoire)
    expect(b.talk('paquerette')).toMatchObject({ kind: 'request', quest: { id: 'O2' } });
    b.setProgress('O2', 9);
    expect(b.state('O2')).toEqual({ status: 'ready', progress: 5 });
    // Rendre une quête passe avant d'en proposer une nouvelle.
    expect(b.talk('mereBrique')).toMatchObject({ kind: 'thanks', quest: { id: 'O2' }, reward: 3 });
    expect(b.talk('mereBrique')).toMatchObject({ kind: 'request', quest: { id: 'R1' } });
  });

  it('l’avancement ne compte que pour une quête en cours', () => {
    const b = book();
    b.increment('R3');
    expect(b.state('R3').progress).toBe(0);
  });
});

describe('objectif mis en avant', () => {
  it('obligatoires d’abord, puis l’arène, puis les facultatives', () => {
    const b = book();
    expect(b.objective()).toMatchObject({ kind: 'npc', npc: 'mereBrique', why: 'give' });
    b.talk('mereBrique');
    expect(b.objective()).toMatchObject({ kind: 'task', quest: { id: 'R1' } });
    b.setProgress('R1', 3);
    expect(b.objective()).toMatchObject({ kind: 'npc', npc: 'mereBrique', why: 'return' });
    b.talk('mereBrique');
    b.talk('mereBrique');
    b.setProgress('R3', 2);
    b.talk('mereBrique');
    b.talk('paquerette');
    b.talk('gaston');
    expect(b.mandatoryDone).toBe(true);
    expect(b.objective()).toEqual({ kind: 'arena' });
  });

  it('textes du journal', () => {
    const b = book();
    const r1 = b.def('R1');
    expect(questLine(r1, b.state('R1'), npcName)).toBe('Mère Brique a besoin d’aide');
    b.talk('mereBrique');
    b.increment('R1');
    expect(questLine(r1, b.state('R1'), npcName)).toBe('Les poules envolées : Ramener les poules dans l’enclos (1/3)');
    b.setProgress('R1', 3);
    expect(questLine(r1, b.state('R1'), npcName)).toBe('Les poules envolées : retourne voir Mère Brique');
  });
});
