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
import { BookOpen, Clock, Calendar, Eye, ArrowLeft, Search, Lock, Crown, FileText, Play } from 'lucide-react';
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
  created_at: string;
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
        .single();
      
      if (classData) {
        setClassName(classData.display_name);
      }

      let query = supabase
        .from('exams')
        .select('*')
        .eq('class_id', classId || '')
        .eq('is_published', true);
      
      // Only filter by subject if not 'all'
      if (subject && subject !== 'all') {
        query = query.eq('subject', subject);
      }
      
      const { data: examsData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setExams(examsData || []);
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

  const years = [...new Set(exams.map(e => e.year).filter(Boolean))].sort((a, b) => b! - a!);
  const examTypes = [...new Set(exams.map(e => e.exam_type).filter(Boolean))];

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = selectedYear === 'all' || exam.year?.toString() === selectedYear;
    const matchesType = selectedType === 'all' || exam.exam_type === selectedType;
    
    return matchesSearch && matchesYear && matchesType;
  });

  const sortedExams = [...filteredExams].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'year-desc':
        return (b.year || 0) - (a.year || 0);
      case 'year-asc':
        return (a.year || 0) - (b.year || 0);
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

        {/* Filters */}
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
                <SelectItem key={year} value={year!.toString()}>{year}</SelectItem>
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

        {/* Exams Grid */}
        {sortedExams.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              {language === 'fr' ? 'Aucune épreuve disponible.' : 'No exam papers available.'}
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedExams.map((exam, index) => {
              // Material colors alternating pattern
              const colorClasses = [
                'bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-500/30 hover:border-blue-500/50',
                'bg-gradient-to-br from-green-500/10 to-green-600/20 border-green-500/30 hover:border-green-500/50',
                'bg-gradient-to-br from-purple-500/10 to-purple-600/20 border-purple-500/30 hover:border-purple-500/50',
                'bg-gradient-to-br from-orange-500/10 to-orange-600/20 border-orange-500/30 hover:border-orange-500/50',
              ];
              const colorIndex = index % 4;
              
              return (
                <Card key={exam.id} className={`group hover:shadow-lg transition-all ${colorClasses[colorIndex]}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary">
                        {exam.year || new Date(exam.created_at).getFullYear()}
                      </Badge>
                      {exam.exam_type && (
                        <Badge variant="outline">{exam.exam_type}</Badge>
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
                      {exam.period && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{exam.period}</span>
                        </div>
                      )}
                      {exam.duration_minutes && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{exam.duration_minutes} min</span>
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
