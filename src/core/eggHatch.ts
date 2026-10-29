import { GOLEMS, type GolemSpecies } from '../data/creatures';
import { TEXT_WELCOME_GOLEM } from '../data/sanctuaries';
import type { CubeModel } from '../entities/cubeModel';
import type { ModelId } from '../entities/models';
import { lumiblocLine } from '../story/dialogues';
import { audio } from '../audio/audio';
import { createGolem, markSeen, type GameState } from './gameState';
import type { SanctuaryHooks } from './sanctuaryLife';

/** Silhouette de chaque golem, pendant que l'œuf hésite. */
const SHADOWS: Record<GolemSpecies, ModelId> = {
  pierre: 'shadowPierre',
  mousse: 'shadowMousse',
  ecorce: 'shadowEcorce',
  champignon: 'shadowChampignon',
  sable: 'shadowSable',
  cuivre: 'shadowCuivre',
};

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export interface HatchScene {
  egg: CubeModel;
  nest: { x: number; z: number };
  floorY: number;
  choices: readonly GolemSpecies[];
  /** Pose un modèle au sol du sanctuaire (cap en radians). */
  place: (id: ModelId, x: number, z: number, facing: number) => CubeModel;
  /** L'œuf tremble pendant ce nombre de secondes. */
  wobble: (seconds: number) => void;
}

/**
 * Éclosion (SPEC.md § 4.2) : l'œuf tremble et éclot ; deux silhouettes apparaissent ; le joueur
 * choisit, puis donne un surnom s'il veut. Le golem rejoint l'équipe. Commune à tous les sanctuaires.
 */
export async function hatchEgg(scene: HatchScene, state: GameState, hooks: SanctuaryHooks): Promise<GolemSpecies> {
  const { x, z } = scene.nest;
  const y = scene.floorY;
  // Le héros recule un peu : la caméra voit le nid et les deux silhouettes.
  hooks.placeHero(x - 3.4, z, -Math.PI / 2);
  hooks.dialog.show(lumiblocLine('hatching'));
  scene.wobble(1.6);
  await wait(1600);
  scene.egg.root.visible = false;
  hooks.burst(x, y + 0.8, z, 0xf6efdc, 30);
  audio.sfx('shatter');

  // Silhouettes : à gauche et à droite du nid, vues depuis la porte (gauche = nord).
  const shadows = scene.choices.map((species, i) => {
    const m = scene.place(SHADOWS[species], x - 0.6, z + (i === 0 ? -1.6 : 1.6), Math.PI / 2);
    hooks.burst(m.root.position.x, y + 1, m.root.position.z, 0x9a8ad0, 14);
    return { species, model: m };
  });
  for (const s of scene.choices) markSeen(state, s);
  await wait(1400);
  hooks.dialog.close();
  const species = await hooks.chooseGolem(scene.choices);

  // La silhouette choisie prend ses couleurs, l'autre s'efface.
  for (const s of shadows) {
    s.model.root.removeFromParent();
    if (s.species !== species) hooks.burst(s.model.root.position.x, y + 1, s.model.root.position.z, 0x9a8ad0, 10);
  }
  const chosen = shadows.find((s) => s.species === species)!;
  const golem = scene.place(species, chosen.model.root.position.x, chosen.model.root.position.z, Math.PI / 2);
  hooks.burst(golem.root.position.x, y + 1, golem.root.position.z, 0xffe27a, 30);
  audio.sfx('hatch');
  await wait(500);
  const nickname = await hooks.askNickname(species);
  golem.root.removeFromParent();

  state.golems.push(createGolem(species, nickname));
  hooks.toast(TEXT_WELCOME_GOLEM.replace('{nom}', nickname || GOLEMS[species].name));
  return species;
}
