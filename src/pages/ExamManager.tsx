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
  const [activeTab, setActiveTab] = useState('form');

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
      
      // Validate structure
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('JSON must contain a "questions" array');
      }

      const validateQuestionRecursive = (q: any, questionPath: string) => {
        if (!q.id || !q.text || !q.type) {
          throw new Error(`${questionPath} must have id, text, and type fields`);
        }
        if (!q.answers || !Array.isArray(q.answers)) {
          throw new Error(`${questionPath} must have an "answers" array`);
        }
        q.answers.forEach((a: any, aIndex: number) => {
          if (!a.id || !a.text || typeof a.is_correct !== 'boolean') {
            throw new Error(`Answer ${aIndex + 1} in ${questionPath} must have id, text, and is_correct fields`);
          }
        });
        
        // Validate sub-questions for long_form questions only
        if (q.sub_questions) {
          if (q.type !== 'long_form') {
            throw new Error(`${questionPath} can only have sub-questions if type is "long_form"`);
          }
          if (!Array.isArray(q.sub_questions)) {
            throw new Error(`${questionPath} sub_questions must be an array`);
          }
          q.sub_questions.forEach((subQ: any, subIndex: number) => {
            validateQuestionRecursive(subQ, `${questionPath} sub-question ${subIndex + 1}`);
          });
        }
      };

      parsed.questions.forEach((q: any, index: number) => {
        validateQuestionRecursive(q, `Question ${index + 1}`);
      });

      setJsonError('');
      setParsedJson(parsed);
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
    
    if (activeTab === 'form' && questions.length === 0) {
      errors.push('At least one question is required');
    }
    
    if (activeTab === 'json' && !parsedJson) {
      errors.push('Valid JSON data is required');
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

    let examContent = null;
    if (activeTab === 'form') {
      examContent = {
        questions: questions.map(q => ({
          id: q.id,
          text: q.text,
          type: q.type,
          answers: q.answers
        }))
      };
    } else if (activeTab === 'json' && parsedJson) {
      examContent = parsedJson;
    }

    setPreviewData({
      ...formData,
      content: examContent,
    });
    setShowPreview(true);
  };

  const saveDraft = async () => {
    setLoading(true);
    try {
      let examContent = null;
      let fileUrl = formData.file_url;

      if (selectedFile) {
        setUploading(true);
        fileUrl = await uploadPdfFile(selectedFile);
        setUploading(false);
      }

      if (activeTab === 'form') {
        examContent = {
          questions: questions.map(q => ({
            id: q.id,
            text: q.text,
            type: q.type,
            answers: q.answers,
            sub_questions: q.sub_questions
          }))
        };
      } else if (activeTab === 'json' && parsedJson) {
        examContent = parsedJson;
      }

      const examData = {
        ...formData,
        content: examContent,
        file_url: fileUrl,
        created_by: user?.id || '',
        is_published: false, // Always save as unpublished for drafts
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
        
        // Update URL to edit mode if this was a new exam
        if (data?.id) {
          window.history.replaceState({}, '', `/admin/exam/edit/${data.id}`);
        }
      }
      
      // Navigate to admin page after saving draft
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
      let examContent = null;
      let fileUrl = formData.file_url;

      if (selectedFile) {
        setUploading(true);
        fileUrl = await uploadPdfFile(selectedFile);
        setUploading(false);
      }

      if (activeTab === 'form') {
        examContent = {
          questions: questions.map(q => ({
            id: q.id,
            text: q.text,
            type: q.type,
            answers: q.answers,
            sub_questions: q.sub_questions
          }))
        };
      } else if (activeTab === 'json' && parsedJson) {
        examContent = parsedJson;
      }

      const examData = {
        ...formData,
        content: examContent,
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

  // Sync JSON data when form questions change
  useEffect(() => {
    if (activeTab === 'form' && questions.length > 0) {
      const formContent = {
        questions: questions.map(q => ({
          id: q.id,
          text: q.text,
          type: q.type,
          answers: q.answers,
          sub_questions: q.sub_questions
        }))
      };
      setJsonData(JSON.stringify(formContent, null, 2));
      setParsedJson(formContent);
    }
  }, [questions, activeTab]);

  // Sync form questions when JSON changes
  useEffect(() => {
    if (activeTab === 'json' && parsedJson?.questions && Array.isArray(parsedJson.questions)) {
      setQuestions(parsedJson.questions);
    }
  }, [parsedJson, activeTab]);

  // Auto-generate preview when data changes
  useEffect(() => {
    if (formData.title || formData.subject) {
      let examContent = null;
      if (activeTab === 'form') {
        examContent = {
          questions: questions.map(q => ({
            id: q.id,
            text: q.text,
            type: q.type,
            answers: q.answers,
            sub_questions: q.sub_questions
          }))
        };
      } else if (activeTab === 'json' && parsedJson) {
        examContent = parsedJson;
      }

      setPreviewData({
        ...formData,
        content: examContent,
      });
    }
  }, [formData, questions, activeTab, parsedJson]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                  {isEditing ? 'Edit Exam' : 'Create New Exam'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isEditing ? 'Update exam details and content' : 'Fill in the details on the left and see live preview on the right'}
                </p>
              </div>
              {isDraft && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  Draft
                </Badge>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/admin')}>
                Cancel
              </Button>
              <Button variant="outline" onClick={saveDraft} disabled={loading || uploading}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button 
                onClick={() => {
                  generatePreview();
                  setShowPreview(true);
                }} 
                variant="outline"
                disabled={loading || uploading}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handlePublish} disabled={loading || uploading}>
                Publish
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Dialog with Scrollbar */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Exam Preview
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
                
                {previewData.content?.questions && (
                  <div>
                    <h4 className="font-semibold mb-4">Questions ({previewData.content.questions.length})</h4>
                    <div className="space-y-4">
                      {previewData.content.questions.map((q: any, index: number) => (
                        <Card key={q.id} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start gap-2">
                              <Badge variant="outline">{index + 1}</Badge>
                              <p className="font-medium">{q.text}</p>
                            </div>
                            {q.type === 'multiple_choice' && (
                              <div className="pl-8 space-y-1">
                                {q.answers.map((answer: any, aIndex: number) => (
                                  <div key={answer.id} className={`flex items-center gap-2 p-2 rounded ${answer.is_correct ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                    <span className="text-sm font-mono">
                                      {String.fromCharCode(65 + aIndex)}.
                                    </span>
                                    <span className={answer.is_correct ? 'font-medium text-green-800' : ''}>
                                      {answer.text}
                                    </span>
                                    {answer.is_correct && (
                                      <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.type === 'long_form' && (
                              <div className="pl-8 space-y-2">
                                <div className="bg-green-50 p-3 rounded border border-green-200">
                                  <p className="text-xs font-medium text-green-800 mb-1">Expected Answer:</p>
                                  <p className="text-sm text-green-700">{q.answers[0]?.text || 'Not provided'}</p>
                                </div>
                                {q.sub_questions && q.sub_questions.length > 0 && (
                                  <div className="space-y-2 mt-3">
                                    <p className="text-sm font-medium text-muted-foreground">Sub-questions:</p>
                                    {q.sub_questions.map((subQ: any, subIndex: number) => (
                                      <div key={subQ.id} className="ml-4 p-3 bg-muted/50 rounded border">
                                        <div className="flex items-start gap-2 mb-2">
                                          <Badge variant="outline" className="text-xs">
                                            {index + 1}.{String.fromCharCode(97 + subIndex)}
                                          </Badge>
                                          <p className="text-sm font-medium">{subQ.text}</p>
                                        </div>
                                        <div className="ml-6 bg-green-50 p-2 rounded border border-green-200">
                                          <p className="text-xs font-medium text-green-800 mb-1">Expected Answer:</p>
                                          <p className="text-xs text-green-700">{subQ.answers[0]?.text || 'Not provided'}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Resizable 2-Column Layout */}
      <div className="max-w-full mx-auto p-6">
        <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-180px)] rounded-lg border">
          {/* LEFT PANEL - Resizable Input Form */}
          <ResizablePanel defaultSize={35} minSize={20} maxSize={60}>
            <div className="h-full overflow-y-auto p-6 bg-gradient-to-br from-background to-muted/20">
              <div className="space-y-6">
                <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Exam Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Fluid Layout - Each field on its own row */}
                    <div className="space-y-4">
                      <div className="w-full">
                        <Label htmlFor="title" className="text-sm font-medium">Exam Title</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Enter exam title..."
                          className="mt-1.5"
                          required
                        />
                      </div>

                      <div className="w-full">
                        <Label htmlFor="subject" className="text-sm font-medium">Subject</Label>
                        <Input
                          id="subject"
                          value={formData.subject}
                          onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                          placeholder="Enter subject..."
                          className="mt-1.5"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="year" className="text-sm font-medium">Year</Label>
                          <Input
                            id="year"
                            type="number"
                            value={formData.year}
                            onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                            className="mt-1.5"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="exam_type" className="text-sm font-medium">Type</Label>
                          <Input
                            id="exam_type"
                            value={formData.exam_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, exam_type: e.target.value }))}
                            placeholder="Test, Exam..."
                            className="mt-1.5"
                            required
                          />
                        </div>
                      </div>

                      <div className="w-full">
                        <Label htmlFor="class_id" className="text-sm font-medium">Class</Label>
                        <Select value={formData.class_id} onValueChange={(value) => setFormData(prev => ({ ...prev, class_id: value }))}>
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.display_name} ({cls.section})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="period" className="text-sm font-medium">Period</Label>
                          <Input
                            id="period"
                            value={formData.period}
                            onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value }))}
                            placeholder="1st Semester..."
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="duration" className="text-sm font-medium">Duration (min)</Label>
                          <Input
                            id="duration"
                            type="number"
                            value={formData.duration_minutes}
                            onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                            className="mt-1.5"
                          />
                        </div>
                      </div>

                      <div className="w-full">
                        <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Brief description of the exam..."
                          className="mt-1.5"
                          rows={3}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Content Creation Methods */}
                <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Exam Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="form" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Form Builder
                </TabsTrigger>
                <TabsTrigger value="json" className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  JSON Data
                </TabsTrigger>
                <TabsTrigger value="pdf" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  PDF Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="form" className="space-y-6 mt-6">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Questions</Label>
                  <Button type="button" onClick={addQuestion} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>

                {questions.map((question, qIndex) => (
                  <Card key={question.id} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Question {qIndex + 1}</Label>
                        <div className="flex gap-2">
                          <Select value={question.type} onValueChange={(value) => changeQuestionType(question.id, value)}>
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                              <SelectItem value="long_form">Long Form</SelectItem>
                            </SelectContent>
                          </Select>
                          {questions.length > 1 && (
                            <Button 
                              type="button" 
                              onClick={() => removeQuestion(question.id)}
                              size="sm"
                              variant="destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <Textarea
                        placeholder="Enter your question..."
                        value={question.text}
                        onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                        required
                      />
                      
                      {question.type === 'multiple_choice' ? (
                        <div className="space-y-2">
                          <Label>Answer Options</Label>
                          {question.answers.map((answer, aIndex) => (
                            <div key={answer.id} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name={`correct-${question.id}`}
                                checked={answer.is_correct}
                                onChange={() => setCorrectAnswer(question.id, answer.id)}
                              />
                              <Input
                                placeholder={`Option ${aIndex + 1}`}
                                value={answer.text}
                                onChange={(e) => updateAnswer(question.id, answer.id, 'text', e.target.value)}
                                required
                              />
                            </div>
                          ))}
                          <p className="text-sm text-muted-foreground">
                            Select the correct answer using the radio buttons
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Expected Answer/Keywords (for evaluation)</Label>
                            <Textarea
                              placeholder="Enter the expected answer or key points that should be included in a good answer..."
                              value={question.answers[0]?.text || ''}
                              onChange={(e) => updateAnswer(question.id, question.answers[0]?.id, 'text', e.target.value)}
                              rows={3}
                            />
                            <p className="text-sm text-muted-foreground">
                              This will be used for evaluation purposes and won't be shown to students
                            </p>
                          </div>

                          {/* Sub-questions for long_form questions */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">Sub-questions</Label>
                              <Button 
                                type="button" 
                                onClick={() => addSubQuestion(question.id)}
                                size="sm"
                                variant="outline"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Sub-question
                              </Button>
                            </div>
                            
                            {question.sub_questions?.map((subQuestion, subIndex) => (
                              <Card key={subQuestion.id} className="ml-6 p-3 bg-muted/30">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-sm">Sub-question {qIndex + 1}.{String.fromCharCode(97 + subIndex)}</Label>
                                    <Button 
                                      type="button" 
                                      onClick={() => removeSubQuestion(question.id, subQuestion.id)}
                                      size="sm"
                                      variant="destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <Textarea
                                    placeholder={`Enter sub-question ${String.fromCharCode(97 + subIndex)})...`}
                                    value={subQuestion.text}
                                    onChange={(e) => updateSubQuestion(question.id, subQuestion.id, 'text', e.target.value)}
                                    rows={2}
                                  />
                                  <div>
                                    <Label className="text-xs">Expected Answer/Keywords</Label>
                                    <Textarea
                                      placeholder="Enter expected answer for this sub-question..."
                                      value={subQuestion.answers[0]?.text || ''}
                                      onChange={(e) => updateSubQuestionAnswer(question.id, subQuestion.id, subQuestion.answers[0]?.id, 'text', e.target.value)}
                                      rows={2}
                                      className="text-sm"
                                    />
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="json" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <div>
                    <Label>JSON Data</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Enter the exam content in JSON format. The structure should include a "questions" array with proper question and answer objects.
                    </p>
                    <Textarea
                      value={jsonData}
                      onChange={(e) => handleJsonChange(e.target.value)}
                      placeholder={`{
  "questions": [
    {
      "id": "q1",
      "text": "What is the capital of France?",
      "type": "multiple_choice",
      "answers": [
        {"id": "a1", "text": "Paris", "is_correct": true},
        {"id": "a2", "text": "London", "is_correct": false},
        {"id": "a3", "text": "Berlin", "is_correct": false},
        {"id": "a4", "text": "Madrid", "is_correct": false}
      ]
    },
    {
      "id": "q2",
      "text": "Analyze the following text:",
      "type": "long_form",
      "answers": [
        {"id": "a5", "text": "Expected analysis points...", "is_correct": true}
      ],
      "sub_questions": [
        {
          "id": "q2_a",
          "text": "a) Identify the main theme",
          "type": "long_form",
          "answers": [
            {"id": "a6", "text": "Main theme should be...", "is_correct": true}
          ]
        },
        {
          "id": "q2_b", 
          "text": "b) Explain the author's arguments",
          "type": "long_form",
          "answers": [
            {"id": "a7", "text": "Arguments include...", "is_correct": true}
          ]
        }
      ]
    }
  ]
}`}
                      rows={15}
                      className="font-mono"
                    />
                  </div>
                  {jsonError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <p className="text-sm text-destructive">{jsonError}</p>
                    </div>
                  )}
                  {parsedJson && !jsonError && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                      <div className="flex items-center gap-2 text-green-600">
                        <FileCheck className="h-4 w-4" />
                        <p className="text-sm">JSON is valid! Found {parsedJson.questions?.length || 0} questions.</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="pdf" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <div>
                    <Label>PDF File Upload</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload a PDF file containing the exam questions. This will be stored and can be downloaded by students.
                    </p>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                  </div>
                  {selectedFile && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                      <p className="text-sm text-blue-600">
                        Selected file: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    </div>
                  )}
                  {formData.file_url && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                      <p className="text-sm text-green-600">
                        Current PDF: <a href={formData.file_url} target="_blank" rel="noopener noreferrer" className="underline">View PDF</a>
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>
          </ResizablePanel>

          {/* Resizable Handle */}
          <ResizableHandle withHandle className="bg-border hover:bg-primary/20 transition-colors" />

          {/* RIGHT PANEL - Live Preview */}
          <ResizablePanel defaultSize={65} minSize={40}>
            <div className="h-full overflow-y-auto p-6 bg-gradient-to-br from-muted/10 to-background">
              <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg h-full flex flex-col">
                <CardHeader className="flex-shrink-0 border-b bg-muted/30">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Eye className="h-5 w-5 text-primary" />
                    Live Preview - All Questions & Answers
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-4 p-6">
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
                    
                    {previewData.content?.questions && previewData.content.questions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-3">
                          Questions ({previewData.content.questions.length})
                        </h4>
                        <div className="space-y-4">
                          {previewData.content.questions.map((q: any, index: number) => (
                            <Card key={q.id} className="p-4 bg-muted/30">
                              <div className="space-y-3">
                                <div className="flex items-start gap-2">
                                  <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                                  <p className="text-sm font-medium flex-1">{q.text || 'Empty question'}</p>
                                </div>
                                {q.type === 'multiple_choice' && q.answers && (
                                  <div className="pl-8 space-y-1.5">
                                    {q.answers.map((answer: any, aIndex: number) => (
                                      <div key={answer.id} className={`text-xs p-2 rounded flex items-center gap-2 ${answer.is_correct ? 'bg-green-100 text-green-800 font-medium border border-green-300' : 'bg-background'}`}>
                                        <span className="font-mono">{String.fromCharCode(65 + aIndex)}.</span>
                                        <span className="flex-1">{answer.text || 'Empty answer'}</span>
                                        {answer.is_correct && <CheckCircle className="h-3 w-3 text-green-600" />}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {q.type === 'long_form' && (
                                  <div className="pl-8 space-y-3">
                                    <div className="bg-green-50 p-2 rounded border border-green-200">
                                      <p className="text-xs font-medium text-green-800 mb-1">Expected Answer:</p>
                                      <p className="text-xs text-green-700">{q.answers[0]?.text || 'Not provided'}</p>
                                    </div>
                                    {q.sub_questions && q.sub_questions.length > 0 && (
                                      <div className="space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground">Sub-questions ({q.sub_questions.length}):</p>
                                        {q.sub_questions.map((subQ: any, subIndex: number) => (
                                          <div key={subQ.id} className="ml-4 p-2 bg-background rounded border">
                                            <div className="flex items-start gap-2 mb-2">
                                              <Badge variant="outline" className="text-xs">
                                                {index + 1}.{String.fromCharCode(97 + subIndex)}
                                              </Badge>
                                              <p className="text-xs font-medium flex-1">{subQ.text || 'Empty sub-question'}</p>
                                            </div>
                                            <div className="ml-6 bg-green-50 p-2 rounded border border-green-200">
                                              <p className="text-xs font-medium text-green-800 mb-1">Expected Answer:</p>
                                              <p className="text-xs text-green-700">{subQ.answers[0]?.text || 'Not provided'}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!previewData.content?.questions || previewData.content.questions.length === 0) && (
                      <div className="text-center py-12 text-muted-foreground">
                        <p className="text-sm">No questions added yet</p>
                        <p className="text-xs mt-1">Add questions to see them here</p>
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
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}