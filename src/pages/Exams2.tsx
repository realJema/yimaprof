import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X, Clock, FileText, Building2, BookOpen, GraduationCap, ChevronLeft, ChevronRight, Filter, SlidersHorizontal, AlertCircle, ArrowRight, Sparkles, Lock, Crown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { anonymizeSchoolName, matchesSchoolSearch } from '@/lib/schoolAnonymizer';

interface Exam {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  visibility: string; // 'public' | 'free'
  created_at: string;
  subject: {
    id: string;
    name: string;
    name_en: string | null;
    name_fr: string | null;
  } | null;
  academic_year: {
    id: string;
    year_label: string;
  } | null;
  exam_type: {
    id: string;
    name: string;
    name_en: string | null;
    name_fr: string | null;
  } | null;
  period: {
    id: string;
    name: string;
    name_en: string | null;
    name_fr: string | null;
  } | null;
  duration: {
    id: string;
    minutes: number;
    display_label: string;
  } | null;
  establishment: {
    id: string;
    name: string;
  } | null;
  class: {
    id: string;
    name: string;
    display_name: string;
    section: string;
  } | null;
  series: {
    id: string;
    code: string;
    name: string;
    name_en: string | null;
    name_fr: string | null;
  } | null;
}

// Subject colors for visual variety
const SUBJECT_COLORS: Record<string, string> = {
  'Mathématiques': 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
  'Mathematics': 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
  'Physique': 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
  'Physics': 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
  'Chimie': 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
  'Chemistry': 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
  'Français': 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800',
  'French': 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800',
  'Anglais': 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
  'English': 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
  'Histoire': 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',
  'History': 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',
  'Géographie': 'bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800',
  'Geography': 'bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800',
  'Philosophie': 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800',
  'Philosophy': 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800',
  'SVT': 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
  'Biology': 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
};

const getSubjectColor = (subjectName: string | undefined) => {
  if (!subjectName) return 'bg-card border-border';
  return SUBJECT_COLORS[subjectName] || 'bg-card border-border';
};

const ITEMS_PER_PAGE = 12;

