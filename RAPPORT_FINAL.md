# Rapport final — Les Golémanciens de Cubeterre

Le jeu est complet, du premier œuf au Dragon d'Ombre : 6 chapitres, 6 biomes, 11 golems (dont le Galaxie), 15 monstres, 5 boss et le dragon. Tout a été construit en autonomie, comme demandé. **Chaque décision prise seul et chaque texte nouveau sont listés, jalon par jalon, dans `A_VALIDER.md`.** C'est le document à relire en priorité.

## Ce qui marche

| Chapitre | Biome | Sanctuaire (énigmes) | Quêtes | Boss |
|---|---|---|---|---|
| 1 | Prairie de Cubeterre | Fleurs : pierre, dalles fleuries | Ferme-des-Blocs (5) | Roi Slime |
| 2 | Forêt Murmurante | Mousse : pierre, leviers, canaux d'eau ⚙️, pierre | Cabanes des Cimes (5) | Reine Araignée (Toile) |
| 3 | Désert des Sables Chantants | Temple ensablé : bloc de grès, miroirs du soleil ⚙️, dalles-symboles, pierre | Oasis de Palmebloc (5) | Grand Ver des Sables |
| 4 | Pics de Givre | Sanctuaire gelé : pierre, glissade, mémoire de glace, moulin gelé ⚙️, pierre | Igloos du Col (5) | Sorcière du Blizzard (Tempête) |
| 5 | Île Céleste | Sanctuaire des Vents : pierre, nuages arc-en-ciel, balance à contrepoids ⚙️, pierre | Village des Nuages (5) | Griffon d'Ombre (Piqué) |
| 6 | Volcan d'Ombre | — | Gardiens du chemin (3 groupes) | Dragon d'Ombre (3 étapes) |

- Chaque chapitre s'ouvre par sa cinématique et sa boucle de lecture (T1 à T6), et se ferme par son outro (O1 à O6).
- Après le Griffon, l'**Épreuve des Étoiles** attend devant l'Académie : 12 étoiles, avec le calcul niveau 7 « défi ». Ensuite viennent la cérémonie, l'outro O5 et la naissance du **Golem Galaxie** (avec la garantie si aucun golem n'est au stade 4).
- Évolutions : la Rune d'éveil fait passer au stade 2 (A3), le Cristal de puissance au stade 3 (Ultime, qui brille dans le combat), le Cœur ancestral au stade 4 (aura). Chaque biome cache un objet, et le boss en donne un autre.
- Musique : un morceau en plusieurs parties par biome (Prairie, Forêt, Désert, Givre, Ciel), plus l'arène, les boss, le dragon et la finale. Tout est généré par synthèse, sans aucun fichier audio.
- Fin du jeu : après O6 et le générique (avec le prénom), on revient dans la Prairie. Toutes les arènes, les combats libres et les biomes restent ouverts.

## Comment tester sur la tablette

