import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Plus, Trash2, Upload, FileText, Code2, FileCheck, Save, Eye, AlertCircle, X, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ExamContentRenderer } from '@/components/exam/ExamContentRenderer';
import { EXAM_JSON_TEMPLATE } from '@/components/exam/ExamJsonTemplate';

interface Question {
  id: string;
  text: string;
  type: string;
  answers: Answer[];
  sub_questions?: Question[];
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

interface ExamData {
  title: string;
  subject: string;
  year: number;
  exam_type: string;
  class_id: string;
  description: string;
  is_published: boolean;
  period?: string;
  language?: string;
  duration_minutes?: number;
  tags?: string[];
  file_url?: string;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function ExamManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { examId } = useParams();
  const isEditing = !!examId;

  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState<ExamData>({
    title: '',
    subject: '',
    year: new Date().getFullYear(),
    exam_type: '',
    class_id: '',
    description: '',
    is_published: false,
    period: '',
    language: 'fr',
    duration_minutes: 120,
    tags: [],
  });

  // Questions for form-based creation
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

  // JSON data
  const [jsonData, setJsonData] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [parsedJson, setParsedJson] = useState<any>(null);

  // PDF upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Draft and preview functionality
  const [isDraft, setIsDraft] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    fetchClasses();
    if (isEditing) {
      fetchExamData();
    }
  }, [examId]);

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

  const fetchExamData = async () => {
    if (!examId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (error) throw error;

      setFormData({
        title: data.title,
        subject: data.subject,
        year: data.year,
        exam_type: data.exam_type,
        class_id: data.class_id,
        description: data.description || '',
        is_published: data.is_published,
        period: data.period || '',
        language: data.language || 'fr',
        duration_minutes: data.duration_minutes || 120,
        tags: data.tags || [],
        file_url: data.file_url || '',
      });

      // Load questions if available
      if (data.content && typeof data.content === 'object' && 'questions' in data.content && Array.isArray(data.content.questions)) {
        setQuestions(data.content.questions as unknown as Question[]);
        setJsonData(JSON.stringify(data.content, null, 2));
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch exam data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Support both new format (array of items) and legacy format (object with questions)
      let items: any[] = [];
      
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        items = parsed.questions;
      } else {
        throw new Error('JSON must be an array of items or contain a "questions" array');
      }

      const validateItem = (item: any, index: number) => {
        if (!item.id || !item.item_type) {
          throw new Error(`Item ${index + 1} must have id and item_type fields`);
        }

        const validItemTypes = ['heading', 'instruction', 'passage', 'question', 'image'];
        if (!validItemTypes.includes(item.item_type)) {
          throw new Error(`Item ${index + 1} has invalid item_type: ${item.item_type}`);
        }

        // Validate questions
        if (item.item_type === 'question') {
          if (!item.question_type || !item.text) {
            throw new Error(`Question item ${index + 1} must have question_type and text`);
          }
          
          const validQuestionTypes = ['multiple_choice', 'long_form'];
          if (!validQuestionTypes.includes(item.question_type)) {
            throw new Error(`Question ${index + 1} has invalid question_type: ${item.question_type}`);
          }

          // Validate answers
          if (item.answers && Array.isArray(item.answers)) {
            item.answers.forEach((a: any, aIndex: number) => {
              if (!a.id || !a.text || typeof a.is_correct !== 'boolean') {
                throw new Error(`Answer ${aIndex + 1} in question ${index + 1} must have id, text, and is_correct fields`);
              }
            });
          }

          // Validate sub-questions
          if (item.sub_questions && Array.isArray(item.sub_questions)) {
            item.sub_questions.forEach((subQ: any, subIndex: number) => {
              if (!subQ.id || !subQ.text) {
                throw new Error(`Sub-question ${subIndex + 1} in question ${index + 1} must have id and text`);
              }
              if (subQ.answers && Array.isArray(subQ.answers)) {
                subQ.answers.forEach((a: any, aIndex: number) => {
                  if (!a.id || !a.text || typeof a.is_correct !== 'boolean') {
                    throw new Error(`Answer ${aIndex + 1} in sub-question ${subIndex + 1} of question ${index + 1} must have id, text, and is_correct`);
                  }
                });
              }
            });
          }
        }

        // Validate images
        if (item.item_type === 'image' && item.assets) {
          if (!Array.isArray(item.assets)) {
            throw new Error(`Image item ${index + 1} assets must be an array`);
          }
        }
      };

      items.forEach((item, index) => validateItem(item, index));

      setJsonError('');
      setParsedJson(Array.isArray(parsed) ? parsed : { questions: parsed.questions });
      return true;
    } catch (error) {
      setJsonError((error as Error).message);
      setParsedJson(null);
      return false;
    }
  };

  const handleJsonChange = (value: string) => {
    setJsonData(value);
    if (value.trim()) {
      validateJson(value);
    } else {
      setJsonError('');
      setParsedJson(null);
    }
  };

  const uploadPdfFile = async (file: File): Promise<string> => {
    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      console.log('Uploading file:', fileName, 'to papers bucket');
      
      const { data, error } = await supabase.storage
        .from('papers')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      console.log('Upload successful:', data);

      const { data: urlData } = supabase.storage
        .from('papers')
        .getPublicUrl(fileName);

      console.log('Public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('PDF upload failed:', error);
      throw new Error(`Failed to upload PDF: ${error.message}`);
    }
  };

  const validateFormData = () => {
    const errors = [];
    if (!formData.title.trim()) errors.push('Title is required');
    if (!formData.subject.trim()) errors.push('Subject is required');
    if (!formData.class_id) errors.push('Class is required');
    if (!formData.exam_type.trim()) errors.push('Exam type is required');
    
    if (!parsedJson) {
      errors.push('Valid JSON content is required');
    }
    
    return errors;
  };

  const generatePreview = () => {
    const errors = validateFormData();
    if (errors.length > 0) {
      toast({
        title: 'Validation Error',
        description: errors.join(', '),
        variant: 'destructive',
      });
      return;
    }

    setPreviewData({
      ...formData,
      content: parsedJson,
    });
    setShowPreview(true);
  };

  const saveDraft = async () => {
    setLoading(true);
    try {
      // Only upload if there's a selected file that hasn't been uploaded yet
      let fileUrl = formData.file_url;
      if (selectedFile && !formData.file_url) {
        toast({
          title: 'PDF not uploaded',
          description: 'Please upload the PDF file before saving',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const examData = {
        ...formData,
        content: parsedJson,
        file_url: fileUrl,
        created_by: user?.id || '',
        is_published: false,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('exams')
          .update(examData)
          .eq('id', examId);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Draft saved successfully',
        });
      } else {
        const { data, error } = await supabase
          .from('exams')
          .insert(examData)
          .select()
          .single();

        if (error) throw error;
        setIsDraft(true);
        toast({
          title: 'Success',
          description: 'Draft saved successfully',
        });
        
        if (data?.id) {
          window.history.replaceState({}, '', `/admin/exam/edit/${data.id}`);
        }
      }
      
      navigate('/admin');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to save draft',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleSubmit = async (shouldPublish = false) => {
    const errors = validateFormData();
    if (errors.length > 0) {
      toast({
        title: 'Validation Error',
        description: errors.join(', '),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Only upload if there's a selected file that hasn't been uploaded yet
      let fileUrl = formData.file_url;
      if (selectedFile && !formData.file_url) {
        toast({
          title: 'PDF not uploaded',
          description: 'Please upload the PDF file before publishing',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const examData = {
        ...formData,
        content: parsedJson,
        file_url: fileUrl,
        created_by: user?.id || '',
        is_published: shouldPublish,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('exams')
          .update(examData)
          .eq('id', examId);

        if (error) throw error;
        toast({
          title: 'Success',
          description: shouldPublish ? 'Exam published successfully' : 'Exam updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('exams')
          .insert(examData);

        if (error) throw error;
        toast({
          title: 'Success',
          description: shouldPublish ? 'Exam published successfully' : 'Exam created successfully',
        });
      }

      navigate('/admin');
    } catch (error) {
      console.error('Error saving exam:', error);
      toast({
        title: 'Error',
        description: `Failed to save exam: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleSaveDraft = async () => {
    await handleSubmit(false);
  };

  const handlePublish = async () => {
    await handleSubmit(true);
    navigate('/admin?tab=exams');
  };

  const handlePublishAndCreateAnother = async () => {
    const errors = validateFormData();
    if (errors.length > 0) {
      toast({
        title: 'Validation Error',
        description: errors.join(', '),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      let fileUrl = formData.file_url;
      if (selectedFile && !formData.file_url) {
        toast({
          title: 'PDF not uploaded',
          description: 'Please upload the PDF file before publishing',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const examData = {
        ...formData,
        content: parsedJson,
        file_url: fileUrl,
        created_by: user?.id || '',
        is_published: true,
      };

      const { error } = await supabase
        .from('exams')
        .insert(examData);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Exam published successfully! You can create another exam now.',
      });

      // Reset form for new exam
      setFormData({
        title: '',
        subject: '',
        year: new Date().getFullYear(),
        exam_type: '',
        class_id: '',
        description: '',
        is_published: false,
        period: '',
        language: 'fr',
        duration_minutes: 120,
        tags: [],
      });
      setJsonData('');
      setSelectedFile(null);
      setParsedJson(null);
    } catch (error) {
      console.error('Error publishing exam:', error);
      toast({
        title: 'Error',
        description: `Failed to publish exam: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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

  const changeQuestionType = (questionId: string, newType: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        if (newType === 'long_form') {
          return {
            ...q,
            type: newType,
            answers: [{ id: generateId(), text: '', is_correct: true }],
            sub_questions: []
          };
        } else {
          const { sub_questions, ...questionWithoutSubs } = q;
          return {
            ...questionWithoutSubs,
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

  const addSubQuestion = (parentQuestionId: string) => {
    const newSubQuestion: Question = {
      id: generateId(),
      text: '',
      type: 'long_form',
      answers: [{ id: generateId(), text: '', is_correct: true }]
    };

    setQuestions(questions.map(q => {
      if (q.id === parentQuestionId && q.type === 'long_form') {
        return {
          ...q,
          sub_questions: [...(q.sub_questions || []), newSubQuestion]
        };
      }
      return q;
    }));
  };

  const removeSubQuestion = (parentQuestionId: string, subQuestionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === parentQuestionId) {
        return {
          ...q,
          sub_questions: q.sub_questions?.filter(sq => sq.id !== subQuestionId) || []
        };
      }
      return q;
    }));
  };

  const updateSubQuestion = (parentQuestionId: string, subQuestionId: string, field: string, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === parentQuestionId) {
        return {
          ...q,
          sub_questions: q.sub_questions?.map(sq => 
            sq.id === subQuestionId ? { ...sq, [field]: value } : sq
          ) || []
        };
      }
      return q;
    }));
  };

  const updateSubQuestionAnswer = (parentQuestionId: string, subQuestionId: string, answerId: string, field: string, value: string | boolean) => {
    setQuestions(questions.map(q => {
      if (q.id === parentQuestionId) {
        return {
          ...q,
          sub_questions: q.sub_questions?.map(sq => {
            if (sq.id === subQuestionId) {
              return {
                ...sq,
                answers: sq.answers.map(a => 
                  a.id === answerId ? { ...a, [field]: value } : a
                )
              };
            }
            return sq;
          }) || []
        };
      }
      return q;
    }));
  };

  // Auto-generate preview when data changes
  useEffect(() => {
    if (formData.title || formData.subject) {
      setPreviewData({
        ...formData,
        content: parsedJson,
      });
    }
  }, [formData, parsedJson]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container max-w-[2000px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {isEditing ? 'Edit Exam' : 'Create Exam'}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Fill in details and watch live preview
                </p>
              </div>
              {isDraft && (
                <Badge variant="secondary" className="ml-2">Draft</Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                Cancel
              </Button>
              <Button variant="outline" size="sm" onClick={saveDraft} disabled={loading || uploading}>
                <Save className="h-4 w-4 mr-1" />
                Save Draft
              </Button>
              <Button size="sm" onClick={handlePublish} disabled={loading || uploading}>
                <FileCheck className="h-4 w-4 mr-1" />
                Publish
              </Button>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={handlePublishAndCreateAnother} disabled={loading || uploading}>
                  <Plus className="h-4 w-4 mr-1" />
                  Publish & Create Another
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Full Exam Preview
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            {previewData && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xl font-bold">{previewData.title}</h3>
                    <p className="text-muted-foreground">{previewData.subject}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {previewData.exam_type} • {previewData.year}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Duration: {previewData.duration_minutes} minutes
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                {previewData.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-muted-foreground">{previewData.description}</p>
                  </div>
                )}
                
                {previewData.content && (
                  <div>
                    <h4 className="font-semibold mb-4">Content Preview</h4>
                    <ExamContentRenderer
                      content={previewData.content}
                      showAnswers={true}
                      mode="preview"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content - Split View */}
      <div className="container max-w-[2000px] mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-120px)]">
          {/* LEFT PANEL - Form Input */}
          <div className="overflow-y-auto pr-2">
            <div className="space-y-4">
              {/* Metadata Section */}
              <Card className="border-border/50 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-primary" />
                    Exam Metadata
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Basic exam information</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="title" className="text-xs">Exam Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Mathematics Final Exam"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="subject" className="text-xs">Subject *</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Mathematics"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="exam_type" className="text-xs">Type *</Label>
                      <Input
                        id="exam_type"
                        value={formData.exam_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, exam_type: e.target.value }))}
                        placeholder="Test, Exam"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="year" className="text-xs">Year *</Label>
                      <Input
                        id="year"
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="period" className="text-xs">Period</Label>
                      <Input
                        id="period"
                        value={formData.period}
                        onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value }))}
                        placeholder="1st Semester"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration" className="text-xs">Duration (min)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="class_id" className="text-xs">Class *</Label>
                    <Select value={formData.class_id} onValueChange={(value) => setFormData(prev => ({ ...prev, class_id: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.display_name} - {cls.section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="language" className="text-xs">Language *</Label>
                    <Select value={formData.language} onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-xs">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the exam..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* PDF Upload Section */}
              <Card className="border-border/50 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="h-4 w-4 text-primary" />
                    PDF Document
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Upload the exam paper PDF file</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="pdf-upload" className="text-xs">PDF File</Label>
                    <div className="mt-1 space-y-2">
                      <Input
                        id="pdf-upload"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.type !== 'application/pdf') {
                              toast({
                                title: 'Invalid file',
                                description: 'Please select a PDF file',
                                variant: 'destructive',
                              });
                              return;
                            }
                            setSelectedFile(file);
                            toast({
                              title: 'File selected',
                              description: `${file.name} is ready to upload`,
                            });
                          }
                        }}
                        className="cursor-pointer"
                      />
                      {selectedFile && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-xs flex-1">{selectedFile.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedFile(null);
                              const input = document.getElementById('pdf-upload') as HTMLInputElement;
                              if (input) input.value = '';
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {formData.file_url && !selectedFile && (
                        <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-md">
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            PDF already uploaded
                          </p>
                          <a 
                            href={formData.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            View current PDF
                          </a>
                        </div>
                      )}
                      <Button
                        type="button"
                        onClick={async () => {
                          if (!selectedFile) {
                            toast({
                              title: 'No file selected',
                              description: 'Please select a PDF file first',
                              variant: 'destructive',
                            });
                            return;
                          }
                          
                          setUploading(true);
                          try {
                            const fileUrl = await uploadPdfFile(selectedFile);
                            setFormData(prev => ({ ...prev, file_url: fileUrl }));
                            toast({
                              title: 'Success',
                              description: 'PDF uploaded successfully',
                            });
                            setSelectedFile(null);
                            const input = document.getElementById('pdf-upload') as HTMLInputElement;
                            if (input) input.value = '';
                          } catch (error) {
                            toast({
                              title: 'Upload failed',
                              description: error.message || 'Failed to upload PDF',
                              variant: 'destructive',
                            });
                          } finally {
                            setUploading(false);
                          }
                        }}
                        disabled={!selectedFile || uploading}
                        className="w-full"
                        variant="outline"
                      >
                        {uploading ? (
                          <>
                            <Upload className="h-4 w-4 mr-2 animate-pulse" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload PDF Now
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* JSON Content Section */}
              <Card className="border-border/50 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-primary" />
                    Exam Content (JSON)
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Define exam questions, passages, and structure in JSON format
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">JSON Data</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleJsonChange(EXAM_JSON_TEMPLATE)}
                      className="h-7 text-xs"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      Load Template
                    </Button>
                  </div>
                  <Textarea
                    value={jsonData}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    placeholder='Click "Load Template" to see an example format'
                    rows={20}
                    className="font-mono text-xs"
                  />
                  {jsonError && (
                    <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {jsonError}
                      </p>
                    </div>
                  )}
                  {parsedJson && !jsonError && (
                    <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-md">
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Valid JSON - {parsedJson.questions?.length || 0} questions
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* RIGHT PANEL - Live Preview */}
          <div className="overflow-y-auto">
            <Card className="border-border/50 bg-card h-full">
              <CardContent className="p-4 space-y-4">
                {previewData && previewData.title ? (
                  <>
                    <div className="sticky top-0 bg-card z-10 pb-4">
                      <h3 className="text-xl font-bold">{previewData.title || 'Untitled Exam'}</h3>
                      <p className="text-sm text-muted-foreground">{previewData.subject || 'No subject'}</p>
                      <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{previewData.exam_type || 'Type'}</Badge>
                        <Badge variant="outline">{previewData.year}</Badge>
                        <Badge variant="outline">{previewData.duration_minutes} min</Badge>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {previewData.description && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Description</h4>
                        <p className="text-sm text-muted-foreground">{previewData.description}</p>
                      </div>
                    )}
                    
                    {previewData.content && (
                      <div>
                        <h4 className="text-sm font-semibold mb-3">Live Preview</h4>
                        <div className="space-y-4">
                          <ExamContentRenderer
                            content={previewData.content}
                            showAnswers={true}
                            mode="preview"
                          />
                        </div>
                      </div>
                    )}

                    {!previewData.content && (
                      <div className="text-center py-12 text-muted-foreground">
                        <p className="text-sm">No content added yet</p>
                        <p className="text-xs mt-1">Add questions or paste JSON to see preview</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <Eye className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Start filling the form</p>
                    <p className="text-xs mt-1">Preview will appear here</p>
                  </div>
                )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }