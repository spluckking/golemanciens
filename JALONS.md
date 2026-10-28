# Jalons de construction et prompts pour Claude Code

## Avant de commencer (une seule fois)

1. Crée un **nouveau dépôt GitHub**, par exemple `golemanciens`, séparé de l'appli de dictée. Active GitHub Pages avec la source « GitHub Actions ».
2. Clone-le sur ton PC, puis copie à la racine les 4 fichiers : `SPEC.md`, `CONTENU.md`, `CLAUDE.md` et `JALONS.md`. Fais un commit.
3. Ouvre Claude Code **dans ce dossier**.
4. Pour chaque jalon, colle le prompt correspondant ci-dessous. Valide le plan proposé, laisse travailler, puis teste sur la tablette avant de passer au jalon suivant.

> Astuce de test : avec `npm run dev -- --host`, ouvre l'adresse IP de ton PC affichée dans le terminal depuis le navigateur de la tablette (même Wi-Fi). Pour la version installée hors ligne, utilise l'URL GitHub Pages, puis « Ajouter à l'écran d'accueil ».

---

## Jalon 1 — Socle et chapitre 1 complet (Prairie)

```
Lis CLAUDE.md, SPEC.md (en entier) et CONTENU.md (sections A/T1, B/O1, C, D/S1, E/Phase 1, F/P1, G).
Nous démarrons le JALON 1 de JALONS.md : le socle du jeu et le chapitre 1 (Prairie de Cubeterre), jouable de bout en bout.

Travaille en 5 sous-étapes. Fais un commit et un point d'étape à la fin de chacune :
1.1 Projet : Vite + TS strict + Three.js + PWA + Vitest + Playwright + workflow GitHub Pages.
    Rendu voxel (chunks, greedy meshing, atlas procédural), biome Prairie avec l'Académie,
    héros avec contrôles tactiles (joystick, caméra au doigt, saut, attaque, interagir), compteur FPS.
1.2 Données et moteur de questions : conversion de CONTENU.md en src/data (avec le test de correspondance),
    générateur de calcul niveaux 1 à 6, banque d'énigmes, difficulté adaptative, boucle de lecture (T1),
    écran titre, saisie du prénom.
1.3 Monde vivant : golems Pierre et Mousse (modèles cubes, stade 1), qui suivent le héros ;
    monstres de la phase 1 neutres, avec abandon de poursuite ; combat temps réel ; caisses ; 🍎 ; PV qui remontent ; K.O. ;
    PNJ, dialogues avec bouton 🔊, journal, boussole.
1.4 Quêtes : sanctuaire S1 (pierre-énigme + dalles fleuries, éclosion avec choix), 5 quêtes du village,
    arène du biome (combat au tour par tour N contre N avec questions, faiblesses), quête P1, boss Roi Slime (2 étapes), outro O1.
    Révision 1.4 : types d'attaque et leçon des faiblesses, moteur de cinématiques (intro T1, outro O1),
    maison du joueur au village (lit, étagère à trophées, golem de maison).
1.5 Autour du jeu : sauvegarde IndexedDB auto + export/import, menu parent (stats, réglages, mode test, FPS),
    écran Golems avec Repas, encyclopédie, rappel de pause, audio (musique Prairie, arène, boss + SFX ;
    révision 1.4 : musique et bruitages des cinématiques).
1.6 Cinématique de l'outro finale O6 (décor de volcan dédié, dragon, médaille, générique), visible depuis le mode test.

Critères d'acceptation du jalon 1 :
- npm test, npm run build et l'E2E « chapitre 1 » passent.
  L'E2E fait : titre → prénom → lecture T1 (avec une erreur pour vérifier la boucle) → sanctuaire → choix du golem
  → 3 quêtes → arène 3 victoires → boss → outro. Le mode test peut accélérer les combats.
- Au moins 55 fps en exploration dans le navigateur Chrome Android de la tablette (pixel ratio plafonné à 1,5).
- Le jeu fonctionne hors ligne après installation depuis GitHub Pages.
- Fermer brutalement l'appli pendant une quête, puis la rouvrir : la progression est conservée.
- La simulation d'équilibrage de la phase 1 respecte SPEC.md § 15.

Commence par me proposer ton plan pour la sous-étape 1.1.
```

---

## Jalon 2 — Chapitre 2 (Forêt Murmurante) et évolution stade 2

```
Lis CLAUDE.md, SPEC.md (§ 1, 2, 4.3, 5, 7, 10) et CONTENU.md (T2, O2, D/S2, E/Phase 2, F/P2).
JALON 2 : chapitre 2 complet, et premier système d'évolution.

À faire :
- Biome Forêt Murmurante (grands arbres, cabanes reliées par passerelles), Arche des éclats à l'Académie
  pour voyager entre biomes débloqués, et arche de retour.
- Golems Écorce et Champignon. Monstres de la phase 2. Effets Étourdi et Endormi.
- Sanctuaire S2 (2 pierres niveau 2 + 3 leviers + canaux d'eau ⚙️, avec test de solvabilité et du nombre de rotations). Quêtes villageoises de la phase 2. Arène. Quête P2. Reine Araignée. Outro O2.
- Runes d'éveil (1 cachée + 1 donnée par le boss) : évolution vers le stade 2 (stats, attaque A2 Magie qui déclenche une énigme,
  modèle plus grand avec runes lumineuses, animation). L'interface grise les golems qui ne sont pas au bon stade.
- Combats libres à l'arène 1 après sa fin (+2 🍎).
- Musique de la Forêt. Descriptions d'encyclopédie des nouvelles entités.

Critères d'acceptation : tests et build OK ; E2E « chapitre 2 » (en démarrant au chapitre 2 via le mode test) ;
simulation de la phase 2 conforme ; au moins 55 fps dans la forêt (attention à la densité de feuillage).
Propose d'abord ton plan.
```

