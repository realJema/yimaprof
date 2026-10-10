# Mises à jour et nouvelles fonctionnalités — plan par lots

Le cahier des charges est découpé en 5 lots, livrés et vérifiés l'un après l'autre. Rien ne change dans les fonctions déjà en place.

## Lot 1 — Corrections rapides
- **Notifications** : plus aucun nom technique (table, variable, type comme `admin_message`) dans la liste, la fenêtre de détail et les emails. On affiche un libellé lisible et traduit (« Message de l'équipe », « Paiement confirmé »…), et les badges bruts sont retirés.
- **Terminologie** : « Semestre » est remplacé par « Trimestre » partout (libellés de l'interface et noms des périodes dans la base).

## Lot 2 — Offres d'abonnement
- La page des offres affiche les cycles Mensuel, Trimestriel et Annuel avec un sélecteur. Elle utilise les prix trimestriels et annuels déjà enregistrés, ou à défaut −10 % et −20 % (règle existante).
- Les cartes sont plus attractives : économie affichée en FCFA, badge « Le plus populaire », avantages mis en avant et prix ramené au mois.
- Le paiement reçoit le cycle choisi. Le flux MeSomb ne change pas.

## Lot 3 — Multi-filières
- Une épreuve peut appartenir à plusieurs séries/filières. On ajoute une liste de séries à côté de la série actuelle, qui est conservée et recopiée automatiquement dans la liste (rattrapage des contenus existants sans rien perdre).
- Dans le formulaire admin d'épreuve, le menu Série/Filière permet de choisir plusieurs filières.
- Un filtre multi-filières est ajouté, de façon homogène, sur les Épreuves (bibliothèque et admin), les Leçons, les Classes et les Élèves.
- Un outil admin de « mise en conformité » liste les épreuves et leçons sans filière et permet d'en assigner plusieurs à la fois.

## Lot 4 — Langue
- On passe page par page pour faire en sorte que tout texte affiché suive la langue choisie (FR ou EN), sans mélange. Les noms de matières, périodes et types utilisent leur version traduite quand elle existe.

## Lot 5 — Challenges
Ce lot complète ce qui existe déjà (page Challenges, tentatives, classement).
- **Fiche challenge** : public cible (grand public ou établissement), critères de qualification, prix (facultatif), auteur, date et heure de début et de fin, durée, note sur, nombre de tentatives.
- **Création par l'Admin** : formulaire dédié avec import JSON des questions et corrections, mêmes validations que pour les épreuves, puis publication directe.
- **Demande par un établissement** (Espace école → Challenges) : l'établissement remplit les informations et donne le lien Google Drive du PDF. Le statut devient « En cours de traitement ». L'établissement ne voit jamais la partie JSON.
- **Validation** : un menu Admin « Challenges en demande » permet de saisir le JSON puis de valider. Le statut passe à « Validé » et l'établissement reçoit la notification « Challenge prêt ».
- **Code privé** : chaque challenge réservé à un établissement a un code, visible seulement par l'école. Le participant doit le saisir avant de commencer, avec le message « Rapprochez-vous du responsable de l'établissement pour obtenir le code ». Le code est vérifié côté serveur.
- **Accès** : le menu Challenges est visible par tous. Il affiche le statut, les dates, le public cible et le prix. Sans challenge, il affiche « Aucun challenge disponible pour le moment ». Un challenge ne s'ouvre qu'à partir de sa date et heure de début.
- **Résultats** : tout le monde voit les résultats, le meilleur et le moins bon score. Seuls les candidats qui remplissent les critères comptent au classement. Le TOP 20 s'affiche à la fin.

## Détails techniques
- `exams.series_ids uuid[]` est rempli à partir de `series_id` ; `series_id` est gardé pour la compatibilité. On fait de même pour `lessons.series_ids`.
- `challenges` reçoit : `target_audience`, `qualification_criteria`, `author_name`, `request_status` (pending_review/validated/rejected), `pdf_drive_url`, `access_code_hash`, `content jsonb`. Des RPC SECURITY DEFINER servent à vérifier le code (`join_challenge_with_code`), à valider (admin) et à afficher les résultats publics (`challenge_public_results` : top 20, meilleur et pire score).
- Un fichier de libellés partagé centralise les types de notifications.
- Ordre de livraison : 1 → 2 → 3 → 4 → 5, avec vérification de compilation et un test dans le navigateur à chaque lot.
