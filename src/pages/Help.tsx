import { useEffect, useState } from 'react';
import SeoHead from '@/components/SeoHead';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Users, Building2, HandCoins, Download, CircleCheck, Smartphone, Monitor } from 'lucide-react';

import homeImg from '@/assets/tutorials/home.png';
import authImg from '@/assets/tutorials/auth.png';
import authInscriptionImg from '@/assets/tutorials/auth_inscription.png';
import authEcoleImg from '@/assets/tutorials/auth_ecole.png';
import examsImg from '@/assets/tutorials/exams.png';
import lessonsImg from '@/assets/tutorials/lessons.png';
import lessonDetailImg from '@/assets/tutorials/lesson_detail.png';
import examDetailImg from '@/assets/tutorials/exam_detail.png';
import challengesImg from '@/assets/tutorials/challenges.png';
import subscriptionsImg from '@/assets/tutorials/subscriptions.png';
import mHomeImg from '@/assets/tutorials/m_home.png';
import mAuthImg from '@/assets/tutorials/m_auth.png';
import mExamsImg from '@/assets/tutorials/m_exams.png';
import mSubscriptionsImg from '@/assets/tutorials/m_subscriptions.png';
import mChallengesImg from '@/assets/tutorials/m_challenges.png';

type Step = { title: string; text: string };
type Screenshot = { src: string; caption: string; mobile?: boolean };
type Section = {
  topic: string;
  intro?: string;
  steps: Step[];
  screenshots?: Screenshot[];
  tip?: string;
};

const audiences = [
  { key: 'students', label: 'Élèves', icon: GraduationCap },
  { key: 'parents', label: 'Parents', icon: Users },
  { key: 'schools', label: "Chefs d'établissement", icon: Building2 },
  { key: 'affiliates', label: 'Parrains', icon: HandCoins },
];

