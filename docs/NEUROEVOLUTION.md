# Où se trouve le réseau neuronal ?

Il est réellement implémenté dans `js/neuroevolution.js`, classe `GuardBrain`, et utilisé par `Guard.neuralSteering()` dans `js/entities.js`.

## Architecture 6 → 8 → 2

- Six entrées : position du garde x/y, dernière position du voleur vue par ce garde x/y, vitesse du garde vx/vy.
- Huit neurones cachés et deux sorties, avec activation tanh.
- Deux sorties converties en direction puis en force de steering.
- 74 poids et biais par cerveau ; population de dix cerveaux dans la scène.

La force neuronale est complémentaire, principalement pendant les états RECHERCHE et RENFORT. Une faible contribution peut être proposée en patrouille lorsqu’une dernière position connue existe. L’évitement prioritaire peut épuiser le budget et empêcher son application. La poursuite directe reste un comportement classique de prédiction.

## Évolution

À la fin d’une tentative, `InfiltrationGame.finish()` évalue les gardes avec :

```text
fitness = détections × 140
        + pas d’alerte × 0,12
        + max(0, 180 − distance finale au joueur)
        + 220 si la tentative du joueur a échoué
```

Le bonus d’échec est attribué à tous les gardes, pas uniquement au capteur. Les évaluations ne sont pas réalisées sur des scénarios contrôlés identiques.

Quand on clique sur le bouton de nouvelle tentative ou de niveau suivant, `nextNight()` déclenche `evolve()` : classement, conservation de ceil(35 % × population), croisement puis mutation des descendants. Pour dix cerveaux, quatre élites sont conservées. La population, la génération et la meilleure fitness sont enregistrées dans `localStorage`.

La génération n’avance pas à chaque image. Revenir à l’accueil puis lancer START ne déclenche pas cette évolution.

## Limites à annoncer honnêtement

- Le réseau ne mémorise pas les trajets exacts. La trace visuelle de debug ne sert pas à l’entraînement.
- Une hausse de fitness ne prouve pas une amélioration de jeu ni une généralisation à de nouvelles cartes.
- La difficulté croissante est programmée dans la campagne, pas apprise par le réseau.
- Topologie fixe : pas d’éditeur de couches, pas de critère d’arrêt d’entraînement.
- Sauvegarde navigateur uniquement : pas d’import/export de cerveau en fichier.
- Réseau écrit en JavaScript, sans ml5 ni TensorFlow.

Phrase pour l’oral : « Les comportements réactifs gèrent patrouilles, poursuites et évitement. Un réseau 6–8–2 ajoute une force de recherche ; ses poids évoluent entre les tentatives par sélection, croisement et mutation. »
