# Améliorations de finition

## 1. Meute plus stable

Les chiens apparaissent espacés le long de parcours et non serrés dans une colonne près d’un meuble. Leur steering réserve de la force à la progression, tout en conservant séparation, alignement et cohésion. Une séparation déterministe traite les positions exactement identiques.

Un graphe de visibilité relie les coins libres des obstacles. Un chien peut calculer un détour quand sa cible est masquée ; les recalculs sont espacés pour limiter le coût. Le chien reste soumis à la locomotion Vehicle et aux collisions.

Couverture : détour autour d’un mur, géométrie de chaque segment, départs non superposés et trente secondes de patrouille pour les cinq cartes en portrait et paysage. Ces tests ciblent les blocages et rotations signalés ; ils ne garantissent pas l’absence de toute anomalie possible en foule.

## 2. Perception lisible

Des cônes faiblement éclairés montrent le regard des gardes ; un halo court indique la détection de proximité à 360°. Des rayons arrêtent le dessin au premier obstacle. Le message « VOUS ÊTES REPÉRÉ ! » s’affiche au début d’une poursuite du joueur, y compris par un chien. Le debug reste disponible séparément.

## 3. Entraînement facultatif

Une salle sûre contient deux reliques, une vitrine, des ombres et une sortie. Les actions restent les mêmes que dans le jeu : aucun vol automatique. La progression de campagne, les records, les améliorations et les cerveaux ne sont pas récompensés par ce mode.

## 4. Retours visuels

Un vol affiche une gerbe lumineuse et un « +1 ». Une sortie visitée trop tôt indique les reliques restantes. L’endurance épuisée produit un message et un statut RECHARGE ; la reprise du sprint attend 25 % de récupération pour éviter les micro-alternances course/marche.

## 5. Volume

Un curseur règle le volume global dans l’accueil et le panneau IA / INFOS. La valeur est bornée, sauvegardée et appliquée au mix Web Audio existant sans recréer les sources. Le bouton de coupure reste indépendant.

## 6. Étoiles personnelles

Une victoire donne une étoile, une mission sans détection une supplémentaire, et le temps cible une dernière. Les meilleurs scores par carte et difficulté ainsi que le total sur 15 sont affichés à l’accueil. Les sauvegardes existantes restent compatibles ; aucune étoile n’est attribuée rétroactivement ni en entraînement.

## 7. Gardes expressifs

Des bulles brèves accompagnent les changements d’état des gardes et de l’équipe de sécurité. Cooldown, durée limitée et maximum de trois bulles sans chevauchement réduisent l’encombrement ; la perception reste inchangée.

## 8. Finale scénarisée

Le Saphir d’Atlas bleu est placé dans la chambre centrale du niveau 5, protégé tant que les six autres reliques ne sont pas récupérées. Son vol verrouille l’alarme jusqu’à la fin, appelle un renfort (dans le plafond de difficulté) et déclenche la fuite chronométrée. La cible initiale de l’alarme est le lieu du vol, pas une position cachée actualisée. L’extraction donne une conclusion spécifique ; l’expiration provoque un échec rejouable. Les autres niveaux gardent leur fonctionnement.
