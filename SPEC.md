# Les Golémanciens de Cubeterre — Spécification du jeu

> Document maître. Il décrit **quoi** construire. Les règles techniques (**comment**) sont dans `CLAUDE.md`. Tous les textes, questions, énigmes et quêtes sont dans `CONTENU.md`, qui fait foi pour le contenu.

---

## 0. Vision et contraintes

- **Public** : un garçon de 8 ans en CE2. Il joue seul, en français, sur tablette.
- **Appareil cible** : Xiaomi Pad 7 Pro (Android 15, Snapdragon 8s Gen 3, écran 11,2" en 3200×2136 à 144 Hz), tenue en **paysage**, uniquement au tactile.
- **Durée** : environ **5 h** pour finir le jeu, en 6 chapitres d'environ 50 min.
- **Genre** : aventure 3D en blocs (voxels), avec des golems compagnons, des combats en temps réel dans le monde et des combats au tour par tour **pédagogiques** (calcul et énigmes) dans l'arène et contre les boss. Une histoire avec questions de lecture accompagne le tout.
- **Originalité obligatoire** : aucun nom, personnage, texture, son ou logo issu de Minecraft, Kirby, Harry Potter ou d'une autre licence. Les inspirations se limitent à l'ambiance : monde en blocs, école de magie, univers coloré et mignon.
- **Tout est généré par le code** : modèles en cubes, textures procédurales (canvas), sons et musique en Web Audio. Aucun fichier média externe.
- **Hors ligne** : PWA installable, qui fonctionne sans réseau après la première visite.
- **Bienveillance** : jamais de punition lourde, de chrono stressant, de pub, d'achat ou de collecte de données.

---

## 1. Structure du jeu

### 1.1 Les 6 chapitres

| # | Chapitre | Village | Œuf (choix entre 2 golems) | Objet d'évolution | Boss |
|---|---|---|---|---|---|
| 1 | Prairie de Cubeterre (avec l'Académie, le hub) | Ferme-des-Blocs | Pierre ou Mousse | — | Roi Slime |
| 2 | Forêt Murmurante | Cabanes des Cimes | Écorce ou Champignon | 2× Rune d'éveil | Reine Araignée |
| 3 | Désert des Sables Chantants | Oasis de Palmebloc | Sable ou Cuivre | 2× Cristal de puissance | Grand Ver des Sables |
| 4 | Pics de Givre | Igloos du Col | Glace ou Cristal | 2× Cœur ancestral | Sorcière du Blizzard |
| 5 | Île Céleste | Village des Nuages | Nuage ou Arc-en-ciel | 1× Poussière d'étoile (fin de phase) | Griffon d'Ombre |
| 6 | Volcan d'Ombre (finale) | — | — | — | Dragon d'Ombre (3 étapes) |

### 1.2 Déroulé d'une phase (chapitres 1 à 5)

1. **Cinématique d'introduction et questions de lecture**, en boucle jusqu'à réussite (§ 9.1 et § 9.4).
2. **Quête de l'œuf** : un sanctuaire fermé par des énigmes de difficulté progressive (§ 10.1). L'œuf éclot, puis le joueur **choisit** l'un des 2 golems de la phase.
3. **Quêtes villageoises** : 3 quêtes obligatoires qui rapportent de la nourriture. Quand elles sont toutes faites, l'**arène du biome** s'ouvre. 2 quêtes facultatives restent disponibles.
4. **Arène** : 3 combats au tour par tour en **N contre N**, où N est le nombre de golems possédés. Quand les 3 sont gagnés, l'arène est « terminée ».
5. **Quête du boss** (débloquée après l'arène), puis **combat contre le boss**. Le boss donne l'éclat de Pierre-Étoile et l'objet d'évolution « boss » de la phase.
6. **Outro** : une courte cinématique qui raconte un texte de 40 à 60 mots, avec l'éclat qui rejoint l'Académie. Il n'y a pas de questions sur l'outro. Un trophée du boss apparaît dans la maison du joueur (§ 18). La phase suivante est alors débloquée.

L'objet d'évolution **caché** de chaque phase (2 à 4) peut être trouvé à tout moment dans le biome.

**Chapitre 6 (finale)** : texte d'introduction et questions de lecture, traversée du volcan (monstres, puis un court chemin), combat contre le Dragon, outro de fin, puis générique.

### 1.3 Hub et voyages

- L'**Académie des Golémanciens** se trouve dans la Prairie. Une **Arche des éclats** permet d'aller dans tout biome déjà débloqué.
- Chaque biome possède une arche de retour vers l'Académie.
- On peut revenir dans un biome terminé pour faire les quêtes facultatives ou des combats d'arène libres, afin de gagner de la nourriture.

---

## 2. Monde et biomes

- **Chaque biome est une scène séparée** d'environ 128×128 blocs, sur 32 de hauteur au maximum. Le relief est généré avec une **graine fixe**, puis les structures sont posées à des positions définies.
- **Éléments obligatoires dans chaque biome** :
  - un village (zone sûre, où les monstres n'entrent pas, gardé par des golems gardiens décoratifs et amicaux) ;
  - un sanctuaire de l'œuf ;
  - une arène ;
  - le repaire du boss ;
  - 3 ou 4 camps de monstres, avec un coffre de nourriture chacun ;
  - une vingtaine de caisses à casser (nourriture en petite quantité, parfois rien) ;
  - l'objet d'évolution caché (phases 2 à 4), placé dans un endroit secret mais trouvable ;
  - des points de sauvegarde visibles (lanternes) au village, au sanctuaire et devant le repaire ;
  - dans la Prairie seulement : la **maison du joueur**, au village de Ferme-des-Blocs (§ 18).
- **Ambiance par biome** : palette de couleurs, ciel, brouillard léger et musique propres à chaque biome.
  - **Prairie** : vert tendre, fleurs, ferme, rivière.
  - **Forêt** : très grands arbres, lumière filtrée, cabanes perchées reliées par des passerelles.
  - **Désert** : dunes, palmiers, oasis, temple ensablé.
  - **Pics de Givre** : neige, lac gelé, igloos, sol glissant dans le sanctuaire.
  - **Île Céleste** : îlots flottants, jardins suspendus, ponts arc-en-ciel, tours.
  - **Volcan** : roche noire, rivières de lave (non mortelles : elles font simplement reculer le joueur), fumée.
- **Guidage** : une boussole ou flèche discrète en haut de l'écran pointe vers l'objectif actif. Un journal de quêtes est accessible par un bouton.

---

## 3. Héros et contrôles

- Le **héros** est un apprenti golémancien en uniforme d'école de magie (cape, baguette magique). Son **prénom** est saisi au premier lancement et utilisé dans les textes via `{prenom}`. Les accords sont au **masculin**.
- **Le héros ne perd jamais de PV** : seuls les golems combattent et peuvent être K.O.
- **Caméra** : à la 3e personne, au-dessus et derrière le héros, à environ 8 blocs, avec une rotation horizontale. Elle évite de passer à travers les murs.
- **Contrôles tactiles** (paysage) :
  - **Joystick virtuel** à gauche.
  - **Glisser sur la moitié droite** pour tourner la caméra.
  - **Bouton Saut**.
  - **Bouton Attaque** : la baguette magique lance une petite étincelle. Elle sert à casser les caisses et à engager un monstre. Avant d'avoir le premier golem, elle ne sert qu'à casser les caisses.
  - **Bouton Interagir** : contextuel, il n'apparaît que près d'un PNJ, d'une pierre-énigme, d'un levier, d'un bloc à pousser ou d'une arche.
  - **Boutons d'interface** en haut : Journal, Golems, Encyclopédie, Pause.
- Tous les boutons font au moins **72 px CSS**, sont placés à la portée des pouces et restent légèrement translucides.

---

## 4. Golems (compagnons)

### 4.1 Liste

| Phase | Golem | Élément | Attaques (A1 / A2 / A3 / Ultime) |
|---|---|---|---|
| 1 | **Pierre** | 🪨 Roche | Coup de poing (F) / Galets brûlants (M, ☀️) / Rocher roulant (F, Étourdi) / **Avalanche** (M) |
| 1 | **Mousse** | 🌿 Plante | Fouet de lianes (F) / Tournesol brûlant (M, ☀️) / Liane-piège (F, Étourdi) / **Jardin géant** (M) |
| 2 | **Écorce** | 🌿 Plante | Coup de branche (F) / Pluie de feuilles (M) / Racines (F, Étourdi) / **Forêt vivante** (M) |
| 2 | **Champignon** | 🍄 Spore | Coup de chapeau (F) / Nuage de spores (M) / Spores dodo (M, Endormi) / **Champignon géant** (F) |
| 3 | **Sable** | 🏜️ Sable | Poing de sable (F) / Tourbillon (M) / Tempête aveuglante (M, Aveuglé) / **Dune géante** (F) |
| 3 | **Cuivre** | ⚡ Foudre | Éclair rapide (F) / Boule électrique (M) / Choc (F, Étourdi) / **Orage** (M) |
| 4 | **Glace** | ❄️ Glace | Poing gelé (F) / Souffle glacé (M) / Prison de glace (M, Étourdi) / **Blizzard** (F) |
| 4 | **Cristal** | 💎 Cristal | Éclat tranchant (F) / Rayon prisme (M) / Bouclier miroir (M, Bouclier) / **Pluie de cristaux** (F) |
| 5 | **Nuage** | ☁️ Vent | Rafale (F) / Brume (M) / Tornade (F, Aveuglé) / **Ouragan** (M) |
| 5 | **Arc-en-ciel** | 🌈 Arc-en-ciel | Rayon rouge (F) / Rayon bleu (M) / Arc lumineux (M, Aveuglé) / **Prisme total** (F) |
| Évol. | **Galaxie** | ✨ Étoile | Étoile filante (F) / Pluie de météores (M) / Trou noir (M, Étourdi) / **Supernova** (F) |

- **F = Force**, l'attaque déclenche une **question de calcul**. **M = Magie**, elle déclenche une **énigme**.
- **Type d'attaque** (révision 1.4) : chaque attaque a un **type**, affiché par une icône sur son bouton. C'est l'élément du golem, sauf quand le tableau indique un autre type (par exemple ☀️ Soleil). **La faiblesse d'un monstre se compare au type de l'attaque**, pas au golem.
- **Règle de conception** : chacun des 2 golems d'une phase a, dès l'éclosion (A1 ou A2), une attaque dont le type est la faiblesse du boss de cette phase. Les types et les éventuels nouveaux noms d'A2 des phases 2 à 5 sont fixés au jalon de chaque phase.
- **Modèles** : chaque golem est un assemblage de cubes d'environ 1,5 à 2 blocs de haut au stade 1, avec une silhouette et une couleur bien distinctes et une animation de marche (balancement des bras et jambes). Chaque stade le rend **plus grand** et ajoute des détails : runes lumineuses au stade 2, éléments de son type au stade 3 (cristaux, branches, éclairs…), aura au stade 4. Le Galaxie est bleu nuit avec des points d'étoiles scintillants.

### 4.2 Obtention et équipe

- Il y a **1 œuf par phase**, donc **5 golems au maximum**, et ils forment tous l'équipe.
- À l'éclosion, l'œuf hésite : 2 silhouettes apparaissent et le joueur choisit. Le joueur peut donner un **surnom** au golem (facultatif, avec une liste de suggestions).
- **Tous les golems suivent le héros** dans le monde, en formation souple, et contournent les obstacles. S'ils sont bloqués ou trop loin, ils sont téléportés près du héros.
- **Stats de base à l'éclosion** : PV 40, ATQ 8, multipliés par `1 + 0,25 × (phase − 1)`, pour qu'un golem obtenu tard reste utile.

### 4.3 Évolution (validée)

| Objet | Où | Effet |
|---|---|---|
| **Rune d'éveil** (×2, phase 2) | 1 caché dans le biome, 1 donné par le boss | Stade 1 → 2 : PV ×1,35, ATQ ×1,35, attaque **A3** (avec effet) débloquée |
| **Cristal de puissance** (×2, phase 3) | idem | Stade 2 → 3 : ×1,35, **Ultime** débloquée (1 fois par combat) |
| **Cœur ancestral** (×2, phase 4) | idem | Stade 3 → 4 : ×1,35 et aura |

- **Au stade 1**, un golem a déjà **A1 et A2** (révision 1.4).
| **Poussière d'étoile** (×1, fin de phase 5) | Formée par les 5 éclats réunis | Un seul golem au **stade 4**, choisi par le joueur, devient **Galaxie** : ×1,4, nouveau modèle, toutes ses attaques deviennent ✨ Étoile |

- Un objet ne s'applique qu'à un golem du **bon stade**. L'interface grise les autres.
- **Épreuve des Étoiles** (révision 1.7) : avant la cérémonie de la Poussière d'étoile, le joueur doit allumer les **12 étoiles** d'une constellation au sommet de l'Académie, une par bonne réponse. C'est l'épreuve la plus longue et la plus difficile du jeu : 6 calculs du **niveau 7 « défi »** (§ 8.1, réservé à cette épreuve), 3 calculs du niveau 6 et 3 énigmes du niveau 5, en alternance, sans adaptation de difficulté. Rien de punitif : pas de chrono ; une erreur montre l'explication et propose une autre question du même genre, sans éteindre d'étoile ; les étoiles allumées sont enregistrées, et l'on peut partir (« Revenir plus tard ») et reprendre à tout moment. Lumibloc encourage à la 4e et à la 8e étoile. Quand la constellation est complète, le joueur choisit le golem au stade 4, puis l'outro O5 raconte la naissance du Galaxie.
- **Garantie** : les objets donnés par les boss suffisent à amener un golem au stade 4. Si le joueur arrive à la Poussière d'étoile sans golem au stade 4, Lumibloc lui donne les objets manquants, avec une ligne de dialogue.
- **Animation d'évolution** : flash, golem en rotation, nouveau modèle, son ascendant. Moins de 4 s, et on peut la passer.

### 4.4 Nourriture 🍎

- C'est une monnaie unique, comptée en 🍎. **Elle ne soigne pas.**
- Un **repas** coûte 3 🍎 et donne, au choix, **+4 PV max** ou **+1 ATQ**, de façon permanente.
- Il y a un **plafond de 4 repas par stade**, réinitialisé à chaque évolution, pour que l'évolution reste nécessaire.
- **Sources** : quête villageoise obligatoire +5, facultative +3, coffre de camp +3, caisse +1 (une sur deux en moyenne), victoire d'arène +4 (+2 en combat libre après la fin de l'arène), boss +6.

### 4.5 PV, K.O., soins

- **Dans le monde**, les PV remontent tout seuls : +2 % des PV max par seconde, après 4 s sans être touché.
- Un golem **K.O. dans le monde** s'endort près du héros, avec des « Zzz », et se réveille au bout de 20 s avec 30 % de ses PV. Si **tous** les golems sont K.O., l'écran devient doux, le héros revient à la dernière lanterne, les golems sont soignés et rien n'est perdu.
- **À l'arène**, tous les golems sont **entièrement soignés à la fin de chaque combat**, gagné ou perdu.
- **Boss et dragon** : les golems sont soignés au début du combat.

---

## 5. Monstres (ennemis)

### 5.1 Bestiaire

| Phase | Monstre | Faible contre | Look (cubes, original) |
|---|---|---|---|
| 1 | Slime | ☀️ | Cube gélatineux vert qui rebondit |
| 1 | Zombie | 🪨 | Silhouette verdâtre aux bras tendus, vêtements déchirés |
| 1 | Araignée | 🌿 | Corps brun, 8 pattes, yeux rouges |
| 2 | Squelette archer | 🪨 | Os blancs, arc |
| 2 | Loup d'ombre | 🍄 | Loup gris foncé, yeux violets |
| 2 | Champignon sauteur | 🌿 | Petit champignon violet qui saute |
| 3 | Momie | ⚡ | Bandelettes beiges |
| 3 | Scorpion | 🪨 | Brun-orange, dard levé |
| 3 | Vautour | 🏜️ | Oiseau brun au cou rose, il vole bas |
| 4 | Yéti | 🪨 | Grand et blanc, fourrure en cubes |
| 4 | Chauve-souris de glace | ⚡ | Bleu pâle, ailes translucides |
| 4 | Fantôme gelé | 💎 | Blanc translucide, flotte |
| 5 | Harpie | ❄️ | Femme-oiseau aux plumes grises |
| 5 | Méduse céleste | ⚡ | Rose translucide, flotte, filaments |
| 5 | Chevalier d'ombre | 🌈 | Armure noire, épée, yeux violets |

**Boss** (combat au tour par tour, seuls) :

| Boss | Faible contre | Étapes |
|---|---|---|
| Roi Slime | ☀️ | 2 : à l'étape 2, il se divise visuellement et ses attaques deviennent « Pluie de gouttes » |
| Reine Araignée | 🍄 | 2 : à l'étape 2, « Toile », qui étourdit un tour |
| Grand Ver des Sables | ⚡ | 2 : à l'étape 2, il plonge sous le sable, puis « Surgissement » |
| Sorcière du Blizzard | 💎 | 2 : à l'étape 2, « Tempête », qui aveugle |
| Griffon d'Ombre | ☁️ | 2 : à l'étape 2, « Piqué » |
| **Dragon d'Ombre** | ✨ uniquement à l'étape 1 | 3 : (1) **armure** que seules les attaques ✨ peuvent entamer, (2) vol et souffle d'ombre, (3) colère, avec des attaques plus fortes. Aux étapes 2 et 3, tous les golems font des dégâts normaux, et ✨ fait double dégât. |

### 5.2 Comportement dans le monde

- Les monstres sont **neutres** : ils errent près de leur camp et **n'attaquent que s'ils sont attaqués**.
- Une fois engagés, ils combattent les golems, jamais le héros. S'ils s'éloignent de **8 blocs** de leur point d'origine ou poursuivent pendant **5 s**, ils **abandonnent**, rentrent chez eux et se soignent.
- **Groupes de 1 à 3 monstres** : 1 ou 2 dans les phases 1 et 2, 2 ou 3 ensuite.
- Un monstre vaincu disparaît dans un nuage de cubes et réapparaît au bout de 3 min dans son camp. Les camps « vidés » pour une quête restent vides.

### 5.3 Stats des monstres (phase p)

- **PV** = 24 + 14 × (p − 1) ; **ATQ** = 5 + 2 × (p − 1).
- **Boss** : PV par étape = 2,25 × les PV d'un monstre de sa phase, et ATQ × 1,3. (Révision 1.4 : 2,5 → 2,25 ; au tour par tour, le boss frappe avec un coefficient 0,5 et les monstres d'arène avec 1,6, réglés par la simulation.)
- **Dragon** (p = 6) : PV par étape = 3 × les PV d'un monstre de la phase 6, et ATQ × 1,3.

---

## 6. Combat dans le monde (temps réel)

- Le héros lance une étincelle sur un monstre : le groupe entier est engagé.
- Les golems choisissent automatiquement une cible (de préférence celle du héros) et attaquent au corps à corps toutes les 1,5 s, pour `ATQ × 0,5` de dégâts. Chaque golem utilise tout seul son attaque débloquée la plus efficace : ×1,5 si son type est la faiblesse de la cible.
- Les monstres attaquent les golems toutes les 2 s, pour `ATQ × 0,5`.
- **Pas de questions** dans le monde : le combat doit rester rapide (10 à 20 s pour un groupe à niveau égal).
- Les dégâts s'affichent en chiffres flottants, et une petite barre de PV apparaît au-dessus des entités engagées.

---

## 7. Combat au tour par tour (arène, boss, dragon)

### 7.1 Règles

- **Arène** : N golems contre N monstres, avec **un actif de chaque côté**. Les adversaires sont tirés au hasard parmi les monstres de la phase de l'arène.
- **Boss et dragon** : toute l'équipe contre le boss seul, avec un golem actif à la fois.
- **Ordre** : le golem actif joue, puis l'adversaire actif. Après 0,8 s, la cible et l'attaque du monstre sont annoncées clairement.
- **Tour du joueur** : il choisit une attaque débloquée, ou « Changer de golem ». Le changement est **gratuit** : il ne coûte pas le tour et le monstre n'attaque pas à ce moment-là.
- **Toute attaque déclenche une question** (§ 8) :
  - bonne réponse : l'attaque touche ;
  - mauvaise réponse : l'attaque **rate**, la bonne réponse est surlignée en vert et **l'explication d'une ligne** s'affiche, puis bouton « J'ai compris ».
- **Dégâts** : `ATQ × puissance × (1,5 si le type de l'attaque est la faiblesse)`, avec une variation de ±10 %. Puissance : A1 = 1,0, A2 = 1,2, A3 = 1,0 + effet, Ultime = 2,5. (Révision 1.4 : le bonus passe de ×2 à ×1,5, réglé dans `balance.ts`.)
  - L'**Arc-en-ciel** fait toujours ×1,25, et ×1,5 si la faiblesse est 🌈.
  - Une faiblesse touchée affiche « Super efficace ! ».
- **Attaque d'un monstre** : `ATQ × coefficient × (0,8 à 1,2)`. Le coefficient (monstre d'arène, boss) est réglé dans `balance.ts` par la simulation pour tenir les objectifs du § 15. Elle a 15 % de chances de rater (50 % s'il est Aveuglé).
- **Effets** (durée d'un tour adverse, sauf indication) :
  - **Étourdi** : passe son tour.
  - **Endormi** : passe 1 ou 2 tours, mais se réveille s'il est touché.
  - **Aveuglé** : 50 % de chances de rater sa prochaine attaque.
  - **Bouclier** : le golem actif ne subit que 50 % des dégâts au prochain coup, et en renvoie 50 % à l'attaquant.
- **Ultime** : utilisable une seule fois par combat. Le bouton brille quand elle est disponible.
- **Fin** : quand toute une équipe est K.O.
  - Victoire : récompense, et à l'arène, soin complet.
  - Défaite : message encourageant, aucune perte. À l'arène, soin complet. Contre un boss, on peut réessayer tout de suite.
- **Leçon des faiblesses** (révision 1.4, à la **première défaite** seulement, arène ou boss) : Lumibloc explique en 2 ou 3 bulles comment lire l'icône de faiblesse et choisir l'attaque du même type. Puis un **QCM de 3 questions**, construites à partir des monstres de la phase et des golems du joueur (« Le Roi Slime est faible contre ☀️. Quelle attaque choisis-tu ? »). Il faut tout réussir pour continuer : en cas d'erreur, la bonne réponse est montrée en vert avec l'explication, et la question revient à la fin. Pas de chrono.

### 7.2 Interface au tour par tour

- **En haut** : le monstre actif, sa barre de PV, son **icône de faiblesse** bien visible et ses effets en cours.
- **En bas à gauche** : le golem actif, sa barre de PV et ses effets.
- **En bas à droite** : de 1 à 4 gros boutons d'attaque. Chacun affiche une icône, le nom de l'attaque et un badge 🔢 (calcul) ou 🧩 (énigme). Il y a aussi un bouton « Changer » qui montre les mini-portraits des golems avec leurs PV.
- **Indicateur d'équipe** : des pastilles pour les golems et monstres restants.
- **Bouton 📒 « Faiblesses »** (révision 1.4, après la leçon) : une fiche avec la faiblesse du monstre actif et les attaques des golems, les plus efficaces mises en évidence.
- Les attaques ont des animations courtes (moins de 1,5 s), chacune avec des particules en cubes de la couleur de l'élément.

---

## 8. Moteur de questions

Une même boîte de dialogue sert à tout : grande carte centrale, texte en au moins 26 px, choix en gros boutons d'au moins 80 px de haut. **Il n'y a jamais de chrono.**

### 8.1 Calcul (attaques Force) : questions générées par le code, avec **4 choix**

| Niveau | Contenu |
|---|---|
| 1 | + et − jusqu'à 20 ; tables ×1, ×2, ×5, ×10 |
| 2 | + et − jusqu'à 100 sans retenue ; tables ×3, ×4 ; doubles jusqu'à 50 |
| 3 | + et − jusqu'à 100 avec retenue ; table ×6 ; moitiés des nombres pairs jusqu'à 100 |
| 4 | + et − avec des centaines jusqu'à 1000 (ex. 340 + 200, 700 − 250) ; tables ×7, ×8, ×9 ; compléments à 100 |
| 5 | + jusqu'à 1000 avec retenue ; toutes les tables de 1 à 10 mélangées ; petits problèmes de monnaie (euros entiers) et d'heure (heure pile, demie, ajouter 15 ou 30 min) |
| 6 | Problèmes à 2 étapes simples ; ×10 et ×100 ; partages simples dans les tables (« 24 billes pour 4 amis ») |
| 7 « défi » (révision 1.7, **Épreuve des Étoiles seulement**) | Nombre à 2 chiffres × 1 chiffre (jusqu'à 49 × 9, ex. 23 × 4) ; partages exacts jusqu'à 100 par 2 à 9 (« 72 étoiles en 8 groupes ») ; problèmes à 2 étapes avec des centaines, résultat jusqu'à 1000 |

- **Les tables de 1 à 10 sont toutes couvertes** au fil des niveaux.
- **Distracteurs plausibles et distincts** : ±1, ±10, table voisine (a × (b ± 1)), inversion addition/soustraction. Tous sont positifs et différents de la bonne réponse.
- **Explication générée**, par exemple « 7 × 8 = 56 » ou « 45 + 38 : 45 + 30 = 75, puis 75 + 8 = 83 ».
- Les problèmes sont rédigés avec des modèles de phrases dans l'univers du jeu (« Le golem ramasse 3 sacs de 6 pommes… »).

### 8.2 Énigmes (attaques Magie et pierres-énigmes) : banque de `CONTENU.md`, **3 choix**

- **En combat**, les énigmes sont **générées** par `src/questions/riddleGen.ts` : familles à paramètres, habillées par phase (personnages, objets, symboles, nombres), avec une mémoire des 400 dernières questions enregistrée dans la sauvegarde. Les calculs passent par la même mémoire, et un sur trois est raconté avec les objets du biome. La banque ci-dessous sert aux pierres-énigmes des sanctuaires.
- La banque est organisée en **5 niveaux**. Chaque énigme a une explication d'une ligne.
- **Pas de répétition** tant qu'il reste des énigmes non vues au niveau demandé : on tire alors au niveau voisin, et sinon on réinitialise en excluant les 5 dernières. Les énigmes vues sont gardées dans la sauvegarde.

### 8.3 Difficulté adaptative

- Il y a un **niveau courant par catégorie** : calcul de 1 à 6, énigme de 1 à 5. Le niveau 7 de calcul n'est jamais atteint par l'adaptation : il est réservé à l'Épreuve des Étoiles. Les deux commencent à 1, ou à la valeur réglée dans le menu parent.
- **3 réussites d'affilée** font monter d'un niveau, **2 erreurs d'affilée** le font baisser.
- **Décalage selon l'attaque** : A1 et A2 +0, A3 +1, Ultime +2, dans la limite des bornes.
- Dans les **sanctuaires**, le niveau des pierres-énigmes est fixé par la phase (§ 10.1), sans adaptation.
- Les positions des choix sont **mélangées** à chaque affichage.

---

## 9. Histoire et lecture

### 9.1 Boucle de lecture (chaque début de chapitre)

1. **La première fois**, le texte est raconté par une **cinématique** (§ 9.4) : chaque phrase s'affiche en sous-titre, en au moins 24 px, pendant le plan qui l'illustre, et `{prenom}` est remplacé par le prénom. Pas de synthèse vocale sur ce texte.
2. Chaque plan reste à l'écran jusqu'à ce que l'enfant touche ▶ ; le bouton n'apparaît qu'après un court temps de lecture, proportionnel à la longueur de la phrase. (Révision 1.4 : remplace l'attente de 20 s du parchemin.)
3. **2 questions** (QCM à 3 choix) sont tirées dans la banque de 8 du texte.
4. **Avec 2 bonnes réponses**, des confettis apparaissent et le jeu continue.
5. **Avec au moins une erreur**, le message « Relis bien le texte, la réponse s'y cache ! » s'affiche, **sans révéler la bonne réponse**. La cinématique **n'est pas rejouée** : le texte entier s'affiche en une seule bulle, façon parchemin, en au moins 24 px avec un interligne de 1,5 (bouton « J'ai lu ! » actif après 10 s), puis reçoit **2 nouvelles questions** jamais posées dans ce cycle. Si la banque est épuisée, on recommence en excluant les 2 dernières. La boucle continue jusqu'à réussite.
6. Les statistiques sont enregistrées pour le menu parent : nombre de lectures et taux de réussite par texte.

### 9.2 Outros

Un court texte de fin de phase, raconté par une cinématique (§ 9.4), avec l'éclat qui rejoint la Pierre-Étoile au-dessus de l'Académie. Pas de questions.

### 9.3 Dialogues

- Les dialogues sont des bulles courtes, de 1 ou 2 phrases, avec un portrait en cubes.
- Un bouton 🔊 lit le dialogue avec la **Web Speech API** en `fr-FR`. Il est masqué si aucune voix française n'est disponible.
- Les personnages récurrents sont le **professeur Lumibloc** (mentor) et un chef par village.

### 9.4 Cinématiques (révision 1.4)

- Chaque texte d'histoire (T1 à T6) et chaque outro (O1 à O6) est raconté par une cinématique **jouée dans le moteur** : petits décors en blocs construits pour elle, modèles en cubes, caméra scénarisée, effets en particules. Aucun fichier vidéo.
- Le texte est **mot pour mot** celui de `CONTENU.md`, découpé en plans de 1 à 3 phrases. Seule la mise en scène est nouvelle.
- La première fois, on ne peut pas passer une cinématique de texte d'histoire, puisque c'est l'exercice de lecture. Le Journal propose « Revoir l'histoire » pour rejouer celles déjà vues, et là on peut les passer.
- **Ordre de réalisation** : intro T1 et outro O1 (jalon 1), outro finale O6 (fin du jalon 1), puis les intros et outros de chaque phase dans le jalon de leur biome.
- Le mode test permet de passer les cinématiques.

---

## 10. Quêtes (le détail est dans `CONTENU.md`)

### 10.1 Quête de l'œuf (sanctuaires)

| Phase | Nombre d'étapes | Composition | Niveau des pierres-énigmes |
|---|---|---|---|
| 1 | 2 | 1 pierre-énigme + 1 énigme dans le monde | 1 |
| 2 | 4 | 2 pierres + 2 dans le monde | 2 |
| 3 | 4 | 1 pierre + 3 dans le monde | 3 |
| 4 | 5 | 2 pierres + 3 dans le monde | 4 |
| 5 | 4 | 2 pierres + 2 dans le monde | 5 |

- **Pierre-énigme** : une énigme de la banque, au niveau indiqué. En cas d'erreur, la pierre « tremble », l'explication s'affiche et **une autre énigme** du même niveau est proposée. Ça ne bloque jamais.
- **Énigmes dans le monde** (dalles, leviers, blocs à pousser, mémoire, glissade) : définies dans `CONTENU.md`. Un bouton « Recommencer » remet l'énigme à zéro. Après 3 échecs, un indice de Lumibloc s'affiche.
- **Plateaux 2D** : les énigmes du monde s'ouvrent avec « Résoudre » sur un plateau vu de dessus (`src/ui/puzzleBoards.ts`), sans caméra ni golem ; les nuages arc-en-ciel restent en 3D. L'Épreuve des Étoiles ajoute 3 grandes énigmes, après les 4e, 8e et 12e étoiles.
- **Énigmes d'ingénierie** (révision 1.6) : à partir de la Forêt, chaque sanctuaire contient un petit mécanisme déjà posé dans le décor, que l'enfant manipule pour ouvrir le passage : **canaux d'eau** (Forêt), **miroirs et lumière** (Désert), **engrenages** (Pics de Givre), **balance à contrepoids** (Île Céleste). On tourne, on pose ou on choisit des pièces prévues ; ce n'est pas de la construction libre (§ 16). Chaque mécanisme montre son effet à l'écran (l'eau coule, le rayon avance, les roues tournent, la herse monte). Leur solvabilité et leur nombre de coups sont vérifiés par test.

### 10.2 Quêtes villageoises

3 quêtes obligatoires et 2 facultatives par phase. Elles sont de courte durée (3 à 5 min). Ce sont des quêtes de livraison, de recherche, d'escorte simple ou de camp à vider. Elles sont suivies dans le Journal, avec un marqueur « ! » au-dessus des PNJ qui en ont une.

### 10.3 Quête du boss

Elle est donnée par le chef du village une fois l'arène terminée. C'est un petit objectif de trajet (suivre une piste, allumer 3 braseros…) qui mène au repaire du boss.

---

## 11. Interface et expérience de jeu

- **Premier lancement** : écran titre (logo en blocs « Les Golémanciens de Cubeterre »), saisie du prénom, puis cinématique et questions du texte 1. Le jeu commence ensuite **dans la maison du joueur**, avec Lumibloc devant la porte. Le tutoriel est intégré au chapitre 1, avec des bulles de Lumibloc : se déplacer, regarder, casser une caisse, parler.
- **Écran Golems** : liste des golems, avec stats, stade, attaques, bouton Repas (🍎) et utilisation des objets d'évolution.
- **Encyclopédie** : les 10 golems (ceux qui n'ont pas été choisis restent en silhouette), les 15 monstres et les 5 boss, à mesure qu'on les rencontre.
- **Journal** : quêtes en cours et terminées, avec l'objectif actif mis en évidence.
- **HUD** : 🍎, éclats (×/5), portraits des golems avec leur PV, boussole.
- **Textes** : français correct, phrases courtes, vocabulaire de CE2, aucun texte obligatoire de plus de 2 phrases hors histoire.
- **Feedback** : sons et animations à chaque réussite. Les erreurs sont présentées avec douceur, jamais de « Faux ! » agressif.
- **Rappel de pause** : après X min de jeu (40 par défaut, réglable, désactivable), au prochain moment calme (hors combat et hors question), Lumibloc propose une pause. Le bouton « Continuer » apparaît après 10 s.

---

## 12. Audio (Web Audio, généré)

- Une **boucle musicale par biome** (style chiptune doux), plus des musiques pour l'arène, les boss et le dragon.
- **Effets sonores** : pas, caisse, attaques par élément, bonne réponse, erreur (douce), évolution, éclosion, gain de 🍎.
- **Cinématiques** (révision 1.4) : une musique d'histoire qui suit l'ambiance du plan (calme le jour, inquiétante la nuit, joyeuse au matin) et des bruitages de mise en scène (grondement, ailes et rugissement du dragon, cristal qui se brise, coups à la porte, apparitions).
- **Volumes musique et effets séparés** dans les options. L'audio ne démarre qu'après une première interaction (règle Android).

---

## 13. Sauvegarde

- **Sauvegarde automatique** dans IndexedDB : après chaque quête, combat, évolution et changement de biome, et toutes les 60 s hors combat.
- **1 profil**. Le schéma est **versionné**, avec des migrations.
- **Contenu sauvegardé** : prénom, chapitre et étapes de quête, golems (type, surnom, stade, repas, PV), 🍎, objets, éclats, énigmes vues, niveaux adaptatifs, statistiques, réglages, temps de jeu.
- **Export et import** d'un fichier JSON depuis le menu parent.

---

## 14. Menu parent

- **Accès** : appui long de 3 s sur le logo de l'écran titre, puis un **code à 4 chiffres** (1234 par défaut, modifiable).
- **Fonctions** :
  - **Statistiques** : lecture (lectures par texte, réussite), calcul (réussite par niveau et par type d'opération, tables les plus ratées), énigmes (réussite par niveau), temps de jeu.
  - **Réglages** : niveau de départ en calcul et en énigmes, rappel de pause (activé ou non, minutes), volumes.
  - **Mode test** : aller directement à un chapitre (en générant un état cohérent : golems et stades attendus), ajouter des 🍎 ou des objets, afficher les FPS.
  - **Sauvegarde** : export, import, réinitialisation (avec double confirmation).

---

## 15. Équilibrage : objectifs vérifiables

- **Monstre d'arène** : il doit tomber en **2 à 3 bonnes réponses** avec un golem au niveau attendu de la phase.
- **Golem** : il doit encaisser **4 à 6 attaques** de monstre de sa phase.
- **Combat d'arène** : un enfant qui répond juste à 70 % doit le gagner **8 fois sur 10**.
- **Boss** : 8 à 15 questions. **Dragon** : 15 à 25 questions.
- **Durée cible par phase** : environ 50 min (lecture 3, sanctuaire 8, quêtes 15, arène 10, boss 8, exploration et repas 6).
- Un **script de simulation** (Vitest) vérifie ces objectifs avec des réponses au hasard à 70 % de réussite, sur l'équipe attendue de chaque phase.

---

## 16. Hors périmètre

Pas de construction ni de minage (on ne fait que casser des caisses ; les mécanismes des énigmes d'ingénierie, § 10.1, sont déjà posés et l'enfant ne fait que les régler), pas de multijoueur, pas de réseau en jeu, pas de compte, pas d'achats, pas de pub, pas de télémétrie, pas d'œuf légendaire et pas de créatures autres que celles listées (le golem de maison du § 18 en fait partie).

---

## 17. Critères d'acceptation globaux (jeu fini)

1. Le jeu est jouable du début à la fin sur la Xiaomi Pad 7 Pro, installé en PWA, **sans réseau**.
2. **60 fps** stables en exploration et en combat, avec un pixel ratio plafonné à 1,5 et au moins 50 fps sur les pires scènes.
3. Les 6 chapitres, 10 golems, 15 monstres, 5 boss et le dragon sont présents, et toutes les quêtes de `CONTENU.md` sont implémentées.
4. La boucle de lecture fonctionne sur les 6 textes, et les questions changent à chaque tour.
5. Toute attaque au tour par tour passe par une question. Les tables de 1 à 10 apparaissent toutes au fil du jeu. La difficulté s'adapte.
6. Évolutions : stades 1 à 4 et Galaxie, avec le respect des règles d'objets et de la garantie.
7. La sauvegarde survit à une fermeture brutale de l'application, et l'export/import fonctionne.
8. Le menu parent est complet.
9. Tous les tests passent : unitaires, contenu, simulation d'équilibrage, et parcours bout en bout du chapitre 1.
10. Aucun nom ni élément de licence existante n'est présent.

---

## 18. Maison du joueur (révision 1.4)

- **Où** : au village de Ferme-des-Blocs, dans la Prairie. C'est là que le jeu commence, après la cinématique et les questions du texte 1.
- **Le lit** (« Dormir ») : soigne les golems, devient le point de retour (comme une lanterne) et **enregistre la partie**. La sauvegarde automatique (§ 13) continue à côté.
- **L'étagère à trophées** : après chaque phase, une statuette dorée du boss vaincu y apparaît. En s'approchant, on lit son nom.
- **Elle évolue à chaque phase** : une extension dans le style du biome terminé (balcon de bois, terrasse de sable, cheminée et tapis de laine, fenêtre-nuage…). Chaque jalon construit la version de sa phase.
- **Le golem de maison** : **Rivet** (nom à valider par le parent), un petit golem original couleur cuivre, avec des taches de vert-de-gris, un tuyau de poêle sur la tête et un balai. Il reste dans la maison, fait le ménage et salue le joueur. Il ne combat pas et ne suit pas le héros.
