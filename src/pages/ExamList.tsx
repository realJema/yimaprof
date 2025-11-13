import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, Clock, Calendar, Eye, ArrowLeft, Search, Lock, Crown, FileText, Play, Filter } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

interface Exam {
  id: string;
  title: string;
  subject_id: string;
  exam_type_id: string;
  period_id: string;
  academic_year_id: string;
  duration_id: string;
  description?: string;
  created_at: string;
  subjects?: {
    name: string;
    name_en?: string;
    name_fr?: string;
  };
  academic_years?: {
    year_label: string;
  };
  periods?: {
    name: string;
    name_en?: string;
    name_fr?: string;
  };
  exam_types?: {
    name: string;
    name_en?: string;
    name_fr?: string;
  };
  durations?: {
    minutes: number;
    display_label: string;
  };
  establishments?: {
    name: string;
  };
}

export default function ExamList() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { classId } = useParams();
  const [searchParams] = useSearchParams();
  const subject = searchParams.get('subject');
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasActiveSubscription } = useSubscription();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchClassAndExams();
  }, [classId, subject]);

  const fetchClassAndExams = async () => {
    try {
      setLoading(true);
      
      const { data: classData } = await supabase
        .from('classes')
        .select('display_name')
        .eq('id', classId || '')
        .maybeSingle();
      
      if (classData) {
        setClassName(classData.display_name);
      }

      // Fetch exams with basic data first
      let query = supabase
        .from('exams')
        .select('*')
        .eq('class_id', classId || '')
        .eq('is_published', true);
      
      const { data: examsData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      // Enrich exams with related data
      const enrichedExams = await Promise.all(
        (examsData || []).map(async (exam) => {
          const enriched: any = { ...exam };
          const examAny = exam as any;
          const sbAny = supabase as any;
          
          // Fetch subject
          if (examAny.subject_id) {
            const { data: subjectData } = await sbAny
              .from('subjects')
              .select('name, name_en, name_fr')
              .eq('id', examAny.subject_id)
              .maybeSingle();
            if (subjectData) enriched.subjects = subjectData;
          }
          
          // Fetch academic year
          if (examAny.academic_year_id) {
            const { data: yearData } = await sbAny
              .from('academic_years')
              .select('year_label')
              .eq('id', examAny.academic_year_id)
              .maybeSingle();
            if (yearData) enriched.academic_years = yearData;
          }
          
          // Fetch period
          if (examAny.period_id) {
            const { data: periodData } = await sbAny
              .from('periods')
              .select('name, name_en, name_fr')
              .eq('id', examAny.period_id)
              .maybeSingle();
            if (periodData) enriched.periods = periodData;
          }
          
          // Fetch exam type
          if (examAny.exam_type_id) {
            const { data: typeData } = await sbAny
              .from('exam_types')
              .select('name, name_en, name_fr')
              .eq('id', examAny.exam_type_id)
              .maybeSingle();
            if (typeData) enriched.exam_types = typeData;
          }
          
          // Fetch duration
          if (examAny.duration_id) {
            const { data: durationData } = await sbAny
              .from('durations')
              .select('minutes, display_label')
              .eq('id', examAny.duration_id)
              .maybeSingle();
            if (durationData) enriched.durations = durationData;
          }
          
          // Fetch establishment
          if (examAny.establishment_id) {
            const { data: estData } = await sbAny
              .from('establishments')
              .select('name')
              .eq('id', examAny.establishment_id)
              .maybeSingle();
            if (estData) enriched.establishments = estData;
          }
          
          return enriched;
        })
      );
      
      setExams(enrichedExams);
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

  const years = [...new Set(exams.map(e => e.academic_years?.year_label).filter(Boolean))].sort((a, b) => {
    const yearA = parseInt(a!.split('-')[0]);
    const yearB = parseInt(b!.split('-')[0]);
    return yearB - yearA;
  });
  const examTypes = [...new Set(exams.map(e => {
    const examType = e.exam_types;
    if (!examType) return null;
    return language === 'fr' ? (examType.name_fr || examType.name) : (examType.name_en || examType.name);
  }).filter(Boolean))];

  const filteredExams = exams.filter(exam => {
    // Match subject filter
    let matchesSubject = true;
    if (subject && subject !== 'all') {
      const subjectName = exam.subjects 
        ? (language === 'fr' ? exam.subjects.name_fr || exam.subjects.name : exam.subjects.name_en || exam.subjects.name)
        : '';
      matchesSubject = subjectName === subject;
    }
    
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = selectedYear === 'all' || exam.academic_years?.year_label === selectedYear;
    
    const examTypeName = exam.exam_types 
      ? (language === 'fr' ? exam.exam_types.name_fr || exam.exam_types.name : exam.exam_types.name_en || exam.exam_types.name)
      : '';
    const matchesType = selectedType === 'all' || examTypeName === selectedType;
    
    return matchesSubject && matchesSearch && matchesYear && matchesType;
  });

  const sortedExams = [...filteredExams].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'year-desc':
        const yearA = a.academic_years?.year_label || '';
        const yearB = b.academic_years?.year_label || '';
        return yearB.localeCompare(yearA);
      case 'year-asc':
        const yearA2 = a.academic_years?.year_label || '';
        const yearB2 = b.academic_years?.year_label || '';
        return yearA2.localeCompare(yearB2);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/exams">{language === 'fr' ? 'Classes' : 'Classes'}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/exams/${classId}/subjects`}>{className}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{subject}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {language === 'fr' 
                ? subject === 'all' 
                  ? `Toutes les épreuves pour ${className}` 
                  : `Épreuves d'examen pour ${className} - ${subject}`
                : subject === 'all'
                  ? `All Papers for ${className}`
                  : `Exam Papers for ${className} - ${subject}`}
            </h1>
            <p className="text-muted-foreground">
              {language === 'fr' ? 'Trouvez des épreuves d\'examen officielles et fictives avec corrections.' : 'Find official and mock exam papers with corrections.'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {language === 'fr' ? 'Retour' : 'Back'}
          </Button>
        </div>

        {/* Subscription Notice */}
        {!hasActiveSubscription && (
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                {language === 'fr' ? 'Accès Limité' : 'Limited Access'}
              </h3>
            </div>
            <p className="text-amber-700 dark:text-amber-300 text-sm mb-3">
              {language === 'fr' ? `Abonnez-vous pour un accès illimité à toutes les corrections.` : `Subscribe for unlimited access to all corrections.`}
            </p>
            <Link to="/subscriptions">
              <Button size="sm" className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700">
                <Crown className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Voir les Abonnements' : 'View Subscriptions'}
              </Button>
            </Link>
          </div>
        )}

        {/* Filters Toggle */}
        <div className="mb-6 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {language === 'fr' ? 'Filtres' : 'Filters'}
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={language === 'fr' ? 'Rechercher...' : 'Search...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'fr' ? 'Année' : 'Year'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'fr' ? 'Toutes' : 'All'}</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year!}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'fr' ? 'Type' : 'Type'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'fr' ? 'Tous' : 'All'}</SelectItem>
                {examTypes.map(type => (
                  <SelectItem key={type} value={type!}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'fr' ? 'Trier' : 'Sort'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{language === 'fr' ? 'Plus récent' : 'Most Recent'}</SelectItem>
                <SelectItem value="year-desc">{language === 'fr' ? 'Année (desc)' : 'Year (desc)'}</SelectItem>
                <SelectItem value="year-asc">{language === 'fr' ? 'Année (asc)' : 'Year (asc)'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Exams Grid */}
        {sortedExams.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              {language === 'fr' ? 'Aucune épreuve disponible.' : 'No exam papers available.'}
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedExams.map((exam) => {
              // Get subject name for color mapping
              const subjectName = exam.subjects 
                ? (language === 'fr' ? exam.subjects.name_fr || exam.subjects.name : exam.subjects.name_en || exam.subjects.name)
                : '';
              
              // Subject-based colors
              const subjectColors: Record<string, string> = {
                'Math': 'bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-500/30 hover:border-blue-500/50',
                'Mathématiques': 'bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-500/30 hover:border-blue-500/50',
                'Mathematics': 'bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-500/30 hover:border-blue-500/50',
                'Physics': 'bg-gradient-to-br from-purple-500/10 to-purple-600/20 border-purple-500/30 hover:border-purple-500/50',
                'Physique': 'bg-gradient-to-br from-purple-500/10 to-purple-600/20 border-purple-500/30 hover:border-purple-500/50',
                'Chemistry': 'bg-gradient-to-br from-green-500/10 to-green-600/20 border-green-500/30 hover:border-green-500/50',
                'Chimie': 'bg-gradient-to-br from-green-500/10 to-green-600/20 border-green-500/30 hover:border-green-500/50',
                'Biology': 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/20 border-emerald-500/30 hover:border-emerald-500/50',
                'Biologie': 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/20 border-emerald-500/30 hover:border-emerald-500/50',
                'English': 'bg-gradient-to-br from-red-500/10 to-red-600/20 border-red-500/30 hover:border-red-500/50',
                'Anglais': 'bg-gradient-to-br from-red-500/10 to-red-600/20 border-red-500/30 hover:border-red-500/50',
                'French': 'bg-gradient-to-br from-pink-500/10 to-pink-600/20 border-pink-500/30 hover:border-pink-500/50',
                'Français': 'bg-gradient-to-br from-pink-500/10 to-pink-600/20 border-pink-500/30 hover:border-pink-500/50',
                'History': 'bg-gradient-to-br from-amber-500/10 to-amber-600/20 border-amber-500/30 hover:border-amber-500/50',
                'Histoire': 'bg-gradient-to-br from-amber-500/10 to-amber-600/20 border-amber-500/30 hover:border-amber-500/50',
                'Geography': 'bg-gradient-to-br from-cyan-500/10 to-cyan-600/20 border-cyan-500/30 hover:border-cyan-500/50',
                'Géographie': 'bg-gradient-to-br from-cyan-500/10 to-cyan-600/20 border-cyan-500/30 hover:border-cyan-500/50',
              };
              
              const colorClass = subjectColors[subjectName] || 'bg-gradient-to-br from-slate-500/10 to-slate-600/20 border-slate-500/30 hover:border-slate-500/50';
              
              const displayYear = exam.academic_years?.year_label || new Date(exam.created_at).getFullYear();
              const displayType = exam.exam_types 
                ? (language === 'fr' ? exam.exam_types.name_fr || exam.exam_types.name : exam.exam_types.name_en || exam.exam_types.name)
                : undefined;
              const displayPeriod = exam.periods
                ? (language === 'fr' ? exam.periods.name_fr || exam.periods.name : exam.periods.name_en || exam.periods.name)
                : undefined;
              const displayDuration = exam.durations?.minutes;
              
              return (
                <Card key={exam.id} className={`group hover:shadow-lg transition-all ${colorClass}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary">
                        {displayYear}
                      </Badge>
                      {displayType && (
                        <Badge variant="outline">{displayType}</Badge>
                      )}
                    </div>
                    <CardTitle className="line-clamp-2 text-lg">{exam.title}</CardTitle>
                    {exam.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                        {exam.description}
                      </p>
                    )}
                    {!exam.description && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {language === 'fr' 
                          ? `Épreuve officielle avec correction détaillée`
                          : `Official exam paper with detailed corrections`}
                      </p>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {displayPeriod && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{displayPeriod}</span>
                        </div>
                      )}
                      {displayDuration && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{displayDuration} min</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link to={`/exam/${exam.id}?mode=preview`} className="w-full">
                        <Button variant="default" size="sm" className="w-full gap-2">
                          <Eye className="h-4 w-4" />
                          {language === 'fr' ? 'Voir l\'Épreuve' : 'View Exam'}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
