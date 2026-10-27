import { CONTENT } from '../data/content';
import { presentReading } from '../questions/present';
import { createReadingStats, ReadingLoop } from '../questions/readingLoop';
import { askPlayerName, askQuestion, confetti, showMessage, showStory, showTitle } from '../ui/screens';
import type { Game } from './game';
import type { GameState } from './gameState';
import type { Rng } from './rng';

export type ScreenId = 'title' | 'name' | 'story' | 'question' | 'message' | 'play';

const RETRY_MESSAGE = 'Relis bien le texte, la réponse s’y cache !';

/** Enchaînement des écrans : titre → prénom → texte 1 → Prairie. */
export class App {
  screen: ScreenId = 'title';

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
    await showTitle(this.layer);
    if (!this.state.playerName) {
      this.screen = 'name';
      this.state.playerName = await askPlayerName(this.layer);
    }
    if (!this.state.storiesRead.includes('T1')) await this.readStory('T1');
    this.play();
  }

  play(): void {
    this.screen = 'play';
    this.game.setMode('play');
  }

  /** Boucle de lecture d'un texte, jusqu'à la réussite. */
  async readStory(id: string): Promise<void> {
    const story = CONTENT.stories.find((s) => s.id === id);
    if (!story) throw new Error(`Texte inconnu : ${id}`);
    const stats = (this.state.readingStats[id] ??= createReadingStats());
    const loop = new ReadingLoop(story, this.rng, stats);
    const name = this.state.playerName;

    for (;;) {
      this.screen = 'story';
      await showStory(this.layer, story, name, loop.waitSeconds * this.timeScale);
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
        return;
      }
      await showMessage(this.layer, RETRY_MESSAGE, 'Relire le texte', name, 'reading-retry');
      loop.reread();
    }
  }
}
