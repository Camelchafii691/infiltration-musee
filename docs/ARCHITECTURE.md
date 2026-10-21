# Architecture et comportements

## Fichiers

| Fichier | Rôle |
|---|---|
| `js/vehicle.js` | Base pédagogique inchangée : vecteurs, force et locomotion. |
| `js/museum-agent.js` | Sous-classe commune : steering, évitement, séparation, collisions. |
| `js/behavior-manager.js` | Composition pondérée avec priorités et budget de force. |
| `js/navigation.js` | Graphe de visibilité pour les détours des chiens ; rayons d’affichage des perceptions. |
| `js/entities.js` | Voleur, gardes, chef, suiveurs, chiens, rivaux, obstacles et reliques. |
| `js/campaign.js` | Cinq plans, difficultés, progression et records. |
| `js/infiltration-tools.js` | Ombres, leurres et améliorations facultatives. |
| `js/neuroevolution.js` | Réseau 6–8–2, population, fitness, sélection et mutations. |
| `js/sketch.js` | Boucle p5.js, scène, perception, missions et interface. |
| `js/pixel-renderer.js` | Rendu pixel art, sprites et décor en cache. |
| `js/touch-controls.js` | Joystick et boutons multi-touch. |
| `js/ambient-music.js` | Musique et effet de vol avec Web Audio. |

Les entités du monde dérivent de `Vehicle`. Le contrôleur de scène gère les règles ; les comportements calculent des forces et la locomotion applique le déplacement. Chaque entité est mise à jour une fois par pas. Le joueur est déplacé avant l’évaluation de sa visibilité par les gardes.

## Principes du cours

| Principe | Démonstration réelle |
|---|---|
| Sélection d’action | Patrouille, observation, poursuite, recherche, renforts, distraction et enquête sonore. |
| Path following | Patrouilles suivant des points avec arrivée. Pas de projection scalaire sur les segments. |
| Pursue | Anticipation de la position du joueur par les gardes et chiens. |
| Evade / Flee | Esquive prédictive des rivaux et de la zone avant du chef. Flee pur existe dans la base, mais n’est pas appelé séparément dans la simulation. |
| Obstacle avoidance | Intersection exacte du segment d’anticipation avec les rectangles ; direction tangentielle d’évitement. Les points ahead sont aussi disponibles en debug. |
| Wander | Gardes distraits et chiens sans cible. |
| Boids | Séparation, alignement et cohésion des chiens. |
| Leader following | Position derrière le chef, séparation et esquive de sa zone avant. |
| Arrival | Ralentissement près d’un objectif ou d’une formation. |
| Neuro-évolution | Réseaux complémentaires des gardes, évolués entre les tentatives. |

Le joueur suit ses commandes et glisse le long des collisions ; il n’est pas détourné par un évitement autonome. Cet évitement reste actif chez les PNJ. Les comportements prioritaires peuvent consommer tout le budget de force : un comportement déclaré actif n’apporte donc pas nécessairement une force à chaque pas.

## Simulation et rendu

La physique utilise des pas fixes de 1/60 s, au maximum cinq par image. À 30 ou 60 images/s, le temps simulé reste identique tant que la machine suit cette cadence. Le rattrapage est borné en cas de longue interruption. Les modes pause et onglet masqué empêchent l’avancement depuis la boucle d’affichage.

Le décor est mis en cache par mission ; les sprites sont réutilisés par type, orientation et animation. La trace du joueur est réservée au debug. Les positions de rendu sont arrondies au pixel, sans modifier les positions physiques.

Les chiens disposent de départs espacés, de patrouilles, d’une séparation traitant aussi les positions identiques et d’un budget réservé à leur objectif. Si l’objectif est masqué par un obstacle, un graphe de coins libres calcule un détour. Le graphe est partagé par la meute et les itinéraires individuels sont recalculés à fréquence bornée, pas à chaque image. La locomotion reste réalisée par des forces et les collisions : aucun déplacement instantané vers les coins.

Les tests vérifient les détours, les chemins praticables vers les objectifs et trente secondes de patrouille de la meute sur les cinq cartes dans les deux formats d’écran. Cela ne garantit pas une navigation optimale pour toutes les configurations possibles de foule.