---

## Jalon 3 — Chapitre 3 (Désert) et stade 3

```
Lis CLAUDE.md, SPEC.md (§ 4.3, 7.1 effets) et CONTENU.md (T3, O3, D/S3, E/Phase 3, F/P3).
JALON 3 : chapitre 3 complet et évolution vers le stade 3.

À faire :
- Biome Désert (dunes, oasis, temple ensablé). Golems Sable et Cuivre. Monstres de la phase 3. Effet Aveuglé.
- Sanctuaire S3 : bloc de grès (avec test de solvabilité par parcours en largeur), miroirs du soleil ⚙️ (test du trajet du rayon
  et du nombre de rotations), dalles-symboles, pierre niveau 3.
- Quêtes de la phase 3, arène, quête P3, Grand Ver des Sables (il plonge et ressurgit), outro O3.
- Cristaux de puissance : stade 3, attaque A3 avec effet (décalage de difficulté +1), éléments visuels propres au type.
- Musique du Désert. Encyclopédie.

Critères d'acceptation : tests, build, E2E « chapitre 3 » et simulation de la phase 3 OK ; au moins 55 fps.
Propose d'abord ton plan.
```

---

## Jalon 4 — Chapitre 4 (Pics de Givre) et stade 4

```
Lis CLAUDE.md, SPEC.md (§ 4.3, 7.1 Ultime et Bouclier) et CONTENU.md (T4, O4, D/S4, E/Phase 4, F/P4).
JALON 4 : chapitre 4 complet et évolution vers le stade 4.

À faire :
- Biome Pics de Givre (neige, lac gelé, igloos, tempête visuelle légère). Golems Glace et Cristal. Monstres de la phase 4. Effet Bouclier.
- Sanctuaire S4 : glissade (avec test de solvabilité en 3 à 5 coups), mémoire de glace, moulin gelé ⚙️ (test : seules
  les deux petites roues donnent le bon sens), 2 pierres niveau 4.
- Quêtes de la phase 4, arène, quête P4 (braseros dans la tempête), Sorcière du Blizzard, outro O4.
- Cœurs ancestraux : stade 4, Ultime (une fois par combat, décalage +2, bouton qui brille), aura.
- Musique des Pics de Givre. Encyclopédie.

Critères d'acceptation : tests, build, E2E « chapitre 4 » et simulation de la phase 4 OK ; au moins 55 fps malgré la neige (particules instanciées).
Propose d'abord ton plan.
```

---

## Jalon 5 — Chapitre 5 (Île Céleste) et Golem Galaxie

```
Lis CLAUDE.md, SPEC.md (§ 4.3 Galaxie et garantie, § 5.1) et CONTENU.md (T5, O5, D/S5, E/Phase 5, F/P5).
JALON 5 : chapitre 5 complet et évolution Galaxie.

À faire :
- Biome Île Céleste (îlots flottants, ponts arc-en-ciel, tours). Golems Nuage et Arc-en-ciel (bonus ×1,5 permanent).
  Monstres de la phase 5. Chutes sans dégâts (retour à la dernière plateforme sûre).
- Sanctuaire S5 : nuages arc-en-ciel (6 couleurs), balance à contrepoids ⚙️ (toute combinaison égale à 8, herse animée), 2 pierres niveau 5.
- Quêtes de la phase 5, arène, quête P5, Griffon d'Ombre, outro O5 avec la cérémonie de la Poussière d'étoile :
  choix d'un golem au stade 4, transformation en Galaxie (nouveau modèle étoilé, attaques ✨).
  Garantie : si aucun golem n'est au stade 4, Lumibloc donne les objets manquants.
- Musique de l'Île Céleste. Encyclopédie.

Critères d'acceptation : tests, build, E2E « chapitre 5 » et simulation de la phase 5 OK ;
test unitaire de la garantie Galaxie ; au moins 55 fps.
Propose d'abord ton plan.
```

---

## Jalon 6 — Finale, fin du jeu et finitions

```
Lis CLAUDE.md, SPEC.md (en entier, en particulier § 5.1 Dragon, § 15, § 17) et CONTENU.md (T6, O6, F/Finale).
JALON 6 : finale et finitions.

À faire :
- Biome Volcan d'Ombre (lave non mortelle qui fait reculer, fumée, pont de pierre noire, cratère).
  Traversée avec 2 ou 3 groupes de monstres renforcés.
- Lecture T6. Dragon d'Ombre en 3 étapes : armure que seul ✨ entame à l'étape 1, puis vol et souffle, puis colère.
  Musique épique. Outro O6, puis générique de fin (avec le prénom), puis retour au hub en mode « jeu terminé »
  (biomes et arènes libres restent accessibles).
- Finitions :
  - vérifier tous les critères de SPEC.md § 17 ;
  - passe d'équilibrage complète avec la simulation sur les 6 chapitres ;
  - vérifier que les tables de 1 à 10 apparaissent ;
  - polir les animations, les sons et l'accessibilité (taille des boutons, contrastes) ;
  - relire tous les textes de l'interface (orthographe, espaces insécables).
- Rapport final pour le parent : durée estimée par chapitre, liste des textes ajoutés hors CONTENU.md, points de vigilance.

Critères d'acceptation : tous les tests passent, y compris l'E2E « finale » ; checklist de SPEC.md § 17 cochée point par point
dans le rapport ; au moins 50 fps pendant le combat du dragon (particules).
Propose d'abord ton plan.
```
