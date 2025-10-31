import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, GraduationCap, BookOpen as BookOpenIcon } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Class {
  id: string;
  name: string;
  display_name: string;
  level: string;
  section: string;
  description?: string;
}

export default function ExamClassSelection() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { system, section } = useParams<{ system: string; section: string }>();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  const systemName = system === 'francophone' 
    ? (language === 'fr' ? 'Système Francophone' : 'Francophone System')
    : (language === 'fr' ? 'Système Anglophone' : 'Anglophone System');

  const sectionName = section === 'nursery' 
    ? (language === 'fr' ? 'Maternelle' : 'Nursery')
    : section === 'primary' 
    ? (language === 'fr' ? 'Primaire' : 'Primary')
    : (language === 'fr' ? 'Secondaire' : 'Secondary');

  useEffect(() => {
    fetchClasses();
  }, [section]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('section', section || '')
        .order('name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast({
        title: language === 'fr' ? "Erreur" : "Error",
        description: language === 'fr' ? "Impossible de charger les classes" : "Failed to load classes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Group classes by level (cycle)
  const groupedClasses = classes.reduce((acc, cls) => {
    if (!acc[cls.level]) {
      acc[cls.level] = [];
    }
    acc[cls.level].push(cls);
    return acc;
  }, {} as Record<string, Class[]>);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-8 w-64 mb-8" />
          <Skeleton className="h-12 w-full mb-4" />
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/exams">{language === 'fr' ? 'Accueil' : 'Home'}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/exams/${system}/sections`}>{systemName}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{sectionName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {language === 'fr' ? 'Choisissez votre Niveau de Classe' : 'Choose Your Class Level'}
            </h1>
            <p className="text-muted-foreground">
              {systemName} - {sectionName}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/exams/${system}/sections`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {language === 'fr' ? 'Retour' : 'Back'}
          </Button>
        </div>

        {/* Classes Grid */}
        {Object.keys(groupedClasses).length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              {language === 'fr' ? 'Aucune classe disponible pour cette section.' : 'No classes available for this section.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedClasses).map(([level, levelClasses]) => (
              <div key={level}>
                <h2 className="text-xl font-semibold mb-4 text-primary">{level}</h2>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {levelClasses.map((cls) => (
                    <Card 
                      key={cls.id}
                      className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-border/50"
                      onClick={() => navigate(`/exams/${system}/${section}/${cls.id}/subjects`)}
                    >
                      <CardHeader className="text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mx-auto mb-3">
                          {level.includes('2nd') || level.includes('2ème') ? (
                            <BookOpenIcon className="h-6 w-6 text-green-500" />
                          ) : (
                            <GraduationCap className="h-6 w-6 text-blue-500" />
                          )}
                        </div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {cls.display_name}
                        </CardTitle>
                        {cls.description && (
                          <CardDescription className="text-sm">
                            {cls.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