const studentsSections: Section[] = [
  {
    topic: 'Inscription et connexion',
    steps: [
      {
        title: '1. Ouvrir la page de création de compte',
        text: "Cliquez sur « S'inscrire » en haut de la page. Vous arrivez sur le formulaire « Créer un compte ».",
      },
      {
        title: '2. Remplir vos informations',
        text: "Saisissez votre prénom, votre nom, choisissez un nom d'utilisateur (il vous identifiera sur la plateforme) et vérifiez que « Vous êtes : Étudiant » est bien sélectionné.",
      },
      {
        title: '3. Renseigner un email et un mot de passe',
        text: "Un email et un mot de passe (au moins 8 caractères avec un chiffre) sont nécessaires. Vous pouvez aussi utiliser « S'inscrire avec Google » pour aller plus vite.",
      },
      {
        title: '4. Confirmer votre email',
        text: "Après l'inscription, un email de confirmation vous est envoyé. Ouvrez-le et cliquez sur le lien : votre compte est activé.",
      },
      {
        title: '5. Se connecter ensuite',
        text: "À chaque visite, cliquez sur « Se connecter », saisissez votre email et votre mot de passe (ou utilisez Google). En cas d'oubli, « Mot de passe oublié ? » vous envoie un email de réinitialisation.",
      },
    ],
    screenshots: [
      { src: authInscriptionImg, caption: "Le formulaire d'inscription : prénom, nom, nom d'utilisateur, profil, email." },
      { src: authImg, caption: "La page de connexion : Google, email et mot de passe, ou mot de passe oublié." },
    ],
    tip: "Si vous vous connectez avec Google, aucun mot de passe Yimaprof n'est nécessaire.",
  },
  {
    topic: "Paiement d'abonnement",
    steps: [
      {
        title: '1. Consulter les offres',
        text: "Cliquez sur « Voir les offres » en haut des pages Épreuves ou Leçons. Vous voyez tous les forfaits disponibles avec leurs avantages.",
      },
      {
        title: '2. Choisir votre forfait',
        text: "Comparez les formules : mensuelle, trimestrielle ou annuelle. Le badge « Le plus populaire » indique la formule choisie par la majorité des élèves.",
      },
      {
        title: '3. Indiquer votre parrain (optionnel)',
        text: "Si quelqu'un vous a recommandé Yimaprof, saisissez son nom d'utilisateur dans la case « Référé par quelqu'un ? » pour le soutenir.",
      },
      {
        title: '4. Payer avec votre téléphone',
        text: "Choisissez Orange Money ou MTN Mobile Money, saisissez votre numéro, puis validez. Le code secret Mobile Money se saisit uniquement sur votre téléphone (message de l'opérateur), jamais sur Yimaprof.",
      },
      {
        title: '5. Accès immédiat',
        text: "Dès la confirmation du paiement, l'accès aux épreuves et corrections est ouvert automatiquement.",
      },
    ],
    screenshots: [
      { src: subscriptionsImg, caption: "La page des offres avec les formules et la case de parrainage." },
    ],
  },
  {
    topic: 'Épreuves et leçons',
    steps: [
      {
        title: '1. Parcourir la bibliothèque',
        text: "Le menu « Épreuves » affiche plus de 1 000 sujets. Utilisez les filtres à gauche : classes, matières, séries, année, période.",
      },
      {
        title: '2. Repérer les épreuves gratuites',
        text: "Le badge vert « Gratuit » signale les épreuves accessibles sans abonnement. Les autres portent un cadenas : elles sont réservées aux abonnés.",
      },
      {
        title: '3. Ouvrir et travailler une épreuve',
        text: "Cliquez sur une épreuve pour l'ouvrir. Vous pouvez lire le sujet, passer l'évaluation, puis consulter le corrigé.",
      },
      {
        title: '4. Suivre les leçons',
        text: "Le menu « Leçons » propose des cours par classe et par matière. Cliquez sur « Ouvrir la leçon » pour lire le cours.",
      },
      {
        title: '5. Faire les exercices de la leçon',
        text: "Chaque leçon propose des exercices à trois niveaux : Facile, Intermédiaire, Difficile. Le premier exercice Facile est gratuit ; avec un abonnement, tous les niveaux s'ouvrent. Après chaque exercice, vous recevez une appréciation sur votre travail.",
      },
    ],
    screenshots: [
      { src: examsImg, caption: "La bibliothèque d'épreuves avec les filtres et les badges « Gratuit »." },
      { src: examDetailImg, caption: "Une épreuve ouverte : sujet, évaluation et corrigé." },
      { src: lessonsImg, caption: "La liste des leçons par classe et matière." },
      { src: lessonDetailImg, caption: "Une leçon ouverte : le cours s'affiche, les exercices suivent." },
    ],
  },
  {
    topic: 'Challenges',
    steps: [
      {
        title: '1. Ouvrir la page Challenges',
        text: "Cliquez sur « Challenges » dans le menu. Vous y voyez les défis en cours, leur durée et leur prix.",
      },
      {
        title: '2. Participer',
        text: "Certains challenges s'adressent à votre classe ou à votre établissement. Cliquez sur le challenge pour voir son contenu et commencer quand vous êtes prêt : le temps tourne dès le lancement.",
      },
      {
        title: '3. Voir votre classement',
        text: "Après chaque participation, votre résultat et votre position apparaissent dans la page du challenge.",
      },
    ],
    screenshots: [
      { src: challengesImg, caption: "La page Challenges : les défis en cours et leur récompense." },
    ],
    tip: "Votre établissement vous inscrit aux challenges qui le concernent.",
  },
];

