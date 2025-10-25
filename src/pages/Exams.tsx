import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Calendar, Users, Lock, Crown, Search, Check, Filter, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

interface Exam {
  id: string;
  title: string;
  subject: string;
  description?: string;
  duration_minutes?: number;
  year?: number;
  period?: string;
  exam_type?: string;
  tags?: string[];
  created_at: string;
  classes?: {
    id: string;
    display_name: string;
    level: string;
    section: string;
  };
}

export default function Exams() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasActiveSubscription, subscriptionTier, subscription } = useSubscription();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    fetchExams();
    fetchClasses();
  }, [hasActiveSubscription, subscription?.plan_id]);

  const fetchExams = async () => {
    try {
      let query = supabase
        .from('exams')
        .select(`
          *,
          classes (
            id,
            display_name,
            level,
            section
          )
        `)
        .eq('is_published', true);

      if (hasActiveSubscription && subscription?.plan_id) {
        const { data: allowedClasses } = await supabase
          .from('subscription_plan_classes')
          .select('class_id')
          .eq('subscription_plan_id', subscription.plan_id);
          
        if (allowedClasses && allowedClasses.length > 0) {
          const classIds = allowedClasses.map(ac => ac.class_id);
          query = query.in('class_id', classIds);
        }
      } else {
        query = query.limit(3);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast({
        title: language === 'fr' ? "Erreur" : "Error",
        description: language === 'fr' ? "Impossible de charger les examens" : "Failed to load exams",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      let query = supabase.from('classes').select('*');

      if (hasActiveSubscription && subscription?.plan_id) {
        const { data: allowedClasses } = await supabase
          .from('subscription_plan_classes')
          .select('class_id')
          .eq('subscription_plan_id', subscription.plan_id);
          
        if (allowedClasses && allowedClasses.length > 0) {
          const classIds = allowedClasses.map(ac => ac.class_id);
          query = query.in('id', classIds);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const subjects = [...new Set(exams.map(exam => exam.subject))];
  const years = [...new Set(exams.map(exam => exam.year).filter(Boolean))].sort((a, b) => b - a);
  const levels = [...new Set(exams.map(exam => exam.classes?.level).filter(Boolean))];

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || exam.subject === selectedSubject;
    const matchesYear = selectedYear === 'all' || exam.year?.toString() === selectedYear;
    const matchesLevel = selectedLevel === 'all' || exam.classes?.level === selectedLevel;
    const matchesClass = selectedClass === 'all' || exam.classes?.id === selectedClass;
    
    return matchesSearch && matchesSubject && matchesYear && matchesLevel && matchesClass;
  });

  // Apply sorting
  const sortedExams = [...filteredExams].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      case 'subject':
        return a.subject.localeCompare(b.subject);
      default:
        return 0;
    }
  });

  const displayedExams = sortedExams;

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="flex gap-6">
          <div className="w-64">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="flex-1 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="h-full">
                <CardHeader>
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">
          {language === 'fr' ? 'Examens' : 'Exams'}
        </h1>
        <p className="text-muted-foreground text-lg">
          {language === 'fr' ? 'Découvrez notre collection d\'examens classés par matière, niveau et année.' : 'Discover our collection of exams organized by subject, level, and year.'}
        </p>
        
        {!hasActiveSubscription && (
          <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                {language === 'fr' ? 'Accès Limité' : 'Limited Access'}
              </h3>
            </div>
            <p className="text-amber-700 dark:text-amber-300 text-sm mb-3">
              {language === 'fr' ? `Vous pouvez voir quelques examens gratuitement. Abonnez-vous pour un accès illimité à tous les examens et corrections.` : `You can view some exams for free. Subscribe for unlimited access to all exams and corrections.`}
            </p>
            <Link to="/subscriptions">
              <Button size="sm" className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700">
                <Crown className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Voir les Abonnements' : 'View Subscriptions'}
              </Button>
            </Link>
          </div>
        )}

        {hasActiveSubscription && (
          <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                {language === 'fr' ? 'Accès Premium' : 'Premium Access'}
              </h3>
            </div>
            <p className="text-green-700 dark:text-green-300 text-sm">
              {language === 'fr' ? `Vous avez accès aux examens ${subscriptionTier} avec votre abonnement.` : `You have access to ${subscriptionTier} exams with your subscription.`}
            </p>
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar - Filters */}
        {showFilters && (
          <Card className="w-full lg:w-64 h-fit lg:sticky lg:top-6 border-border/50 bg-card/95 backdrop-blur-sm shadow-medium animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                {language === 'fr' ? 'Filtres' : 'Filters'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'fr' ? 'Matière' : 'Subject'}</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'fr' ? 'Toutes' : 'All'}</SelectItem>
                    {subjects.map(subject => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'fr' ? 'Année' : 'Year'}</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'fr' ? 'Toutes' : 'All'}</SelectItem>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'fr' ? 'Niveau' : 'Level'}</label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'fr' ? 'Tous' : 'All'}</SelectItem>
                    {levels.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'fr' ? 'Classe' : 'Class'}</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'fr' ? 'Toutes' : 'All'}</SelectItem>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  {language === 'fr' ? 'Trier par' : 'Sort by'}
                </label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{language === 'fr' ? 'Plus récent' : 'Newest'}</SelectItem>
                    <SelectItem value="oldest">{language === 'fr' ? 'Plus ancien' : 'Oldest'}</SelectItem>
                    <SelectItem value="title">{language === 'fr' ? 'Titre (A-Z)' : 'Title (A-Z)'}</SelectItem>
                    <SelectItem value="subject">{language === 'fr' ? 'Matière (A-Z)' : 'Subject (A-Z)'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setSelectedSubject('all');
                  setSelectedYear('all');
                  setSelectedLevel('all');
                  setSelectedClass('all');
                  setSearchTerm('');
                }}
              >
                {language === 'fr' ? 'Réinitialiser' : 'Reset Filters'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Right Content Area */}
        <div className="flex-1 space-y-6">
          {/* Search and Toggle */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0 lg:hidden"
            >
              <Filter className="h-4 w-4" />
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={language === 'fr' ? 'Rechercher des examens...' : 'Search exams...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

           {/* Exams Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {displayedExams.map(exam => (
              <Card key={exam.id} className="group relative overflow-hidden hover:shadow-lg transition-all animate-fade-in flex flex-col h-full border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="line-clamp-2 text-lg leading-tight mb-2">{exam.title}</CardTitle>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col justify-between pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span className="font-medium">{exam.subject}</span>
                    </div>
                    
                    {exam.classes && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4 text-primary" />
                        <span>{exam.classes.display_name}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>{exam.year || new Date(exam.created_at).getFullYear()}</span>
                      </div>
                      
                      {exam.duration_minutes && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span>{exam.duration_minutes} min</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hover Buttons Overlay */}
                  <div className="absolute inset-0 bg-background/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3 p-6">
                    <Link to={`/exam/${exam.id}?mode=preview`} className="w-full">
                      <Button variant="outline" className="w-full">
                        <BookOpen className="h-4 w-4 mr-2" />
                        {language === 'fr' ? 'Aperçu' : 'Preview'}
                      </Button>
                    </Link>
                    
                    {user ? (
                      <>
                        <Link to={`/exam/${exam.id}?mode=correction`} className="w-full">
                          <Button
                            variant={hasActiveSubscription ? "default" : "secondary"}
                            className="w-full"
                            disabled={!hasActiveSubscription}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {language === 'fr' ? 'Voir Solution' : 'See Solution'}
                          </Button>
                        </Link>
                        
                        <Link to={`/exam/${exam.id}?mode=evaluation`} className="w-full">
                          <Button
                            variant={hasActiveSubscription ? "default" : "secondary"}
                            className="w-full"
                            disabled={!hasActiveSubscription}
                          >
                            {language === 'fr' ? 'Prendre Évaluation' : 'Take Evaluation'}
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <Link to="/subscriptions" className="w-full">
                        <Button className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700">
                          <Crown className="h-4 w-4 mr-2" />
                          {language === 'fr' ? 'Acheter Abonnement' : 'Purchase Subscription'}
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {!hasActiveSubscription && exams.length > 3 && (
              <Card className="hover:shadow-lg transition-shadow border-dashed border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <Lock className="h-12 w-12 text-amber-600 mb-4" />
                  <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    {language === 'fr' ? 'Plus d\'examens disponibles' : 'More exams available'}
                  </h3>
                  <p className="text-amber-700 dark:text-amber-300 text-sm mb-4">
                    {language === 'fr' ? `Abonnez-vous pour accéder à tous les examens selon votre curriculum.` : `Subscribe to access all exams based on your curriculum.`}
                  </p>
                  <Link to="/subscriptions">
                    <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700">
                      <Crown className="h-4 w-4 mr-2" />
                      {language === 'fr' ? 'S\'abonner maintenant' : 'Subscribe Now'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {displayedExams.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">
                {language === 'fr' ? 'Aucun examen trouvé' : 'No exams found'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}