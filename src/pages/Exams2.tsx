import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Link } from 'react-router-dom';
import { 
  Search, Filter, X, Clock, Calendar, FileText, 
  Building2, BookOpen, GraduationCap, ChevronDown, ChevronUp,
  SlidersHorizontal, Lock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

interface Exam {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  visibility: string;
  created_at: string;
  subject: { id: string; name: string; name_en: string | null; name_fr: string | null } | null;
  academic_year: { id: string; year_label: string } | null;
  exam_type: { id: string; name: string; name_en: string | null; name_fr: string | null } | null;
  period: { id: string; name: string; name_en: string | null; name_fr: string | null } | null;
  duration: { id: string; minutes: number; display_label: string } | null;
  establishment: { id: string; name: string } | null;
  class: { id: string; name: string; display_name: string; section: string } | null;
}

interface FilterOption {
  id: string;
  name: string;
  count: number;
}

const Exams2 = () => {
  const { language } = useLanguage();
  const { hasActiveSubscription } = useSubscription();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedExamType, setSelectedExamType] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedSystem, setSelectedSystem] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  
  // Collapsible states
  const [schoolsOpen, setSchoolsOpen] = useState(true);
  const [classesOpen, setClassesOpen] = useState(true);
  const [subjectsOpen, setSubjectsOpen] = useState(true);
  
  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch all exams
  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ['all-exams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          id, title, description, is_published, visibility, created_at,
          subject:subjects(id, name, name_en, name_fr),
          academic_year:academic_years(id, year_label),
          exam_type:exam_types(id, name, name_en, name_fr),
          period:periods(id, name, name_en, name_fr),
          duration:durations(id, minutes, display_label),
          establishment:establishments(id, name),
          class:classes(id, name, display_name, section)
        `)
        .eq('is_published', true)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as Exam[];
    }
  });

  // Fetch filter options
  const { data: schools } = useQuery({
    queryKey: ['establishments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('establishments').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: academicYears } = useQuery({
    queryKey: ['academic_years'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_years').select('*').eq('is_active', true).order('start_year', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: examTypes } = useQuery({
    queryKey: ['exam_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exam_types').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const { data: periods } = useQuery({
    queryKey: ['periods'],
    queryFn: async () => {
      const { data, error } = await supabase.from('periods').select('*').eq('is_active', true).order('order_number');
      if (error) throw error;
      return data;
    }
  });

  // Get localized name helper
  const getLocalizedName = (item: { name: string; name_en?: string | null; name_fr?: string | null } | null) => {
    if (!item) return '';
    if (language === 'en' && item.name_en) return item.name_en;
    if (language === 'fr' && item.name_fr) return item.name_fr;
    return item.name;
  };

  // Filter exams
  const filteredExams = useMemo(() => {
    if (!exams) return [];
    
    return exams.filter(exam => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          exam.title.toLowerCase().includes(search) ||
          exam.description?.toLowerCase().includes(search) ||
          getLocalizedName(exam.subject)?.toLowerCase().includes(search) ||
          exam.establishment?.name.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      
      // School filter
      if (selectedSchools.length > 0 && exam.establishment) {
        if (!selectedSchools.includes(exam.establishment.id)) return false;
      } else if (selectedSchools.length > 0 && !exam.establishment) {
        return false;
      }
      
      // Class filter
      if (selectedClasses.length > 0 && exam.class) {
        if (!selectedClasses.includes(exam.class.id)) return false;
      } else if (selectedClasses.length > 0 && !exam.class) {
        return false;
      }
      
      // Subject filter
      if (selectedSubjects.length > 0 && exam.subject) {
        if (!selectedSubjects.includes(exam.subject.id)) return false;
      } else if (selectedSubjects.length > 0 && !exam.subject) {
        return false;
      }
      
      // Year filter
      if (selectedYear !== 'all' && exam.academic_year?.id !== selectedYear) return false;
      
      // Exam type filter
      if (selectedExamType !== 'all' && exam.exam_type?.id !== selectedExamType) return false;
      
      // Period filter
      if (selectedPeriod !== 'all' && exam.period?.id !== selectedPeriod) return false;
      
      // System filter (Francophone/Anglophone based on class section)
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
  }, [exams, searchTerm, selectedSchools, selectedClasses, selectedSubjects, selectedYear, selectedExamType, selectedPeriod, selectedSystem, sortBy, language]);

  // Count exams per filter option
  const getFilterCounts = useMemo(() => {
    if (!exams) return { schools: {}, classes: {}, subjects: {} };
    
    const counts = { schools: {} as Record<string, number>, classes: {} as Record<string, number>, subjects: {} as Record<string, number> };
    
    exams.forEach(exam => {
      if (exam.establishment) {
        counts.schools[exam.establishment.id] = (counts.schools[exam.establishment.id] || 0) + 1;
      }
      if (exam.class) {
        counts.classes[exam.class.id] = (counts.classes[exam.class.id] || 0) + 1;
      }
      if (exam.subject) {
        counts.subjects[exam.subject.id] = (counts.subjects[exam.subject.id] || 0) + 1;
      }
    });
    
    return counts;
  }, [exams]);

  // Active filters
  const activeFiltersCount = 
    selectedSchools.length + 
    selectedClasses.length + 
    selectedSubjects.length + 
    (selectedYear !== 'all' ? 1 : 0) + 
    (selectedExamType !== 'all' ? 1 : 0) + 
    (selectedPeriod !== 'all' ? 1 : 0) + 
    (selectedSystem !== 'all' ? 1 : 0);

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedSchools([]);
    setSelectedClasses([]);
    setSelectedSubjects([]);
    setSelectedYear('all');
    setSelectedExamType('all');
    setSelectedPeriod('all');
    setSelectedSystem('all');
  };

  const toggleSchool = (id: string) => {
    setSelectedSchools(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleClass = (id: string) => {
    setSelectedClasses(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjects(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // Sidebar content component
  const SidebarFilters = () => (
    <div className="space-y-4">
      {/* System Toggle */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">
          {language === 'fr' ? 'Système' : 'System'}
        </h3>
        <div className="flex gap-2">
          <Button
            variant={selectedSystem === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSystem('all')}
            className="flex-1"
          >
            {language === 'fr' ? 'Tous' : 'All'}
          </Button>
          <Button
            variant={selectedSystem === 'francophone' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSystem('francophone')}
            className="flex-1"
          >
            FR
          </Button>
          <Button
            variant={selectedSystem === 'anglophone' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSystem('anglophone')}
            className="flex-1"
          >
            EN
          </Button>
        </div>
      </div>

      <Separator />

      {/* Schools */}
      <Collapsible open={schoolsOpen} onOpenChange={setSchoolsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">
              {language === 'fr' ? 'Établissements' : 'Schools'}
            </span>
            {selectedSchools.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedSchools.length}
              </Badge>
            )}
          </div>
          {schoolsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ScrollArea className="h-[200px] pr-3">
            <div className="space-y-2 pt-2">
              {schools?.map(school => (
                <label key={school.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                  <Checkbox
                    checked={selectedSchools.includes(school.id)}
                    onCheckedChange={() => toggleSchool(school.id)}
                  />
                  <span className="text-sm flex-1 truncate">{school.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({getFilterCounts.schools[school.id] || 0})
                  </span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Classes */}
      <Collapsible open={classesOpen} onOpenChange={setClassesOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">
              {language === 'fr' ? 'Classes' : 'Classes'}
            </span>
            {selectedClasses.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedClasses.length}
              </Badge>
            )}
          </div>
          {classesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ScrollArea className="h-[200px] pr-3">
            <div className="space-y-2 pt-2">
              {classes?.map(cls => (
                <label key={cls.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                  <Checkbox
                    checked={selectedClasses.includes(cls.id)}
                    onCheckedChange={() => toggleClass(cls.id)}
                  />
                  <span className="text-sm flex-1 truncate">{cls.display_name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({getFilterCounts.classes[cls.id] || 0})
                  </span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Subjects */}
      <Collapsible open={subjectsOpen} onOpenChange={setSubjectsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">
              {language === 'fr' ? 'Matières' : 'Subjects'}
            </span>
            {selectedSubjects.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedSubjects.length}
              </Badge>
            )}
          </div>
          {subjectsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ScrollArea className="h-[200px] pr-3">
            <div className="space-y-2 pt-2">
              {subjects?.map(subject => (
                <label key={subject.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                  <Checkbox
                    checked={selectedSubjects.includes(subject.id)}
                    onCheckedChange={() => toggleSubject(subject.id)}
                  />
                  <span className="text-sm flex-1 truncate">{getLocalizedName(subject)}</span>
                  <span className="text-xs text-muted-foreground">
                    ({getFilterCounts.subjects[subject.id] || 0})
                  </span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {language === 'fr' ? 'Parcourir les Épreuves' : 'Browse Exams'}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {language === 'fr' 
                    ? `${filteredExams.length} épreuve${filteredExams.length > 1 ? 's' : ''} trouvée${filteredExams.length > 1 ? 's' : ''}`
                    : `${filteredExams.length} exam${filteredExams.length > 1 ? 's' : ''} found`
                  }
                  {exams && filteredExams.length !== exams.length && (
                    <span className="text-muted-foreground/70">
                      {' '}/ {exams.length} {language === 'fr' ? 'total' : 'total'}
                    </span>
                  )}
                </p>
              </div>
              
              {/* Mobile Filter Button */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    {language === 'fr' ? 'Filtres' : 'Filters'}
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle>
                      {language === 'fr' ? 'Filtres' : 'Filters'}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <SidebarFilters />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Search and Quick Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'fr' ? 'Rechercher une épreuve...' : 'Search exams...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={language === 'fr' ? 'Année' : 'Year'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'fr' ? 'Toutes les années' : 'All years'}</SelectItem>
                    {academicYears?.map(year => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.year_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={language === 'fr' ? 'Type' : 'Type'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'fr' ? 'Tous les types' : 'All types'}</SelectItem>
                    {examTypes?.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {getLocalizedName(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={language === 'fr' ? 'Période' : 'Period'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'fr' ? 'Toutes' : 'All'}</SelectItem>
                    {periods?.map(period => (
                      <SelectItem key={period.id} value={period.id}>
                        {getLocalizedName(period)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={language === 'fr' ? 'Trier' : 'Sort'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{language === 'fr' ? 'Plus récent' : 'Newest'}</SelectItem>
                    <SelectItem value="oldest">{language === 'fr' ? 'Plus ancien' : 'Oldest'}</SelectItem>
                    <SelectItem value="title">{language === 'fr' ? 'Titre' : 'Title'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {language === 'fr' ? 'Filtres actifs:' : 'Active filters:'}
                </span>
                {selectedSchools.map(id => {
                  const school = schools?.find(s => s.id === id);
                  return school && (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {school.name}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => toggleSchool(id)} />
                    </Badge>
                  );
                })}
                {selectedClasses.map(id => {
                  const cls = classes?.find(c => c.id === id);
                  return cls && (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {cls.display_name}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => toggleClass(id)} />
                    </Badge>
                  );
                })}
                {selectedSubjects.map(id => {
                  const subject = subjects?.find(s => s.id === id);
                  return subject && (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {getLocalizedName(subject)}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => toggleSubject(id)} />
                    </Badge>
                  );
                })}
                {selectedSystem !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedSystem === 'francophone' ? 'Francophone' : 'Anglophone'}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedSystem('all')} />
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-destructive hover:text-destructive">
                  {language === 'fr' ? 'Effacer tout' : 'Clear all'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-4 bg-card rounded-lg border p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {language === 'fr' ? 'Filtres' : 'Filters'}
                </h2>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs h-7">
                    {language === 'fr' ? 'Réinitialiser' : 'Reset'}
                  </Button>
                )}
              </div>
              <SidebarFilters />
            </div>
          </aside>

          {/* Exam Grid */}
          <main className="flex-1">
            {examsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(9)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-4" />
                      <div className="flex gap-2 mb-3">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-3 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {language === 'fr' ? 'Aucune épreuve trouvée' : 'No exams found'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {language === 'fr' 
                    ? 'Essayez de modifier vos filtres pour voir plus de résultats.'
                    : 'Try adjusting your filters to see more results.'
                  }
                </p>
                <Button variant="outline" onClick={clearAllFilters}>
                  {language === 'fr' ? 'Effacer les filtres' : 'Clear filters'}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredExams.map(exam => (
                  <Link key={exam.id} to={`/exam/${exam.id}`}>
                    <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {exam.title}
                          </h3>
                          {!hasActiveSubscription && (
                            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {exam.class?.display_name} • {getLocalizedName(exam.subject)}
                        </p>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {exam.academic_year && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {exam.academic_year.year_label}
                            </Badge>
                          )}
                          {exam.exam_type && (
                            <Badge variant="secondary" className="text-xs">
                              {getLocalizedName(exam.exam_type)}
                            </Badge>
                          )}
                          {exam.duration && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {exam.duration.display_label}
                            </Badge>
                          )}
                        </div>

                        {exam.establishment && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {exam.establishment.name}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Exams2;
