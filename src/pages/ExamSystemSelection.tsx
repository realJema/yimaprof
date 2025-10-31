import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from 'react-router-dom';
import { Globe2 } from 'lucide-react';

export default function ExamSystemSelection() {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const systems = [
    {
      id: 'francophone',
      name: language === 'fr' ? 'Système Francophone' : 'Francophone System',
      description: language === 'fr' 
        ? 'Ressources pour le système éducatif francophone, de la maternelle aux certifications avancées.' 
        : 'Resources for the French-speaking educational system, from nursery to advanced level certifications.',
      color: 'from-blue-500 to-indigo-500'
    },
    {
      id: 'anglophone',
      name: language === 'fr' ? 'Système Anglophone' : 'Anglophone System',
      description: language === 'fr' 
        ? 'Ressources pour le système éducatif anglophone, de la maternelle aux certifications avancées.' 
        : 'Resources for the English-speaking educational system, from nursery to advanced level certifications.',
      color: 'from-green-500 to-emerald-500'
    }
  ];

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Globe2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">
            {language === 'fr' ? 'Sélectionnez un Système' : 'Select a System'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {language === 'fr' 
              ? 'Choisissez le système éducatif pour trouver les examens et corrections pertinents.' 
              : 'Choose the educational system to find relevant exam papers and corrections.'}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {systems.map((system) => (
            <Card 
              key={system.id}
              className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-border/50 overflow-hidden"
              onClick={() => navigate(`/exams/${system.id}/sections`)}
            >
              <div className={`h-2 bg-gradient-to-r ${system.color}`} />
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                  {system.name}
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  {system.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-primary font-medium group-hover:translate-x-2 transition-transform">
                  {language === 'fr' ? 'Explorer' : 'Explore'}
                  <span className="ml-2">→</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
