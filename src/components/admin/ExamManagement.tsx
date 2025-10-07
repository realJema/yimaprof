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
  classes?: {
    display_name: string;
    section: string;
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
  const { user } = useAuth();
  const { toast } = useToast();
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

  useEffect(() => {
    fetchExams();
    fetchClasses();
  }, []);

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          classes (
            display_name,
            section
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch exams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('display_name');

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
      const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          exam.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesYear = selectedYear === 'all' || exam.year.toString() === selectedYear;
      const matchesSubject = selectedSubject === 'all' || exam.subject === selectedSubject;
      const matchesClass = selectedClass === 'all' || exam.class_id === selectedClass;
      const matchesStatus = selectedStatus === 'all' || 
                          (selectedStatus === 'published' && exam.is_published) ||
                          (selectedStatus === 'draft' && !exam.is_published);
      
      return matchesSearch && matchesYear && matchesSubject && matchesClass && matchesStatus;
    });
  };

  // Get unique values for filters
  const uniqueYears = Array.from(new Set(exams.map(e => e.year))).sort((a, b) => b - a);
  const uniqueSubjects = Array.from(new Set(exams.map(e => e.subject))).sort();

  const handleDelete = async (exam: Exam) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;

    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', exam.id);

      if (error) throw error;

      setExams(prev => prev.filter(e => e.id !== exam.id));
      toast({
        title: 'Success',
        description: 'Exam deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete exam',
        variant: 'destructive',
      });
    }
  };

  const togglePublishStatus = async (exam: Exam) => {
    try {
      const { error } = await supabase
        .from('exams')
        .update({ is_published: !exam.is_published })
        .eq('id', exam.id);

      if (error) throw error;

      setExams(prev => prev.map(e => 
        e.id === exam.id ? { ...e, is_published: !e.is_published } : e
      ));

      toast({
        title: 'Success',
        description: `Exam ${exam.is_published ? 'unpublished' : 'published'} successfully`,
      });
    } catch (error) {
      console.error('Error updating exam status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update exam status',
        variant: 'destructive',
      });
    }
  };

  const renderExamCard = (exam: Exam) => (
    <Card key={exam.id} className="border-border/50 hover:border-primary/50 transition-all h-full flex flex-col">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-start gap-3 mb-3">
          <BookOpen className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-2 mb-2">{exam.title}</h3>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-xs">
                {exam.subject}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {exam.year}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-3 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">Type:</span>
            <span>{exam.exam_type}</span>
          </div>
          {exam.classes && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">Class:</span>
              <span>{exam.classes.display_name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Badge variant={exam.is_published ? 'default' : 'secondary'} className="text-xs">
              {exam.is_published ? 'Published' : 'Draft'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => togglePublishStatus(exam)}
            className="text-xs h-8"
          >
            {exam.is_published ? 'Unpublish' : 'Publish'}
          </Button>
          <Link to={`/exam/${exam.id}?mode=preview`} className="w-full">
            <Button variant="outline" size="sm" className="w-full text-xs h-8">
              <Eye className="h-3 w-3 mr-1" />
              Preview
            </Button>
          </Link>
          <Link to={`/admin/exam/edit/${exam.id}`} className="w-full">
            <Button variant="outline" size="sm" className="w-full text-xs h-8">
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(exam)}
            className="text-xs h-8"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderExamList = (examsList: Exam[]) => {
    const filteredExams = filterExams(examsList);
    const totalPages = Math.ceil(filteredExams.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedExams = filteredExams.slice(startIndex, startIndex + itemsPerPage);
    
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Card key={i} className="border-border/50">
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
            </Card>
          ))}
        </div>
      );
    }

    if (filteredExams.length === 0) {
      return (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No exams found matching your criteria</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {paginatedExams.map(renderExamCard)}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        <p className="text-sm text-muted-foreground text-center">
          Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredExams.length)} of {filteredExams.length} exams
        </p>
      </div>
    );
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-card-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Exam Management
            </CardTitle>
            <Link to="/admin/exam/new">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Exam
              </Button>
            </Link>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <h3 className="font-semibold">Filters</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {uniqueYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {uniqueSubjects.map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
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
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{exams.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Exams</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{francophones.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Francophone</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{anglophones.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Anglophone</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                {exams.filter(e => e.is_published).length}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Published</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exam Lists by Language */}
      <Tabs defaultValue="francophone" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="francophone" className="flex items-center gap-2">
            <Globe2 className="h-4 w-4" />
            Francophone ({francophones.length})
          </TabsTrigger>
          <TabsTrigger value="anglophone" className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Anglophone ({anglophones.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="francophone" className="space-y-4">
          {renderExamList(francophones)}
        </TabsContent>

        <TabsContent value="anglophone" className="space-y-4">
          {renderExamList(anglophones)}
        </TabsContent>
      </Tabs>
    </div>
  );
}