const parentsSections: Section[] = [
  {
    topic: 'Inscription et connexion',
    intro: "Tout se fait sur le téléphone, en quelques minutes. Une adresse email n'est pas obligatoire.",
    steps: [
      {
        title: '1. Ouvrir Yimaprof sur votre téléphone',
        text: "Ouvrez votre navigateur (Chrome, Safari…) et allez sur yimaprof.com. Vous pouvez enregistrer la page dans vos favoris pour la retrouver facilement.",
      },
      {
        title: '2. Créer le compte de votre enfant',
        text: "Appuyez sur « S'inscrire » en haut, remplissez le formulaire au nom de votre enfant. Vous pouvez aussi appuyer sur « Continuer avec Google » si vous avez un compte Gmail.",
      },
      {
        title: '3. Confirmer le compte',
        text: "Un email de confirmation peut vous être envoyé : ouvrez-le et cliquez sur le lien. Si vous utilisez Google, cette étape se fait automatiquement.",
      },
      {
        title: '4. Se reconnecter plus tard',
        text: "Appuyez sur « Se connecter » et saisissez l'email et le mot de passe choisis, ou utilisez Google. En cas d'oubli, « Mot de passe oublié ? » vous envoie un lien de réinitialisation.",
      },
    ],
    screenshots: [
      { src: mHomeImg, caption: "La page d'accueil sur téléphone : tout est accessible depuis le menu.", mobile: true },
      { src: mAuthImg, caption: "Connexion ou inscription sur téléphone.", mobile: true },
    ],
    tip: "L'établissement de votre enfant peut aussi créer le compte pour vous. Demandez au chef d'établissement.",
  },
  {
    topic: "Paiement d'abonnement",
    intro: "Vous payez avec Orange Money ou MTN Mobile Money, directement depuis votre téléphone.",
    steps: [
      {
        title: '1. Voir les offres',
        text: "Appuyez sur « Voir les offres ». Vous voyez les forfaits : mensuel, trimestriel ou annuel, avec le prix de chacun.",
      },
      {
        title: '2. Choisir le forfait',
        text: "Appuyez sur la formule qui vous convient. La page suivante récapitule ce que votre enfant obtiendra.",
      },
      {
        title: '3. Confirmer le paiement',
        text: "Choisissez Orange Money ou MTN, saisissez votre numéro de téléphone, puis validez. Vérifiez bien le montant affiché avant de confirmer.",
      },
      {
        title: '4. Valider sur votre téléphone',
        text: "Votre opérateur (Orange ou MTN) vous demande votre code secret Mobile Money sur votre téléphone : c'est la seule fois où vous le saisissez. Ne donnez jamais ce code à quelqu'un, ni par téléphone, ni par message.",
      },
      {
        title: '5. Accès ouvert',
        text: "Dès que le paiement est confirmé, votre enfant accède aux épreuves et aux leçons. Un reçu vous est envoyé.",
      },
    ],
    screenshots: [
      { src: mSubscriptionsImg, caption: "Les offres affichées sur téléphone : le prix est toujours visible avant de payer.", mobile: true },
    ],
    tip: "Si le paiement échoue (solde insuffisant, limite de l'opérateur), aucun montant n'est débité : rechargez votre compte puis réessayez.",
  },
  {
    topic: 'Épreuves et leçons de votre enfant',
    steps: [
      {
        title: '1. Les épreuves',
        text: "Dans le menu « Épreuves », votre enfant choisit sa classe et sa matière. Les épreuves marquées « Gratuit » sont libres d'accès ; les autres nécessitent un abonnement.",
      },
      {
        title: '2. Les leçons',
        text: "Dans « Leçons », votre enfant suit des cours structurés et fait des exercices à trois niveaux de difficulté. La progression est enregistrée automatiquement.",
      },
      {
        title: '3. Suivre la progression',
        text: "L'espace « Progression » de votre enfant montre les exercices réalisés, les résultats obtenus et des recommandations pour continuer.",
      },
    ],
    screenshots: [
      { src: mExamsImg, caption: "La bibliothèque d'épreuves sur téléphone.", mobile: true },
      { src: mChallengesImg, caption: "La page Challenges sur téléphone.", mobile: true },
    ],
  },
  {
    topic: 'Challenges',
    steps: [
      {
        title: '1. Les défis de son établissement',
        text: "Les challenges sont proposés par classe ou par établissement. Votre enfant participe depuis la page « Challenges » quand l'école a organisé un défi.",
      },
      {
        title: '2. Le jour du challenge',
        text: "Le challenge démarre à une heure annoncée et dure un temps limité. Mieux vaut être installé à l'avance, dans un endroit calme avec une bonne connexion.",
      },
    ],
  },
];