1. Ouvrir https://spluckking.github.io/golemanciens/ dans Chrome, puis « Ajouter à l'écran d'accueil ». Le jeu marche ensuite sans réseau.
2. Pour aller vite, le menu parent (appui long, code) a un mode test. La partie normale garde sa sauvegarde.
3. Points à essayer en priorité, parce qu'ils sont nouveaux :
   - la glissade et le moulin gelé (Pics de Givre) ;
   - les nuages arc-en-ciel et la balance (Île Céleste) ;
   - l'Épreuve des Étoiles (les questions les plus difficiles) ;
   - le Dragon (seul le Galaxie entame son armure à l'étape 1 : il faut le faire entrer).

## Critères d'acceptation (SPEC.md § 17)

1. **Jouable du début à la fin, en PWA, sans réseau** : oui. Le service worker met tout en cache, et le parcours complet est couvert par les tests de bout en bout, biome par biome. *Pas encore vérifié sur la vraie tablette.*
2. **60 fps, pixel ratio plafonné à 1,5** : le plafond est en place. Les particules (neige, fumée) sont instanciées en un seul appel de dessin, et une ombre en disque sous les entités remplace les ombres temps réel. *Les fps n'ont été mesurés que sur l'émulateur (rendu logiciel) : à vérifier sur la tablette avec l'affichage des FPS du menu parent.*
3. **6 chapitres, 10 golems + Galaxie, 15 monstres, 5 boss et le dragon, toutes les quêtes** : oui (R1 à R3, O1, O2 pour chaque phase, P1 à P5, la finale).
4. **Boucle de lecture sur les 6 textes, questions qui changent** : oui (tests de la boucle et E2E des chapitres).
5. **Toute attaque passe par une question, tables de 1 à 10, difficulté adaptative** : oui (tests du générateur sur 1000 tirages par niveau, y compris le niveau 7 ; test de couverture des tables ; règles adaptatives testées).
6. **Évolutions 1 à 4 et Galaxie, règles d'objets, garantie** : oui (tests unitaires de l'évolution, de la Galaxie et de la garantie ; E2E de l'Épreuve et de la cérémonie).
7. **Sauvegarde qui survit à une fermeture brutale, export/import** : oui, sauvegarde IndexedDB à chaque progrès, test aller-retour et migration du schéma (version 3 ; les nouveaux biomes sont ajoutés automatiquement aux anciennes sauvegardes).
8. **Menu parent complet** : oui (inchangé depuis le jalon 1 ; le mode test et l'aperçu de la fin y sont).
9. **Tous les tests passent** : voir ci-dessous.
10. **Aucune licence existante** : tous les noms viennent de SPEC.md et CONTENU.md, et tous les modèles et textures sont dessinés dans le code.

## Équilibrage (simulation, 70 % de bonnes réponses)

Pour chaque phase, la simulation vérifie :
- un monstre tombe en 2 à 3 bonnes réponses ;
- un combat d'arène se gagne au moins 8 fois sur 10 ;
- chaque boss demande 8 à 15 questions et se gagne au moins 8 fois sur 10 ;
- le dragon demande 15 à 25 questions.

Réglages ajoutés en cours de route (dans `src/data/balance.ts`, et expliqués dans `A_VALIDER.md`) :
- PV des boss par étape réduits quand l'équipe grandit : 1,5 × les PV d'un monstre dès la phase 2, puis 1,3 en phase 4 ;
- PV des monstres de la phase 3 × 0,9.

## Durée estimée par chapitre

La cible de la spec est d'environ 50 minutes par chapitre :
- lecture : 3 min ;
- sanctuaire : 8 min ;
- quêtes : 15 min ;
- arène : 10 min ;
- boss : 8 min ;
- exploration : 6 min.

Les sanctuaires des phases 4 et 5 ont une énigme de plus que ceux du début : compter plutôt **55 à 60 minutes** pour ces chapitres. L'Épreuve des Étoiles ajoute environ 15 minutes au chapitre 5. La finale (volcan et dragon) prend environ 25 minutes. En tout, environ **5 heures** de jeu.

## Ce qui reste approximatif

- **Performances réelles sur la Xiaomi Pad 7 Pro** : à mesurer, en particulier sur l'Île Céleste, qui montre beaucoup d'îles à la fois. Avec les 5 golems, j'y ai mesuré jusqu'à 140 appels de dessin (la limite est 150) et environ 22 000 triangles (la limite est 300 000). Près de l'arche des Pics de Givre, avec 4 golems et le camp des yétis en vue, on monte à 148 appels : c'est dans le budget, mais tout juste. Si les fps baissent, ce sont les premiers endroits à alléger.
- **Collisions avec les mécanismes** : les roues du moulin, la balance et la herse sont des modèles sans collision. On interagit avec eux par des boutons, pas en les touchant.
- **Monstres sur l'Île Céleste** : ceux qui tombent des îles reviennent à leur camp. Un monstre qui poursuit un golem au bord d'une île peut donc « sauter » d'un coup.
- **L'Épreuve des Étoiles** se passe dans des fenêtres (constellation, questions) devant l'Académie, et non en haut d'une tour qu'on gravirait.
- **Les cinématiques** sont des mises en scène simples (caméra, acteurs en cubes, particules). Certains plans gagneraient à être recadrés après les avoir vus sur la tablette.

## Points de vigilance

- **La Tempête de la Sorcière** : j'ai choisi « moitié de dégâts » plutôt que « 50 % de chances de rater ». À confirmer.
- **Les attaques de type changé**, pour que chaque golem ait une réponse au boss de sa phase :
  - Sable : « Sable électrique » ⚡ ;
  - Glace : « Souffle glacé » 💎 ;
  - Arc-en-ciel : « Rayon bleu » ☁️.
  
  À confirmer.
- **Les donneurs de quêtes**, que CONTENU.md ne précise pas toujours : Dame Oasia et Zéphir, Grand-mère Flocon, le Capitaine Azur.
- **Tous les nouveaux textes** (répliques, messages d'interface, descriptions de l'encyclopédie) sont dans `A_VALIDER.md`. Les textes de CONTENU.md n'ont pas été modifiés.
