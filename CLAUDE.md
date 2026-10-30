# CLAUDE.md — Les Golémanciens de Cubeterre

Ce projet est un jeu 3D en blocs pour un enfant de 8 ans (CE2), joué sur la tablette Android Xiaomi Pad 7 Pro, sous forme de PWA hébergée sur GitHub Pages.

- **`SPEC.md`** : ce qu'il faut construire. C'est la référence pour le gameplay.
- **`CONTENU.md`** : tous les textes, questions, énigmes et quêtes. Il fait foi. **Ne jamais modifier ni inventer de contenu pédagogique sans le signaler explicitement au parent.**
- **`JALONS.md`** : l'ordre de construction. On ne travaille que sur le jalon demandé.

---

## Stack (imposée)

- **Vite** + **TypeScript** en mode `strict`, sans `any` implicite.
- **Three.js**, avec `WebGLRenderer` et `antialias: false`.
- **Interface en DOM et CSS**, superposée au canvas : menus, dialogues, questions, HUD. Pas de texte rendu dans le WebGL.
- **vite-plugin-pwa** pour le manifeste et le service worker : hors ligne complet, `orientation: landscape`, `display: fullscreen`.
- **Web Audio API** pour toute la musique et les effets, générés par synthèse. **Aucun fichier audio.**
- **IndexedDB** pour la sauvegarde, via une petite couche maison ou `idb`.
- **Tests** : **Vitest** pour la logique, le contenu et la simulation, **Playwright** (Chromium, émulation tablette en paysage 1280×853 avec tactile) pour les parcours de bout en bout.
- Dépendances : les plus légères possible. Il faut justifier toute dépendance autre que celles listées.

## Règles absolues

1. **Aucun fichier média externe** : pas d'image, de son, de modèle ni de police à télécharger. Les textures sont générées sur canvas (pixel art procédural 16×16 dans un atlas), et les modèles sont des assemblages de cubes définis dans le code.
2. **Aucun nom ni élément d'une licence existante** (Minecraft, Kirby, Harry Potter, etc.). Les noms sont ceux de `SPEC.md` et `CONTENU.md`.
3. **Interface en français**, avec une orthographe et une typographie correctes (espaces insécables avant `? ! :`, guillemets « »). Les identifiants de code sont en anglais.
4. **Le contenu vient de `CONTENU.md`** : il est converti en données typées dans `src/data/`. Un test vérifie que les données correspondent au fichier (voir Tests).
5. **Pas de réseau en jeu**, pas de télémétrie, pas d'analytics.
6. **Rien de punitif ni de stressant** : pas de chrono sur les questions, pas de perte de progression.

## Architecture suggérée

```
src/
  main.ts                 démarrage, boucle de jeu
  core/                   scène, renderer, input tactile, caméra, état global, événements
  world/                  génération voxel, chunks, meshing, biomes, structures
  entities/               héros, golems, monstres, PNJ (modèles cubes et animations)
  combat/realtime/        combat dans le monde
  combat/turn/            combat au tour par tour (arène, boss, dragon)
  questions/              moteur : calcul (générateur), énigmes, lecture, difficulté adaptative
  quests/                 quêtes œuf, villageoises, boss ; énigmes du monde
  story/                  textes, outros, dialogues
  ui/                     écrans DOM : titre, HUD, dialogue, question, golems, journal, encyclopédie, parent
  audio/                  synthés, musiques par biome, SFX
  save/                   IndexedDB, schéma versionné, migrations, export/import
  data/                   contenu typé (issu de CONTENU.md), golems, monstres, équilibrage
tests/                    unit/, content/, sim/, e2e/
```

- La **logique de jeu** (combat, questions, progression, sauvegarde) est **pure et indépendante de Three.js**, pour être testable sans rendu.
- L'**équilibrage** est regroupé dans un seul fichier `src/data/balance.ts`, avec les valeurs de `SPEC.md` § 4 à 7 et § 15.

## Budget de performance (Xiaomi Pad 7 Pro)

