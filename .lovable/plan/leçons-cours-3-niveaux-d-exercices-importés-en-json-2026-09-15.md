# Leçons : cours + 3 niveaux d'exercices importés en JSON

## Ce qui existe aujourd'hui

- **Formulaire admin** (`LessonManagement.tsx`) : un seul dialogue avec tous les champs, le lien du document Word et une section « Questions de compréhension ».
- **Champ document** (`LessonDocumentField.tsx`) : lien + aperçu iframe uniquement après clic sur « Tester l'aperçu ». La conversion Google Docs `edit` → `preview` existe déjà dans `lessonDocs.ts`.
- **Page élève** (`LessonDetail.tsx`) : document intégré, questions de compréhension, puis une liste d'exercices groupés Facile / Intermédiaire / Difficile qui pointent vers des épreuves liées (table `lesson_exercises`).
- **Exercices liés** (`LessonExerciseManager.tsx`) : création d'exercices sous forme d'épreuves + liaison d'épreuves existantes.
- La durée existe déjà : `lessons.estimated_minutes`.

## Structure de données proposée

Un nouveau champ JSON sur la leçon, rien de cassé :

```text
lessons.exercises  jsonb  NOT NULL DEFAULT '{}'
{
  "facile":       [ { question, type, options[], answer, points, correction } ],
  "intermediaire": [ ... ],
  "difficile":    [ ... ]
}
```

Les colonnes `questions`, `file_url`, `estimated_minutes` et la table `lesson_exercises` restent en place.

## Compatibilité avec l'existant (à valider)

- Aucune suppression de données : les anciennes « questions de compréhension » et les épreuves liées restent en base.
- L'éditeur de questions de compréhension est retiré du formulaire ; sur la page élève, ces questions ne s'affichent que si la leçon en possède déjà (compatibilité, pas de nouvelle saisie).
- Les épreuves liées existantes (les exercices génériques créés auparavant) continuent de s'afficher dans un bloc distinct « Épreuves liées », sous les 3 niveaux. Le gestionnaire d'épreuves liées reste accessible depuis la liste admin.
- Aucune migration destructive : les leçons anciennes affichent simplement 0 exercice par niveau jusqu'à un import JSON.

## Formulaire admin en 3 étapes

Remplacement du contenu du dialogue par un stepper cliquable (Précédent / Suivant, Précédent désactivé à l'étape 1) :

1. **Informations générales** — Titre, Résumé, Matière, Classe, Série, Chapitre, Durée (min), Langue, interrupteurs Leçon gratuite / Publier. Champs inchangés.
2. **Contenu du cours** — champ « Lien du document Word » avec le message d'aide actuel, et aperçu iframe qui se met à jour automatiquement dès qu'un lien valide est saisi (conversion Google Docs vers `/preview`). Sans lien : zone vide avec icône et « Aucun document lié pour l'instant ».
3. **Exercices d'application** — zone de collage JSON + import de fichier `.json`, bouton « Valider le JSON », puis « Importer / Enregistrer » qui n'apparaît qu'après validation réussie. Aperçu du nombre d'exercices détectés par niveau, et rappel du nombre déjà enregistré sur la leçon. Le bouton final devient « Publier — voir côté élève » et ouvre la page élève de la leçon.

Validation JSON, rien n'est enregistré en cas d'erreur : JSON syntaxiquement valide ; les 3 clés `facile` / `intermediaire` / `difficile` présentes et de type tableau ; chaque exercice avec `question`, `answer`, `points` ; si `type = "qcm"`, `answer` doit figurer à l'identique dans `options`. Message d'erreur précis : niveau, index de l'exercice, champ fautif.

## Page élève

- Bloc **Contenu du cours** : aperçu intégré du document (comportement actuel conservé).
- Bloc **Exercices d'application** : 3 cartes cliquables (Facile / Intermédiaire / Difficile) affichant le nombre d'exercices. Au clic : deux boutons **Évaluation** et **Corrigé**.
- **Évaluation** : compte à rebours démarré à l'entrée, basé sur la durée de la leçon, affiché en `mm:ss` avec alerte visuelle dans la dernière minute ; options cliquables (choix unique, modifiable) ; bouton « Valider mes réponses » ; à 0, soumission automatique de l'état courant avec message « temps écoulé » ; résultats = bonnes réponses, score sur le total des points ; bouton « Recommencer » qui relance un minuteur complet ; minuteur nettoyé au démontage du composant.
- **Corrigé** : question, bonne réponse, explication, lecture seule, sans minuteur ni score.
- Historique : le résultat est enregistré dans `user_evaluations` uniquement s'il peut l'être sans épreuve associée ; sinon la progression de la leçon (`lesson_progress`) est mise à jour. Ce point est vérifié avant écriture.

## Détails techniques

- Migration : `ALTER TABLE public.lessons ADD COLUMN exercises jsonb NOT NULL DEFAULT '{}'::jsonb` (aucune perte, aucun RLS à changer).
- Nouveau `src/lib/lessonJsonExercises.ts` : types, parsing, validation avec messages localisés, comptage par niveau.
- Nouveau `src/components/admin/LessonJsonImport.tsx` (étape 3) et `LessonStepper` interne à `LessonManagement.tsx`.
- Nouveaux `src/components/lesson/LessonLevelCard.tsx`, `LessonLevelEvaluation.tsx` (minuteur `setInterval` + nettoyage), `LessonLevelCorrection.tsx`.
- `LessonDocumentField.tsx` : aperçu automatique au lieu du bouton bascule (bouton conservé pour masquer).
- Aucun fichier des épreuves (`ExamViewer`, `ExamManagement`, `examScoring`…) n'est modifié.
