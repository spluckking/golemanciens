import { CONTENT } from '../data/content';
import { presentReading } from '../questions/present';
import { createReadingStats, ReadingLoop } from '../questions/readingLoop';
import { CINEMATICS, storyCaptions } from '../story/cinematics';
import { exportSave, parseSave, SaveError } from '../save/saveFile';
import { clearGame, saveGame } from '../save/store';
import { askParentCode, openParentMenu, type ParentActions } from '../ui/parentMenu';
import { askPlayerName, askQuestion, confetti, showMessage, showStory, showTitle } from '../ui/screens';
import { checkpointState } from './checkpoints';
import type { Game } from './game';
import type { GameState } from './gameState';
import type { Rng } from './rng';

export type ScreenId = 'title' | 'name' | 'cinematic' | 'story' | 'question' | 'message' | 'play';

const RETRY_MESSAGE = 'Relis bien le texte, la réponse s’y cache !';

/** Enchaînement des écrans : titre → prénom → cinématique et questions du texte 1 → Prairie. */
export class App {
  screen: ScreenId = 'title';
  /** Le parent a demandé à voir la fin du jeu depuis le menu parent. */
  private finaleRequested = false;

  constructor(
    private readonly game: Game,
    private readonly layer: HTMLElement,
    readonly state: GameState,
    private readonly rng: Rng,
    /** Mode test : accélère les attentes (1 = temps normal). */
    private readonly timeScale = 1,
  ) {}

  async start(): Promise<void> {
    this.game.setMode('title');
    this.screen = 'title';
    // Partie déjà commencée : « Continuer » (on ne peut effacer la partie que depuis le menu parent).
    // Un appui long sur le logo ouvre le menu parent (code), puis on revient au titre.
    while ((await showTitle(this.layer, this.state.playerName ? 'Continuer' : 'Jouer')) === 'parent') {
      if (!(await askParentCode(this.layer, this.state.settings.parentCode))) continue;
      await openParentMenu(this.layer, this.parentActions());
      if (this.finaleRequested) {
        this.finaleRequested = false;
        this.screen = 'cinematic';
        await this.game.playOutro('O6', 0, false);
        this.game.setMode('title');
        this.screen = 'title';
      }
    }
    if (!this.state.playerName) {
      this.screen = 'name';
      this.state.playerName = await askPlayerName(this.layer);
    }
    if (!this.state.storiesRead.includes('T1')) await this.readStory('T1');
    this.play();
  }

  /** Actions du menu parent : enregistrer, exporter, importer, réinitialiser, aller à un moment du chapitre. */
  private parentActions(): ParentActions {
    const reload = (): void => window.location.reload();
    return {
      state: this.state,
      save: () => this.game.save(),
      applySettings: () => this.game.applySettings(),
      exportFile: () => {
        const blob = new Blob([exportSave(this.state)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const day = new Date().toISOString().slice(0, 10);
        a.download = `golemanciens-${this.state.playerName || 'partie'}-${day}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      },
      importFile: async (text) => {
        try {
          const state = parseSave(text);
          if (!(await saveGame(state))) return 'Impossible d’enregistrer la partie importée.';
          reload();
          return null;
        } catch (e) {
          return e instanceof SaveError ? e.message : 'Ce fichier n’est pas une sauvegarde valide.';
        }
      },
      reset: async () => {
        await clearGame();
        reload();
      },
      previewFinale: () => {
        this.finaleRequested = true;
      },
      checkpoint: async (id) => {
        await saveGame(checkpointState(this.state, id));
        reload();
      },
    };
  }

  play(): void {
    this.screen = 'play';
    this.game.setMode('play');
  }

  /**
   * Boucle de lecture d'un texte, jusqu'à la réussite (SPEC.md § 9.1). La première fois, le texte est
   * raconté par sa cinématique ; après une erreur, elle n'est pas rejouée : le texte entier s'affiche
   * en une seule bulle.
   */
  async readStory(id: string): Promise<void> {
    const story = CONTENT.stories.find((s) => s.id === id);
    if (!story) throw new Error(`Texte inconnu : ${id}`);
    const stats = (this.state.readingStats[id] ??= createReadingStats());
    const loop = new ReadingLoop(story, this.rng, stats);
    const name = this.state.playerName;

    const script = CINEMATICS[id];
    let first = true;
    for (;;) {
      if (first && script) {
        this.screen = 'cinematic';
        await this.game.playCinematic(script, storyCaptions(story, script), { skippable: false, timeScale: this.timeScale });
      } else {
        this.screen = 'story';
        await showStory(this.layer, story, name, loop.waitSeconds * this.timeScale);
      }
      first = false;
      loop.finishReading();
      while (loop.phase === 'questions') {
        const q = loop.currentQuestion();
        if (!q) break;
        const view = presentReading(q, this.rng);
        this.screen = 'question';
        const chosen = await askQuestion(this.layer, view, name, `Question ${loop.questionNumber + 1} sur ${loop.roundIndices.length}`);
        loop.answer(view.sourceIndex[chosen]);
      }
      this.screen = 'message';
      if (loop.phase === 'success') {
        confetti(this.layer);
        await showMessage(this.layer, 'Bravo, {prenom} !', 'Continuer', name, 'reading-success');
        this.state.storiesRead.push(id);
        this.game.save();
        return;
      }
      await showMessage(this.layer, RETRY_MESSAGE, 'Relire le texte', name, 'reading-retry');
      loop.reread();
    }
  }
}
