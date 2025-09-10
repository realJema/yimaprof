import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Search, Download, Users, Star, CheckCircle, Globe, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: Search,
      title: "Recherche avancée",
      description: "Trouvez facilement les sujets par matière, classe, année et établissement"
    },
    {
      icon: Download,
      title: "Accès hors-ligne",
      description: "Téléchargez vos sujets et révisez même sans connexion internet"
    },
    {
      icon: Users,
      title: "Communauté",
      description: "Rejoignez des milliers d'étudiants qui réussissent avec YIMA"
    },
    {
      icon: Globe,
      title: "Multilingue",
      description: "Interface disponible en français et en anglais"
    }
  ];

  const stats = [
    { number: "10,000+", label: "Sujets d'examens" },
    { number: "50,000+", label: "Étudiants actifs" },
    { number: "500+", label: "Établissements" },
    { number: "98%", label: "Taux de satisfaction" }
  ];

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="mb-8 flex justify-center">
            <div className="flex items-center gap-3 rounded-full bg-white/80 px-6 py-3 shadow-soft">
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">YIMA</span>
            </div>
          </div>
          
          <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl lg:text-7xl">
            Réussissez vos examens avec{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              YIMA
            </span>
          </h1>
          
          <p className="mb-8 text-lg text-muted-foreground md:text-xl lg:text-2xl max-w-3xl mx-auto">
            La plateforme éducative qui révolutionne l'apprentissage en Afrique. 
            Accédez à des milliers de sujets d'examens, corrections détaillées et révisez partout.
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            {user ? (
              <Button size="lg" className="gradient-primary text-lg px-8 py-6" asChild>
                <Link to="/exams">
                  <Search className="mr-2 h-5 w-5" />
                  Explorer les examens
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" className="gradient-primary text-lg px-8 py-6" asChild>
                  <Link to="/auth?mode=signup">
                    Commencer gratuitement
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6" asChild>
                  <Link to="/auth">
                    Se connecter
                  </Link>
                </Button>
              </>
            )}
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-accent" />
            <span>Gratuit • Sans engagement • Accès immédiat</span>
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

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 md:text-4xl">
              Pourquoi choisir YIMA ?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Une plateforme pensée pour les étudiants africains, avec les outils 
              dont vous avez besoin pour exceller dans vos études.
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

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary to-secondary">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <div className="mb-6 flex justify-center">
            <Smartphone className="h-16 w-16" />
          </div>
          
          <h2 className="text-3xl font-bold mb-4 md:text-4xl">
            Prêt à transformer votre façon d'apprendre ?
          </h2>
          
          <p className="text-lg mb-8 text-white/90 max-w-2xl mx-auto">
            Rejoignez des milliers d'étudiants qui ont déjà amélioré leurs résultats 
            grâce à YIMA. Commencez dès aujourd'hui !
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6" asChild>
              <Link to={user ? "/exams" : "/auth?mode=signup"}>
                {user ? "Explorer maintenant" : "Créer mon compte gratuit"}
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent border-white text-white hover:bg-white hover:text-primary" asChild>
              <Link to="/subscriptions">
                Voir les abonnements
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
