import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Download, Eye, Search, Calendar, Users, FileText, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface Exam {
  id: string;
  title: string;
  subject: string;
  year?: number;
  period?: string;
  exam_type?: string;
  description?: string;
  class_id?: string;
  language?: string;
  content?: any; // JSON content
  created_at: string;
  classes?: {
    id: string;
    name: string;
    display_name: string;
    section: string;
    level: string;
  };
}

interface Class {
  id: string;
  name: string;
  display_name: string;
  section: string;
  level: string;
  description?: string;
}

interface ClassStats {
  [key: string]: {
    count: number;
    subjects: string[];
    latestYear?: number;
  };
}

type ViewType = 'sections' | 'exams';

export default function Exams() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<ViewType>('sections');
  const [selectedSection, setSelectedSection] = useState<'francophone' | 'anglophone' | 'all' | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classStats, setClassStats] = useState<ClassStats>({});

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('level');
      
      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchClassStats = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          class_id,
          subject, 
          year,
          classes (
            id,
            name,
            display_name,
            section
          )
        `)
        .eq('is_published', true);

      if (error) throw error;

      const stats: ClassStats = {};
      data?.forEach(exam => {
        const classId = exam.class_id;
        if (!classId || !exam.classes) return;
        
        if (!stats[classId]) {
          stats[classId] = {
            count: 0,
            subjects: [],
            latestYear: undefined
          };
        }
        
        stats[classId].count++;
        
        if (exam.subject && !stats[classId].subjects.includes(exam.subject)) {
          stats[classId].subjects.push(exam.subject);
        }
        
        if (exam.year && (!stats[classId].latestYear || exam.year > stats[classId].latestYear)) {
          stats[classId].latestYear = exam.year;
        }
      });
      
      setClassStats(stats);
    } catch (error) {
      console.error('Failed to fetch class stats:', error);
    }
  };

  const fetchExamsBySection = async (section: 'francophone' | 'anglophone' | 'all') => {
    setLoading(true);
    try {
      let query = supabase
        .from('exams')
        .select(`
          *,
          classes (
            id,
            name,
            display_name,
            section,
            level
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (section === 'francophone') {
        query = query.eq('classes.section', 'francophone');
      } else if (section === 'anglophone') {
        query = query.eq('classes.section', 'anglophone');
      }

      const { data, error } = await query;
      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      toast({
        title: t('error'),
        description: 'Failed to fetch exams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSectionSelect = (section: 'francophone' | 'anglophone' | 'all') => {
    setSelectedSection(section);
    setCurrentView('exams');
    fetchExamsBySection(section);
  };

  const handleClassSelect = (classId: string) => {
    // Determine section based on class
    const classInfo = classes.find(c => c.id === classId);
    const section = classInfo?.section === 'francophone' ? 'francophone' : 'anglophone';
    setSelectedSection(section);
    setCurrentView('exams');
    
    // Fetch exams for specific class
    setLoading(true);
    supabase
      .from('exams')
      .select(`
        *,
        classes (
          id,
          name,
          display_name,
          section,
          level
        )
      `)
      .eq('is_published', true)
      .eq('class_id', classId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast({
            title: t('error'),
            description: 'Failed to fetch exams',
            variant: 'destructive',
          });
        } else {
          setExams(data || []);
        }
        setLoading(false);
      });
  };

  const handleBack = () => {
    setCurrentView('sections');
    setSelectedSection(null);
  };

  const groupExamsByClass = (exams: Exam[]) => {
    const grouped: { [key: string]: Exam[] } = {};
    exams.forEach(exam => {
      const classId = exam.class_id || 'other';
      if (!grouped[classId]) {
        grouped[classId] = [];
      }
      grouped[classId].push(exam);
    });
    return grouped;
  };

  const filteredExams = exams.filter(exam =>
    exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderSections = () => (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">{t('exams')}</h1>
      
      {/* Francophone Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-semibold text-foreground">{t('francophone')} Section</h2>
            <p className="text-muted-foreground">Classes de la 6ème à la Terminale • {language === 'fr' ? 'Système français' : 'French system'}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {classes.filter(c => c.section === 'francophone').map((classItem) => {
            const stats = classStats[classItem.id];
            return (
              <Card 
                key={classItem.id}
                className="cursor-pointer hover:bg-card/90 transition-all duration-300 border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:scale-105"
                onClick={() => handleClassSelect(classItem.id)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-card-foreground text-xl text-center font-bold">
                    {classItem.display_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="secondary" className="text-sm font-medium">
                      <BookOpen className="h-3 w-3 mr-1" />
                      {stats?.count || 0} {language === 'fr' ? 'épreuves' : 'papers'}
                    </Badge>
                  </div>
                  
                  {stats && stats.subjects.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {stats.subjects.length} {language === 'fr' ? 'matières' : 'subjects'}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {stats.subjects.slice(0, 3).map((subject, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                        {stats.subjects.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{stats.subjects.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {stats?.latestYear && (
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {language === 'fr' ? 'Jusqu\'à' : 'Up to'} {stats.latestYear}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Anglophone Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-semibold text-foreground">{t('anglophone')} Section</h2>
            <p className="text-muted-foreground">Form 1 to Upper Sixth • {language === 'fr' ? 'Système anglais' : 'English system'}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {classes.filter(c => c.section === 'anglophone').map((classItem) => {
            const stats = classStats[classItem.id];
            return (
              <Card 
                key={classItem.id}
                className="cursor-pointer hover:bg-card/90 transition-all duration-300 border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:scale-105"
                onClick={() => handleClassSelect(classItem.id)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-card-foreground text-xl text-center font-bold">
                    {classItem.display_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="secondary" className="text-sm font-medium">
                      <BookOpen className="h-3 w-3 mr-1" />
                      {stats?.count || 0} {language === 'fr' ? 'épreuves' : 'papers'}
                    </Badge>
                  </div>
                  
                  {stats && stats.subjects.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {stats.subjects.length} {language === 'fr' ? 'matières' : 'subjects'}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {stats.subjects.slice(0, 3).map((subject, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                        {stats.subjects.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{stats.subjects.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {stats?.latestYear && (
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {language === 'fr' ? 'Jusqu\'à' : 'Up to'} {stats.latestYear}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderExams = () => {
    const groupedExams = groupExamsByClass(filteredExams);
    
    return (
      <div className="min-h-screen space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            {selectedSection === 'francophone' 
              ? t('francophone') 
              : selectedSection === 'anglophone' 
                ? t('anglophone') 
                : 'All Exams'
            }
          </h1>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t('search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">{t('loading')}</p>
          </div>
        ) : Object.keys(groupedExams).length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">{t('no_exams')}</p>
          </div>
        ) : (
          <div className="space-y-12 pb-16">
            {classes
              .filter(classItem => groupedExams[classItem.id])
              .map(classItem => (
                <div key={classItem.id} className="space-y-6">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-semibold text-foreground">{classItem.display_name}</h2>
                    <Badge variant="secondary" className="text-sm font-medium">
                      {groupedExams[classItem.id].length} {language === 'fr' ? 'épreuves' : 'exams'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedExams[classItem.id].map((exam) => (
                      <Card key={exam.id} className="border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-all duration-300 hover:shadow-lg">
                        <CardHeader>
                          <CardTitle className="text-card-foreground text-lg line-clamp-2">
                            {exam.title}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <span>{exam.subject}</span>
                            {exam.year && (
                              <>
                                <span>•</span>
                                <span>{exam.year}</span>
                              </>
                            )}
                            {exam.period && (
                              <>
                                <span>•</span>
                                <span>{exam.period}</span>
                              </>
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {exam.description && (
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {exam.description}
                            </p>
                          )}
                          
                          <div className="flex flex-col gap-2">
                            <Button size="sm" variant="outline" className="flex items-center gap-2 justify-start" asChild>
                              <Link to={`/exam/${exam.id}?mode=preview`}>
                                <FileText className="h-4 w-4" />
                                {language === 'fr' ? 'Aperçu questions' : 'Preview Questions'}
                              </Link>
                            </Button>
                            <Button size="sm" className="flex items-center gap-2 justify-start" asChild>
                              <Link to={`/exam/${exam.id}?mode=evaluation`}>
                                <Clock className="h-4 w-4" />
                                {language === 'fr' ? 'Évaluation' : 'Evaluation'}
                              </Link>
                            </Button>
                            <Button size="sm" variant="secondary" className="flex items-center gap-2 justify-start" asChild>
                              <Link to={`/exam/${exam.id}?mode=correction`}>
                                <CheckCircle className="h-4 w-4" />
                                {language === 'fr' ? 'Voir correction' : 'View Correction'}
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetchClasses();
    fetchClassStats();
  }, []);

  return (
    <div className="bg-gradient-subtle min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {currentView === 'sections' && renderSections()}
        {currentView === 'exams' && renderExams()}
      </div>
    </div>
  );
}