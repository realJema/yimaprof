import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen as BookOpenIcon, Repeat } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";

interface Class {
  id: string;
  name: string;
  display_name: string;
  level: string;
  section: string;
  description?: string;
}

export default function Exams() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscription } = useSubscription();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSystem, setSelectedSystem] = useState<'francophone' | 'anglophone'>('francophone');

  useEffect(() => {
    fetchClasses();
  }, [selectedSystem]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('section', selectedSystem)
        .order('level');

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

  const systemName = selectedSystem === 'francophone' 
    ? (language === 'fr' ? 'Système Francophone' : 'Francophone System')
    : (language === 'fr' ? 'Système Anglophone' : 'Anglophone System');

  const systemDescription = selectedSystem === 'francophone'
    ? (language === 'fr' 
      ? 'Ressources pour le système éducatif francophone, du collège au lycée.' 
      : 'Resources for the French-speaking educational system, from middle school to high school.')
    : (language === 'fr' 
      ? 'Ressources pour le système éducatif anglophone, de Form 1 à Upper Sixth.' 
      : 'Resources for the English-speaking educational system, from Form 1 to Upper Sixth.');

  // Group classes by level range
  const groupedClasses = classes.reduce((acc, cls) => {
    const level = parseInt(cls.level);
    let group = '';
    
    if (selectedSystem === 'francophone') {
      if (level >= 6 && level <= 9) {
        group = language === 'fr' ? '1er Cycle' : '1st Cycle';
      } else if (level >= 10 && level <= 12) {
        group = language === 'fr' ? '2ème Cycle' : '2nd Cycle';
      }
    } else {
      if (level >= 7 && level <= 11) {
        group = 'Forms';
      } else if (level >= 12 && level <= 13) {
        group = 'Advanced Level';
      }
    }

    if (group && !acc[group]) {
      acc[group] = [];
    }
    if (group) {
      acc[group].push(cls);
    }
    return acc;
  }, {} as Record<string, Class[]>);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-6">
            <Skeleton className="w-80 h-64" />
            <div className="flex-1">
              <Skeleton className="h-12 w-full mb-8" />
              <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - System Switcher */}
          <Card className="w-full lg:w-80 h-fit lg:sticky lg:top-6 border-border/50 bg-card/95 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-lg text-primary">
                  {systemName}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedSystem(selectedSystem === 'francophone' ? 'anglophone' : 'francophone')}
                  title={language === 'fr' ? 'Changer de système' : 'Change system'}
                >
                  <Repeat className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="text-sm">
                {systemDescription}
              </CardDescription>
            </CardHeader>
            <div className="px-6 pb-6">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setSelectedSystem(selectedSystem === 'francophone' ? 'anglophone' : 'francophone')}
              >
                <Repeat className="h-4 w-4" />
                {language === 'fr' ? 'Changer de Système' : 'Change System'}
              </Button>
            </div>
          </Card>

          {/* Right Content Area - Class Selection */}
          <div className="flex-1">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">
                {language === 'fr' ? 'Choisissez votre Classe' : 'Choose Your Class'}
              </h1>
              <p className="text-muted-foreground text-lg">
                {language === 'fr' 
                  ? 'Sélectionnez votre niveau de classe pour accéder aux épreuves d\'examen et corrections.' 
                  : 'Select your class level to access exam papers and corrections.'}
              </p>
            </div>

            {/* Classes Grid */}
            {Object.keys(groupedClasses).length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  {language === 'fr' ? 'Aucune classe disponible.' : 'No classes available.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedClasses).map(([group, groupClasses]) => (
                  <div key={group}>
                    <h2 className="text-xl font-semibold mb-4 text-primary">{group}</h2>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {groupClasses.map((cls) => (
                        <Card 
                          key={cls.id}
                          className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-border/50"
                          onClick={() => navigate(`/exams/${cls.id}/subjects`)}
                        >
                          <CardHeader className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mx-auto mb-3">
                              {group.includes('2nd') || group.includes('2ème') || group.includes('Advanced') ? (
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
      </div>
    </div>
  );
}
