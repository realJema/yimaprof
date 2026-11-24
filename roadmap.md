# Roadmap
- [ ] Rétablir les paiements MeSomb via Supabase : diagnostiquer la clé API inactive, préserver le parcours rapide et empêcher les transactions bloquées ; validation réelle subordonnée à une clé MeSomb active.
- [x] Enregistrer la nouvelle clé MeSomb temporaire via le formulaire de secret sécurisé ; valeur jamais exposée dans le chat ou le code.
- [x] Prendre en charge les exercices de leçon à plusieurs questions : le premier exercice Facile gratuit conserve toutes ses questions ; ancien format préservé (78 tests et affichage navigateur vérifié).
- [ ] Regrouper les 10 questions Facile de « Circuit simple » en un seul exercice gratuit si l’utilisateur confirme ce regroupement ; aucune donnée réelle modifiée avant sa réponse.
- [x] Construire le guide : suivi hebdomadaire, difficultés, prochaine action, plan jusqu’à l’échéance.
- [x] Tester les calculs et le guide sur ordinateur et téléphone (30 tests et parcours avec réponses simulées).
- [ ] Vérifier objectifs, échéance et résultats du guide avec une vraie session élève (Supabase externe sans session gérée).
- [x] Clarifier le plein écran, documenter l'absence de pénalité et ajouter les classements après clôture (accès protégé côté serveur).
- [x] Ajouter les cours multi-classes, séries visibles et sections FR/EN ; anciennes classes conservées.
- [x] Restaurer les six Séquences dans les filtres (sélection vérifiée dans le navigateur).
- [x] Ajouter les offres jour/semaine avec tarifs administrables et durées exactes (tests réussis ; tarifs non configurés).
- [x] Traduire l'aide en anglais ; recherche et restrictions des profils vérifiées sur pages publiques.
- [ ] Vérifier la sauvegarde admin des classes/prix et un classement avec compte connecté (session Supabase externe indisponible).

- [x] Finaliser Google Search Console : site vérifié, sitemap envoyé.
- [x] Répondre à la stratégie SEO / Search Console (élèves et parents).

- [x] Corriger la sortie après refus de démarrage du paiement, sans réessai en cas de résultat incertain (tests et navigateur avec réponses simulées).
- [x] Restaurer les exercices précédents lors de l’annulation d’un import JSON validé (tests et composant vérifié dans le navigateur).

- [x] Vérifier le suivi commun Orange/MTN et actualiser automatiquement les historiques dès les changements de transaction (Realtime activé sur transactions, 9 tests réussis).
- [ ] Confirmer la livraison des notifications MeSomb : aucun journal webhook disponible ; les confirmations Orange récentes proviennent de la vérification de statut, un paiement réel reste nécessaire pour vérifier la livraison côté prestataire.
- [x] Fluidifier Orange Money / MTN : démarrage immédiat, suivi Supabase et récupération de confirmation sans relancer un débit (5 tests réussis).
- [ ] Vérifier un paiement Mobile Money réel connecté (Supabase externe : session de test non disponible).
- [x] Débloquer « Annuler sans versement » (garde-fou base de données refusait le statut refusé)
- [x] Message « Vérifiez le montant et votre mot de passe » : provient de l'ancienne version publiée → republier
- [ ] Remettre le minimum de retrait à 500 FCFA (attend la fin des tests de l'utilisateur)
- [ ] Domaine expéditeur vérifié dans Resend pour les codes par email (attend l'utilisateur)
