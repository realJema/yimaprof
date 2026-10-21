# Publier YimaProf sur Google Play et l'App Store

L'application mobile utilise exactement le même site et la même base de données que yimaprof.com.

## 1. Récupérer le projet
```
git pull
npm install
```

## 2. Icônes et écran de démarrage (une fois, puis à chaque changement de logo)
Les images sources sont dans `resources/` (icon.png 1024×1024, splash.png 2732×2732).
```
npm run cap:assets
```

## 3. Build de production (contenu embarqué, pas de rechargement à chaud)
```
npm run cap:release
```
Le rechargement à chaud n'est actif que via `npm run cap:live` (tests uniquement, jamais pour les boutiques).

## 4. Android — Google Play
1. `npx cap open android` (Android Studio).
2. Augmenter `versionCode` / `versionName` dans `android/app/build.gradle` à chaque mise en ligne.
3. Build > Generate Signed App Bundle > AAB, avec une clé de signature (conserver la clé et le mot de passe en lieu sûr).
4. Play Console (25 $ une fois) : créer l'app, fiche (description, captures, icône 512×512), politique de confidentialité, classification du contenu, sécurité des données, puis envoyer l'AAB en test interne puis en production.

## 5. iOS — App Store (Mac + Xcode requis)
1. `npx cap open ios`.
2. Dans Signing & Capabilities : choisir l'équipe Apple Developer (99 $/an), Bundle ID `app.lovable.p9b7b100e3aeb4062a5d70a7173c46989`.
3. Incrémenter Version / Build.
4. Product > Archive > Distribute App > App Store Connect.
5. App Store Connect : fiche, captures (iPhone 6,7"), politique de confidentialité, puis TestFlight et soumission.

## 6. Points de vigilance avant soumission
- Abonnements : Apple et Google peuvent exiger leur propre système d'achat pour du contenu numérique ; le paiement MeSomb dans l'app peut entraîner un refus. Prévoir une réponse (paiement sur le site web uniquement, ou achats intégrés).
- Connexion Google/Facebook : à adapter pour le mobile (ouverture navigateur + adresses de retour autorisées dans Supabase) avant publication.
- Suppression de compte : Apple exige un moyen de supprimer son compte depuis l'app.
- Politique de confidentialité publique (URL) obligatoire sur les deux boutiques.
