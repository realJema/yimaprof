import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Plus, Edit, Trash2, Eye, Search, Globe2, Languages, Shield, ArrowLeft, PanelLeftClose, PanelLeftOpen, CheckCircle2, Clock } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ExamPreviewDialog } from '@/components/admin/ExamPreviewDialog';
import { useExamFormData } from '@/hooks/useExamFormData';
import { useLanguage } from '@/contexts/LanguageContext';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface Exam {
  id: string;
  title: string;
  subject: string;
  year: number;
  exam_type: string;
  is_published: boolean;
  created_at: string;
  class_id: string;
  language: string;
  content?: any;
  subject_id?: string;
  exam_type_id?: string;
  academic_year_id?: string;
  period_id?: string;
  establishment_id?: string;
  classes?: {
    display_name: string;
    section: string;
  };
  subjects?: {
    name: string;
    name_en: string;
    name_fr: string;
  };
  exam_types?: {
    name: string;
    name_en: string;
    name_fr: string;
  };
  academic_years?: {
    year_label: string;
  };
  periods?: {
    name: string;
    name_en: string;
    name_fr: string;
  };
  establishments?: {
    name: string;
  };
}

interface Class {
  id: string;
  display_name: string;
  section: string;
}

export default function AdminExams() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const isMobile = useIsMobile();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  
  // URL-based filters
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Derived filter values from URL
  const searchQuery = searchParams.get('search') || '';
  const selectedYear = searchParams.get('year') || 'all';
  const selectedSubject = searchParams.get('subject') || 'all';
  const selectedClass = searchParams.get('class') || 'all';
  const selectedStatus = searchParams.get('status') || 'all';
  const selectedLanguage = (searchParams.get('lang') as 'all' | 'fr' | 'en') || 'all';
  const selectedEstablishment = searchParams.get('school') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  
  // UI-only state (not persisted in URL)
  const [sidebarVisible, setSidebarVisible] = useState(true);
  
  // Helper functions for URL param updates
  const setParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'all' && value !== '') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Reset page on filter change
    newParams.delete('page');
    setSearchParams(newParams, { replace: true });
  };

  const setPage = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    if (page > 1) {
      newParams.set('page', page.toString());
    } else {
      newParams.delete('page');
    }
    setSearchParams(newParams, { replace: true });
  };
  const itemsPerPage = 12;
  
  // Preview
  const [previewExam, setPreviewExam] = useState<Exam | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const formOptions = useExamFormData();

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  useEffect(() => {
    if (hasAccess) {
      fetchExams();
      fetchClasses();
    }
  }, [hasAccess]);

  const checkAdminAccess = async () => {
    try {
      // Check if user is admin
      const { data: isAdminData } = await supabase.rpc('is_admin', { user_id: user?.id });
      if (isAdminData === true) {
        setHasAccess(true);
        setCheckingAccess(false);
        return;
      }
      
      // Check if user is editor
      const { data: isEditorData } = await supabase.rpc('has_role', { 
        _user_id: user?.id,
        _role: 'editor'
      });
      if (isEditorData === true) {
        setHasAccess(true);
        setCheckingAccess(false);
        return;
      }
      
      setHasAccess(false);
    } catch (error) {
      setHasAccess(false);
    } finally {
      setCheckingAccess(false);
    }
  };

  const fetchExams = async () => {
    try {
      const PAGE_SIZE = 1000;
      let from = 0;
      let allExams: any[] = [];
      // Page through results since Supabase caps at 1000 rows per request
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from('exams')
          .select(`
            *,
            classes (display_name, section),
            subjects:subject_id (name, name_en, name_fr),
            exam_types:exam_type_id (name, name_en, name_fr),
            academic_years:academic_year_id (year_label),
            periods:period_id (name, name_en, name_fr),
            establishments:establishment_id (name)
          `)
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        const batch = data || [];
        allExams = allExams.concat(batch);
        if (batch.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      setExams(allExams as any);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast({ title: 'Error', description: 'Failed to fetch exams', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase.from('classes').select('*').order('display_name');
      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const filterExams = (examsList: Exam[]) => {
    return examsList.filter(exam => {
      const subjectName = exam.subjects 
        ? (language === 'fr' ? exam.subjects.name_fr || exam.subjects.name : exam.subjects.name_en || exam.subjects.name)
        : '';
      const yearLabel = exam.academic_years?.year_label || '';
      
      const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           subjectName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesYear = selectedYear === 'all' || yearLabel === selectedYear;
      const matchesSubject = selectedSubject === 'all' || subjectName === selectedSubject;
      const matchesClass = selectedClass === 'all' || exam.class_id === selectedClass;
      const matchesStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'published' && exam.is_published) || 
                           (selectedStatus === 'draft' && !exam.is_published);
      const matchesLang = selectedLanguage === 'all' || exam.language === selectedLanguage;
      const matchesEstablishment = selectedEstablishment === 'all' || 
                                   (selectedEstablishment === 'none' && !exam.establishment_id) ||
                                   exam.establishment_id === selectedEstablishment;
      
      return matchesSearch && matchesYear && matchesSubject && matchesClass && matchesStatus && matchesLang && matchesEstablishment;
    });
  };

  const uniqueYears = Array.from(new Set(exams.map(e => e.academic_years?.year_label).filter(Boolean))).sort((a, b) => {
    const yearA = parseInt((a as string).split('-')[0]);
    const yearB = parseInt((b as string).split('-')[0]);
    return yearB - yearA;
  });

  const uniqueSubjects = Array.from(new Set(exams.map(e => {
    const subject = e.subjects;
    return subject ? (language === 'fr' ? subject.name_fr || subject.name : subject.name_en || subject.name) : '';
  }).filter(Boolean))).sort();

  const handleDelete = async (exam: Exam) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;
    try {
      const { error } = await supabase.from('exams').delete().eq('id', exam.id);
      if (error) throw error;
      setExams(prev => prev.filter(e => e.id !== exam.id));
      toast({ title: 'Success', description: 'Exam deleted successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete exam', variant: 'destructive' });
    }
  };

  const getSubjectColor = (subjectName: string): string => {
    const subject = subjectName?.toLowerCase() || '';
    if (subject.includes('math') || subject.includes('mathématiques')) return 'subject-math';
    if (subject.includes('science')) return 'subject-science';
    if (subject.includes('english') || subject.includes('anglais')) return 'subject-english';
    if (subject.includes('french') || subject.includes('français')) return 'subject-french';
    if (subject.includes('history') || subject.includes('histoire')) return 'subject-history';
    if (subject.includes('geography') || subject.includes('géographie')) return 'subject-geography';
    if (subject.includes('physics') || subject.includes('physique')) return 'subject-physics';
    if (subject.includes('chemistry') || subject.includes('chimie')) return 'subject-chemistry';
    if (subject.includes('biology') || subject.includes('biologie') || subject.includes('svt')) return 'subject-biology';
    if (subject.includes('computer') || subject.includes('informatique') || subject.includes('ict')) return 'subject-computer';
    if (subject.includes('economics') || subject.includes('économie')) return 'subject-economics';
    return 'subject-default';
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const filteredExams = filterExams(exams);
  const totalPages = Math.ceil(filteredExams.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedExams = filteredExams.slice(startIndex, startIndex + itemsPerPage);

  const francophones = exams.filter(e => e.language === 'fr');
  const anglophones = exams.filter(e => e.language === 'en');

  const renderExamCard = (exam: Exam) => {
    const subjectName = language === 'fr' ? exam.subjects?.name_fr : exam.subjects?.name_en;
    const examTypeName = language === 'fr' ? exam.exam_types?.name_fr : exam.exam_types?.name_en;
    const periodName = language === 'fr' ? exam.periods?.name_fr : exam.periods?.name_en;
    const yearLabel = exam.academic_years?.year_label;
    
    // Generate background color based on subject
    const getCardBgColor = (subject: string) => {
      const s = subject?.toLowerCase() || '';
      if (s.includes('math') || s.includes('mathématiques')) return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
      if (s.includes('physics') || s.includes('physique')) return 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800';
      if (s.includes('chemistry') || s.includes('chimie')) return 'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800';
      if (s.includes('biology') || s.includes('biologie') || s.includes('svt')) return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
      if (s.includes('english') || s.includes('anglais')) return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
      if (s.includes('french') || s.includes('français')) return 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800';
      if (s.includes('history') || s.includes('histoire')) return 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800';
      if (s.includes('geography') || s.includes('géographie')) return 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800';
      if (s.includes('computer') || s.includes('informatique') || s.includes('ict')) return 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800';
      if (s.includes('economics') || s.includes('économie')) return 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800';
      if (s.includes('science')) return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
      return 'bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800';
    };

    const cardBgColor = getCardBgColor(subjectName || '');
    
    return (
      <Card key={exam.id} className={`group relative overflow-hidden ${cardBgColor} hover:shadow-lg transition-all duration-300 h-full flex flex-col`}>
        <CardContent className="p-4 flex flex-col h-full gap-3">
        {/* Title with Published icon */}
          <div className="flex items-start gap-2">
            <h3 className="font-semibold text-sm line-clamp-2 leading-tight text-foreground group-hover:text-primary transition-colors flex-1">
              {exam.title}
            </h3>
            {exam.is_published ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            )}
          </div>

          {/* Subject & Year */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm text-foreground truncate">
              {subjectName || 'No subject'}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {yearLabel || 'N/A'}
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-1.5 text-xs text-muted-foreground">
            {exam.classes && (
              <div className="flex items-center justify-between">
                <span>{t('class_filter')}:</span>
                <span className="font-medium text-foreground">{exam.classes.display_name}</span>
              </div>
            )}
            {examTypeName && (
              <div className="flex items-center justify-between gap-2">
                <span className="flex-shrink-0">{language === 'fr' ? "Type d'épreuve:" : 'Exam type:'}</span>
                <span className="font-medium text-foreground truncate" title={examTypeName}>{examTypeName}</span>
              </div>
            )}
            {periodName && (
              <div className="flex items-center justify-between">
                <span>{t('periods')}:</span>
                <span className="font-medium text-foreground">{periodName}</span>
              </div>
            )}
            {exam.establishments && (
              <div className="flex items-center justify-between">
                <span>{t('school_filter')}:</span>
                <span className="font-medium text-foreground truncate max-w-[120px]" title={exam.establishments.name}>
                  {exam.establishments.name}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-border/30">
            <Link to={`/admin/exam/edit/${exam.id}?from=${encodeURIComponent(`/admin/exams?${searchParams.toString()}`)}`} className="block">
              <Button variant="outline" size="sm" className="w-full h-8 hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30 dark:hover:text-blue-400 transition-colors">
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30 dark:hover:text-green-400 transition-colors"
              onClick={() => { setPreviewExam(exam); setShowPreview(true); }}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleDelete(exam)} 
              className="h-8 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30 dark:hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const FiltersContent = () => (
    <div className="space-y-5">
      {/* Search */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('search')}</Label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('search_exams')}
            value={searchQuery}
            onChange={(e) => setParam('search', e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('language_filter')}</Label>
        <ToggleGroup 
          type="single" 
          value={selectedLanguage} 
          onValueChange={(v) => { if (v) setParam('lang', v); }}
          className="flex w-full"
        >
          <ToggleGroupItem value="all" className="flex-1 text-xs">{t('all')}</ToggleGroupItem>
          <ToggleGroupItem value="fr" className="flex-1 text-xs gap-1">
            <Globe2 className="h-3 w-3" /> FR
          </ToggleGroupItem>
          <ToggleGroupItem value="en" className="flex-1 text-xs gap-1">
            <Languages className="h-3 w-3" /> EN
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Year */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('year_filter')}</Label>
        <Select value={selectedYear} onValueChange={(v) => setParam('year', v)}>
          <SelectTrigger>
            <SelectValue placeholder={t('all_years')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_years')}</SelectItem>
            {uniqueYears.map(year => (
              <SelectItem key={year} value={year!.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('subject_filter')}</Label>
        <Select value={selectedSubject} onValueChange={(v) => setParam('subject', v)}>
          <SelectTrigger>
            <SelectValue placeholder={t('all_subjects')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_subjects')}</SelectItem>
            {uniqueSubjects.map(subject => (
              <SelectItem key={subject} value={subject}>{subject}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Class */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('class_filter')}</Label>
        <Select value={selectedClass} onValueChange={(v) => setParam('class', v)}>
          <SelectTrigger>
            <SelectValue placeholder={t('all_classes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_classes')}</SelectItem>
            {classes.map(cls => (
              <SelectItem key={cls.id} value={cls.id}>{cls.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* School */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('school_filter')}</Label>
        <Select value={selectedEstablishment} onValueChange={(v) => setParam('school', v)}>
          <SelectTrigger>
            <SelectValue placeholder={t('all_schools')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_schools')}</SelectItem>
            <SelectItem value="none">{t('no_school_set')}</SelectItem>
            {formOptions.establishments?.map(est => (
              <SelectItem key={est.id} value={est.id}>{est.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('status_filter')}</Label>
        <Select value={selectedStatus} onValueChange={(v) => setParam('status', v)}>
          <SelectTrigger>
            <SelectValue placeholder={t('all_status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_status')}</SelectItem>
            <SelectItem value="published">{t('published')}</SelectItem>
            <SelectItem value="draft">{t('draft')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      <Button variant="outline" className="w-full" onClick={clearFilters}>
        {t('clear_filters')}
      </Button>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{t('please_sign_in_page')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('access_denied')}</h2>
            <p className="text-muted-foreground">{t('no_admin_privileges')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <ExamPreviewDialog 
        exam={previewExam} 
        open={showPreview} 
        onOpenChange={setShowPreview}
        onUpdated={() => {
          fetchExams();
          setShowPreview(false);
        }}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('back_to_admin')}
                  </Link>
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {t('exam_management')}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {filteredExams.length} {t('exams')} • {francophones.length} FR • {anglophones.length} EN
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Mobile filter trigger */}
                {isMobile && (
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Search className="h-4 w-4 mr-2" />
                        {t('filters')}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80">
                      <SheetHeader>
                        <SheetTitle>{t('filters')}</SheetTitle>
                      </SheetHeader>
                      <div className="mt-6">
                        <FiltersContent />
                      </div>
                    </SheetContent>
                  </Sheet>
                )}
                
                <Link to="/admin/exam/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('add_exam')}</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4">
          {/* Desktop sidebar toggle */}
          {!isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarVisible(!sidebarVisible)}
              className="hidden lg:flex fixed left-4 top-32 z-50 rounded-full shadow-lg bg-card hover:bg-muted border-2 transition-all duration-300 gap-2 px-4"
              style={{ left: sidebarVisible ? '17rem' : '1rem' }}
            >
              {sidebarVisible ? (
                <>
                  <PanelLeftClose className="h-4 w-4" />
                  <span className="text-xs font-medium">{t('hide_filters')}</span>
                </>
              ) : (
                <>
                  <PanelLeftOpen className="h-4 w-4" />
                  <span className="text-xs font-medium">{t('filters')}</span>
                </>
              )}
            </Button>
          )}

          <div className="flex gap-6">
            {/* Left Sidebar - Filters (Desktop) */}
            {!isMobile && sidebarVisible && (
              <div className="hidden lg:block w-64 shrink-0">
                <Card className="sticky top-24 border-border/50">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-4">{t('filters')}</h3>
                    <FiltersContent />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4 space-y-3">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredExams.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('no_exams_found')}</p>
                    <Button variant="outline" className="mt-4" onClick={clearFilters}>
                      {t('clear_filters')}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {paginatedExams.map(renderExamCard)}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPage(Math.max(1, currentPage - 1))} 
                        disabled={currentPage === 1}
                      >
                        {t('previous')}
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                          .map((page, idx, arr) => {
                            const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                            return (
                              <div key={page} className="flex items-center gap-1">
                                {showEllipsis && <span className="px-2 text-muted-foreground">...</span>}
                                <Button
                                  variant={currentPage === page ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setPage(page)}
                                  className="w-8 h-8 p-0"
                                >
                                  {page}
                                </Button>
                              </div>
                            );
                          })}
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPage(Math.min(totalPages, currentPage + 1))} 
                        disabled={currentPage === totalPages}
                      >
                        {t('next')}
                      </Button>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground text-center">
                    {t('showing_exams')} {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredExams.length)} {t('of_exams')} {filteredExams.length} {t('exams')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
