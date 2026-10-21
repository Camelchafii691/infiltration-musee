# Publication et remise

## Dépôt à publier

Publier le contenu du dossier `infiltration-musee` à la racine du dépôt choisi : `index.html`, `style.css`, `js/`, `libraries/`, `scripts/`, `tests/`, `docs/` et les fichiers de configuration. Ne pas publier le dossier de travail global, le clone du cours, les diapositives, les QR locaux ou les archives.

Le dépôt de destination doit être confirmé par son URL. Aucun dépôt existant ne doit être supprimé ou écrasé pour publier ce jeu. S’il contient déjà des fichiers, conserver son historique et préparer l’intégration sur une branche.

## Avant de pousser

1. Exécuter `npm run check` puis `npm test`.
2. Jouer au moins une tentative en Facile et une en Difficile.
3. Vérifier collecte, ombre, détection, pause et transition de niveau.
4. Tester les chiens en groupe et près des murs : les nouveaux détours, départs espacés et patrouilles ont des tests de régression ; compléter par une partie humaine.
5. Ne pas ajouter de clé privée, token, fichier `.env` ou données personnelles.

## Démo publique

Le jeu est statique : il ne nécessite ni serveur applicatif ni base de données. Une publication GitHub Pages peut utiliser la branche du dépôt avec `index.html` à sa racine. Le workflow fourni ne publie pas le site : il vérifie seulement le projet. Activer Pages séparément après confirmation du dépôt et du mode de diffusion.

La progression locale ne migre pas automatiquement vers la nouvelle adresse. Le lien et le QR de démonstration devront pointer vers l’adresse publiée, pas vers localhost.

## Informations personnelles à compléter par l’auteur

Ne pas inventer une expérience personnelle ou une vidéo. Remplir avant le rendu :

- Nom et classe : à renseigner.
- URL du dépôt : https://github.com/Camelchafii691/infiltration-musee
- URL de la démo : après activation de l’hébergement.
- URL de la vidéo : après enregistrement.
- IDE et assistants utilisés : mentionner l’aide de Codex pour la préparation du code, des tests et de la documentation ; préciser ce que vous avez compris et modifié personnellement.

### Mon expérience

Rédiger avec vos propres mots : pourquoi ce sujet, une difficulté réellement rencontrée, comment sa solution fonctionne, une limite du projet et ce que vous amélioreriez. Ne pas reprendre un récit généré comme s’il décrivait une expérience vécue.

## Démonstration conseillée (90 secondes)

1. Accueil, objectif et commandes.
2. Patrouille, ombre et détection occultée par une vitrine.
3. Poursuite, leurre et renforts.
4. Meute de chiens et équipe derrière le chef, en debug.
5. Rapport, nouvelle tentative et changement de génération.

Le support mélange plusieurs établissements et années. Faire confirmer les exigences exactes par l’enseignant : notamment ml5, projection scalaire, topologie neuronale réglable ou mode serpent/leader. Le jeu ne couvre pas littéralement toutes ces variantes.
