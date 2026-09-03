# Leçons au format Word (documents hébergés en externe)

Objectif : arrêter de saisir le contenu des leçons à la main. Vous collez le lien d'un document Word déjà hébergé ailleurs (Google Drive, OneDrive, Dropbox...), et l'élève lit la leçon directement dans la page grâce à une visionneuse intégrée en lecture seule.

## Ce qui sera construit

### 1. Nouvelle page admin « Leçons » (`/admin/lessons`)
Construite sur le même modèle que la page de gestion des épreuves :
- Liste filtrable (matière, classe, chapitre, publié/brouillon, école) avec recherche et pagination.
- Formulaire de création/édition : titre, résumé, matière, classe, chapitre, série, durée estimée, niveau, gratuit/abonnés, publié/brouillon.
- Champ **Lien du document Word** avec :
  - validation de l'URL,
  - détection automatique du fournisseur (Google Docs/Drive, OneDrive/SharePoint, lien direct .docx),
  - conversion automatique en URL d'aperçu (Google `/preview`, OneDrive `embed`, sinon visionneuse Office),
  - bouton « Tester l'aperçu » qui affiche le document dans le formulaire avant enregistrement.
- Aide contextuelle rappelant que le lien doit être partagé en « lecture pour tous ».
- Actions : publier/dépublier, dupliquer, supprimer, association d'exercices (épreuves liées) comme aujourd'hui.

Entrée ajoutée dans la navigation admin, à côté de la gestion des épreuves.

### 2. Page publique de la leçon (`/lessons/:id`)
- Si un lien de document existe, la leçon s'affiche dans une **visionneuse intégrée** (iframe plein largeur, hauteur adaptative, plein écran possible).
- Repli automatique : si l'aperçu ne charge pas, un message clair s'affiche (« document indisponible ») — sans lien de téléchargement pour le contenu payant.
- Lecture seule : la visionneuse est enveloppée dans le composant de protection existant (clic droit, copie, captures bloquées) ; aucun bouton de téléchargement n'est proposé.
- Le contenu texte reste supporté : si aucun lien n'est renseigné, l'affichage Markdown actuel est conservé.
- Le suivi de progression, le bouton « Marquer comme terminé » et les exercices liés restent inchangés.

### 3. Liste des leçons (`/lessons`)
- Badge « Document » sur les leçons basées sur un fichier Word.
- Regroupement matière → chapitre → leçon conservé, verrouillage abonnés conservé.

### 4. Espace école — upload de contenu
Le composant de contenu de l'espace école adopte le même formulaire :
- Champ **Lien du document Word** + test d'aperçu, à la place de la grande zone de texte.
- Le champ texte reste disponible en option (accordéon « Contenu texte »).
- Les leçons de l'école restent limitées à son établissement et à ses classes.

## Détails techniques

- Base de données : `lessons.file_url` existe déjà et sera utilisé pour le lien. Ajout additif de deux colonnes : `file_provider` (`google` | `onedrive` | `direct` | `other`) et `file_embed_url` (URL d'aperçu calculée), pour éviter de recalculer côté client et faciliter le changement de visionneuse. Aucune donnée existante modifiée.
- Nouvel utilitaire `src/lib/lessonDocs.ts` : normalisation d'URL → `{ provider, embedUrl }`, avec règles pour `docs.google.com`, `drive.google.com`, `1drv.ms`/`sharepoint.com`, `dropbox.com` (`?raw=1`) et repli sur `view.officeapps.live.com/op/embed.aspx?src=...` pour les `.docx` publics directs.
- Nouveaux fichiers front : `src/pages/AdminLessons.tsx`, `src/components/admin/LessonManagement.tsx`, `src/components/admin/LessonDocumentField.tsx`, `src/components/lesson/LessonDocumentViewer.tsx`.
- Modifiés : `src/pages/LessonDetail.tsx`, `src/pages/Lessons.tsx`, `src/components/school/SchoolContent.tsx`, `src/App.tsx` (route), navigation admin.
- Sécurité : la visionneuse iframe utilise `sandbox="allow-scripts allow-same-origin allow-popups"` sans `allow-downloads`, plus `ProtectedContent` autour. Les RLS existantes des leçons ne changent pas ; l'écriture reste réservée aux admins/éditeurs et aux `school_admin` de l'établissement.
- Limite honnête à signaler : un document rendu public via un lien reste techniquement accessible à qui possède l'URL — la lecture seule décourage la copie mais ne la rend pas impossible.
