import { Link } from "react-router-dom";
import SeoHead from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import {
  BookOpen, FileText, Trophy, MessageCircle, HelpCircle, PenLine, Target,
  ClipboardCheck, GraduationCap, Crown, CheckCircle, Smartphone, Zap, ShieldCheck, ArrowRight, Lock, Sprout, Flame, Rocket, ArrowDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import ViewOffersButton from "@/components/layout/ViewOffersButton";
import { WHATSAPP_SUPPORT_NUMBER, whatsappSupportUrl } from "@/lib/supportContact";
import iconLessons from "@/assets/card-icons/lessons.png";
import iconFacile from "@/assets/card-icons/facile.png";
import iconIntermediaire from "@/assets/card-icons/intermediaire.png";
import iconDifficile from "@/assets/card-icons/difficile.png";
import iconEpreuves from "@/assets/card-icons/epreuves.png";
import iconEvaluation from "@/assets/card-icons/evaluation.png";
import iconChallenges from "@/assets/card-icons/challenges.png";
import iconForum from "@/assets/card-icons/forum.png";
import iconAide from "@/assets/card-icons/aide.png";

type PillCardProps = { to: string; icon: React.ElementType; img?: string; color: string; bg: string; title: string; badge?: string; badgeCls?: string };
const PillCard = ({ to, icon: Icon, img, color, bg, title, badge, badgeCls }: PillCardProps) => (
  <Link to={to} className="group flex items-center gap-4 rounded-3xl bg-card px-5 py-5 shadow-soft transition-all duration-200 hover:scale-[1.03] hover:shadow-medium">
    <span className="flex h-14 w-14 shrink-0 items-center justify-center leading-none transition-transform group-hover:-rotate-6 group-hover:scale-110" aria-hidden>
      {img
        ? <img src={img} alt="" loading="lazy" width={56} height={56} className="h-14 w-14 object-contain drop-shadow-sm" />
        : <Icon className={`h-10 w-10 ${color}`} strokeWidth={2.2} />}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-extrabold uppercase leading-snug tracking-wide text-primary md:text-base">{title}</span>
      {badge && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badgeCls}`}>{badge}</span>}
    </span>
  </Link>
);

const Index = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const fr = language !== "en";
  const L = (a: string, b: string) => (fr ? a : b);

  const actions = [
    { to: "/lessons", icon: BookOpen, label: L("Réviser une leçon", "Review a lesson") },
    { to: "/lessons", icon: PenLine, label: L("Faire un exercice (Facile gratuit)", "Do an exercise (Easy free)") },
    { to: "/exams2", emoji: "🎯", icon: Target, label: L("M'auto-évaluer", "Self-assess") },
    { to: "/exams2", icon: GraduationCap, label: L("Préparer un examen", "Prepare an exam") },
    { to: "/subscriptions", icon: Crown, label: L("Consulter les offres", "See plans") },
  ];

  const included = [
    L("Tous les exercices Intermédiaire et Difficile des leçons", "All Intermediate and Hard lesson exercises"),
    L("Les corrigés des exercices après auto-évaluation", "Exercise solutions after self-assessment"),
    L("Les évaluations chronométrées sur les épreuves", "Timed evaluations on past papers"),
    L("La page Progression avec conseils personnalisés", "Progress page with tailored advice"),
  ];

  const reassurance = [
    { icon: Smartphone, text: L("Paiement Orange Money / MTN", "Orange Money / MTN payment") },
    { icon: Zap, text: L("Accès immédiat", "Instant access") },
    { icon: ShieldCheck, text: L("Aucun code secret demandé sur YimaProf", "No secret code asked on YimaProf") },
  ];

  return (
    <div className="bg-background">
      <SeoHead
        title="Yimaprof — Préparation aux examens du Cameroun"
        description="Révisez les épreuves officielles du Cameroun (BEPC, Probatoire, Bac, GCE) avec corrections détaillées, évaluations chronométrées et forum d'entraide."
        path="/"
      />

      <div className="pt-4"><ViewOffersButton /></div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 px-4 py-14 md:py-24">
        <div className="container mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-sm font-medium shadow-soft">
            <GraduationCap className="h-4 w-4 text-primary" /> BEPC · Probatoire · Bac · GCE
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight md:text-6xl">
            {L("Révise, évalue-toi et réussis tes examens avec ", "Review, self-assess and pass your exams with ")}
            <span className="text-foreground">Yima</span>
            <span className="text-secondary italic font-extrabold">prof</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            {L(
              "Votre enfant révise ses leçons, évalue son niveau réel et prépare le BEPC, le Probatoire et le Bac avec des épreuves corrigées.",
              "Your child reviews lessons, checks their real level and prepares for BEPC, Probatoire and Bac with corrected past papers."
            )}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" className="gradient-primary px-8 py-6 text-lg" asChild>
              <Link to="/exams2">{user ? L("Explorer les épreuves", "Explore papers") : L("Commencer gratuitement", "Start for free")}</Link>
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-6 text-lg" asChild>
              <Link to="/subscriptions">{L("Voir les offres", "See plans")}</Link>
            </Button>
          </div>
          {!user && (
            <p className="mt-5 text-sm text-muted-foreground">
              {L("Déjà inscrit ?", "Already registered?")}{" "}
              <Link to="/auth" className="font-semibold text-primary underline-offset-4 hover:underline">{L("Se connecter", "Sign in")}</Link>
              {" · "}
              <Link to="/auth?mode=signup" className="font-semibold text-primary underline-offset-4 hover:underline">{L("Créer un compte", "Create an account")}</Link>
            </p>
          )}
        </div>
      </section>

      {/* Contents — Nomad-style pill cards */}
      <section className="bg-gradient-to-b from-lavender to-background px-4 py-16 md:py-20">
        <div className="container mx-auto max-w-6xl">
          <h2 className="mb-2 text-center text-3xl font-bold md:text-4xl">{L("Tout pour réussir", "Everything to succeed")} 🎉</h2>
          <p className="mb-10 text-center text-muted-foreground">{L("Choisis ta rubrique et commence à réviser en t'amusant.", "Pick a section and start revising with joy.")}</p>

          <h3 className="mb-4 flex items-center gap-3 text-xl font-extrabold uppercase tracking-wide text-primary md:text-2xl"><ArrowDown className="h-6 w-6" />{L("Leçons et exercices", "Lessons & exercises")}</h3>
          <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: "/lessons", img: iconLessons, icon: BookOpen, color: "text-fun-violet", bg: "bg-fun-violet/15", title: L("Leçons", "Lessons"), badge: L("Nouveau", "New"), badgeCls: "bg-fun-violet/15 text-fun-violet" },
              { to: "/lessons", img: iconFacile, icon: Sprout, color: "text-fun-green", bg: "bg-fun-green/15", title: L("Exercices Facile", "Easy exercises"), badge: L("Gratuit", "Free"), badgeCls: "bg-fun-green/15 text-fun-green" },
              { to: "/lessons", img: iconIntermediaire, icon: Flame, color: "text-fun-orange", bg: "bg-fun-orange/15", title: L("Intermédiaire", "Intermediate"), badge: "Premium", badgeCls: "bg-fun-orange/15 text-fun-orange" },
              { to: "/lessons", img: iconDifficile, icon: Rocket, color: "text-fun-red", bg: "bg-fun-red/15", title: L("Difficile", "Hard"), badge: "Premium", badgeCls: "bg-fun-red/15 text-fun-red" },
            ].map((c) => <PillCard key={c.title} {...c} />)}
          </div>

          <h3 className="mb-4 flex items-center gap-3 text-xl font-extrabold uppercase tracking-wide text-primary md:text-2xl"><ArrowDown className="h-6 w-6" />{L("Épreuves et plus", "Papers & more")}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: "/exams2", img: iconEpreuves, icon: FileText, color: "text-fun-blue", bg: "bg-fun-blue/15", title: L("Épreuves corrigées", "Corrected papers"), badge: "BEPC · Bac", badgeCls: "bg-fun-blue/15 text-fun-blue" },
              { to: "/exams2", img: iconEvaluation, icon: Target, color: "text-fun-pink", bg: "bg-fun-pink/15", title: L("Auto-évaluation", "Self-assessment"), badge: "Premium", badgeCls: "bg-fun-pink/15 text-fun-pink" },
              { to: "/challenges", img: iconChallenges, icon: Trophy, color: "text-fun-yellow", bg: "bg-fun-yellow/20", title: "Challenges", badge: L("Concours", "Contests"), badgeCls: "bg-fun-yellow/20 text-foreground" },
              { to: "/forum", img: iconForum, icon: MessageCircle, color: "text-fun-green", bg: "bg-fun-green/15", title: "Forum", badge: L("Entraide", "Help"), badgeCls: "bg-fun-green/15 text-fun-green" },
              { to: "/help", img: iconAide, icon: HelpCircle, color: "text-fun-violet", bg: "bg-fun-violet/15", title: L("Aide et tutoriels", "Help & tutorials") },
            ].map((c) => <PillCard key={c.title} {...c} />)}
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="bg-muted/30 px-4 py-16 md:py-20">
        <div className="container mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-3xl font-bold md:text-4xl">{L("Que veux-tu faire aujourd'hui ?", "What do you want to do today?")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {actions.map((a) => (
              <Link key={a.label} to={a.to} className="flex items-center gap-4 rounded-xl border bg-card p-4 font-medium shadow-soft transition hover:border-primary hover:shadow-medium">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><a.icon className="h-5 w-5" /></span>
                <span className="flex-1">{a.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Included */}
      <section className="px-4 py-16 md:py-20">
        <div className="container mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">{L("Ce qui est inclus avec l'abonnement", "What the subscription includes")}</h2>
            <p className="mt-3 text-muted-foreground">{L("L'exercice Facile et les épreuves gratuites restent ouverts à tous. L'abonnement débloque le reste :", "The Easy exercise and free papers stay open to all. The subscription unlocks the rest:")}</p>
            <ul className="mt-6 space-y-3">
              {included.map((i) => (
                <li key={i} className="flex items-start gap-3"><CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" /><span>{i}</span></li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border-2 border-secondary bg-card p-6 shadow-medium md:p-8">
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
              <Crown className="h-3 w-3" /> {L("Le plus choisi : Trimestre", "Most chosen: Term")}
            </span>
            <p className="mt-4 text-lg font-semibold">{L("Mensuel, Trimestre ou Annuel", "Monthly, Term or Annual")}</p>
            <p className="text-sm text-muted-foreground">{L("Choisissez la durée qui convient à votre enfant.", "Pick the duration that suits your child.")}</p>
            <Button size="lg" className="gradient-primary mt-6 w-full" asChild>
              <Link to="/subscriptions"><Lock className="mr-2 h-4 w-4" />{L("Voir les offres", "See plans")}</Link>
            </Button>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              {reassurance.map((r) => (
                <li key={r.text} className="flex items-center gap-2"><r.icon className="h-4 w-4 text-primary" />{r.text}</li>
              ))}
            </ul>
            <div className="mt-5 border-t pt-5">
              {WHATSAPP_SUPPORT_NUMBER ? (
                <Button variant="outline" className="w-full" asChild>
                  <a href={whatsappSupportUrl(L("Bonjour, j'ai besoin d'aide sur YimaProf.", "Hello, I need help with YimaProf."))} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" />{L("Besoin d'aide ? WhatsApp", "Need help? WhatsApp")}
                  </a>
                </Button>
              ) : (
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/help"><HelpCircle className="mr-2 h-4 w-4" />{L("Besoin d'aide ?", "Need help?")}</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary/5 px-4 py-14">
        <div className="container mx-auto max-w-3xl text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 text-2xl font-bold md:text-3xl">{L("Prêt à commencer ?", "Ready to start?")}</h2>
          <Button size="lg" className="gradient-primary mt-6 px-8" asChild>
            <Link to={user ? "/exams2" : "/auth?mode=signup"}>{user ? L("Explorer maintenant", "Explore now") : L("Créer un compte gratuit", "Create a free account")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