const Exams2 = () => {
  const { language } = useLanguage();
  const { hasActiveSubscription, subscription } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [lockedDialogOpen, setLockedDialogOpen] = useState(false);

  // URL parameter helpers
  const getParamArray = useCallback((key: string): string[] => {
    const value = searchParams.get(key);
    return value ? value.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const setParam = useCallback((key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Reset page when filters change
    if (key !== 'page') {
      newParams.delete('page');
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const setParamArray = useCallback((key: string, values: string[]) => {
    const newParams = new URLSearchParams(searchParams);
    if (values.length > 0) {
      newParams.set(key, values.join(','));
    } else {
      newParams.delete(key);
    }
    // Reset page when filters change
    newParams.delete('page');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Derived filter state from URL
  const selectedSystem = searchParams.get('system') || 'all';
  const selectedClasses = useMemo(() => getParamArray('class'), [getParamArray]);
  const selectedSubjects = useMemo(() => getParamArray('subject'), [getParamArray]);
  const selectedSeries = useMemo(() => getParamArray('series'), [getParamArray]);
  const selectedSchools = useMemo(() => getParamArray('school'), [getParamArray]);
  const selectedYear = searchParams.get('year') || 'all';
  const selectedExamType = searchParams.get('type') || 'all';
  const selectedPeriod = searchParams.get('period') || 'all';
  const sortBy = searchParams.get('sort') || 'newest';
  const searchTerm = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch subscription plan classes to determine accessible content
  const { data: subscriptionPlanClasses } = useQuery({
    queryKey: ['subscription-plan-classes', subscription?.plan_id],
    queryFn: async () => {
      if (!subscription?.plan_id) return [];
      const { data, error } = await supabase
        .from('subscription_plan_classes')
        .select('class_id')
        .eq('subscription_plan_id', subscription.plan_id);
      if (error) throw error;
      return data.map(item => item.class_id);
    },
    enabled: !!subscription?.plan_id
  });

  // Fetch all exams (public and free)
  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ['all-exams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exams').select(`
          id, title, description, is_published, visibility, created_at,
          subject:subjects(id, name, name_en, name_fr),
          academic_year:academic_years(id, year_label),
          exam_type:exam_types(id, name, name_en, name_fr),
          period:periods(id, name, name_en, name_fr),
          duration:durations(id, minutes, display_label),
          establishment:establishments(id, name),
          class:classes(id, name, display_name, section),
          series:series(id, code, name, name_en, name_fr)
        `)
        .eq('is_published', true)
        .in('visibility', ['public', 'free'])
        .order('created_at', { ascending: false })
        .range(0, 99999);
      if (error) throw error;
      return data as unknown as Exam[];
    }
  });

  // Fetch filter options
  const {
    data: schools
  } = useQuery({
    queryKey: ['establishments'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('establishments').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });
  const {
    data: classes
  } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('classes').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });
  const {
    data: subjects
  } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('subjects').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    }
  });
  const {
    data: academicYears
  } = useQuery({
    queryKey: ['academic_years'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('academic_years').select('*').eq('is_active', true).order('start_year', {
        ascending: false
      });
      if (error) throw error;
      return data;
    }
  });
  const {
    data: examTypes
  } = useQuery({
    queryKey: ['exam_types'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('exam_types').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });
  const {
    data: periods
  } = useQuery({
    queryKey: ['periods'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('periods').select('*').eq('is_active', true).order('order_number');
      if (error) throw error;
      return data;
    }
  });

  // Fetch series
  const {
    data: series
  } = useQuery({
    queryKey: ['series'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('series').select('*').eq('is_active', true).order('order_number');
      if (error) throw error;
      return data;
    }
  });

  // Get localized name helper
  const getLocalizedName = (item: {
    name: string;
    name_en?: string | null;
    name_fr?: string | null;
  } | null) => {
    if (!item) return '';
    if (language === 'en' && item.name_en) return item.name_en;
    if (language === 'fr' && item.name_fr) return item.name_fr;
    return item.name;
  };

  // Determine available systems based on subscription
  const availableSystems = useMemo(() => {
    if (!hasActiveSubscription || !subscriptionPlanClasses || !classes) {
      return { francophone: false, anglophone: false, hasMultiple: false };
    }
    const accessibleClasses = classes.filter(cls => subscriptionPlanClasses.includes(cls.id));
    const hasFrancophone = accessibleClasses.some(cls => cls.section === 'francophone');
    const hasAnglophone = accessibleClasses.some(cls => cls.section === 'anglophone');
    return {
      francophone: hasFrancophone,
      anglophone: hasAnglophone,
      hasMultiple: hasFrancophone && hasAnglophone
    };
  }, [hasActiveSubscription, subscriptionPlanClasses, classes]);

  // Auto-select system if user only has access to one
  useMemo(() => {
    if (!hasActiveSubscription) return;
    if (availableSystems.hasMultiple) return; // User has both, keep current selection
    if (availableSystems.francophone && selectedSystem !== 'francophone') {
      setParam('system', 'francophone');
    } else if (availableSystems.anglophone && selectedSystem !== 'anglophone') {
      setParam('system', 'anglophone');
    }
  }, [availableSystems, hasActiveSubscription, selectedSystem, setParam]);

  // Filter exams based on subscription access or free visibility
  const accessibleExams = useMemo(() => {
    if (!exams) return [];

    // Non-subscribers: see ALL exams (locked ones included so they can browse)
    if (!hasActiveSubscription) {
      return exams;
    }

    // Subscribers without plan classes loaded yet: show free + all (will refine)
    if (!subscriptionPlanClasses) {
      return exams;
    }

    // Subscribers: free exams + exams from their plan classes
    return exams.filter(exam => {
      if (exam.visibility === 'free') return true;
      if (!exam.class?.id) return false;
      return subscriptionPlanClasses.includes(exam.class.id);
    });
  }, [exams, hasActiveSubscription, subscriptionPlanClasses]);

  // Compute the 10 fixed "free preview" exams for non-subscribers:
  // 2 most recent per class across Terminale, Première, Troisième, Form 5, Upper Sixth.
  const FREE_PREVIEW_CLASS_NAMES = ['class_tle', 'class_1ere', 'class_3e', 'form_5', 'upper_sixth'];
  const freePreviewIds = useMemo(() => {
    if (!exams) return new Set<string>();
    const ids = new Set<string>();
    for (const className of FREE_PREVIEW_CLASS_NAMES) {
      const classExams = exams
        .filter(e => e.class?.name === className)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2);
      classExams.forEach(e => ids.add(e.id));
    }
    // Also include any exam explicitly marked as 'free' in DB
    exams.filter(e => e.visibility === 'free').forEach(e => ids.add(e.id));
    return ids;
  }, [exams]);

  const isExamUnlocked = useCallback((exam: Exam) => {
    if (hasActiveSubscription) return true;
    return freePreviewIds.has(exam.id);
  }, [hasActiveSubscription, freePreviewIds]);

  // Filter exams with all filters applied
  const filteredExams = useMemo(() => {
    return accessibleExams.filter(exam => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = exam.title.toLowerCase().includes(search) || exam.description?.toLowerCase().includes(search) || getLocalizedName(exam.subject)?.toLowerCase().includes(search) || exam.establishment?.name.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      if (selectedSchools.length > 0 && exam.establishment) {
        if (!selectedSchools.includes(exam.establishment.id)) return false;
      } else if (selectedSchools.length > 0 && !exam.establishment) {
        return false;
      }
      if (selectedClasses.length > 0 && exam.class) {
        if (!selectedClasses.includes(exam.class.id)) return false;
      } else if (selectedClasses.length > 0 && !exam.class) {
        return false;
      }
      if (selectedSubjects.length > 0 && exam.subject) {
        if (!selectedSubjects.includes(exam.subject.id)) return false;
      } else if (selectedSubjects.length > 0 && !exam.subject) {
        return false;
      }
      // Series filter
      if (selectedSeries.length > 0) {
        if (exam.series) {
          if (!selectedSeries.includes(exam.series.id)) return false;
        } else {
          return false;
        }
      }
      if (selectedYear !== 'all' && exam.academic_year?.id !== selectedYear) return false;
      if (selectedExamType !== 'all' && exam.exam_type?.id !== selectedExamType) return false;
      if (selectedPeriod !== 'all' && exam.period?.id !== selectedPeriod) return false;
      if (selectedSystem !== 'all' && exam.class) {
        if (selectedSystem === 'francophone' && exam.class.section !== 'francophone') return false;
        if (selectedSystem === 'anglophone' && exam.class.section !== 'anglophone') return false;
      }
      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }, [accessibleExams, searchTerm, selectedSchools, selectedClasses, selectedSubjects, selectedSeries, selectedYear, selectedExamType, selectedPeriod, selectedSystem, sortBy, language]);

  // Pagination
  const totalPages = Math.ceil(filteredExams.length / ITEMS_PER_PAGE);
  const paginatedExams = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredExams.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredExams, currentPage]);

  // Page reset is now handled by setParam and setParamArray automatically

  // Count exams per filter option (filtered by selected system and accessible exams)
  const getFilterCounts = useMemo(() => {
    const counts = {
      schools: {} as Record<string, number>,
      classes: {} as Record<string, number>,
      subjects: {} as Record<string, number>,
      series: {} as Record<string, number>
    };
    // Only count accessible exams that match the selected system
    const systemFilteredExams = accessibleExams.filter(exam => {
      if (selectedSystem === 'all') return true;
      if (!exam.class) return false;
      return exam.class.section === selectedSystem;
    });
    systemFilteredExams.forEach(exam => {
      if (exam.establishment) counts.schools[exam.establishment.id] = (counts.schools[exam.establishment.id] || 0) + 1;
      if (exam.class) counts.classes[exam.class.id] = (counts.classes[exam.class.id] || 0) + 1;
      if (exam.subject) counts.subjects[exam.subject.id] = (counts.subjects[exam.subject.id] || 0) + 1;
      if (exam.series) counts.series[exam.series.id] = (counts.series[exam.series.id] || 0) + 1;
    });
    return counts;
  }, [accessibleExams, selectedSystem]);

  // Filter classes based on selected system AND subscription access
  const filteredClasses = useMemo(() => {
    if (!classes) return [];
    let accessibleClasses = hasActiveSubscription && subscriptionPlanClasses
      ? classes.filter(cls => subscriptionPlanClasses.includes(cls.id))
      : classes;
    if (selectedSystem !== 'all') {
      accessibleClasses = accessibleClasses.filter(cls => cls.section === selectedSystem);
    }
    return accessibleClasses;
  }, [classes, subscriptionPlanClasses, selectedSystem, hasActiveSubscription]);

  // Filter subjects based on accessible exams and selected system
  const filteredSubjects = useMemo(() => {
    if (!subjects) return [];
    // Get subjects that have accessible exams in the selected system
    const subjectIds = new Set(
      accessibleExams
        .filter(exam => {
          if (selectedSystem === 'all') return true;
          return exam.class?.section === selectedSystem;
        })
        .filter(exam => exam.subject)
        .map(exam => exam.subject!.id)
    );
    
    // Filter subjects by both having exams AND matching the selected system
    return subjects.filter(subject => {
      // Must have accessible exams
      if (!subjectIds.has(subject.id)) return false;
      
      // If a system is selected, filter by subject's system field
      if (selectedSystem !== 'all') {
        const subjectSystem = (subject as any).system;
        // Show shared subjects + system-specific subjects
        if (subjectSystem && subjectSystem !== 'shared' && subjectSystem !== selectedSystem) {
          return false;
        }
      }
      
      return true;
    });
  }, [subjects, accessibleExams, selectedSystem]);

  // Filter series based on selected system
  const filteredSeries = useMemo(() => {
    if (!series) return [];
    return series.filter(s => {
      if (s.system === 'general') return true;
      if (selectedSystem === 'all') return true;
      return s.system === selectedSystem;
    });
  }, [series, selectedSystem]);

  const activeFiltersCount = selectedSchools.length + selectedClasses.length + selectedSubjects.length + selectedSeries.length + (selectedYear !== 'all' ? 1 : 0) + (selectedExamType !== 'all' ? 1 : 0) + (selectedPeriod !== 'all' ? 1 : 0);
  
  const clearAllFilters = useCallback(() => {
    const newParams = new URLSearchParams();
    // Preserve system if user only has one
    if (!availableSystems.hasMultiple && selectedSystem !== 'all') {
      newParams.set('system', selectedSystem);
    }
    setSearchParams(newParams, { replace: true });
  }, [availableSystems.hasMultiple, selectedSystem, setSearchParams]);

  const toggleSchool = useCallback((id: string) => {
    const current = getParamArray('school');
    const updated = current.includes(id) ? current.filter(s => s !== id) : [...current, id];
    setParamArray('school', updated);
  }, [getParamArray, setParamArray]);

  const toggleClass = useCallback((id: string) => {
    const current = getParamArray('class');
    const updated = current.includes(id) ? current.filter(c => c !== id) : [...current, id];
    setParamArray('class', updated);
  }, [getParamArray, setParamArray]);

  const toggleSubject = useCallback((id: string) => {
    const current = getParamArray('subject');
    const updated = current.includes(id) ? current.filter(s => s !== id) : [...current, id];
    setParamArray('subject', updated);
  }, [getParamArray, setParamArray]);

  const toggleSeries = useCallback((id: string) => {
    const current = getParamArray('series');
    const updated = current.includes(id) ? current.filter(s => s !== id) : [...current, id];
    setParamArray('series', updated);
  }, [getParamArray, setParamArray]);

  // Multi-select popover component
  const MultiSelectPopover = ({
    label,
    icon: Icon,
    items,
    selectedItems,
    onToggle,
    counts,
    getItemName
  }: {
    label: string;
    icon: React.ElementType;
    items: any[] | undefined;
    selectedItems: string[];
    onToggle: (id: string) => void;
    counts: Record<string, number>;
    getItemName: (item: any) => string;
  }) => <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between h-9">
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {label}
          </span>
          {selectedItems.length > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {selectedItems.length}
            </Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <ScrollArea className="h-[250px]">
          <div className="p-2 space-y-1">
            {items?.map(item => <label key={item.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md">
                <Checkbox checked={selectedItems.includes(item.id)} onCheckedChange={() => onToggle(item.id)} />
                <span className="text-sm flex-1 truncate">{getItemName(item)}</span>
                <span className="text-xs text-muted-foreground">{counts[item.id] || 0}</span>
              </label>)}
          </div>
        </ScrollArea>
        {selectedItems.length > 0 && <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => selectedItems.forEach(id => onToggle(id))}>
              {language === 'fr' ? 'Effacer' : 'Clear'}
            </Button>
          </div>}
      </PopoverContent>
    </Popover>;

  // Sidebar filters content (without system and school)
  const FiltersContent = () => <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={language === 'fr' ? 'Rechercher...' : 'Search...'} value={searchTerm} onChange={e => setParam('search', e.target.value || null)} className="pl-10 h-9" />
      </div>

      <Separator />

      {/* Classes - filtered by system */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{language === 'fr' ? 'Classes' : 'Classes'}</label>
        <MultiSelectPopover label={language === 'fr' ? 'Sélectionner' : 'Select'} icon={GraduationCap} items={filteredClasses} selectedItems={selectedClasses} onToggle={toggleClass} counts={getFilterCounts.classes} getItemName={item => item.display_name} />
      </div>

      {/* Subjects - filtered by system */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{language === 'fr' ? 'Matières' : 'Subjects'}</label>
        <MultiSelectPopover label={language === 'fr' ? 'Sélectionner' : 'Select'} icon={BookOpen} items={filteredSubjects} selectedItems={selectedSubjects} onToggle={toggleSubject} counts={getFilterCounts.subjects} getItemName={item => getLocalizedName(item)} />
      </div>

      {/* Series - filtered by system */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{language === 'fr' ? 'Série / Filière' : 'Series / Track'}</label>
        <MultiSelectPopover label={language === 'fr' ? 'Sélectionner' : 'Select'} icon={GraduationCap} items={filteredSeries} selectedItems={selectedSeries} onToggle={toggleSeries} counts={getFilterCounts.series} getItemName={item => getLocalizedName(item)} />
      </div>

      <Separator />

      {/* Year */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{language === 'fr' ? 'Année' : 'Year'}</label>
        <Select value={selectedYear} onValueChange={(value) => setParam('year', value)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'fr' ? 'Toutes' : 'All'}</SelectItem>
            {academicYears?.map(year => <SelectItem key={year.id} value={year.id}>{year.year_label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Exam Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{language === 'fr' ? "Type d'épreuves" : 'Exam Type'}</label>
        <Select value={selectedExamType} onValueChange={(value) => setParam('type', value)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'fr' ? 'Tous' : 'All'}</SelectItem>
            {examTypes?.map(type => <SelectItem key={type.id} value={type.id}>{getLocalizedName(type)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Period */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{language === 'fr' ? 'Période' : 'Period'}</label>
        <Select value={selectedPeriod} onValueChange={(value) => setParam('period', value)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'fr' ? 'Toutes' : 'All'}</SelectItem>
            {periods?.map(period => <SelectItem key={period.id} value={period.id}>{getLocalizedName(period)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {activeFiltersCount > 0 && <>
          <Separator />
          <Button variant="outline" size="sm" className="w-full" onClick={clearAllFilters}>
            <X className="h-4 w-4 mr-2" />
            {language === 'fr' ? 'Effacer les filtres' : 'Clear filters'}
          </Button>
        </>}
    </div>;
  return <div className="min-h-screen bg-background">
      {/* Top Header with System and School */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            {/* Title and System Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-foreground">
                  {language === 'fr' ? 'Parcourir les Épreuves' : 'Browse Exams'}
                </h1>
                {!hasActiveSubscription && (
                  <Badge variant="outline" className="text-xs">
                    {language === 'fr' ? 'Aperçu gratuit' : 'Free preview'}
                  </Badge>
                )}
              </div>
              
              {/* System Toggle - Only show available systems for subscribers */}
              {(hasActiveSubscription ? (availableSystems.francophone || availableSystems.anglophone) : true) && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {language === 'fr' ? 'Système:' : 'System:'}
                  </span>
                  <ToggleGroup type="single" value={selectedSystem} onValueChange={value => value && setParam('system', value)} className="bg-muted p-1 rounded-lg">
                    {(hasActiveSubscription ? availableSystems.hasMultiple : true) && (
                      <ToggleGroupItem value="all" className="px-4 data-[state=on]:bg-background data-[state=on]:shadow-sm">
                        {language === 'fr' ? 'Tous' : 'All'}
                      </ToggleGroupItem>
                    )}
                    {(hasActiveSubscription ? availableSystems.francophone : true) && (
                      <ToggleGroupItem value="francophone" className="px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        Francophone
                      </ToggleGroupItem>
                    )}
                    {(hasActiveSubscription ? availableSystems.anglophone : true) && (
                      <ToggleGroupItem value="anglophone" className="px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        Anglophone
                      </ToggleGroupItem>
                    )}
                  </ToggleGroup>
                </div>
              )}
            </div>

            {/* Exam count */}
            <p className="text-sm text-muted-foreground">
              {filteredExams.length} {language === 'fr' ? 'épreuve(s) trouvée(s)' : 'exam(s) found'}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Desktop Sidebar - filters available to everyone */}
          <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-32 bg-card rounded-lg border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    {language === 'fr' ? 'Filtres' : 'Filters'}
                  </h2>
                  {activeFiltersCount > 0 && <Badge variant="secondary">{activeFiltersCount}</Badge>}
                </div>
                <FiltersContent />
              </div>
            </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 gap-4">
              <div className="flex items-center gap-3">
                {/* Mobile Filter Button - available to everyone */}
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="lg:hidden">
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        {language === 'fr' ? 'Filtres' : 'Filters'}
                        {activeFiltersCount > 0 && <Badge variant="secondary" className="ml-2">{activeFiltersCount}</Badge>}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80">
                      <SheetHeader>
                        <SheetTitle>{language === 'fr' ? 'Filtres' : 'Filters'}</SheetTitle>
                      </SheetHeader>
                      <div className="mt-4">
                        <FiltersContent />
                      </div>
                    </SheetContent>
                  </Sheet>
              </div>

              {/* Sort - available to everyone */}
              <Select value={sortBy} onValueChange={(value) => setParam('sort', value)}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{language === 'fr' ? 'Plus récent' : 'Newest'}</SelectItem>
                    <SelectItem value="oldest">{language === 'fr' ? 'Plus ancien' : 'Oldest'}</SelectItem>
                    <SelectItem value="title">{language === 'fr' ? 'Titre' : 'Title'}</SelectItem>
                  </SelectContent>
                </Select>
            </div>

            {/* Active filters badges */}
            {(activeFiltersCount > 0 || selectedSchools.length > 0) && <div className="flex items-center gap-1.5 flex-wrap mb-4">
                {selectedSchools.map(id => {
              const school = schools?.find(s => s.id === id);
              return school && <Badge key={id} variant="secondary" className="gap-1 text-xs text-muted-foreground">
                      {anonymizeSchoolName(school)}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => toggleSchool(id)} />
                    </Badge>;
            })}
                {selectedClasses.map(id => {
              const cls = classes?.find(c => c.id === id);
              return cls && <Badge key={id} variant="secondary" className="gap-1 text-xs">
                      {cls.display_name}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => toggleClass(id)} />
                    </Badge>;
            })}
                {selectedSubjects.map(id => {
              const subject = subjects?.find(s => s.id === id);
              return subject && <Badge key={id} variant="secondary" className="gap-1 text-xs">
                      {getLocalizedName(subject)}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => toggleSubject(id)} />
                    </Badge>;
            })}
              </div>}

            {/* Show content based on subscription status */}
            {examsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(12)].map((_, i) => <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-3" />
                      <div className="flex gap-2 mb-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                      <Skeleton className="h-3 w-2/3" />
                    </CardContent>
                  </Card>)}
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {language === 'fr' ? 'Aucune épreuve trouvée' : 'No exams found'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {language === 'fr' ? 'Essayez de modifier vos filtres.' : 'Try adjusting your filters.'}
                </p>
                <Button variant="outline" onClick={clearAllFilters}>
                  {language === 'fr' ? 'Effacer les filtres' : 'Clear filters'}
                </Button>
              </div>
            ) : <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {paginatedExams.map(exam => {
                    const subjectName = getLocalizedName(exam.subject);
                    const cardColor = getSubjectColor(subjectName);
                    const unlocked = isExamUnlocked(exam);
                    const fromParam = encodeURIComponent(`/exams2?${searchParams.toString()}`);
                    const examUrl = `/exam/${exam.id}?from=${fromParam}${unlocked && !hasActiveSubscription ? '&freePreview=1' : ''}`;

                    const cardInner = (
                        <Card className={`h-full min-h-[160px] transition-all border-2 ${cardColor} ${unlocked ? 'hover:shadow-lg cursor-pointer group' : 'opacity-75 cursor-pointer hover:opacity-90 relative'}`}>
                          <CardContent className="p-4 flex flex-col h-full">
                            {!unlocked && (
                              <div className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-background/90 border border-border">
                                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                            )}
                            {/* Badges at top */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {unlocked && !hasActiveSubscription && (
                                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                                  {language === 'fr' ? 'Gratuit' : 'Free'}
                                </Badge>
                              )}
                              {exam.subject && (
                                <Badge variant="secondary" className="text-xs font-medium">
                                  {subjectName}
                                </Badge>
                              )}
                              {exam.series && (
                                <Badge variant="outline" className="text-xs font-medium bg-primary/5 text-primary border-primary/20">
                                  {language === 'fr' ? 'Série' : 'Series'} {exam.series.code}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-start justify-between gap-2 mb-2 flex-1">
                              <h3 className={`font-semibold text-foreground line-clamp-2 text-sm transition-colors ${unlocked ? 'group-hover:text-primary' : ''}`}>
                                {exam.title}
                              </h3>
                            </div>
                            
                            <p className="text-xs text-muted-foreground mb-3">
                              {exam.class?.display_name}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 mt-auto">
                              {exam.academic_year && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0">
                                  {exam.academic_year.year_label}
                                </Badge>
                              )}
                              {exam.duration && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0">
                                  <Clock className="h-3 w-3 mr-0.5" />
                                  {exam.duration.display_label}
                                </Badge>
                              )}
                            </div>

                            {exam.establishment && (
                              <p className="text-xs text-muted-foreground/70 truncate mt-2 pt-2 border-t border-border/50">
                                {anonymizeSchoolName(exam.establishment)}
                              </p>
                            )}

                            {/* Locked CTA for non-unlocked exams */}
                            {!unlocked && (
                              <div className="mt-3 pt-2 border-t border-dashed border-border/50">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Lock className="h-3 w-3" />
                                  <span className="font-medium">
                                    {language === 'fr' ? 'Réservé aux abonnés' : 'Subscribers only'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                    );

                    if (!unlocked) {
                      return (
                        <button
                          key={exam.id}
                          type="button"
                          onClick={() => setLockedDialogOpen(true)}
                          className="text-left"
                        >
                          {cardInner}
                        </button>
                      );
                    }

                    return (
                      <Link key={exam.id} to={examUrl}>
                        {cardInner}
                      </Link>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && <div className="flex items-center justify-center gap-2 mt-8">
                    <Button variant="outline" size="sm" onClick={() => setParam('page', String(Math.max(1, currentPage - 1)))} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({
                  length: totalPages
                }, (_, i) => i + 1).filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1).map((page, idx, arr) => {
                  const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                  return <div key={page} className="flex items-center gap-1">
                              {showEllipsisBefore && <span className="px-2 text-muted-foreground">...</span>}
                              <Button variant={currentPage === page ? "default" : "outline"} size="sm" className="w-9 h-9" onClick={() => setParam('page', String(page))}>
                                {page}
                              </Button>
                            </div>;
                })}
                    </div>

                    <Button variant="outline" size="sm" onClick={() => setParam('page', String(Math.min(totalPages, currentPage + 1)))} disabled={currentPage === totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>}

                <p className="text-center text-sm text-muted-foreground mt-4">
                  {language === 'fr' ? `Page ${currentPage} sur ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
                </p>

                {/* Prominent Subscribe CTA for non-subscribers - Below free papers */}
                {!hasActiveSubscription && (
                  <div className="mt-12 animate-fade-in">
                    <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10">
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                      <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                      
                      <CardContent className="relative py-10 px-6 sm:py-12 sm:px-10">
                        <div className="max-w-2xl mx-auto text-center space-y-6">
                          {/* Icon with animation */}
                          <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 hover-scale">
                            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                          </div>
                          
                          {/* Heading */}
                          <div className="space-y-2">
                            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                              {language === 'fr' 
                                ? 'Débloquez plus de 500 épreuves premium' 
                                : 'Unlock 500+ Premium Exams'}
                            </h2>
                            <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
                              {language === 'fr' 
                                ? 'Accédez à toutes les épreuves avec corrections complètes, mode évaluation et suivi de progression.'
                                : 'Access all exams with full solutions, evaluation mode, and progress tracking.'}
                            </p>
                          </div>
                          
                          {/* Features */}
                          <div className="flex flex-wrap justify-center gap-3 text-sm">
                            {[
                              { fr: 'Corrections détaillées', en: 'Detailed solutions' },
                              { fr: 'Mode évaluation', en: 'Evaluation mode' },
                              { fr: 'Suivi de progression', en: 'Progress tracking' },
                              { fr: 'Accès illimité', en: 'Unlimited access' }
                            ].map((feature, i) => (
                              <Badge 
                                key={i} 
                                variant="secondary" 
                                className="px-3 py-1.5 bg-primary/10 text-primary border-0 animate-fade-in"
                                style={{ animationDelay: `${i * 100}ms` }}
                              >
                                {language === 'fr' ? feature.fr : feature.en}
                              </Badge>
                            ))}
                          </div>
                          
                          {/* Price hint */}
                          <div className="text-sm text-muted-foreground">
                            {language === 'fr' ? 'À partir de' : 'Starting from'}{' '}
                            <span className="font-bold text-foreground text-lg">2 500 XAF</span>
                            <span className="text-muted-foreground">/mois</span>
                          </div>
                          
                          {/* CTA Buttons */}
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link to="/subscriptions">
                              <Button size="lg" className="gap-2 px-8 hover-scale shadow-lg shadow-primary/20">
                                <Sparkles className="h-5 w-5" />
                                {language === 'fr' ? 'S\'abonner maintenant' : 'Subscribe Now'}
                                <ArrowRight className="h-5 w-5" />
                              </Button>
                            </Link>
                            <Link to="/subscriptions">
                              <Button variant="outline" size="lg" className="gap-2">
                                {language === 'fr' ? 'Voir les forfaits' : 'View Plans'}
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>}
          </main>
        </div>
      </div>

      {/* Locked exam dialog for non-subscribers */}
      <Dialog open={lockedDialogOpen} onOpenChange={setLockedDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 p-3 rounded-full bg-primary/10">
              <Crown className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-center">
              {language === 'fr' ? 'Épreuve réservée aux abonnés' : 'Subscribers-only exam'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {language === 'fr'
                ? "Cette épreuve fait partie du contenu premium. Abonnez-vous pour accéder à plus de 500 épreuves avec corrections complètes."
                : 'This exam is part of premium content. Subscribe to access 500+ exams with full solutions.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setLockedDialogOpen(false)}>
              {language === 'fr' ? 'Plus tard' : 'Later'}
            </Button>
            <Link to="/subscriptions" onClick={() => setLockedDialogOpen(false)}>
              <Button className="gap-2">
                <Sparkles className="h-4 w-4" />
                {language === 'fr' ? "Voir les abonnements" : 'View subscriptions'}
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Exams2;