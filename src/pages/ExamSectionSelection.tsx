import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Baby, BookOpen, GraduationCap, ArrowLeft, Repeat } from 'lucide-react';

export default function ExamSectionSelection() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { system } = useParams<{ system: string }>();

  const systemName = system === 'francophone' 
    ? (language === 'fr' ? 'Système Francophone' : 'Francophone System')
    : (language === 'fr' ? 'Système Anglophone' : 'Anglophone System');

  const systemDescription = system === 'francophone'
    ? (language === 'fr' 
      ? 'Ressources pour le système éducatif francophone, de la maternelle aux certifications avancées.' 
      : 'Resources for the French-speaking educational system, from nursery to advanced level certifications.')
    : (language === 'fr' 
      ? 'Ressources pour le système éducatif anglophone, de la maternelle aux certifications avancées.' 
      : 'Resources for the English-speaking educational system, from nursery to advanced level certifications.');

  const sections = [
    {
      id: 'nursery',
      name: language === 'fr' ? 'Maternelle' : 'Nursery',
      description: language === 'fr' 
        ? 'Ressources pour l\'éducation préscolaire.' 
        : 'Find materials for pre-school education.',
      icon: Baby,
      color: 'text-pink-500'
    },
    {
      id: 'primary',
      name: language === 'fr' ? 'Primaire' : 'Primary',
      description: language === 'fr' 
        ? 'Accès aux épreuves du Certificat de Fin d\'Études du Premier Degré (CEPE) et plus.' 
        : 'Access papers for First School Leaving Certificate (FSLC) and more.',
      icon: BookOpen,
      color: 'text-blue-500'
    },
    {
      id: 'secondary',
      name: language === 'fr' ? 'Secondaire' : 'Secondary',
      description: language === 'fr' 
        ? 'Explorez les ressources pour les niveaux GCE Ordinaire et Avancé.' 
        : 'Explore resources for GCE Ordinary and Advanced Levels.',
      icon: GraduationCap,
      color: 'text-amber-500'
    }
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header with Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/exams">
                    {language === 'fr' ? 'Accueil' : 'Home'}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{systemName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/exams')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {language === 'fr' ? 'Retour' : 'Back'}
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate('/exams')}
              className="gap-2"
            >
              <Repeat className="h-4 w-4" />
              {language === 'fr' ? 'Changer de Système' : 'Change System'}
            </Button>
          </div>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">{systemName}</CardTitle>
              <CardDescription className="text-base">{systemDescription}</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content */}
        <div>
          <h2 className="text-3xl font-bold mb-2">
            {language === 'fr' ? 'Sélectionnez une Section' : 'Select a Section'}
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            {language === 'fr' 
              ? 'Choisissez un niveau d\'éducation ci-dessous pour trouver les épreuves d\'examen et corrections pertinentes.' 
              : 'Choose an educational level below to find relevant exam papers and corrections.'}
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <Card 
                  key={section.id}
                  className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-border/50"
                  onClick={() => navigate(`/exams/${system}/${section.id}/classes`)}
                >
                  <CardHeader>
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4 ${section.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {section.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {section.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
