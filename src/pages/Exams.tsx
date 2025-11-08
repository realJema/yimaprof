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
  paperCount?: number;
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
      
      // Fetch paper counts for each class
      const classesWithCounts = await Promise.all(
        (data || []).map(async (cls) => {
          const { count } = await supabase
            .from('exams')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
            .eq('is_published', true);
          
          return { ...cls, paperCount: count || 0 };
        })
      );
      
      setClasses(classesWithCounts);
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
          <Skeleton className="h-24 w-full mb-8" />
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* System Switcher - Top */}
        <Card className="mb-8 border-border/50 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl text-primary mb-2">
                  {systemName}
                </CardTitle>
                <CardDescription className="text-sm">
                  {systemDescription}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setSelectedSystem(selectedSystem === 'francophone' ? 'anglophone' : 'francophone')}
              >
                <Repeat className="h-4 w-4" />
                {language === 'fr' ? 'Changer de Système' : 'Change System'}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Header */}
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
                  {groupClasses.map((cls, index) => {
                    // Material colors alternating pattern
                    const colorClasses = [
                      'bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-500/30 hover:border-blue-500/50',
                      'bg-gradient-to-br from-green-500/10 to-green-600/20 border-green-500/30 hover:border-green-500/50',
                      'bg-gradient-to-br from-purple-500/10 to-purple-600/20 border-purple-500/30 hover:border-purple-500/50',
                      'bg-gradient-to-br from-orange-500/10 to-orange-600/20 border-orange-500/30 hover:border-orange-500/50',
                    ];
                    const iconColors = [
                      'text-blue-500',
                      'text-green-500',
                      'text-purple-500',
                      'text-orange-500',
                    ];
                    const colorIndex = index % 4;
                    
                    return (
                      <Card 
                        key={cls.id}
                        className={`group cursor-pointer hover:shadow-lg transition-all duration-300 ${colorClasses[colorIndex]}`}
                        onClick={() => navigate(`/exams/${cls.id}/subjects`)}
                      >
                        <CardHeader className="text-center">
                          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-background/50 mx-auto mb-3">
                            {group.includes('2nd') || group.includes('2ème') || group.includes('Advanced') ? (
                              <BookOpenIcon className={`h-6 w-6 ${iconColors[colorIndex]}`} />
                            ) : (
                              <GraduationCap className={`h-6 w-6 ${iconColors[colorIndex]}`} />
                            )}
                          </div>
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {cls.display_name}
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {selectedSystem === 'francophone' 
                              ? (language === 'fr' ? 'Collège & Lycée' : 'Middle & High School')
                              : (language === 'fr' ? 'Système Anglophone' : 'English System')}
                          </CardDescription>
                          <CardDescription className="text-sm font-medium mt-2">
                            {cls.paperCount || 0} {language === 'fr' ? 'épreuves disponibles' : 'papers available'}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
