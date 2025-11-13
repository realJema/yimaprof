import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Plus, Edit, Trash2, Eye, Search, Filter, Globe2, Languages } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExamContentRenderer } from '@/components/exam/ExamContentRenderer';
import { useExamFormData } from '@/hooks/useExamFormData';
import { useLanguage } from '@/contexts/LanguageContext';
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
interface Question {
  id: string;
  text: string;
  type: string;
  answers: Answer[];
}
interface Answer {
  id: string;
  text: string;
  is_correct: boolean;
}
interface Class {
  id: string;
  display_name: string;
  section: string;
}
const generateId = () => Math.random().toString(36).substr(2, 9);
export function ExamManagement() {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    language,
    t
  } = useLanguage();
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [previewExam, setPreviewExam] = useState<Exam | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch dropdown options for filters
  const formOptions = useExamFormData();
  useEffect(() => {
    fetchExams();
    fetchClasses();
  }, []);
  const fetchExams = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('exams').select(`
          *,
          classes (
            display_name,
            section
          ),
          subjects:subject_id (
            name,
            name_en,
            name_fr
          ),
          exam_types:exam_type_id (
            name,
            name_en,
            name_fr
          ),
          academic_years:academic_year_id (
            year_label
          ),
          periods:period_id (
            name,
            name_en,
            name_fr
          ),
          establishments:establishment_id (
            name
          )
        `).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setExams(data as any || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch exams',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchClasses = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('classes').select('*').order('display_name');
      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  // Filter exams by language
  const francophones = exams.filter(exam => exam.language === 'fr');
  const anglophones = exams.filter(exam => exam.language === 'en');

  // Apply filters to exams
  const filterExams = (examsList: Exam[]) => {
    return examsList.filter(exam => {
      const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) || exam.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesYear = selectedYear === 'all' || exam.year.toString() === selectedYear;
      const matchesSubject = selectedSubject === 'all' || exam.subject === selectedSubject;
      const matchesClass = selectedClass === 'all' || exam.class_id === selectedClass;
      const matchesStatus = selectedStatus === 'all' || selectedStatus === 'published' && exam.is_published || selectedStatus === 'draft' && !exam.is_published;
      return matchesSearch && matchesYear && matchesSubject && matchesClass && matchesStatus;
    });
  };

  // Get unique values for filters
  const uniqueYears = Array.from(new Set(exams.map(e => e.year))).sort((a, b) => b - a);
  const uniqueSubjects = Array.from(new Set(exams.map(e => e.subject))).sort();
  const handleDelete = async (exam: Exam) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;
    try {
      const {
        error
      } = await supabase.from('exams').delete().eq('id', exam.id);
      if (error) throw error;
      setExams(prev => prev.filter(e => e.id !== exam.id));
      toast({
        title: 'Success',
        description: 'Exam deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete exam',
        variant: 'destructive'
      });
    }
  };
  const togglePublishStatus = async (exam: Exam) => {
    try {
      const {
        error
      } = await supabase.from('exams').update({
        is_published: !exam.is_published
      }).eq('id', exam.id);
      if (error) throw error;
      setExams(prev => prev.map(e => e.id === exam.id ? {
        ...e,
        is_published: !e.is_published
      } : e));
      toast({
        title: 'Success',
        description: `Exam ${exam.is_published ? 'unpublished' : 'published'} successfully`
      });
    } catch (error) {
      console.error('Error updating exam status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update exam status',
        variant: 'destructive'
      });
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

  const renderExamCard = (exam: Exam) => {
    const subjectName = language === 'fr' ? exam.subjects?.name_fr : exam.subjects?.name_en;
    const examTypeName = language === 'fr' ? exam.exam_types?.name_fr : exam.exam_types?.name_en;
    const periodName = language === 'fr' ? exam.periods?.name_fr : exam.periods?.name_en;
    const yearLabel = exam.academic_years?.year_label;
    const subjectColor = getSubjectColor(subjectName || '');
    
    return <Card key={exam.id} className="group relative overflow-hidden border-border/40 bg-card hover:border-primary/20 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
        {/* Accent Bar */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-${subjectColor}`} />
        
        <CardContent className="p-4 flex flex-col h-full gap-3.5">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-${subjectColor}/10 flex items-center justify-center`}>
                <BookOpen className={`h-4 w-4 text-${subjectColor}`} />
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold px-2 flex-shrink-0">
                {exam.language === 'fr' ? 'FR' : 'EN'}
              </Badge>
            </div>
            <Badge variant={exam.is_published ? 'default' : 'secondary'} className="text-[10px] px-2 flex-shrink-0">
              {exam.is_published ? 'Published' : 'Draft'}
            </Badge>
          </div>

          {/* Title */}
          <div className="min-w-0">
            <h3 className="font-semibold text-sm line-clamp-2 leading-tight text-foreground group-hover:text-primary transition-colors">
              {exam.title}
            </h3>
          </div>

          {/* Subject & Year Banner */}
          <div className={`flex items-center justify-between gap-2 p-2.5 rounded-lg bg-${subjectColor}/10 border border-${subjectColor}/20 min-w-0`}>
            <span className={`font-semibold text-sm text-${subjectColor} truncate`}>
              {subjectName || 'No subject'}
            </span>
            <span className="text-xs text-muted-foreground font-medium flex-shrink-0 bg-background px-2 py-0.5 rounded">
              {yearLabel || 'N/A'}
            </span>
          </div>

          {/* Details Grid */}
          <div className="flex-1 space-y-2 text-xs min-w-0">
            {exam.classes && <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground flex-shrink-0 w-14">Class:</span>
                <span className="font-medium text-foreground truncate">{exam.classes.display_name}</span>
              </div>}
            
            {examTypeName && <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground flex-shrink-0 w-14">Type:</span>
                <Badge variant="secondary" className="text-[10px] font-normal px-2 py-0.5 truncate">
                  {examTypeName}
                </Badge>
              </div>}
            
            {periodName && <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground flex-shrink-0 w-14">Period:</span>
                <Badge variant="outline" className="text-[10px] font-normal px-2 py-0.5 truncate">
                  {periodName}
                </Badge>
              </div>}
            
            {exam.establishments && <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground flex-shrink-0 w-14">School:</span>
                <span className="font-medium text-foreground text-xs truncate" title={exam.establishments.name}>
                  {exam.establishments.name}
                </span>
              </div>}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-border/30">
            <Link to={`/admin/exam/edit/${exam.id}`} className="block">
              <Button variant="outline" size="sm" className="w-full h-9 hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30 dark:hover:text-blue-400 transition-colors">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="h-9 hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30 dark:hover:text-green-400 transition-colors" onClick={() => {
            setPreviewExam(exam);
            setShowPreview(true);
          }}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDelete(exam)} className="h-9 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30 dark:hover:text-red-400 transition-colors">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>;
  };
  const renderExamList = (examsList: Exam[]) => {
    const filteredExams = filterExams(examsList);
    const totalPages = Math.ceil(filteredExams.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedExams = filteredExams.slice(startIndex, startIndex + itemsPerPage);
    if (loading) {
      return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Card key={i} className="border-border/50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>)}
        </div>;
    }
    if (filteredExams.length === 0) {
      return <Card className="border-border/50">
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No exams found matching your criteria</p>
          </CardContent>
        </Card>;
    }
    return <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {paginatedExams.map(renderExamCard)}
        </div>

        {totalPages > 1 && <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({
            length: totalPages
          }, (_, i) => i + 1).map(page => <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(page)} className="w-8 h-8 p-0">
                  {page}
                </Button>)}
            </div>

            <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
              Next
            </Button>
          </div>}

        <p className="text-sm text-muted-foreground text-center">
          Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredExams.length)} of {filteredExams.length} exams
        </p>
      </div>;
  };
  return <>
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewExam?.title}</DialogTitle>
          </DialogHeader>
          {previewExam?.content && <ExamContentRenderer content={previewExam.content} showAnswers={true} />}
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
      {/* Header with Stats */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <CardTitle className="text-card-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Exam Management
            </CardTitle>
            
            {/* Inline Stats */}
            <div className="flex items-center gap-4 flex-wrap text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-bold text-primary">{exams.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">FR:</span>
                <span className="font-bold text-primary">{francophones.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">EN:</span>
                <span className="font-bold text-primary">{anglophones.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Published:</span>
                <span className="font-bold text-primary">
                  {exams.filter(e => e.is_published).length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              <Link to="/admin/exam/new">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Exam
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Collapsible Filters */}
      {showFilters && <Card className="border-border/30 bg-card/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search exams..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
              
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {uniqueYears.map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {uniqueSubjects.map(subject => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.display_name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>}

      {/* Exam Lists by Language */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        
        <CardContent>
          <Tabs defaultValue="francophone" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="francophone" className="flex items-center gap-2">
                <Globe2 className="h-4 w-4" />
                <span className="hidden sm:inline">Francophone</span> ({francophones.length})
              </TabsTrigger>
              <TabsTrigger value="anglophone" className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                <span className="hidden sm:inline">Anglophone</span> ({anglophones.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="francophone" className="space-y-4">
              {renderExamList(francophones)}
            </TabsContent>

            <TabsContent value="anglophone" className="space-y-4">
              {renderExamList(anglophones)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </>;
}