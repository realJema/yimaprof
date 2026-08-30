# Notes sur 20, challenges-épreuves et correction IA

## 1. Notation sur 20 (au lieu du pourcentage)

- Chaque QCM garde son barème: points par question (défaut 1). Score final = somme des points obtenus, ramené sur le total de points disponibles, puis converti sur 20 (ou 10 / 100 selon un réglage par épreuve).
- Affichage partout sous la forme `16/20` (dashboard élève, résultats, école, parents, admin, historique). Le pourcentage reste uniquement comme information secondaire dans les graphiques.
- Stockage: on réutilise `user_evaluations.total_score` / `total_possible` déjà présents, plus deux colonnes additives `graded_out_of` (défaut 20) et `score_scaled`. Aucune donnée existante supprimée: les anciennes lignes en pourcentage sont converties à l'affichage.

## 2. Protection du contenu

- Blocage du clic droit, du glisser-déposer d'images, de la sélection de texte et des raccourcis copier/imprimer sur les pages épreuve, leçon et challenge.
- Anti-capture: masquage automatique du contenu si la fenêtre perd le focus ou si l'onglet passe en arrière-plan, filigrane discret avec le nom d'utilisateur sur l'énoncé. Une capture système ne peut pas être bloquée techniquement dans un navigateur — le filigrane rend la fuite traçable.

## 3. Challenges = épreuves de compétition

- Un challenge porte désormais une épreuve (`exam_id`) et une portée: établissement, régionale (région du Centre, etc.), nationale.
- Clic sur un challenge → page dédiée qui affiche l'énoncé exactement comme une épreuve Yima, mais sans bouton de correction ni solutions.
- Critères d'éligibilité: classe, série, matière, région/établissement selon la portée. Seuls les élèves correspondants voient le bouton « Passer le challenge ».
- Une seule tentative. Écran occupé: plein écran forcé, navigation bloquée, chronomètre, avertissement à chaque sortie de plein écran, soumission automatique à la fin du temps.
- Coupure internet: la session (réponses, temps restant, consultation préalable) est sauvegardée localement en continu et rejouée à la reconnexion via la file d'attente déjà en place; la tentative reste unique et ne peut pas être relancée.

## 4. Traçabilité de la participation

- Booléen « a consulté l'épreuve avant de la passer » (oui/non) enregistré dès la première ouverture de l'énoncé hors session.
- Temps réel de réalisation enregistré et affiché dans les classements et les tableaux de bord école/admin.

## 5. Interface d'insertion des cours et exercices (pour Darelle)

- Éditeur de leçons: titre, classe, matière, série, chapitre, contenu, ordre, publication.
- Exercices rattachés à une leçon avec un niveau: basique, intermédiaire, avancé.
- Accès: exercices basiques gratuits pour tous; intermédiaires et avancés réservés aux abonnés, avec carte verrouillée et invitation à s'abonner (même logique de paywall que les épreuves).
- Rôle: accessible aux `admin` et `editor` (et aux écoles pour leur propre contenu).

## 6. Correction IA des épreuves à rédaction

Fonctionne déjà via `ai-grade`; on l'étend et on maîtrise les coûts:

- Modèle par défaut économique (`google/gemini-3.7-flash`), escalade vers un modèle plus fort seulement sur demande explicite d'un enseignant en cas de contestation.
- Une seule requête par copie, toutes les questions rédigées regroupées dans le même appel, sortie structurée (note, points, justification courte).
- Barème et corrigé de référence envoyés dans le prompt pour éviter de longs raisonnements, avec consigne de brièveté.
- Contexte éducatif configurable par pays (Cameroun, Sénégal, etc.): barème, terminologie, exigences de rédaction.
- Cache: une copie déjà corrigée n'est jamais renvoyée à l'IA; les tentatives identiques réutilisent le résultat.
- Garde-fous de coût: quota par utilisateur et par jour, plafond global journalier, journalisation dans `ai_usage_logs` et suivi dans l'admin existant.
- Ordre de grandeur: avec ce réglage, une copie rédigée coûte une fraction de centime; quelques milliers de copies par mois restent négligeables face au prix d'un abonnement.

## 7. Ergonomie et couleurs

- Conservation de l'identité Yimaprof (bleu + orange) mais montée en gamme: cartes plus lisibles, dégradés maîtrisés, badges de niveau colorés, barres de progression, anneaux de score, états vides soignés, animations discrètes.
- Aucune refonte des routes ni de la structure: uniquement présentation et tokens du design system.

## 8. Détails techniques

- Migrations additives uniquement: `challenges.exam_id`, `challenges.region`, critères d'éligibilité, `challenge_participants.viewed_before`, `time_spent_seconds`, `attempt_locked`; `lesson_exercises.level`; `user_evaluations.graded_out_of` et `score_scaled`. Aucune colonne renommée ou supprimée.
- RLS: lecture des challenges selon la portée et l'éligibilité, écriture réservée aux administrateurs d'établissement et aux admins; unicité de la tentative garantie côté base.
- Ordre de livraison: (1) notation sur 20, (2) protection du contenu, (3) challenges-épreuves + passage sécurisé, (4) éditeur cours/exercices + paywall par niveau, (5) correction IA étendue, (6) finitions visuelles.
