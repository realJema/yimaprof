# Corrections et compléments — plan par lots

Chaque lot est livré et vérifié avant le suivant, sans toucher aux fonctions qui marchent déjà.

## Lot 2 — Offres d'abonnement
- Retirer le bandeau du haut qui affiche des prix calculés en pourcentage.
- Afficher pour chaque offre les prix mensuel, trimestriel et annuel enregistrés par l'admin (si un prix manque, la durée n'est pas proposée).
- Nom, description et avantages de chaque offre en français et en anglais ; la page n'affiche que la langue choisie. Champs FR/EN ajoutés dans l'admin des offres ; les offres actuelles gardent leur texte comme version française.

## Lot 3 — Série / Filière
- Choix de plusieurs séries à la création d'une épreuve et d'un challenge (la série unique actuelle est conservée et reprise automatiquement).
- Filtre Série ajouté : leçons (élève + admin), challenges, liste admin des épreuves. La bibliothèque d'épreuves reconnaît aussi les séries multiples.

## Lot 5 — Challenges
- Plus de date de début : seulement une date de fin (les challenges existants gardent leurs dates, la date de début n'est plus demandée ni affichée).
- Déroulé comme une évaluation en ligne : avertissement obligatoire avant le lancement, pas de pause, écran verrouillé, à finir jusqu'au bout, pas de corrigé ni de note avant la soumission.
- École : champ « Lien Google Drive du PDF de l'épreuve » dans le formulaire de création.
- Admin : nouvel onglet « Challenges » — liste de toutes les demandes, statut, validation/refus, import JSON des questions.
- Menu « Challenges » visible pour tous les profils ; contenu réservé aux comptes avec abonnement actif ; sinon invitation à s'abonner ; liste vide → « Aucun challenge disponible pour le moment ».

## Lot 6 — Page Progression
- Indicateurs : leçons apprises, exercices faits (par niveau), épreuves et challenges passés, moyenne.
- Recommandations selon la moyenne (moins de 50 %, 50–69 %, 70–84 %, 85 % et plus) : conseils généraux et actions concrètes avec liens (refaire un niveau Facile, ouvrir une leçon, tenter un challenge…), et matières à renforcer.

## Détails techniques
- Migration : `challenges.starts_at` devient optionnel (valeur par défaut now()), ajout `challenges.pdf_url`, statut de validation des challenges ; `exams.series_ids uuid[]` et `challenges.eligible_series_ids` alimentés depuis `series_id` ; colonnes `name_en/name_fr`, `description_en/fr`, `features_en/fr` sur `subscription_plans`.
- Les résultats des exercices de leçon ne sont pas encore enregistrés : ils le seront dans `user_evaluations` (lien `lesson_id`) pour la page Progression.
- Le verrouillage reprend le mode d'évaluation existant sans le bouton Pause.
