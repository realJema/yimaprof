# Roadmap
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
