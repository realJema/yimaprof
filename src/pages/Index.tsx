import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Search, Download, Users, Star, CheckCircle, Globe, Smartphone, GraduationCap, Target, Zap, Shield } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const features = [
    {
      icon: Search,
      title: t('advanced_search'),
      description: t('advanced_search_desc')
    },
    {
      icon: Download,
      title: t('offline_access'),
      description: t('offline_access_desc')
    },
    {
      icon: Users,
      title: t('community'),
      description: t('community_desc')
    },
    {
      icon: Globe,
      title: t('multilingual'),
      description: t('multilingual_desc')
    }
  ];

  const howItWorksSteps = [
    {
      icon: GraduationCap,
      title: t('step_1_title'),
      description: t('step_1_desc'),
      step: "01"
    },
    {
      icon: Target,
      title: t('step_2_title'),
      description: t('step_2_desc'),
      step: "02"
    },
    {
      icon: Search,
      title: t('step_3_title'),
      description: t('step_3_desc'),
      step: "03"
    },
    {
      icon: Zap,
      title: t('step_4_title'),
      description: t('step_4_desc'),
      step: "04"
    }
  ];

  const stats = [
    { number: "10,000+", label: t('exam_papers') },
    { number: "50,000+", label: t('active_students') },
    { number: "500+", label: t('schools') },
    { number: "98%", label: t('satisfaction') }
  ];

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="mb-8 flex justify-center">
            <div className="flex items-center gap-3 rounded-full bg-white/80 px-6 py-3 shadow-soft">
              <Logo size="xl" />
            </div>
          </div>
          
          <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl lg:text-7xl">
            {t('hero_title')}{" "}
            <span className="text-foreground">Yima</span>
            <span className="text-secondary italic font-extrabold">prof</span>
          </h1>
          
          <p className="mb-8 text-lg text-muted-foreground md:text-xl lg:text-2xl max-w-3xl mx-auto">
            {t('hero_subtitle')}
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            {user ? (
              <Button size="lg" className="gradient-primary text-lg px-8 py-6" asChild>
                <Link to="/exams2">
                  <Search className="mr-2 h-5 w-5" />
                  {t('explore_exams')}
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" className="gradient-primary text-lg px-8 py-6" asChild>
                  <Link to="/auth?mode=signup">
                    {t('get_started_free')}
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6" asChild>
                  <Link to="/auth">
                    {t('sign_in')}
                  </Link>
                </Button>
              </>
            )}
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-accent" />
            <span>{t('free_no_commitment')}</span>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-primary md:text-4xl">
                  {stat.number}
                </div>
                <div className="text-sm text-muted-foreground md:text-base">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 md:text-4xl">
              {t('how_it_works')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('how_it_works_subtitle')}
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {howItWorksSteps.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 relative">
                    <step.icon className="h-8 w-8 text-primary" />
                    <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {index < howItWorksSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 -right-4 w-8 h-0.5 bg-primary/20"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 md:text-4xl">
              {t('why_choose')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('why_choose_subtitle')}
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-soft hover:shadow-medium transition-shadow">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Educational Sections Info */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 md:text-4xl">
              {t('francophone')} & {t('anglophone')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              YIMA supports both French and English educational systems across Africa, providing relevant exam papers for each curriculum.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-6 w-6 text-primary" />
                  {t('francophone')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Access exam papers from French-speaking African countries including Cameroon, Senegal, Ivory Coast, and more.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>BEPC, Probatoire, Baccalauréat</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>6ème à Terminale</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>All subjects in French</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-6 w-6 text-secondary" />
                  {t('anglophone')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Comprehensive collection from English-speaking regions including GCE O/A Levels and local equivalent exams.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-secondary" />
                    <span>GCE O Level, A Level</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-secondary" />
                    <span>Form 1 to Upper Sixth</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-secondary" />
                    <span>All subjects in English</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary to-secondary">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <div className="mb-6 flex justify-center">
            <Smartphone className="h-16 w-16" />
          </div>
          
          <h2 className="text-3xl font-bold mb-4 md:text-4xl">
            {t('cta_title')}
          </h2>
          
          <p className="text-lg mb-8 text-white/90 max-w-2xl mx-auto">
            {t('cta_subtitle')}
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6" asChild>
              <Link to={user ? "/exams2" : "/auth?mode=signup"}>
                {user ? t('explore_now') : t('create_account')}
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent border-white text-white hover:bg-white hover:text-primary" asChild>
              <Link to="/subscriptions">
                {t('view_subscriptions')}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;