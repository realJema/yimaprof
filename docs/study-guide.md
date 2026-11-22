# Guide d’apprentissage et de révision

## Parcours élève

Le tableau de bord présente le bilan de la semaine et un lien vers **Progression → Mon guide d’apprentissage**. Le guide propose quatre étapes, dans cet ordre :

1. **Suivi hebdomadaire** : semaines du lundi au dimanche, total d’évaluations soumises et notées, distinction épreuves/exercices de leçon, moyenne, jours de pratique évaluée, comparaison avec la semaine précédente et liste des résultats. Objectif modifiable de 1 à 21 évaluations par semaine, initialement 3.
2. **Analyse des difficultés** : les cinq derniers résultats disponibles de chaque matière, sur la semaine actuelle et les onze précédentes. Moins de 50 % : bases à renforcer ; de 50 à 69 % : à consolider ; à partir de 70 % : à entretenir. Un seul résultat est explicitement présenté comme un signal à confirmer.
3. **Prochaine action** : matière la plus faible parmi les résultats retenus, dernière activité correspondante. Une leçon identifiable ouvre directement cette leçon ; sinon les épreuves sont filtrées par matière. Sans résultat, l’élève choisit sa première leçon. Un échec ramène aux bases ; réussir Facile ne fait pas sauter directement à Difficile.
4. **Plan jusqu’à l’échéance** : l’élève choisit Séquence 1 à 6, BEPC, Probatoire, Bac, GCE ou une évaluation nommée. Chaque semaine propose un nombre de séances correspondant à l’objectif ; les séances alternent les matières connues, privilégient les bases lorsqu’elles sont fragiles et des épreuves durant les deux derniers jours. Aucune séance n’est placée après la date de l’échéance. Navigation possible jusqu’à la dernière semaine.

Une séance est validée par un résultat enregistré correspondant à la matière et, lorsqu’une leçon précise est ciblée, à cette leçon. Une épreuve est nécessaire pour une séance finale chronométrée. Un résultat peut valider une seule séance de la semaine ; les rattrapages sont acceptés après la date prévue. Le plan est adaptatif, pas un calendrier historique immuable.

## Persistance et sécurité

- Objectif et échéance sont synchronisés dans `study_preferences`, accessibles uniquement à leur propriétaire via les règles Supabase.
- L’ancienne échéance locale est importée uniquement lorsque le compte ne possède encore aucune préférence enregistrée. Supprimer l’échéance conserve la ligne avec une date vide afin d’éviter sa réapparition.
- Les résultats sont paginés et limités explicitement à douze semaines ; les doublons de nouvelles tentatives d’insertion d’une même épreuve sont regroupés par épreuve/leçon/numéro de tentative. Les différentes tentatives réelles sont conservées.
- Les paiements, règles d’accès, corrigés et évaluations existants ne sont pas modifiés. Le guide ne contourne jamais un abonnement nécessaire.

## Limites explicites

L’analyse porte sur les matières et niveaux enregistrés, pas sur des concepts précis : aucune difficulté conceptuelle n’est inventée. Les exercices JSON stockent seulement un pourcentage ; leur durée n’est donc pas inventée. Les challenges restent dans l’historique existant mais sont exclus du compteur épreuves/exercices. La consultation des corrigés n’est pas mesurée. Les dates de résultats rejoués hors connexion correspondent aux dates actuellement enregistrées par le système.

## Vérification de cette livraison

- Tests de calcul : semaines, notes nulles/zéro, séparation des sources, dédoublonnage, plus de 1 000 résultats, classement des matières, niveaux progressifs, six séquences, échéances et plan.
- Navigation testée avec réponses Supabase simulées : lecture des résultats, objectif enregistré puis relu, création/modification/suppression d’une échéance, prochaine activité, navigation du plan, état vide et affichage ordinateur/téléphone.
- La connexion au Supabase externe ne permet pas de créer une session gérée : la sauvegarde avec une vraie session élève reste à vérifier. Les simulations ne constituent pas une validation de bout en bout en production.