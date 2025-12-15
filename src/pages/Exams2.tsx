import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Link } from 'react-router-dom';
import { 
  Search, X, Clock, Calendar, FileText, 
  Building2, BookOpen, GraduationCap, ChevronLeft, ChevronRight,
  Lock, Check
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

const ITEMS_PER_PAGE = 12;

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
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

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

  // Pagination
  const totalPages = Math.ceil(filteredExams.length / ITEMS_PER_PAGE);
  const paginatedExams = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredExams.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredExams, currentPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSchools, selectedClasses, selectedSubjects, selectedYear, selectedExamType, selectedPeriod, selectedSystem]);

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

  // Active filters count
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
    setCurrentPage(1);
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
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
          {selectedItems.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {selectedItems.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <ScrollArea className="h-[280px]">
          <div className="p-2 space-y-1">
            {items?.map(item => (
              <label 
                key={item.id} 
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md"
              >
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={() => onToggle(item.id)}
                />
                <span className="text-sm flex-1 truncate">{getItemName(item)}</span>
                <span className="text-xs text-muted-foreground">
                  {counts[item.id] || 0}
                </span>
              </label>
            ))}
          </div>
        </ScrollArea>
        {selectedItems.length > 0 && (
          <div className="border-t p-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => selectedItems.forEach(id => onToggle(id))}
            >
              {language === 'fr' ? 'Effacer la sélection' : 'Clear selection'}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-3">
            {/* Title row */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {language === 'fr' ? 'Parcourir les Épreuves' : 'Browse Exams'}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {language === 'fr' 
                    ? `${filteredExams.length} épreuve${filteredExams.length > 1 ? 's' : ''}`
                    : `${filteredExams.length} exam${filteredExams.length > 1 ? 's' : ''}`
                  }
                </p>
              </div>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-destructive hover:text-destructive">
                  <X className="h-4 w-4 mr-1" />
                  {language === 'fr' ? 'Effacer' : 'Clear'}
                </Button>
              )}
            </div>

            {/* Search row */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'fr' ? 'Rechercher une épreuve...' : 'Search exams...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
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

            {/* Filters row */}
            <div className="flex flex-wrap gap-2">
              {/* System toggle */}
              <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'fr' ? 'Tous' : 'All'}</SelectItem>
                  <SelectItem value="francophone">FR</SelectItem>
                  <SelectItem value="anglophone">EN</SelectItem>
                </SelectContent>
              </Select>

              {/* Multi-select popovers */}
              <MultiSelectPopover
                label={language === 'fr' ? 'Établissements' : 'Schools'}
                icon={Building2}
                items={schools}
                selectedItems={selectedSchools}
                onToggle={toggleSchool}
                counts={getFilterCounts.schools}
                getItemName={(item) => item.name}
              />

              <MultiSelectPopover
                label={language === 'fr' ? 'Classes' : 'Classes'}
                icon={GraduationCap}
                items={classes}
                selectedItems={selectedClasses}
                onToggle={toggleClass}
                counts={getFilterCounts.classes}
                getItemName={(item) => item.display_name}
              />

              <MultiSelectPopover
                label={language === 'fr' ? 'Matières' : 'Subjects'}
                icon={BookOpen}
                items={subjects}
                selectedItems={selectedSubjects}
                onToggle={toggleSubject}
                counts={getFilterCounts.subjects}
                getItemName={(item) => getLocalizedName(item)}
              />

              {/* Single select dropdowns */}
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder={language === 'fr' ? 'Année' : 'Year'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'fr' ? 'Toutes' : 'All'}</SelectItem>
                  {academicYears?.map(year => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.year_label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'fr' ? 'Tous' : 'All'}</SelectItem>
                  {examTypes?.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {getLocalizedName(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[120px] h-9">
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
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{language === 'fr' ? 'Récent' : 'Newest'}</SelectItem>
                  <SelectItem value="oldest">{language === 'fr' ? 'Ancien' : 'Oldest'}</SelectItem>
                  <SelectItem value="title">{language === 'fr' ? 'Titre' : 'Title'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active filters badges */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedSchools.map(id => {
                  const school = schools?.find(s => s.id === id);
                  return school && (
                    <Badge key={id} variant="secondary" className="gap-1 text-xs">
                      {school.name}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => toggleSchool(id)} />
                    </Badge>
                  );
                })}
                {selectedClasses.map(id => {
                  const cls = classes?.find(c => c.id === id);
                  return cls && (
                    <Badge key={id} variant="secondary" className="gap-1 text-xs">
                      {cls.display_name}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => toggleClass(id)} />
                    </Badge>
                  );
                })}
                {selectedSubjects.map(id => {
                  const subject = subjects?.find(s => s.id === id);
                  return subject && (
                    <Badge key={id} variant="secondary" className="gap-1 text-xs">
                      {getLocalizedName(subject)}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => toggleSubject(id)} />
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {examsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <div className="flex gap-2 mb-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
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
                ? 'Essayez de modifier vos filtres.'
                : 'Try adjusting your filters.'
              }
            </p>
            <Button variant="outline" onClick={clearAllFilters}>
              {language === 'fr' ? 'Effacer les filtres' : 'Clear filters'}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedExams.map(exam => (
                <Link key={exam.id} to={`/exam/${exam.id}`}>
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-foreground line-clamp-2 text-sm group-hover:text-primary transition-colors">
                          {exam.title}
                        </h3>
                        {!hasActiveSubscription && (
                          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2">
                        {exam.class?.display_name} • {getLocalizedName(exam.subject)}
                      </p>

                      <div className="flex flex-wrap gap-1 mb-2">
                        {exam.academic_year && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {exam.academic_year.year_label}
                          </Badge>
                        )}
                        {exam.exam_type && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            {getLocalizedName(exam.exam_type)}
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
                        <p className="text-xs text-muted-foreground truncate">
                          {exam.establishment.name}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first, last, current, and adjacent pages
                      return page === 1 || 
                             page === totalPages || 
                             Math.abs(page - currentPage) <= 1;
                    })
                    .map((page, idx, arr) => {
                      // Add ellipsis
                      const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsisBefore && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className="w-9 h-9"
                            onClick={() => setCurrentPage(page)}
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
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Page info */}
            <p className="text-center text-sm text-muted-foreground mt-4">
              {language === 'fr' 
                ? `Page ${currentPage} sur ${totalPages}`
                : `Page ${currentPage} of ${totalPages}`
              }
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Exams2;
