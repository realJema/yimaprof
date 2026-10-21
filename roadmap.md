# Roadmap
- [ ] Retraits : remplacer la validation manuelle par le versement MeSomb protégé contre les doublons, vérifier les échecs et la confirmation
- [x] Lot 1 Notifications sans noms techniques + Trimestre
- [x] Lot 2 Offres : prix trimestriels/annuels réels, bandeau à pourcentages retiré, offres FR/EN
- [x] Lot 3 Multi-filières + filtre Série (leçons, challenges, admin épreuves)
- [ ] Lot 4 Langue (une seule langue par page, revue globale)
- [x] Lot 5 Challenges (date de fin seule, verrouillé sans pause, avertissement, PDF Drive, admin, menu abonnés)
- [x] Lot 6 Page Progression + recommandations

## Améliorations du 11 octobre
- [x] Leçons : disposition, séries multiples, protection sans bloquer le défilement
- [x] Challenges : message public discret, création admin/école, dates, PDF, CRUD et validation
- [x] Forum : couleurs et disposition
- [x] Offres : trois durées visibles simultanément
- [x] Navigation gratuite et invitations inscription/connexion
- [x] Vérification des couleurs d’origine et des parcours publics et imports JSON
- [ ] Vérification complète des parcours Admin/Établissement avec connexion : sessions de test indisponibles sur le Supabase externe

## Améliorations du 11 octobre (2)
- [x] Épreuves : séries multiples (déjà en place)
- [x] Challenges : brouillon persistant (école + admin), aperçu et modification admin, cible classes/séries
- [x] Challenges validés visibles par les élèves inscrits par leur école
- [x] Leçons : exercices en mode focus + appréciations par niveau

## Cahier « 2. Page Challenge » (14 oct.)
- [x] Prix affiché dans le détail du challenge
- [x] Filtres Série / Classe / Matière / Type sur Challenges
- [x] Page leçon élargie ; niveaux Facile/Intermédiaire/Difficile colorés
- [ ] Comptes parents créés par l'école (email ou téléphone, SMS bloqué), mots de passe auto, export PDF, import CSV
- [ ] Protection renforcée du document (masquer lien source), couleurs de l'évaluation leçon
- [ ] Connexion Google (Gmail) à diagnostiquer

## Protection et présentation des leçons (14 octobre)
- [x] Renforcer les protections du lecteur sans bloquer le défilement et préciser les limites des documents externes
- [x] Améliorer la hiérarchie, l’alignement et les couleurs de la page de lecture sans changer les droits ni les exercices
- [ ] Vérifier le lecteur, les protections et la navigation

## Application mobile native (15 octobre)
- [x] Dépendances Capacitor installées (core, cli, ios, android) et configuration créée
- [x] Dossiers natifs Android et iPhone ajoutés, rechargement à chaud depuis le bac à sable
- [ ] Import CSV des élèves, code d’invitation élève, comptes parents créés par l’école
- [ ] Récits de test du parcours mobile (connexion, abonnements, leçons, épreuves) sur un vrai appareil
- [ ] Retirer le bloc `server.url` et préparer les icônes, splash et signatures avant App Store / Play Store
- [ ] Comptes développeur : Apple (99 $/an), Google (25 $ une fois) — à la charge de l’établissement
- [ ] Notifications push en arrière-plan : non en place (API web indisponible sur iPhone, extensions natives à prévoir)
