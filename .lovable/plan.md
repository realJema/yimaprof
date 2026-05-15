## Objectif

Supprimer toutes les mentions « Lovable » que Google ou un visiteur peut voir, sans toucher à l'intégration AI Gateway (backend invisible) ni au plugin `lovable-tagger` (dev-only).

## Changements

### 1. `index.html` — méta SEO publiques
- `<meta name="author">` : `Lovable` → `Yimaprof`
- `<meta property="og:title">` : `yima-learn-connect` → `Yimaprof — Exam Preparation Platform`
- `<meta property="og:description">` : `Lovable Generated Project` → reprendre la description du site (« Plateforme de préparation aux examens du Cameroun »)
- `<meta property="og:url">` : ajouter `https://yimaprof.com/`
- `<meta property="og:type">` : ajouter `website`
- `<meta name="twitter:site">` : `@lovable_dev` → retirer (ou remplacer par le handle Yimaprof si fourni)
- Ajouter `<link rel="canonical" href="https://yimaprof.com/" />`
- Ajouter un JSON-LD `Organization` minimal (name, url, logo)

### 2. `README.md`
Réécrire entièrement pour Yimaprof :
- Titre, description courte, stack technique (React/Vite/Supabase), commandes `npm install` / `npm run dev`, lien custom domain `https://yimaprof.com`. Aucune mention Lovable ni URL `lovable.dev`.

### 3. Emails transactionnels
- `supabase/functions/send-notification-email/_templates/subscription-expiry.tsx` ligne 145 : `https://yimaprof.lovable.app/contact` → `https://yimaprof.com/contact`
- `supabase/functions/send-notification-email/index.ts` ligne 114 : remplacer `supabaseUrl.replace('.supabase.co', '.lovable.app')` par une constante `https://yimaprof.com` (les liens d'action des emails pointeront vers le domaine custom au lieu du sous-domaine `.lovable.app`)

### 4. Demande de re-scan SEO
Après les modifications, soumettre `https://yimaprof.com/` dans Google Search Console (Inspection d'URL → Demander une indexation). Le sitemap et les snippets se mettront à jour sous quelques jours. Étape manuelle à effectuer côté utilisateur — je rappellerai dans le message final.

## Ce qui n'est PAS modifié (par votre choix)

- `supabase/functions/ai-grade/index.ts` et `help-chat/index.ts` : conservent `LOVABLE_API_KEY` et l'endpoint `ai.gateway.lovable.dev` (backend, invisible pour Google).
- `vite.config.ts` + `package.json` : `lovable-tagger` reste (dev-only, n'apparaît pas dans le build de prod).
- Badge « Edit with Lovable » : reste affiché sur le site publié.

## Fichiers touchés

- `index.html`
- `README.md`
- `supabase/functions/send-notification-email/_templates/subscription-expiry.tsx`
- `supabase/functions/send-notification-email/index.ts`