const schoolSections: Section[] = [
  {
    topic: 'Inscription et connexion',
    steps: [
      {
        title: '1. Créer un compte établissement',
        text: "Sur la page d'inscription, ouvrez l'onglet « École ». Remplissez les informations de votre établissement, un email de contact et un mot de passe.",
      },
      {
        title: '2. Confirmation',
        text: "Un email de confirmation active le compte. Vous accédez ensuite à votre espace école.",
      },
      {
        title: '3. Se connecter',
        text: "À chaque visite, « Se connecter » avec l'email de l'école et le mot de passe, ou avec Google.",
      },
    ],
    screenshots: [
      { src: authEcoleImg, caption: "L'onglet « École » de la page d'inscription." },
    ],
  },
  {
    topic: 'Gérer les élèves et les abonnements',
    steps: [
      {
        title: '1. Ouvrir votre espace école',
        text: "Depuis votre compte, ouvrez l'espace « Établissement ». Il regroupe les élèves rattachés à votre école, leurs abonnements et vos gains.",
      },
      {
        title: '2. Rattacher les élèves',
        text: "Vous pouvez créer les comptes de vos élèves directement depuis l'espace école, ou demander à l'administration Yimaprof de rattacher un compte déjà existant à votre établissement.",
      },
      {
        title: '3. Suivre les paiements et les gains',
        text: "Chaque paiement d'un élève parrainé par votre établissement vous rapporte une commission : elle apparaît dans votre espace, avec le total disponible.",
      },
    ],
    tip: "Le nom de votre établissement est toujours masqué devant les élèves (il apparaît sous forme de code).",
  },
  {
    topic: "Retirer les gains",
    steps: [
      {
        title: '1. Ouvrir la page de retrait',
        text: "Dans votre espace, appuyez sur le bouton « Retrait ». Un résumé explique les étapes.",
      },
      {
        title: '2. Choisir le montant et le moyen',
        text: "Saisissez le montant à retirer (un minimum s'applique), choisissez l'opérateur (Orange Money ou MTN) et donnez le numéro qui recevra l'argent.",
      },
      {
        title: '3. Valider avec le code email',
        text: "Un code à 6 chiffres est envoyé par email. Saisissez-le pour confirmer la demande. Une seule demande peut être en attente à la fois.",
      },
      {
        title: '4. Versement',
        text: "Le versement est effectué par l'administration Yimaprof sous 48 heures sur le numéro indiqué. Vous pouvez suivre l'état de votre demande dans votre espace.",
      },
    ],
    tip: "Si vous vous connectez avec Google, la validation se fait uniquement avec le code email (aucun mot de passe demandé).",
  },
  {
    topic: 'Challenges de votre établissement',
    steps: [
      {
        title: '1. Suivre les challenges',
        text: "Les challenges destinés à vos élèves (par classe, niveau ou série) sont visibles dans la page Challenges : durée, matière et récompense y sont affichés.",
      },
      {
        title: '2. Encourager la participation',
        text: "Informe vos élèves du lancement : ils retrouvent le défi dans leur menu Challenges le jour venu.",
      },
    ],
  },
];

