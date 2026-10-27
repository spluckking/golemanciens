/** Types du contenu issu de CONTENU.md. Les choix sont dans l'ordre du fichier. */

export interface ReadingQuestion {
  text: string;
  choices: string[];
  /** Index de la bonne réponse dans choices. */
  answer: number;
}

export interface StoryText {
  id: string;
  title: string;
  paragraphs: string[];
  questions: ReadingQuestion[];
}

export interface Outro {
  id: string;
  /** Moment de l'outro, par exemple « après le Roi Slime ». */
  when: string;
  text: string;
}

export interface Riddle {
  id: string;
  level: number;
  text: string;
  choices: string[];
  answer: number;
  explanation: string;
}

export type LumiblocLineKey =
  | 'tutorialMove'
  | 'tutorialCrate'
  | 'hatching'
  | 'firstArena'
  | 'weakness'
  | 'combatMistake'
  | 'defeat'
  | 'firstEvolutionItem'
  | 'meal'
  | 'galaxy'
  | 'pause';

export interface Content {
  stories: StoryText[];
  outros: Outro[];
  riddles: Riddle[];
  lumibloc: Record<LumiblocLineKey, string>;
}
