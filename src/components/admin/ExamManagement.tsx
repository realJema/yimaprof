import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminDataTable } from './AdminDataTable';
import { BookOpen, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Exam {
  id: string;
  title: string;
  subject: string;
  year: number;
  exam_type: string;
  is_published: boolean;
  created_at: string;
  class_id: string;
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    year: new Date().getFullYear(),
    exam_type: '',
    class_id: '',
    description: '',
    is_published: false,
  });

  const [questions, setQuestions] = useState<Question[]>([{
    id: generateId(),
    text: '',
    type: 'multiple_choice',
    answers: [
      { id: generateId(), text: '', is_correct: false },
      { id: generateId(), text: '', is_correct: false },
      { id: generateId(), text: '', is_correct: false },
      { id: generateId(), text: '', is_correct: false }
    ]
  }]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const examContent = {
        questions: questions.map(q => ({
          id: q.id,
          text: q.text,
          type: q.type,
          answers: q.answers
        }))
      };

      const examData = {
        ...formData,
        content: examContent as any,
        created_by: user?.id || '',
      };

      if (editingExam) {
        const { error } = await supabase
          .from('exams')
          .update(examData)
          .eq('id', editingExam.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Exam updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('exams')
          .insert(examData);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Exam created successfully',
        });
      }

      setIsDialogOpen(false);
      setEditingExam(null);
      resetForm();
      fetchExams();
    } catch (error) {
      console.error('Error saving exam:', error);
      toast({
        title: 'Error',
        description: 'Failed to save exam',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subject: '',
      year: new Date().getFullYear(),
      exam_type: '',
      class_id: '',
      description: '',
      is_published: false,
    });
    setQuestions([{
      id: generateId(),
      text: '',
      type: 'multiple_choice',
      answers: [
        { id: generateId(), text: '', is_correct: false },
        { id: generateId(), text: '', is_correct: false },
        { id: generateId(), text: '', is_correct: false },
        { id: generateId(), text: '', is_correct: false }
      ]
    }]);
  };

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      title: exam.title,
      subject: exam.subject,
      year: exam.year,
      exam_type: exam.exam_type,
      class_id: exam.class_id,
      description: '',
      is_published: exam.is_published,
    });
    
    // Load existing questions if available
    if (exam.content && typeof exam.content === 'object' && exam.content.questions) {
      setQuestions(exam.content.questions || []);
    } else {
      setQuestions([{
        id: generateId(),
        text: '',
        type: 'multiple_choice',
        answers: [
          { id: generateId(), text: '', is_correct: false },
          { id: generateId(), text: '', is_correct: false },
          { id: generateId(), text: '', is_correct: false },
          { id: generateId(), text: '', is_correct: false }
        ]
      }]);
    }
    
    setIsDialogOpen(true);
  };

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

  const changeQuestionType = (questionId: string, newType: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        if (newType === 'long_form') {
          return {
            ...q,
            type: newType,
            answers: [{ id: generateId(), text: '', is_correct: true }]
          };
        } else {
          return {
            ...q,
            type: newType,
            answers: [
              { id: generateId(), text: '', is_correct: false },
              { id: generateId(), text: '', is_correct: false },
              { id: generateId(), text: '', is_correct: false },
              { id: generateId(), text: '', is_correct: false }
            ]
          };
        }
      }
      return q;
    }));
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      id: generateId(),
      text: '',
      type: 'multiple_choice',
      answers: [
        { id: generateId(), text: '', is_correct: false },
        { id: generateId(), text: '', is_correct: false },
        { id: generateId(), text: '', is_correct: false },
        { id: generateId(), text: '', is_correct: false }
      ]
    }]);
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const updateQuestion = (questionId: string, field: string, value: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  const updateAnswer = (questionId: string, answerId: string, field: string, value: string | boolean) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? {
            ...q, 
            answers: q.answers.map(a => 
              a.id === answerId ? { ...a, [field]: value } : a
            )
          }
        : q
    ));
  };

  const setCorrectAnswer = (questionId: string, answerId: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? {
            ...q, 
            answers: q.answers.map(a => ({ ...a, is_correct: a.id === answerId }))
          }
        : q
    ));
  };

  const columns = [
    {
      key: 'title',
      label: 'Title',
    },
    {
      key: 'subject',
      label: 'Subject',
    },
    {
      key: 'year',
      label: 'Year',
    },
    {
      key: 'exam_type',
      label: 'Type',
    },
    {
      key: 'classes.display_name',
      label: 'Class',
      render: (value: string, exam: Exam) => (
        <div>
          <div>{exam.classes?.display_name}</div>
          <Badge variant="outline" className="text-xs">
            {exam.classes?.section}
          </Badge>
        </div>
      ),
    },
    {
      key: 'is_published',
      label: 'Status',
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  const actions = (exam: Exam) => (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => togglePublishStatus(exam)}
      >
        {exam.is_published ? 'Unpublish' : 'Publish'}
      </Button>
      <Link to={`/exam/${exam.id}?mode=preview`}>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </Link>
      <Link to={`/admin/exam/edit/${exam.id}`}>
        <Button
          variant="outline"
          size="sm"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </Link>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => handleDelete(exam)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
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
      <CardContent>
        <AdminDataTable
          data={exams}
          columns={columns}
          searchKey="title"
          actions={actions}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
}