const affiliateSections: Section[] = [
  {
    topic: 'Inscription et connexion',
    steps: [
      {
        title: '1. Créer votre compte',
        text: "Cliquez sur « S'inscrire » et remplissez le formulaire. Dans « Vous êtes », choisissez le profil qui vous convient. Vous pouvez aussi vous inscrire avec Google.",
      },
      {
        title: '2. Confirmer et vous connecter',
        text: "Confirmez votre email après l'inscription, puis connectez-vous avec vos identifiants ou Google.",
      },
    ],
    screenshots: [
      { src: authInscriptionImg, caption: "Le formulaire d'inscription, avec le choix du profil." },
    ],
  },
  {
    topic: 'Parrainer des élèves',
    steps: [
      {
        title: '1. Trouver votre nom d’utilisateur',
        text: "Votre nom d'utilisateur (par exemple paul_ndjock) sert de code de parrainage. C'est lui que vous partagez.",
      },
      {
        title: '2. Partager votre code',
        text: "Communiquez-le à vos filleuls : ils le saisissent dans la case « Référé par quelqu'un ? » au moment de choisir leur forfait.",
      },
      {
        title: '3. Recevoir vos gains',
        text: "Chaque premier paiement d'un filleul vous rapporte une commission. Les chefs d'établissement reçoivent une commission sur chaque paiement de leurs élèves parrainés.",
      },
    ],
    screenshots: [
      { src: subscriptionsImg, caption: "La case « Référé par quelqu'un ? » où le filleul saisit votre nom d'utilisateur." },
    ],
  },
  {
    topic: 'Retirer vos gains',
    steps: [
      {
        title: '1. Ouvrir votre espace parrain',
        text: "Depuis votre compte, ouvrez l'espace « Parrain » : vous y voyez vos filleuls, vos gains et le total disponible.",
      },
      {
        title: '2. Demander le retrait',
        text: "Appuyez sur « Retrait », saisissez le montant (un minimum s'applique), choisissez l'opérateur et le numéro qui recevra l'argent.",
      },
      {
        title: '3. Confirmer avec le code email',
        text: "Saisissez le code à 6 chiffres reçu par email. Le versement est fait par l'administration sous 48 heures.",
      },
    ],
  },
  {
    topic: 'Épreuves, leçons et challenges',
    steps: [
      {
        title: 'En parler simplement',
        text: "Pour convaincre un parent ou un élève, montrez-lui la bibliothèque d'épreuves (plus de 1 000 sujets avec corrigés), les leçons avec exercices et les challenges. Le compte est gratuit : il peut tester avant de payer.",
      },
    ],
    screenshots: [
      { src: examsImg, caption: "La bibliothèque d'épreuves à montrer aux futurs abonnés." },
    ],
  },
];

const sectionsByAudience: Record<string, Section[]> = {
  students: studentsSections,
  parents: parentsSections,
  schools: schoolSections,
  affiliates: affiliateSections,
};

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const searchSynonyms: Record<string, string[]> = {
  paiement: ['abonnement', 'payer', 'orange', 'mtn', 'offre', 'forfait'],
  exercice: ['lecon', 'epreuve', 'evaluation', 'corrige'],
  compte: ['inscription', 'connexion', 'mot de passe', 'google'],
  parrainage: ['parrain', 'code', 'retrait', 'commission', 'gain'],
};

function matchesQuery(section: Section, query: string) {
  const q = normalize(query.trim());
  if (!q) return true;
  const haystack = normalize(
    [section.topic, section.intro ?? '', section.tip ?? '', ...section.steps.flatMap((s) => [s.title, s.text])].join(' '),
  );
  const terms = [q, ...Object.entries(searchSynonyms).filter(([k]) => k.startsWith(q) || q.startsWith(k)).flatMap(([, v]) => v)];
  return terms.some((t) => haystack.includes(t));
}

