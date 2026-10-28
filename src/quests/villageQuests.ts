import { QUEST_REWARD, QUESTS_P1, type QuestDef, type QuestId, type QuestNpc } from '../data/quests';

/**
 * Quêtes villageoises (SPEC.md § 10.2), sans rendu : on parle à un villageois pour accepter
 * une quête, on l'accomplit dans le monde, puis on revient la rendre pour gagner des 🍎.
 * Les 3 quêtes obligatoires ouvrent l'arène ; les 2 facultatives restent disponibles.
 */

/** locked : pas encore proposée (avant l'éclosion) ; ready : accomplie, à rendre. */
export type QuestStatus = 'locked' | 'available' | 'active' | 'ready' | 'done';

export interface QuestState {
  status: QuestStatus;
  progress: number;
}

export type QuestLog = Record<QuestId, QuestState>;

export function createQuestLog(defs: readonly QuestDef[] = QUESTS_P1): QuestLog {
  return Object.fromEntries(defs.map((d) => [d.id, { status: 'locked', progress: 0 }])) as QuestLog;
}

export type TalkResult =
  | { kind: 'thanks'; quest: QuestDef; reward: number }
  | { kind: 'request'; quest: QuestDef }
  | { kind: 'reminder'; quest: QuestDef }
  | { kind: 'none' };

/** Ce que la boussole et le journal mettent en avant. */
export type Objective =
  | { kind: 'npc'; npc: QuestNpc; quest: QuestDef; why: 'give' | 'return' }
  | { kind: 'task'; quest: QuestDef }
  | { kind: 'arena' }
  | { kind: 'none' };

export class QuestBook {
  constructor(
    readonly log: QuestLog,
    readonly defs: readonly QuestDef[] = QUESTS_P1,
  ) {}

  state(id: QuestId): QuestState {
    return this.log[id];
  }

  def(id: QuestId): QuestDef {
    const d = this.defs.find((x) => x.id === id);
    if (!d) throw new Error(`Quête inconnue : ${id}`);
    return d;
  }

  /** Après l'éclosion : toutes les quêtes du village sont proposées. */
  unlockAll(): void {
    for (const d of this.defs) if (this.log[d.id].status === 'locked') this.log[d.id].status = 'available';
  }

  /** Obligatoires d'abord, puis dans l'ordre du fichier. */
  private ordered(): QuestDef[] {
    return [...this.defs.filter((d) => d.mandatory), ...this.defs.filter((d) => !d.mandatory)];
  }

  /** On parle à un villageois : rendre une quête, en accepter une, ou se faire rappeler la quête en cours. */
  talk(npc: QuestNpc): TalkResult {
    const all = this.ordered();
    const ready = all.find((d) => d.turnIn === npc && this.log[d.id].status === 'ready');
    if (ready) {
      this.log[ready.id].status = 'done';
      return { kind: 'thanks', quest: ready, reward: ready.mandatory ? QUEST_REWARD.mandatory : QUEST_REWARD.optional };
    }
    const offer = all.find((d) => d.giver === npc && this.log[d.id].status === 'available');
    if (offer) {
      const st = this.log[offer.id];
      st.status = 'active';
      if (offer.delivery) {
        st.progress = offer.goal;
        st.status = 'ready';
      }
      return { kind: 'request', quest: offer };
    }
    const current = all.find((d) => d.giver === npc && (this.log[d.id].status === 'active' || this.log[d.id].status === 'ready'));
    if (current) return { kind: 'reminder', quest: current };
    return { kind: 'none' };
  }

  /** Avancement d'une quête en cours (borné à l'objectif) ; elle devient « à rendre » une fois l'objectif atteint. */
  setProgress(id: QuestId, n: number): void {
    const st = this.log[id];
    if (st.status !== 'active') return;
    const goal = this.def(id).goal;
    st.progress = Math.max(0, Math.min(goal, n));
    if (st.progress >= goal) st.status = 'ready';
  }

  increment(id: QuestId): void {
    this.setProgress(id, this.log[id].progress + 1);
  }

  isActive(id: QuestId): boolean {
    return this.log[id].status === 'active';
  }

  /** Marqueur au-dessus d'un villageois : une quête à proposer, ou une quête à lui rendre. */
  marker(npc: QuestNpc): 'give' | 'return' | null {
    if (this.defs.some((d) => d.turnIn === npc && this.log[d.id].status === 'ready')) return 'return';
    if (this.defs.some((d) => d.giver === npc && this.log[d.id].status === 'available')) return 'give';
    return null;
  }

  get mandatoryDone(): boolean {
    return this.defs.filter((d) => d.mandatory).every((d) => this.log[d.id].status === 'done');
  }

  get unlocked(): boolean {
    return this.defs.some((d) => this.log[d.id].status !== 'locked');
  }

  /** Objectif mis en avant : les quêtes obligatoires d'abord, puis l'arène, puis les facultatives. */
  objective(): Objective {
    const pick = (defs: QuestDef[]): Objective | null => {
      for (const d of defs) if (this.log[d.id].status === 'ready') return { kind: 'npc', npc: d.turnIn, quest: d, why: 'return' };
      for (const d of defs) if (this.log[d.id].status === 'active') return { kind: 'task', quest: d };
      for (const d of defs) if (this.log[d.id].status === 'available') return { kind: 'npc', npc: d.giver, quest: d, why: 'give' };
      return null;
    };
    const mandatory = this.defs.filter((d) => d.mandatory);
    const optional = this.defs.filter((d) => !d.mandatory);
    return pick(mandatory) ?? (this.mandatoryDone && this.unlocked ? { kind: 'arena' } : null) ?? pick(optional) ?? { kind: 'none' };
  }
}

/** Texte d'une quête pour le journal : son objectif avec l'avancement, ou à qui la rendre. */
export function questLine(def: QuestDef, st: QuestState, npcName: (id: QuestNpc) => string): string {
  if (st.status === 'ready') return `${def.title} : retourne voir ${npcName(def.turnIn)}`;
  if (st.status === 'available') return `${npcName(def.giver)} a besoin d’aide`;
  return `${def.title} : ${def.task.replace('{n}', String(st.progress)).replace('{goal}', String(def.goal))}`;
}
