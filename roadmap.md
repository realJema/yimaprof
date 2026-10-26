# Roadmap

- [ ] Mesurer les consultations des offres et les paiements par pays, séparer les tests et évaluer le frein Mobile Money.

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
