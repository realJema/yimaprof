import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import {
  BookOpen,
  Plus,
  Trash2,
  Upload,
  FileText,
  Code2,
  FileCheck,
  Save,
  Eye,
  AlertCircle,
  X,
  CheckCircle,
  Edit2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ExamContentRenderer } from "@/components/exam/ExamContentRenderer";
import { EditableExamContentRenderer } from "@/components/exam/EditableExamContentRenderer";
import { EXAM_JSON_TEMPLATE } from "@/components/exam/ExamJsonTemplate";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useExamFormData } from "@/hooks/useExamFormData";
import { AddNewItemDialog } from "@/components/admin/AddNewItemDialog";
import { useQueryClient } from '@tanstack/react-query';
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
  establishment_id?: string;
  subject_id?: string;
  exam_type_id?: string;
  period_id?: string;
  academic_year_id?: string;
  duration_id?: string;
}
const generateId = () => Math.random().toString(36).substr(2, 9);
export default function ExamManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { examId } = useParams();
  const isEditing = !!examId;
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Fetch form dropdown data
  const formOptions = useExamFormData();
  
  // State for "Add New" dialogs
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddEstablishment, setShowAddEstablishment] = useState(false);
  const [showAddYear, setShowAddYear] = useState(false);
  const [showAddDuration, setShowAddDuration] = useState(false);

  // Form data
  const [formData, setFormData] = useState<ExamData>({
    title: "",
    subject: "",
    year: new Date().getFullYear(),
    exam_type: "",
    class_id: "",
    description: "",
    is_published: false,
    period: "",
    language: "fr",
    duration_minutes: 120,
    tags: [],
  });

  // Questions for form-based creation
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: generateId(),
      text: "",
      type: "multiple_choice",
      answers: [
        {
          id: generateId(),
          text: "",
          is_correct: false,
        },
        {
          id: generateId(),
          text: "",
          is_correct: false,
        },
        {
          id: generateId(),
          text: "",
          is_correct: false,
        },
        {
          id: generateId(),
          text: "",
          is_correct: false,
        },
      ],
    },
  ]);

  // JSON data
  const [jsonData, setJsonData] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [parsedJson, setParsedJson] = useState<any>(null);

  // PDF upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Draft and preview functionality
  const [isDraft, setIsDraft] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isCardCollapsed, setIsCardCollapsed] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);

  useEffect(() => {
    fetchClasses();
    if (isEditing) {
      setInitialLoading(true);
      fetchExamData();
    }
  }, [examId]);
  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase.from("classes").select("*").order("display_name");
      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };
  const fetchExamData = async () => {
    if (!examId) return;
    try {
      setLoading(true);
      setInitialLoading(true);
      const { data, error } = await supabase.from("exams").select("*").eq("id", examId).single();
      if (error) throw error;

      const examFormData = {
        title: data.title,
        subject: data.subject,
        year: data.year,
        exam_type: data.exam_type,
        class_id: data.class_id,
        description: data.description || "",
        is_published: data.is_published,
        period: data.period || "",
        language: data.language || "fr",
        duration_minutes: data.duration_minutes || 120,
        tags: data.tags || [],
        file_url: data.file_url || "",
      };

      setFormData(examFormData);

      // Load JSON content and questions
      if (data.content) {
        const contentString = JSON.stringify(data.content, null, 2);
        setJsonData(contentString);
        validateJson(contentString);

        // Load questions if available for form-based editing
        if (typeof data.content === "object" && "questions" in data.content && Array.isArray(data.content.questions)) {
          setQuestions(data.content.questions as unknown as Question[]);
        }

        // Set preview data immediately
        setPreviewData({
          ...examFormData,
          content: data.content,
        });
      }
    } catch (error) {
      console.error("Error fetching exam:", error);
      toast({
        title: "Error",
        description: "Failed to fetch exam data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };
  
  // Handlers for adding new items
  const handleAddSubject = async (name: string, translations: { en: string; fr: string }) => {
    try {
      const { error } = await supabase
        .from('subjects')
        .insert({ name, name_en: translations.en, name_fr: translations.fr });
      
      if (error) throw error;
      toast({ title: t('examSuccessSubject') });
      formOptions.refetchSubjects();
    } catch (error) {
      console.error('Error adding subject:', error);
      toast({ 
        title: t('examErrorAdding'),
        variant: 'destructive' 
      });
    }
  };

  const handleAddEstablishment = async (name: string) => {
    try {
      const { error } = await supabase
        .from('establishments')
        .insert({ name, type: 'Lycée', country: 'CI' });
      
      if (error) throw error;
      toast({ title: t('examSuccessSchool') });
      formOptions.refetchEstablishments();
    } catch (error) {
      console.error('Error adding establishment:', error);
      toast({ 
        title: t('examErrorAdding'),
        variant: 'destructive' 
      });
    }
  };

  const handleAddYear = async (yearLabel: string) => {
    try {
      const years = yearLabel.split('-');
      if (years.length !== 2) {
        toast({ 
          title: t('error'),
          description: 'Year format should be YYYY-YYYY (e.g., 2024-2025)',
          variant: 'destructive' 
        });
        return;
      }
      
      const startYear = parseInt(years[0]);
      const endYear = parseInt(years[1]);
      
      const { error } = await supabase
        .from('academic_years')
        .insert({ year_label: yearLabel, start_year: startYear, end_year: endYear });
      
      if (error) throw error;
      toast({ title: t('examSuccessYear') });
      formOptions.refetchAcademicYears();
    } catch (error) {
      console.error('Error adding academic year:', error);
      toast({ 
        title: t('examErrorAdding'),
        variant: 'destructive' 
      });
    }
  };

  const handleAddDuration = async (minutes: string) => {
    try {
      const min = parseInt(minutes);
      if (isNaN(min) || min <= 0) {
        toast({ 
          title: t('error'),
          description: 'Duration must be a positive number',
          variant: 'destructive' 
        });
        return;
      }
      
      const hours = Math.floor(min / 60);
      const remainingMins = min % 60;
      const label = hours > 0 
        ? (remainingMins > 0 ? `${hours}h${remainingMins}` : `${hours}h`)
        : `${min} min`;
      
      const { error } = await supabase
        .from('durations')
        .insert({ minutes: min, display_label: label });
      
      if (error) throw error;
      toast({ title: t('examSuccessDuration') });
      formOptions.refetchDurations();
    } catch (error) {
      console.error('Error adding duration:', error);
      toast({ 
        title: t('examErrorAdding'),
        variant: 'destructive' 
      });
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
        const validItemTypes = ["heading", "instruction", "passage", "question", "image"];
        if (!validItemTypes.includes(item.item_type)) {
          throw new Error(`Item ${index + 1} has invalid item_type: ${item.item_type}`);
        }

        // Validate questions
        if (item.item_type === "question") {
          if (!item.question_type || !item.text) {
            throw new Error(`Question item ${index + 1} must have question_type and text`);
          }
          const validQuestionTypes = ["multiple_choice", "long_form"];
          if (!validQuestionTypes.includes(item.question_type)) {
            throw new Error(`Question ${index + 1} has invalid question_type: ${item.question_type}`);
          }

          // Validate answers
          if (item.answers && Array.isArray(item.answers)) {
            item.answers.forEach((a: any, aIndex: number) => {
              if (!a.id || !a.text || typeof a.is_correct !== "boolean") {
                throw new Error(
                  `Answer ${aIndex + 1} in question ${index + 1} must have id, text, and is_correct fields`,
                );
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
                  if (!a.id || !a.text || typeof a.is_correct !== "boolean") {
                    throw new Error(
                      `Answer ${aIndex + 1} in sub-question ${subIndex + 1} of question ${index + 1} must have id, text, and is_correct`,
                    );
                  }
                });
              }
            });
          }
        }

        // Validate images
        if (item.item_type === "image" && item.assets) {
          if (!Array.isArray(item.assets)) {
            throw new Error(`Image item ${index + 1} assets must be an array`);
          }
        }
      };
      items.forEach((item, index) => validateItem(item, index));
      setJsonError("");
      setParsedJson(
        Array.isArray(parsed)
          ? parsed
          : {
              questions: parsed.questions,
            },
      );
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
      const isValid = validateJson(value);
      if (isValid) {
        // Update preview when JSON changes
        setPreviewData({
          ...formData,
          content: parsedJson,
        });
      }
    } else {
      setJsonError("");
      setParsedJson(null);
    }
  };

  const handleContentChange = (newContent: any) => {
    // Update the parsed JSON
    setParsedJson(newContent);

    // Update the JSON string
    const newJsonString = JSON.stringify(newContent, null, 2);
    setJsonData(newJsonString);

    // Update preview
    setPreviewData({
      ...formData,
      content: newContent,
    });
  };
  const uploadPdfFile = async (file: File): Promise<string> => {
    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      console.log("Uploading file:", fileName, "to papers bucket");
      const { data, error } = await supabase.storage.from("papers").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) {
        console.error("Upload error:", error);
        throw error;
      }
      console.log("Upload successful:", data);
      const { data: urlData } = supabase.storage.from("papers").getPublicUrl(fileName);
      console.log("Public URL:", urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error("PDF upload failed:", error);
      throw new Error(`Failed to upload PDF: ${error.message}`);
    }
  };
  const validateFormData = () => {
    const errors = [];
    if (!formData.title.trim()) errors.push("Title is required");
    if (!formData.subject.trim()) errors.push("Subject is required");
    if (!formData.class_id) errors.push("Class is required");
    if (!formData.exam_type.trim()) errors.push("Exam type is required");
    if (!parsedJson) {
      errors.push("Valid JSON content is required");
    }
    return errors;
  };
  const generatePreview = () => {
    const errors = validateFormData();
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(", "),
        variant: "destructive",
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
          title: "PDF not uploaded",
          description: "Please upload the PDF file before saving",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const examData = {
        ...formData,
        content: parsedJson,
        file_url: fileUrl,
        created_by: user?.id || "",
        is_published: false,
      };
      if (isEditing) {
        const { error } = await supabase.from("exams").update(examData).eq("id", examId);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Draft saved successfully",
        });
      } else {
        const { data, error } = await supabase.from("exams").insert(examData).select().single();
        if (error) throw error;
        setIsDraft(true);
        toast({
          title: "Success",
          description: "Draft saved successfully",
        });
        if (data?.id) {
          window.history.replaceState({}, "", `/admin/exam/edit/${data.id}`);
        }
      }
      navigate("/admin");
    } catch (error) {
      console.error("Error saving draft:", error);
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
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
        title: "Validation Error",
        description: errors.join(", "),
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      // Only upload if there's a selected file that hasn't been uploaded yet
      let fileUrl = formData.file_url;
      if (selectedFile && !formData.file_url) {
        toast({
          title: "PDF not uploaded",
          description: "Please upload the PDF file before publishing",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const examData = {
        ...formData,
        content: parsedJson,
        file_url: fileUrl,
        created_by: user?.id || "",
        is_published: shouldPublish,
      };
      if (isEditing) {
        const { error } = await supabase.from("exams").update(examData).eq("id", examId);
        if (error) throw error;
        toast({
          title: "Success",
          description: shouldPublish ? "Exam published successfully" : "Exam updated successfully",
        });
      } else {
        const { error } = await supabase.from("exams").insert(examData);
        if (error) throw error;
        toast({
          title: "Success",
          description: shouldPublish ? "Exam published successfully" : "Exam created successfully",
        });
      }
      navigate("/admin");
    } catch (error) {
      console.error("Error saving exam:", error);
      toast({
        title: "Error",
        description: `Failed to save exam: ${error.message || "Unknown error"}`,
        variant: "destructive",
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
    navigate("/admin?tab=exams");
  };
  const handlePublishAndCreateAnother = async () => {
    const errors = validateFormData();
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(", "),
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      let fileUrl = formData.file_url;
      if (selectedFile && !formData.file_url) {
        toast({
          title: "PDF not uploaded",
          description: "Please upload the PDF file before publishing",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const examData = {
        ...formData,
        content: parsedJson,
        file_url: fileUrl,
        created_by: user?.id || "",
        is_published: true,
      };
      const { error } = await supabase.from("exams").insert(examData);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Exam published successfully! You can create another exam now.",
      });

      // Reset form for new exam
      setFormData({
        title: "",
        subject: "",
        year: new Date().getFullYear(),
        exam_type: "",
        class_id: "",
        description: "",
        is_published: false,
        period: "",
        language: "fr",
        duration_minutes: 120,
        tags: [],
      });
      setJsonData("");
      setSelectedFile(null);
      setParsedJson(null);
    } catch (error) {
      console.error("Error publishing exam:", error);
      toast({
        title: "Error",
        description: `Failed to publish exam: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: generateId(),
        text: "",
        type: "multiple_choice",
        answers: [
          {
            id: generateId(),
            text: "",
            is_correct: false,
          },
          {
            id: generateId(),
            text: "",
            is_correct: false,
          },
          {
            id: generateId(),
            text: "",
            is_correct: false,
          },
          {
            id: generateId(),
            text: "",
            is_correct: false,
          },
        ],
      },
    ]);
  };
  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter((q) => q.id !== questionId));
  };
  const updateQuestion = (questionId: string, field: string, value: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              [field]: value,
            }
          : q,
      ),
    );
  };
  const updateAnswer = (questionId: string, answerId: string, field: string, value: string | boolean) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              answers: q.answers.map((a) =>
                a.id === answerId
                  ? {
                      ...a,
                      [field]: value,
                    }
                  : a,
              ),
            }
          : q,
      ),
    );
  };
  const setCorrectAnswer = (questionId: string, answerId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              answers: q.answers.map((a) => ({
                ...a,
                is_correct: a.id === answerId,
              })),
            }
          : q,
      ),
    );
  };
  const changeQuestionType = (questionId: string, newType: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          if (newType === "long_form") {
            return {
              ...q,
              type: newType,
              answers: [
                {
                  id: generateId(),
                  text: "",
                  is_correct: true,
                },
              ],
              sub_questions: [],
            };
          } else {
            const { sub_questions, ...questionWithoutSubs } = q;
            return {
              ...questionWithoutSubs,
              type: newType,
              answers: [
                {
                  id: generateId(),
                  text: "",
                  is_correct: false,
                },
                {
                  id: generateId(),
                  text: "",
                  is_correct: false,
                },
                {
                  id: generateId(),
                  text: "",
                  is_correct: false,
                },
                {
                  id: generateId(),
                  text: "",
                  is_correct: false,
                },
              ],
            };
          }
        }
        return q;
      }),
    );
  };
  const addSubQuestion = (parentQuestionId: string) => {
    const newSubQuestion: Question = {
      id: generateId(),
      text: "",
      type: "long_form",
      answers: [
        {
          id: generateId(),
          text: "",
          is_correct: true,
        },
      ],
    };
    setQuestions(
      questions.map((q) => {
        if (q.id === parentQuestionId && q.type === "long_form") {
          return {
            ...q,
            sub_questions: [...(q.sub_questions || []), newSubQuestion],
          };
        }
        return q;
      }),
    );
  };
  const removeSubQuestion = (parentQuestionId: string, subQuestionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === parentQuestionId) {
          return {
            ...q,
            sub_questions: q.sub_questions?.filter((sq) => sq.id !== subQuestionId) || [],
          };
        }
        return q;
      }),
    );
  };
  const updateSubQuestion = (parentQuestionId: string, subQuestionId: string, field: string, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === parentQuestionId) {
          return {
            ...q,
            sub_questions:
              q.sub_questions?.map((sq) =>
                sq.id === subQuestionId
                  ? {
                      ...sq,
                      [field]: value,
                    }
                  : sq,
              ) || [],
          };
        }
        return q;
      }),
    );
  };
  const updateSubQuestionAnswer = (
    parentQuestionId: string,
    subQuestionId: string,
    answerId: string,
    field: string,
    value: string | boolean,
  ) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === parentQuestionId) {
          return {
            ...q,
            sub_questions:
              q.sub_questions?.map((sq) => {
                if (sq.id === subQuestionId) {
                  return {
                    ...sq,
                    answers: sq.answers.map((a) =>
                      a.id === answerId
                        ? {
                            ...a,
                            [field]: value,
                          }
                        : a,
                    ),
                  };
                }
                return sq;
              }) || [],
          };
        }
        return q;
      }),
    );
  };

  // Auto-generate preview when data changes
  useEffect(() => {
    if (!initialLoading && (formData.title || formData.subject || parsedJson)) {
      setPreviewData({
        ...formData,
        content: parsedJson,
      });
    }
  }, [formData, parsedJson, initialLoading]);
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm"></div>

      {/* Full Screen Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              {t("preview")}
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
                    <p className="text-sm text-muted-foreground">Duration: {previewData.duration_minutes} minutes</p>
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
                    <ExamContentRenderer content={previewData.content} showAnswers={true} mode="preview" />
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content - Full Preview */}
      <div className="h-screen overflow-y-auto pb-0">
        {formData.file_url ? (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full overflow-y-auto">
                <div className="w-full p-3 md:p-6 space-y-4 md:space-y-6">
                  {initialLoading ? (
                    <>
                      <Skeleton className="h-48 w-full rounded-lg" />
                      <Skeleton className="h-96 w-full rounded-lg" />
                    </>
                  ) : (
                    <>
                      {/* Exam Details Card */}
                      {(formData.title || formData.subject) && (
                        <div className="bg-card rounded-lg border p-4 md:p-6 shadow-medium">
                          <div className="space-y-4">
                            <div>
                              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                                {formData.title || "Untitled Exam"}
                              </h1>
                              <p className="text-base md:text-lg text-muted-foreground mt-1">
                                {formData.subject || "No Subject"}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm">
                              {formData.exam_type && (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">Type:</span>
                                  <Badge variant="secondary">{formData.exam_type}</Badge>
                                </div>
                              )}
                              {formData.year && (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">Year:</span>
                                  <Badge variant="outline">{formData.year}</Badge>
                                </div>
                              )}
                              {formData.period && (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">Period:</span>
                                  <Badge variant="outline">{formData.period}</Badge>
                                </div>
                              )}
                              {formData.duration_minutes && (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">Duration:</span>
                                  <Badge variant="outline">{formData.duration_minutes} minutes</Badge>
                                </div>
                              )}
                              {formData.language && (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">Language:</span>
                                  <Badge variant="outline">{formData.language === "fr" ? "Français" : "English"}</Badge>
                                </div>
                              )}
                            </div>

                            {formData.description && (
                              <div className="pt-2 border-t">
                                <p className="text-sm text-muted-foreground">{formData.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Exam Content Preview - Editable */}
                      {parsedJson && (
                        <div className="bg-card rounded-lg border p-4 md:p-6 shadow-strong">
                          <div className="flex items-center justify-between mb-4 pb-2 border-b">
                            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                              <Edit2 className="h-4 w-4" />
                              Click on any text to edit
                            </h3>
                          </div>
                          <EditableExamContentRenderer
                            content={parsedJson}
                            onContentChange={handleContentChange}
                            showAnswers={true}
                          />
                        </div>
                      )}
                      {!parsedJson && (
                        <div className="flex items-center justify-center h-96 text-muted-foreground">
                          <div className="text-center">
                            <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Add exam content below to see the preview</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full bg-muted/30 flex flex-col">
                <div className="border-b bg-card px-4 py-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {t("pdf_preview")}
                  </h3>
                </div>
                <div className="flex-1 overflow-hidden">
                  <iframe src={formData.file_url} className="w-full h-full border-0" title="PDF Preview" />
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="w-full p-3 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
            {initialLoading ? (
              <>
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-96 w-full rounded-lg" />
              </>
            ) : (
              <>
                {/* Exam Details Card */}
                {(formData.title || formData.subject) && (
                  <div className="bg-card rounded-lg border p-4 md:p-6 shadow-medium">
                    <div className="space-y-4">
                      <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                          {formData.title || "Untitled Exam"}
                        </h1>
                        <p className="text-base md:text-lg text-muted-foreground mt-1">
                          {formData.subject || "No Subject"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm">
                        {formData.exam_type && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">Type:</span>
                            <Badge variant="secondary">{formData.exam_type}</Badge>
                          </div>
                        )}
                        {formData.year && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">Year:</span>
                            <Badge variant="outline">{formData.year}</Badge>
                          </div>
                        )}
                        {formData.period && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">Period:</span>
                            <Badge variant="outline">{formData.period}</Badge>
                          </div>
                        )}
                        {formData.duration_minutes && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">Duration:</span>
                            <Badge variant="outline">{formData.duration_minutes} minutes</Badge>
                          </div>
                        )}
                        {formData.language && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">Language:</span>
                            <Badge variant="outline">{formData.language === "fr" ? "Français" : "English"}</Badge>
                          </div>
                        )}
                      </div>

                      {formData.description && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground">{formData.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Exam Content Preview - Editable */}
                {parsedJson && (
                  <div className="bg-card rounded-lg border p-4 md:p-6 shadow-strong">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b">
                      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Edit2 className="h-4 w-4" />
                        {t("click_to_edit")}
                      </h3>
                    </div>
                    <EditableExamContentRenderer
                      content={parsedJson}
                      onContentChange={handleContentChange}
                      showAnswers={true}
                    />
                  </div>
                )}
                {!parsedJson && (
                  <div className="flex items-center justify-center h-96 text-muted-foreground">
                    <div className="text-center">
                      <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t("add_content_below")}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Floating Tabbed Card - Bottom */}
      <div className="fixed bottom-0 md:bottom-6 left-0 md:left-1/2 md:-translate-x-1/2 w-full md:w-[90%] max-w-5xl z-40">
        <Card className="border-t-2 md:border-2 md:rounded-lg rounded-t-lg shadow-2xl bg-card backdrop-blur-lg transition-all duration-300">
          {!isCardCollapsed && (
            <Tabs defaultValue="details" className="w-full">
              <div className="border-b px-3 md:px-6 pt-3 md:pt-4 overflow-x-auto">
                <TabsList className="w-full md:w-auto justify-start h-auto p-0 bg-transparent inline-flex">
                  <TabsTrigger
                    value="details"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-sm md:text-base px-3 md:px-4 py-2 whitespace-nowrap"
                  >
                    <FileCheck className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                    <span className="hidden sm:inline">{t("exam_details")}</span>
                    <span className="sm:hidden">Details</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="class"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-sm md:text-base px-3 md:px-4 py-2 whitespace-nowrap"
                  >
                    <BookOpen className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                    <span className="hidden sm:inline">Class & Settings</span>
                    <span className="sm:hidden">Class</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="pdf"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-sm md:text-base px-3 md:px-4 py-2 whitespace-nowrap"
                  >
                    <Upload className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                    PDF
                  </TabsTrigger>
                  <TabsTrigger
                    value="json"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-sm md:text-base px-3 md:px-4 py-2 whitespace-nowrap"
                  >
                    <Code2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                    JSON
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="max-h-[40vh] md:max-h-[50vh] overflow-y-auto">
                {/* Details Tab */}
                <TabsContent value="details" className="p-4 md:p-6 mt-0 space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-xs">
                      {t("exam_title")} *
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="e.g., Mathematics Final Exam"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Establishment/School */}
                    <div>
                      <Label htmlFor="establishment" className="text-xs">
                        {t("examSchool")}
                      </Label>
                      <Select
                        value={formData.establishment_id}
                        onValueChange={(value) => {
                          if (value === '__add_new__') {
                            setShowAddEstablishment(true);
                          } else {
                            setFormData((prev) => ({ ...prev, establishment_id: value }));
                          }
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={t("examSelectSchool")} />
                        </SelectTrigger>
                        <SelectContent>
                          {formOptions.establishments?.map((school) => (
                            <SelectItem key={school.id} value={school.id}>
                              {school.name}
                            </SelectItem>
                          ))}
                          <Separator className="my-2" />
                          <SelectItem value="__add_new__" className="text-primary font-medium">
                            + {t("examAddNewSchool")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Subject */}
                    <div>
                      <Label htmlFor="subject" className="text-xs">
                        {t("subject")} *
                      </Label>
                      <Select
                        value={formData.subject_id}
                        onValueChange={(value) => {
                          if (value === '__add_new__') {
                            setShowAddSubject(true);
                          } else {
                            setFormData((prev) => ({ ...prev, subject_id: value }));
                          }
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={t("examSelectSubject")} />
                        </SelectTrigger>
                        <SelectContent>
                          {formOptions.subjects?.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {language === 'fr' ? subject.name_fr : subject.name_en}
                            </SelectItem>
                          ))}
                          <Separator className="my-2" />
                          <SelectItem value="__add_new__" className="text-primary font-medium">
                            + {t("examAddNewSubject")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Exam Type */}
                    <div>
                      <Label htmlFor="exam_type" className="text-xs">
                        {t("exam_type")} *
                      </Label>
                      <Select
                        value={formData.exam_type_id}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, exam_type_id: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={t("examSelectExamType")} />
                        </SelectTrigger>
                        <SelectContent>
                          {formOptions.examTypes?.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {language === 'fr' ? type.name_fr : type.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Class */}
                    <div>
                      <Label htmlFor="class" className="text-xs">
                        {t("class")} *
                      </Label>
                      <Select
                        value={formData.class_id}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, class_id: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={t("select_class")} />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Academic Year */}
                    <div>
                      <Label htmlFor="year" className="text-xs">
                        {t("year")} *
                      </Label>
                      <Select
                        value={formData.academic_year_id}
                        onValueChange={(value) => {
                          if (value === '__add_new__') {
                            setShowAddYear(true);
                          } else {
                            setFormData((prev) => ({ ...prev, academic_year_id: value }));
                          }
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={t("examSelectYear")} />
                        </SelectTrigger>
                        <SelectContent>
                          {formOptions.academicYears?.map((year) => (
                            <SelectItem key={year.id} value={year.id}>
                              {year.year_label}
                            </SelectItem>
                          ))}
                          <Separator className="my-2" />
                          <SelectItem value="__add_new__" className="text-primary font-medium">
                            + {t("examAddNewYear")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Period */}
                    <div>
                      <Label htmlFor="period" className="text-xs">
                        {t("period")}
                      </Label>
                      <Select
                        value={formData.period_id}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, period_id: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={t("examSelectPeriod")} />
                        </SelectTrigger>
                        <SelectContent>
                          {formOptions.periods?.map((period) => (
                            <SelectItem key={period.id} value={period.id}>
                              {language === 'fr' ? period.name_fr : period.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Duration */}
                    <div>
                      <Label htmlFor="duration" className="text-xs">
                        {t("duration")}
                      </Label>
                      <Select
                        value={formData.duration_id}
                        onValueChange={(value) => {
                          if (value === '__add_new__') {
                            setShowAddDuration(true);
                          } else {
                            setFormData((prev) => ({ ...prev, duration_id: value }));
                          }
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={t("examSelectDuration")} />
                        </SelectTrigger>
                        <SelectContent>
                          {formOptions.durations?.map((duration) => (
                            <SelectItem key={duration.id} value={duration.id}>
                              {duration.display_label}
                            </SelectItem>
                          ))}
                          <Separator className="my-2" />
                          <SelectItem value="__add_new__" className="text-primary font-medium">
                            + {t("examAddCustomDuration")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-xs">
                      {t("description")}
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder={t("description")}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tags" className="text-xs">
                      {t("tags")}
                    </Label>
                    <Input
                      id="tags"
                      value={formData.tags?.join(", ") || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tags: e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean),
                        }))
                      }
                      placeholder={t("enter_tags")}
                      className="mt-1"
                    />
                  </div>
                </TabsContent>

                {/* Class Tab */}
                <TabsContent value="class" className="p-6 mt-0 space-y-4">
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">{t("class")} *</Label>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">{t("francophone")}</p>
                        <RadioGroup
                          value={formData.class_id}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              class_id: value,
                            }))
                          }
                        >
                          <div className="grid grid-cols-2 gap-2">
                            {classes
                              .filter((cls) => cls.section === "francophone")
                              .map((cls) => (
                                <div
                                  key={cls.id}
                                  className="flex items-center space-x-2 border rounded-md p-2 hover:bg-muted/50 transition-colors"
                                >
                                  <RadioGroupItem value={cls.id} id={cls.id} />
                                  <Label htmlFor={cls.id} className="text-sm cursor-pointer flex-1">
                                    {cls.display_name}
                                  </Label>
                                </div>
                              ))}
                          </div>
                        </RadioGroup>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">{t("anglophone")}</p>
                        <RadioGroup
                          value={formData.class_id}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              class_id: value,
                            }))
                          }
                        >
                          <div className="grid grid-cols-2 gap-2">
                            {classes
                              .filter((cls) => cls.section === "anglophone")
                              .map((cls) => (
                                <div
                                  key={cls.id}
                                  className="flex items-center space-x-2 border rounded-md p-2 hover:bg-muted/50 transition-colors"
                                >
                                  <RadioGroupItem value={cls.id} id={cls.id} />
                                  <Label htmlFor={cls.id} className="text-sm cursor-pointer flex-1">
                                    {cls.display_name}
                                  </Label>
                                </div>
                              ))}
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-3 block">{t("language")} *</Label>
                    <RadioGroup
                      value={formData.language}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          language: value,
                        }))
                      }
                    >
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-muted/50 transition-colors flex-1">
                          <RadioGroupItem value="fr" id="lang-fr" />
                          <Label htmlFor="lang-fr" className="text-sm cursor-pointer flex-1">
                            Français
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-muted/50 transition-colors flex-1">
                          <RadioGroupItem value="en" id="lang-en" />
                          <Label htmlFor="lang-en" className="text-sm cursor-pointer flex-1">
                            English
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </TabsContent>

                {/* PDF Upload Tab */}
                <TabsContent value="pdf" className="p-6 mt-0 space-y-4">
                  <div>
                    <Label htmlFor="pdf-upload" className="text-xs">
                      {t("choose_file")}
                    </Label>
                    <div className="mt-1 space-y-2">
                      <Input
                        id="pdf-upload"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.type !== "application/pdf") {
                              toast({
                                title: "Invalid file",
                                description: "Please select a PDF file",
                                variant: "destructive",
                              });
                              return;
                            }
                            setSelectedFile(file);
                            toast({
                              title: "File selected",
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
                              const input = document.getElementById("pdf-upload") as HTMLInputElement;
                              if (input) input.value = "";
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
                              title: t("error"),
                              description: t("no_file_chosen"),
                              variant: "destructive",
                            });
                            return;
                          }
                          setUploading(true);
                          try {
                            const fileUrl = await uploadPdfFile(selectedFile);
                            setFormData((prev) => ({
                              ...prev,
                              file_url: fileUrl,
                            }));
                            toast({
                              title: t("success"),
                              description: "PDF uploaded successfully",
                            });
                            setSelectedFile(null);
                            const input = document.getElementById("pdf-upload") as HTMLInputElement;
                            if (input) input.value = "";
                          } catch (error) {
                            toast({
                              title: t("error"),
                              description: error.message || "Failed to upload PDF",
                              variant: "destructive",
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
                            {t("loading")}...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            {t("upload")}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* JSON Content Tab */}
                <TabsContent value="json" className="p-4 md:p-6 mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">JSON</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleJsonChange(EXAM_JSON_TEMPLATE)}
                      className="h-7 text-xs"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      {t("copy_template")}
                    </Button>
                  </div>
                  <Textarea
                    value={jsonData}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    placeholder='Click "Load Template" to see an example format'
                    rows={15}
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
                </TabsContent>
              </div>
            </Tabs>
          )}

          {/* Bottom Action Bar - moved from top */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 md:px-6 py-3 border-t bg-primary/10 gap-3">
            <div className="flex items-center gap-2 text-sm md:text-base font-semibold">
              <FileCheck className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              <span className="hidden sm:inline">Exam Editor</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveDraft}
                disabled={loading || uploading}
                className="text-xs md:text-sm flex-1 sm:flex-none"
              >
                <Save className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
                <span className="hidden sm:inline">{t("save_draft")}</span>
                <span className="sm:hidden">Save</span>
              </Button>
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={loading || uploading}
                className="text-xs md:text-sm flex-1 sm:flex-none"
              >
                <FileCheck className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
                <span className="hidden sm:inline">{t("publish_exam")}</span>
                <span className="sm:hidden">Publish</span>
              </Button>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePublishAndCreateAnother}
                  disabled={loading || uploading}
                  className="text-xs md:text-sm hidden lg:flex"
                >
                  <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
                  {t("publish_and_create_another")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCardCollapsed(!isCardCollapsed)}
                className="ml-auto sm:ml-2"
              >
                {isCardCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Add New Item Dialogs */}
      <AddNewItemDialog
        open={showAddSubject}
        onClose={() => setShowAddSubject(false)}
        onAdd={handleAddSubject}
        title={t("examAddingSubject")}
        fieldLabel={t("examSubject")}
        requiresTranslation={true}
      />

      <AddNewItemDialog
        open={showAddEstablishment}
        onClose={() => setShowAddEstablishment(false)}
        onAdd={handleAddEstablishment}
        title={t("examAddingSchool")}
        fieldLabel={t("examSchoolName")}
      />

      <AddNewItemDialog
        open={showAddYear}
        onClose={() => setShowAddYear(false)}
        onAdd={handleAddYear}
        title={t("examAddingYear")}
        fieldLabel={t("examYearFormat")}
        isYear={true}
      />

      <AddNewItemDialog
        open={showAddDuration}
        onClose={() => setShowAddDuration(false)}
        onAdd={handleAddDuration}
        title={t("examAddingDuration")}
        fieldLabel={t("examDurationMinutes")}
        isDuration={true}
      />
    </div>
  );
}