export default function Help() {
  const { user } = useAuth();
  const { establishment } = useEstablishment();
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [audience, setAudience] = useState('students');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!user) { setIsAffiliate(false); return; }
    supabase
      .from('affiliate_applications')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsAffiliate(data?.status === 'approved'));
  }, [user]);

  const isSchoolHead = !!user && !!establishment && establishment.owner_id === user.id;
  const visibleAudiences = audiences.filter(
    (a) => (a.key !== 'schools' || isSchoolHead) && (a.key !== 'affiliates' || isAffiliate),
  );

  useEffect(() => {
    if (!visibleAudiences.some((a) => a.key === audience)) setAudience('students');
  }, [visibleAudiences, audience]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [audience]);

  const suggestions = ['paiement', 'exercice', 'compte', ...(isAffiliate || isSchoolHead ? ['parrainage'] : [])];

  return (
    <div className="min-h-screen py-10 px-4">
      <SeoHead
        title="Aide et tutoriels — Yimaprof"
        description="Tutoriels illustrés pas à pas : inscription, connexion, paiement d'abonnement, épreuves, leçons et challenges sur Yimaprof."
        path="/help"
      />
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3">Aide et tutoriels</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Des guides illustrés pas à pas pour utiliser Yimaprof facilement, selon votre profil.
          </p>
          <div className="mt-6 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="De quoi avez-vous besoin ? (paiement, exercice, compte…)"
                aria-label="Rechercher dans l'aide"
                className="pl-10 h-12 text-base"
              />
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <Button key={s} type="button" size="sm" variant={normalize(query) === s ? 'default' : 'outline'} onClick={() => setQuery(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Tabs value={audience} onValueChange={setAudience} className="w-full">
          <TabsList className={`grid grid-cols-2 ${visibleAudiences.length > 2 ? 'md:grid-cols-' + visibleAudiences.length : ''} w-full mb-8 h-auto`}>
            {visibleAudiences.map(({ key, label, icon: Icon }) => (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2 py-3">
                <Icon className="h-4 w-4" />
                <span className="text-xs md:text-sm">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {visibleAudiences.map(({ key, label }) => {
            const results = sectionsByAudience[key].filter((s) => matchesQuery(s, query));
            return (
            <TabsContent key={key} value={key} className="space-y-8">
              <p className="text-muted-foreground text-center">
                Tutoriels pour <span className="font-medium text-foreground">{label.toLowerCase()}</span>
              </p>
              {results.length === 0 && (
                <p className="text-center text-muted-foreground">
                  Aucun tutoriel ne correspond à « {query} ». Essayez « paiement », « exercice » ou « compte ».
                </p>
              )}
              {results.map((section) => (
                <Card key={section.topic}>
                  <CardContent className="p-6 md:p-8">
                    <h2 className="text-2xl font-bold mb-2">{section.topic}</h2>
                    {section.intro && (
                      <p className="text-muted-foreground mb-4">{section.intro}</p>
                    )}
                    <ol className="space-y-4 mb-6">
                      {section.steps.map((step) => (
                        <li key={step.title} className="flex gap-3">
                          <CircleCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">{step.title.replace(/^\d+\.\s*/, '')}</p>
                            <p className="text-muted-foreground text-sm mt-0.5">{step.text}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                    {section.screenshots && (
                      <div className={`grid gap-4 ${section.screenshots.length > 1 ? 'md:grid-cols-2' : ''}`}>
                        {section.screenshots.map((shot) => (
                          <figure
                            key={shot.caption}
                            className="rounded-lg border border-border overflow-hidden bg-muted/30"
                          >
                            <img
                              src={shot.src}
                              alt={shot.caption}
                              loading="lazy"
                              className={`w-full h-auto ${shot.mobile ? 'max-w-[240px] mx-auto' : ''}`}
                            />
                            <figcaption className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                              {shot.mobile ? (
                                <Smartphone className="h-3.5 w-3.5 shrink-0" />
                              ) : (
                                <Monitor className="h-3.5 w-3.5 shrink-0" />
                              )}
                              {shot.caption}
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    )}
                    {section.tip && (
                      <div className="mt-6 flex gap-2 items-start rounded-md bg-primary/5 border border-primary/20 p-3">
                        <Badge variant="secondary" className="shrink-0">Astuce</Badge>
                        <p className="text-sm text-muted-foreground">{section.tip}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
