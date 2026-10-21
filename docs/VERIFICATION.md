# Vérification avant publication

Vérification du 21 octobre 2026, effectuée sur la copie locale organisée du jeu.

## Contrôles exécutés

- `npm run check` : syntaxe des fichiers JavaScript du projet, ressources HTML présentes, liens locaux de documentation et copie de licence p5.js.
- `npm test` : **73 tests réussis**, aucun échec, sous Node.js **24.10.0**.
- Serveur Node : accueil, feuille de style et tous les scripts de la page servis ; GET et HEAD ; refus des fichiers privés et des méthodes d’écriture.
- Lancement réel dans le navigateur avec le nouveau serveur : accueil, START et menu pause fonctionnels, aucun avertissement ni erreur console relevé pendant ce contrôle.
- Vérifications précédentes conservées : accueil visible en 320 × 568 et en paysage 844 × 390 ; cinq plans traversables et objectifs accessibles ; différences de difficulté ; détection et occlusion ; effets sonores et commandes tactiles.
- Classe `Vehicle` identique à la base de cours : SHA-1 `61427c125ba990812e0861bdb598e6cf665f3a73`.
- Recherche de motifs courants de secrets dans les fichiers du projet : aucun résultat. Ce contrôle par motifs ne constitue pas un audit exhaustif de sécurité.
- Meute : détour effectif autour d’un mur, départs non superposés et progression des patrouilles pendant trente secondes sur les cinq cartes, en portrait et paysage, difficulté Difficile.
- Entraînement : deux reliques accessibles, aucun ennemi, aucun déblocage ni évolution ; parcours complet et retour à la campagne vérifiés dans le navigateur, sauvegardes campagne/cerveaux inchangées.
- Volume : valeur bornée et persistante, gain appliqué en direct, vérification des curseurs dans le navigateur.
- Retours visuels : cônes arrêtés par les obstacles, bannière de repérage et animation de vol contrôlés visuellement ; sortie incomplète et recharge d’endurance couverts par les tests.
- Accueil avec entraînement et volume : contrôles visibles sans défilement en 320 × 568 et 844 × 390, puis contrôle sur ordinateur.
- Mode plein écran retiré à la demande de l’utilisateur : bouton, script et branchement supprimés ; absence de ces éléments couverte par un test de régression.
- Recommencement : R et le bouton du menu pause ouvrent une confirmation. Annuler / Échap conserve la tentative et l’état de pause précédent ; seule une confirmation réinitialise. Maintien de R, demandes répétées, réouverture après confirmation et onglet masqué couverts par les tests.
- Étoiles : critères, sauvegarde par carte/difficulté, conservation du meilleur score, validation des données et compatibilité des anciennes sauvegardes.
- Gardes expressifs : durée et cooldown testés ; bulles contrôlées visuellement.
- Finale : protection du Saphir, alarme permanente, délais des trois difficultés, cible au lieu du vol, plafond de renforts, expiration, victoire au dernier pas et réinitialisation testés. Déclenchement et écran de victoire vérifiés dans le navigateur avec une progression de test en mémoire, sans déverrouiller la sauvegarde réelle.

Le workflow GitHub est configuré pour vérifier le projet sous Node.js 22 et 24 à chaque push et pull request. Ses résultats sont consultables dans [GitHub Actions](https://github.com/Camelchafii691/infiltration-musee/actions). La présence du code sur GitHub ne constitue pas un déploiement du jeu : GitHub Pages doit être activé séparément.

## Ce qui n’est pas confirmé

1. Les corrections des chiens ciblent les départs serrés, les rotations sans progression et les blocages aux coins. Les tests de régression passent ; le signalement initial n’étant pas décrit précisément, un autre cas observé devra être reproduit avant de le déclarer résolu.
2. Le graphe de détours des chiens complète l’évitement local ; il ne garantit pas une navigation optimale pour toutes les situations de foule. Les gardes gardent leur steering local.
3. La suite automatisée ne remplace pas une partie humaine sur chaque appareil. Aucun test physique récent sur le téléphone de l’utilisateur n’est revendiqué.
4. Le réseau ne mémorise pas les trajets exacts et aucune amélioration systématique de ses performances n’a été démontrée.
5. Les consignes du cours mélangent plusieurs promotions ; les variantes non implémentées sont indiquées dans les documents d’architecture et de remise.

## État de la livraison

Le dossier contient uniquement le jeu, sa bibliothèque locale, la documentation, les scripts et les tests. Les fichiers de travail et archives ne sont pas inclus dans le dossier destiné au dépôt.

Le dépôt public de destination, créé avec l’accord de l’auteur, est [Camelchafii691/infiltration-musee](https://github.com/Camelchafii691/infiltration-musee). Aucun dépôt existant n’a été supprimé ou remplacé. Les vidéos de démonstration sont conservées séparément du code. L’expérience personnelle et les éventuels liens publics de vidéo et de démonstration restent à compléter par l’auteur.
