import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { GraduationCap, BookOpen as BookOpenIcon, Repeat, Lock, Crown, School, ChevronDown, Search, X, Check } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
interface Class {
  id: string;
  name: string;
  display_name: string;
  level: string;
  section: string;
  description?: string;
  paperCount?: number;
}
interface FreeExam {
  id: string;
  title: string;
  subject: string;
  class_id: string;
  class_name: string;
}
export default function Exams() {
  const {
    language
  } = useLanguage();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  const {
    hasActiveSubscription
  } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const [classes, setClasses] = useState<Class[]>([]);
  const [freeExams, setFreeExams] = useState<FreeExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSystem, setSelectedSystem] = useState<'francophone' | 'anglophone'>('francophone');
  const [establishments, setEstablishments] = useState<Array<{ id: string; name: string }>>([]);
  const [schoolSearchTerm, setSchoolSearchTerm] = useState('');
  const [schoolDropdownOpen, setSchoolDropdownOpen] = useState(false);
  
  const selectedEstablishment = searchParams.get('school') || 'all';
  
  const setSelectedEstablishment = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      newParams.delete('school');
    } else {
      newParams.set('school', value);
    }
    setSearchParams(newParams);
  };
  
  const isFullAccessUser = user && hasActiveSubscription;
  
  const filteredEstablishments = establishments.filter(est =>
    est.name.toLowerCase().includes(schoolSearchTerm.toLowerCase())
  );
  
  const selectedSchoolName = selectedEstablishment === 'all' 
    ? (language === 'fr' ? 'Toutes les écoles' : 'All Schools')
    : establishments.find(e => e.id === selectedEstablishment)?.name || '';
  useEffect(() => {
    fetchEstablishments();
  }, []);

  useEffect(() => {
    if (isFullAccessUser) {
      fetchClasses();
    } else {
      fetchFreeExams();
    }
  }, [selectedSystem, selectedEstablishment, isFullAccessUser]);

  const fetchEstablishments = async () => {
    try {
      const { data, error } = await supabase
        .from('establishments')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setEstablishments(data || []);
    } catch (error) {
      console.error('Error fetching establishments:', error);
    }
  };
  const fetchFreeExams = async () => {
    try {
      setLoading(true);
      // Fetch only 5 free exams
      const {
        data: examsData,
        error
      } = await supabase.from('exams').select(`
          id,
          title,
          class_id,
          classes!inner(display_name),
          subjects:subject_id (
            name,
            name_en,
            name_fr
          )
        `).eq('is_published', true).eq('classes.section', selectedSystem).limit(5);
      if (error) throw error;
      const formattedExams = (examsData || []).map((exam: any) => ({
        id: exam.id,
        title: exam.title,
        subject: exam.subjects ? (language === 'fr' ? exam.subjects.name_fr || exam.subjects.name : exam.subjects.name_en || exam.subjects.name) : '',
        class_id: exam.class_id,
        class_name: exam.classes.display_name
      }));
      setFreeExams(formattedExams);
    } catch (error) {
      console.error('Error fetching free exams:', error);
      toast({
        title: language === 'fr' ? "Erreur" : "Error",
        description: language === 'fr' ? "Impossible de charger les épreuves" : "Failed to load exams",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
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
        (data || []).map(async cls => {
          let examQuery = supabase
            .from('exams')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
            .eq('is_published', true);
          
          if (selectedEstablishment !== 'all') {
            examQuery = examQuery.eq('establishment_id', selectedEstablishment);
          }
          
          const { count } = await examQuery;
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
  const systemName = selectedSystem === 'francophone' ? language === 'fr' ? 'Système Francophone' : 'Francophone System' : language === 'fr' ? 'Système Anglophone' : 'Anglophone System';
  const systemDescription = selectedSystem === 'francophone' ? language === 'fr' ? 'Ressources pour le système éducatif francophone, du collège au lycée.' : 'Resources for the French-speaking educational system, from middle school to high school.' : language === 'fr' ? 'Ressources pour le système éducatif anglophone, de Form 1 à Upper Sixth.' : 'Resources for the English-speaking educational system, from Form 1 to Upper Sixth.';

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
    return <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-24 w-full mb-8" />
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
        </div>
      </div>;
  }
  return <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* System Switcher - Top */}
        <Card className="mb-8 border-border/50 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex-1">
                <CardTitle className="text-xl text-primary mb-2">
                  {systemName}
                </CardTitle>
                <CardDescription className="text-sm">
                  {systemDescription}
                </CardDescription>
              </div>
              <Button variant="outline" className="gap-2" onClick={() => setSelectedSystem(selectedSystem === 'francophone' ? 'anglophone' : 'francophone')}>
                <Repeat className="h-4 w-4" />
                {language === 'fr' ? 'Changer de Système' : 'Change System'}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* School Filter Dropdown */}
        {isFullAccessUser && establishments.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium flex items-center gap-2">
                <School className="h-4 w-4" />
                {language === 'fr' ? 'Filtrer par École:' : 'Filter by School:'}
              </span>
              <Popover open={schoolDropdownOpen} onOpenChange={setSchoolDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={schoolDropdownOpen}
                    className="min-w-[200px] max-w-[350px] justify-between"
                  >
                    <span className="truncate">{selectedSchoolName}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0 bg-popover" align="start">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={language === 'fr' ? 'Rechercher une école...' : 'Search schools...'}
                        value={schoolSearchTerm}
                        onChange={(e) => setSchoolSearchTerm(e.target.value)}
                        className="pl-8 h-9"
                      />
                      {schoolSearchTerm && (
                        <button
                          onClick={() => setSchoolSearchTerm('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedEstablishment('all');
                        setSchoolDropdownOpen(false);
                        setSchoolSearchTerm('');
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors",
                        selectedEstablishment === 'all' && "bg-accent"
                      )}
                    >
                      <Check className={cn("h-4 w-4", selectedEstablishment === 'all' ? "opacity-100" : "opacity-0")} />
                      <School className="h-4 w-4 text-primary" />
                      <span>{language === 'fr' ? 'Toutes les écoles' : 'All Schools'}</span>
                    </button>
                    {filteredEstablishments.length === 0 ? (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        {language === 'fr' ? 'Aucune école trouvée' : 'No schools found'}
                      </div>
                    ) : (
                      filteredEstablishments.map(est => (
                        <button
                          key={est.id}
                          onClick={() => {
                            setSelectedEstablishment(est.id);
                            setSchoolDropdownOpen(false);
                            setSchoolSearchTerm('');
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left",
                            selectedEstablishment === est.id && "bg-accent"
                          )}
                        >
                          <Check className={cn("h-4 w-4 shrink-0", selectedEstablishment === est.id ? "opacity-100" : "opacity-0")} />
                          <School className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{est.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              {selectedEstablishment !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEstablishment('all')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  {language === 'fr' ? 'Effacer' : 'Clear'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Free Access Notice */}
        {!isFullAccessUser && <div className="mb-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Lock className="h-6 w-6 text-amber-600" />
              <h3 className="font-bold text-lg text-amber-800 dark:text-amber-200">
                {language === 'fr' ? 'Accès Gratuit Limité' : 'Limited Free Access'}
              </h3>
            </div>
            <p className="text-amber-700 dark:text-amber-300 mb-4">
              {language === 'fr' ? `Vous consultez actuellement ${freeExams.length} épreuves gratuites. Connectez-vous et abonnez-vous pour accéder à toutes les épreuves organisées par classe et matière.` : `You are currently viewing ${freeExams.length} free exam papers. Sign in and subscribe for access to all exams organized by class and subject.`}
            </p>
            <div className="flex gap-3">
              {!user && <Link to="/auth">
                  <Button size="sm" variant="outline" className="border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950">
                    {language === 'fr' ? 'Se Connecter' : 'Sign In'}
                  </Button>
                </Link>}
              <Link to="/subscriptions">
                <Button size="sm" className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700">
                  <Crown className="h-4 w-4 mr-2" />
                  {language === 'fr' ? 'Voir les Abonnements' : 'View Subscriptions'}
                </Button>
              </Link>
            </div>
          </div>}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {isFullAccessUser ? language === 'fr' ? 'Choisissez votre Classe' : 'Choose Your Class' : language === 'fr' ? 'Épreuves Gratuites' : 'Free Exam Papers'}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isFullAccessUser ? language === 'fr' ? 'Sélectionnez votre niveau de classe pour accéder aux épreuves d\'examen et corrections.' : 'Select your class level to access exam papers and corrections.' : language === 'fr' ? 'Découvrez un aperçu de nos épreuves. Abonnez-vous pour un accès complet.' : 'Explore a preview of our exam papers. Subscribe for full access.'}
          </p>
        </div>

        {/* Content */}
        {isFullAccessUser ?
      // Full Access: Classes Grid
      Object.keys(groupedClasses).length === 0 ? <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                {language === 'fr' ? 'Aucune classe disponible.' : 'No classes available.'}
              </p>
            </Card> : <div className="space-y-8">
              {Object.entries(groupedClasses).map(([group, groupClasses]) => <div key={group}>
                  <h2 className="text-xl font-semibold mb-4 text-primary">{group}</h2>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {groupClasses.map((cls, index) => {
              // Material colors alternating pattern
              const colorClasses = ['bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-500/30 hover:border-blue-500/50', 'bg-gradient-to-br from-green-500/10 to-green-600/20 border-green-500/30 hover:border-green-500/50', 'bg-gradient-to-br from-purple-500/10 to-purple-600/20 border-purple-500/30 hover:border-purple-500/50', 'bg-gradient-to-br from-orange-500/10 to-orange-600/20 border-orange-500/30 hover:border-orange-500/50'];
              const iconColors = ['text-blue-500', 'text-green-500', 'text-purple-500', 'text-orange-500'];
              const colorIndex = index % 4;
              return <Card key={cls.id} className={`group cursor-pointer hover:shadow-lg transition-all duration-300 ${colorClasses[colorIndex]}`} onClick={() => navigate(`/exams/${cls.id}/subjects${selectedEstablishment !== 'all' ? `?school=${selectedEstablishment}` : ''}`)}>
                          <CardHeader className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-background/50 mx-auto mb-3">
                              {group.includes('2nd') || group.includes('2ème') || group.includes('Advanced') ? <BookOpenIcon className={`h-6 w-6 ${iconColors[colorIndex]}`} /> : <GraduationCap className={`h-6 w-6 ${iconColors[colorIndex]}`} />}
                            </div>
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {cls.display_name}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {selectedSystem === 'francophone' ? language === 'fr' ? 'Collège & Lycée' : 'Middle & High School' : language === 'fr' ? 'Système Anglophone' : 'English System'}
                            </CardDescription>
                            <CardDescription className="text-sm font-medium mt-2">
                              {cls.paperCount || 0} {language === 'fr' ? 'épreuves disponibles' : 'papers available'}
                            </CardDescription>
                          </CardHeader>
                        </Card>;
            })}
                  </div>
                </div>)}
            </div> :
      // Free Access: Limited Exams List
      freeExams.length === 0 ? <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                {language === 'fr' ? 'Aucune épreuve disponible.' : 'No exams available.'}
              </p>
            </Card> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {freeExams.map((exam, index) => {
          const colorClasses = ['bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-500/30 hover:border-blue-500/50', 'bg-gradient-to-br from-green-500/10 to-green-600/20 border-green-500/30 hover:border-green-500/50', 'bg-gradient-to-br from-purple-500/10 to-purple-600/20 border-purple-500/30 hover:border-purple-500/50', 'bg-gradient-to-br from-orange-500/10 to-orange-600/20 border-orange-500/30 hover:border-orange-500/50'];
          const iconColors = ['text-blue-500', 'text-green-500', 'text-purple-500', 'text-orange-500'];
          const colorIndex = index % 4;
          return <Card key={exam.id} className={`group cursor-pointer hover:shadow-lg transition-all duration-300 ${colorClasses[colorIndex]}`} onClick={() => navigate(`/exam/${exam.id}?mode=preview`)}>
                    <CardHeader>
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-background/50 mb-3">
                        <BookOpenIcon className={`h-6 w-6 ${iconColors[colorIndex]}`} />
                      </div>
                      <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-2">
                        {exam.title}
                      </CardTitle>
                      <CardDescription className="text-xs mt-2">
                        {exam.class_name} • {exam.subject}
                      </CardDescription>
                      <CardDescription className="text-xs mt-1 text-muted-foreground">
                        {language === 'fr' ? 'Épreuve gratuite' : 'Free exam paper'}
                      </CardDescription>
                    </CardHeader>
                  </Card>;
         })}
            </div>}
      </div>
    </div>;
}