- **Profils de rendu** (`src/core/quality.ts`) : « Haut » sur la tablette (pixel ratio plafonné à **1,75**, bloom léger en demi-résolution sur les émissifs), « Test » pour la CI et le mode test (pixel ratio plafonné à **1,5**, ni post-traitement, ni ciel en dégradé, ni `textureGrad` : le rendu logiciel de la CI est trop lent). Le test E2E `rendu.spec.ts` couvre le profil Haut.
- **Image** : `NeutralToneMapping` appliqué une seule fois (à l'écran ou dans l'`OutputPass`), sortie sRGB ; ciel en dégradé et lumière par biome (`src/world/lighting.ts`).
- **Cible** : 60 fps, et jamais moins de 50 dans les pires scènes.
- **Chunks** de 16×16×32, avec un **meshing glouton** (greedy meshing) et une géométrie construite une seule fois, ou dans un Web Worker si c'est nécessaire.
- **Matériaux** : `MeshLambertMaterial` avec un seul atlas de textures (tuiles à marges et mipmaps), occlusion ambiante calculée dans les sommets au maillage, émissif HDR pour les éléments lumineux. Brouillard linéaire à la couleur de l'horizon pour limiter la distance de vue (environ 64 blocs).
- **Pas d'ombres temps réel** : une ombre douce (dégradé radial) sous les entités.
- **InstancedMesh** pour la végétation, les caisses et les particules.
- **Moins de 150 draw calls** et **moins de 300 000 triangles** visibles : à vérifier via `renderer.info` dans le mode test (afficher les FPS). Les passes plein écran du post-traitement sont comptées à part.
- **Un seul biome en mémoire**, avec libération des ressources (`dispose`) au changement de biome.

## Tests (obligatoires à chaque jalon)

- **Contenu** :
  - chaque texte a 8 questions ;
  - chaque question et énigme a exactement 1 bonne réponse et le bon nombre de choix (3) ;
  - pas de doublons ;
  - les explications sont présentes ;
  - un parseur lit `CONTENU.md` et compare avec `src/data`.
- **Générateur de calcul** : pour chaque niveau, sur 1000 tirages, la réponse est juste, les 4 choix sont distincts et positifs, et l'explication est cohérente. Toutes les tables de 1 à 10 sont présentes sur l'ensemble des niveaux.
- **Moteur de questions** : pas de répétition tant qu'il reste des questions, et règles adaptatives (+1 après 3 réussites, −1 après 2 erreurs) avec les décalages par attaque.
- **Boucle de lecture** : 2 bonnes réponses font passer ; une erreur renvoie au texte avec 2 nouvelles questions ; la banque se réinitialise correctement.
- **Combat au tour par tour** : dégâts, faiblesses, effets, Ultime une seule fois, changement de golem, soin à la fin d'un combat d'arène, armure du dragon (seul ✨ l'entame à l'étape 1).
- **Simulation d'équilibrage** : elle vérifie les objectifs de `SPEC.md` § 15, avec 70 % de bonnes réponses aléatoires.
- **Énigmes du monde** : solvabilité de la glissade et du bloc de grès (parcours en largeur), et nombre de coups dans les bornes.
- **Sauvegarde** : aller-retour export/import, et migration du schéma.
- **E2E (Playwright)** : parcours du jalon (voir `JALONS.md`), en utilisant le mode test du menu parent pour aller vite.

Commandes attendues : `npm run dev` (avec `--host` pour tester depuis la tablette en Wi-Fi), `npm run build`, `npm test`, `npm run test:e2e`.

## Déploiement

- **GitHub Pages** via GitHub Actions : un workflow `deploy.yml` lance build et tests à chaque push sur `main`, puis publie.
- La `base` de Vite est le nom du dépôt (`/<nom-du-repo>/`). Le manifeste PWA et le service worker doivent respecter cette base.
- Le même fonctionnement que l'appli de dictée déjà hébergée sur GitHub Pages par le parent.

## Méthode de travail

1. **Au début d'un jalon** : relire la section du jalon dans `JALONS.md` et les sections de `SPEC.md` concernées, puis proposer un **plan court** (fichiers, étapes, tests) et attendre la validation.
2. Travailler **par petites étapes**, avec un commit à chaque sous-étape qui fonctionne et des messages de commit en français.
3. **Ne jamais déclarer un jalon fini** tant que `npm test`, `npm run build` et l'E2E du jalon ne passent pas.
4. **À la fin d'un jalon**, écrire un résumé pour le parent :
   - ce qui marche ;
   - comment le tester sur la tablette ;
   - ce qui reste approximatif ;
   - les textes nouveaux à valider (descriptions d'encyclopédie, répliques de quêtes).
5. **En cas d'ambiguïté** dans la spec, poser la question au lieu d'inventer une règle de jeu.
