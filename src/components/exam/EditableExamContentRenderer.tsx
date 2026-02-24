import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Edit2, Image, ImagePlus, Plus, Trash2, Upload, BookOpen } from 'lucide-react';
import { useState, useRef } from 'react';
import { LatexText } from '@/components/ui/latex-text';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Answer {
  id: string;
  text: string;
  is_correct: boolean;
  rubric?: Array<{
    criteria: string;
    points: number;
  }>;
}

interface SubQuestion {
  id: string;
  text: string;
  question_type: string;
  paper_number?: string;
  sub_number?: string;
  display_number?: string;
  answers?: Answer[];
}

interface MediaItem {
  id: string;
  role: 'question_figure' | 'answer_figure';
  type: string;
  url: string;
  alt?: string;
  caption?: string;
}

interface Question {
  id: string;
  item_type: 'question';
  question_type: 'multiple_choice' | 'long_form';
  paper_number?: string;
  text: string;
  context_ref?: string;
  answers?: Answer[];
  sub_questions?: SubQuestion[];
  marks?: number;
  order: number;
  media?: MediaItem[];
  explanatory_note?: string;
}

interface ContentItem {
  id: string;
  item_type: 'heading' | 'instruction' | 'passage' | 'question' | 'image';
  text?: string;
  assets?: Array<{
    type: string;
    url: string;
    alt?: string;
  }>;
  order: number;
}

type ExamContentItem = ContentItem | Question;

interface EditableExamContentRendererProps {
  content: any;
  onContentChange: (newContent: any) => void;
  showAnswers?: boolean;
}

const generateId = () => `item_${Math.random().toString(36).substr(2, 9)}`;

export function EditableExamContentRenderer({
  content,
  onContentChange,
  showAnswers = false
}: EditableExamContentRendererProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingAtIndex, setUploadingAtIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  if (!content) {
    return <p className="text-muted-foreground">No content available.</p>;
  }

  const getItems = (): any[] => {
    if (Array.isArray(content)) {
      return content;
    } else if (content.questions && Array.isArray(content.questions)) {
      return content.questions;
    }
    return [];
  };

  const updateItems = (newItems: any[]) => {
    if (Array.isArray(content)) {
      onContentChange(newItems);
    } else if (content.questions && Array.isArray(content.questions)) {
      onContentChange({ ...content, questions: newItems });
    }
  };

  const handleAddImage = async (file: File, afterOrder: number, caption: string = '') => {
    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image smaller than 10MB',
          variant: 'destructive',
        });
        return;
      }

      // Upload to Supabase
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('exam-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('exam-images')
        .getPublicUrl(fileName);

      // Create new image item
      const items = getItems();
      const newOrder = afterOrder + 0.5; // Insert between items
      
      const newImageItem = {
        id: generateId(),
        item_type: 'image',
        text: caption || `Figure ${items.filter(i => i.item_type === 'image').length + 1}`,
        assets: [{ type: 'image', url: urlData.publicUrl, alt: caption || 'Exam figure' }],
        order: newOrder,
      };

      // Insert and re-order
      const updatedItems = [...items, newImageItem]
        .sort((a, b) => a.order - b.order)
        .map((item, idx) => ({ ...item, order: idx + 1 }));

      updateItems(updatedItems);

      toast({
        title: 'Image added',
        description: 'The image has been inserted into the exam content',
      });
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploadingAtIndex(null);
    }
  };

  const handleReplaceImage = async (itemId: string, file: File) => {
    try {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file',
          variant: 'destructive',
        });
        return;
      }

      // Upload new image
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('exam-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('exam-images')
        .getPublicUrl(fileName);

      // Update the item
      const items = getItems();
      const updatedItems = items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            assets: [{ type: 'image', url: urlData.publicUrl, alt: item.text || 'Exam figure' }],
          };
        }
        return item;
      });

      updateItems(updatedItems);

      toast({
        title: 'Image replaced',
        description: 'The image has been updated',
      });
    } catch (error: any) {
      console.error('Image replace error:', error);
      toast({
        title: 'Replace failed',
        description: error.message || 'Failed to replace image',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteItem = (itemId: string) => {
    const items = getItems();
    const updatedItems = items
      .filter(item => item.id !== itemId)
      .map((item, idx) => ({ ...item, order: idx + 1 }));
    updateItems(updatedItems);
    
    toast({
      title: 'Item deleted',
      description: 'The item has been removed from the exam content',
    });
  };

  const handleAddMediaToQuestion = async (questionId: string, file: File, role: 'question_figure' | 'answer_figure') => {
    try {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Invalid file type', description: 'Please select an image file', variant: 'destructive' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Max 10MB', variant: 'destructive' });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('exam-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('exam-images').getPublicUrl(fileName);

      const caption = role === 'question_figure' ? 'Question figure' : 'Solution figure';
      const newMedia: MediaItem = {
        id: generateId(),
        role,
        type: 'image',
        url: urlData.publicUrl,
        alt: caption,
        caption,
      };

      const items = getItems();
      const updatedItems = items.map((item: any) => {
        if (item.id === questionId) {
          return { ...item, media: [...(item.media || []), newMedia] };
        }
        return item;
      });
      updateItems(updatedItems);

      toast({ title: 'Image added', description: `${role === 'question_figure' ? 'Question' : 'Solution'} figure uploaded` });
    } catch (error: any) {
      console.error('Media upload error:', error);
      toast({ title: 'Upload failed', description: error.message || 'Failed to upload', variant: 'destructive' });
    }
  };

  const handleDeleteMedia = (questionId: string, mediaId: string) => {
    const items = getItems();
    const updatedItems = items.map((item: any) => {
      if (item.id === questionId && item.media) {
        return { ...item, media: item.media.filter((m: MediaItem) => m.id !== mediaId) };
      }
      return item;
    });
    updateItems(updatedItems);
    toast({ title: 'Image removed' });
  };

  const handleTextChange = (itemId: string, newText: string, field: 'text' | 'paper_number' | 'explanatory_note' = 'text') => {
    let updatedContent;
    
    // Handle array format
    if (Array.isArray(content)) {
      updatedContent = content.map(item => 
        item.id === itemId ? { ...item, [field]: newText } : item
      );
    } 
    // Handle object with questions array
    else if (content.questions && Array.isArray(content.questions)) {
      updatedContent = {
        ...content,
        questions: content.questions.map((item: any) => 
          item.id === itemId ? { ...item, [field]: newText } : item
        )
      };
    }
    
    if (updatedContent) {
      onContentChange(updatedContent);
    }
  };

  const handleAnswerChange = (questionId: string, answerId: string, newText: string) => {
    let updatedContent;
    
    if (Array.isArray(content)) {
      updatedContent = content.map(item => {
        if (item.id === questionId && item.answers) {
          return {
            ...item,
            answers: item.answers.map((ans: Answer) =>
              ans.id === answerId ? { ...ans, text: newText } : ans
            )
          };
        }
        return item;
      });
    } else if (content.questions && Array.isArray(content.questions)) {
      updatedContent = {
        ...content,
        questions: content.questions.map((item: any) => {
          if (item.id === questionId && item.answers) {
            return {
              ...item,
              answers: item.answers.map((ans: Answer) =>
                ans.id === answerId ? { ...ans, text: newText } : ans
              )
            };
          }
          return item;
        })
      };
    }
    
    if (updatedContent) {
      onContentChange(updatedContent);
    }
  };

  const handleSubQuestionChange = (questionId: string, subQuestionId: string, newText: string) => {
    let updatedContent;
    
    if (Array.isArray(content)) {
      updatedContent = content.map(item => {
        if (item.id === questionId && item.sub_questions) {
          return {
            ...item,
            sub_questions: item.sub_questions.map((subQ: SubQuestion) =>
              subQ.id === subQuestionId ? { ...subQ, text: newText } : subQ
            )
          };
        }
        return item;
      });
    } else if (content.questions && Array.isArray(content.questions)) {
      updatedContent = {
        ...content,
        questions: content.questions.map((item: any) => {
          if (item.id === questionId && item.sub_questions) {
            return {
              ...item,
              sub_questions: item.sub_questions.map((subQ: SubQuestion) =>
                subQ.id === subQuestionId ? { ...subQ, text: newText } : subQ
              )
            };
          }
          return item;
        })
      };
    }
    
    if (updatedContent) {
      onContentChange(updatedContent);
    }
  };

  // Handle legacy format (old questions array)
  if (content.questions && Array.isArray(content.questions)) {
    const firstQuestion = content.questions[0];
    
    // Check if it's the new format (with item_type)
    if (firstQuestion && 'item_type' in firstQuestion) {
      return renderNewFormat(content.questions as ExamContentItem[]);
    }
    
    // Otherwise, render legacy format
    return renderLegacyFormat(content.questions);
  }

  // Handle raw content array (new format)
  if (Array.isArray(content)) {
    return renderNewFormat(content as ExamContentItem[]);
  }

  return <p className="text-muted-foreground">Invalid content format.</p>;

  function renderNewFormat(items: ExamContentItem[]) {
    const sortedItems = [...items].sort((a, b) => a.order - b.order);
    let questionNumber = 0;

    const renderAddImageButton = (afterOrder: number) => (
      <div className="flex justify-center py-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const caption = prompt('Enter image caption (optional):') || '';
                handleAddImage(file, afterOrder, caption);
              }
              e.target.value = '';
            }}
          />
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded border border-dashed border-muted-foreground/30 hover:border-primary/50">
            <Plus className="h-3 w-3" />
            <Image className="h-3 w-3" />
            Add Image Here
          </span>
        </label>
      </div>
    );

    return (
      <div className="space-y-6">
        {/* Add image at the beginning */}
        <div className="group">
          {renderAddImageButton(0)}
        </div>

        {sortedItems.map((item, index) => {
          // Headings
          if (item.item_type === 'heading') {
            return (
              <div key={item.id} className="group">
                <div className="border-l-4 border-primary pl-4 py-2 relative">
                  <div 
                    className="text-xl font-bold text-foreground uppercase tracking-wide outline-none hover:bg-muted/30 px-2 py-1 rounded transition-colors pr-12"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleTextChange(item.id, e.currentTarget.textContent || '')}
                    onFocus={() => setEditingId(item.id)}
                  >
                    {item.text}
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 className="h-3 w-3 text-muted-foreground" />
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete block"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {renderAddImageButton(item.order)}
              </div>
            );
          }

          // Instructions
          if (item.item_type === 'instruction') {
            return (
              <div key={item.id} className="group">
                <div className="bg-muted/50 p-4 rounded-lg border border-border relative">
                  <p className="text-sm text-muted-foreground italic pr-12">
                    <span className="font-semibold text-foreground">Instructions: </span>
                    <span
                      className="outline-none hover:bg-muted/50 px-1 rounded transition-colors"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleTextChange(item.id, e.currentTarget.textContent || '')}
                      onFocus={() => setEditingId(item.id)}
                    >
                      {item.text}
                    </span>
                  </p>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 className="h-3 w-3 text-muted-foreground" />
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete block"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {renderAddImageButton(item.order)}
              </div>
            );
          }

          // Passages
          if (item.item_type === 'passage') {
            return (
              <div key={item.id} className="group">
                <div className="bg-accent/30 p-4 rounded-lg border border-accent relative">
                  <div className="prose prose-sm max-w-none pr-12">
                    <div
                      className="text-sm text-foreground whitespace-pre-wrap outline-none hover:bg-muted/30 px-2 py-1 rounded transition-colors"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleTextChange(item.id, e.currentTarget.textContent || '')}
                      onFocus={() => setEditingId(item.id)}
                    >
                      {item.text}
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 className="h-3 w-3 text-muted-foreground" />
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete block"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {renderAddImageButton(item.order)}
              </div>
            );
          }

          // Images
          if (item.item_type === 'image') {
            const asset = item.assets?.[0];
            return (
              <div key={item.id} className="group">
                <div className="space-y-2 relative border border-dashed border-transparent hover:border-muted-foreground/30 rounded-lg p-2">
                  {item.text && (
                    <div
                      className="text-sm font-medium text-muted-foreground outline-none hover:bg-muted/30 px-2 py-1 rounded transition-colors inline-block"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleTextChange(item.id, e.currentTarget.textContent || '')}
                      onFocus={() => setEditingId(item.id)}
                    >
                      {item.text}
                    </div>
                  )}
                  {asset && (
                    <div className="border rounded-lg overflow-hidden bg-background relative">
                      <img
                        src={asset.url}
                        alt={asset.alt || 'Exam figure'}
                        className="max-w-full h-auto"
                      />
                    </div>
                  )}
                  
                  {/* Image action buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleReplaceImage(item.id, file);
                          e.target.value = '';
                        }}
                      />
                      <span className="inline-flex items-center justify-center h-7 w-7 rounded bg-primary/90 text-primary-foreground hover:bg-primary transition-colors">
                        <Upload className="h-3.5 w-3.5" />
                      </span>
                    </label>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {renderAddImageButton(item.order)}
              </div>
            );
          }

          // Questions
          if (item.item_type === 'question') {
            questionNumber++;
            const question = item as Question;

            return (
              <div key={item.id} className="group">
                <div className="border border-border rounded-lg p-4 bg-card relative">
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                <div className="space-y-4">
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <Badge 
                          variant="outline" 
                          className="text-sm font-semibold shrink-0 cursor-pointer hover:bg-muted/50 transition-colors group"
                          title="Click to edit question number"
                        >
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => handleTextChange(question.id, e.currentTarget.textContent || '', 'paper_number')}
                            onFocus={() => setEditingId(question.id)}
                            className="outline-none"
                          >
                            {question.paper_number || questionNumber}
                          </span>
                          <Edit2 className="h-2.5 w-2.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Badge>
                        <div className="flex-1">
                          <div
                            className="text-base font-medium text-foreground whitespace-pre-wrap outline-none hover:bg-muted/30 px-2 py-1 rounded transition-colors"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => handleTextChange(question.id, e.currentTarget.textContent || '')}
                            onFocus={() => setEditingId(question.id)}
                          >
                            {question.text}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {question.marks && (
                        <Badge variant="secondary" className="text-xs">
                          {question.marks} marks
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {question.question_type === 'multiple_choice' ? 'MCQ' : 'Essay'}
                      </Badge>
                    </div>
                  </div>

                  {/* Context Reference */}
                  {question.context_ref && (
                    <p className="text-xs text-muted-foreground italic">
                      (Refer to {question.context_ref})
                    </p>
                  )}

                  {/* Question Figure Media */}
                  {question.media && question.media.filter(m => m.role === 'question_figure').length > 0 && (
                    <div className="space-y-2 ml-8">
                      {question.media.filter(m => m.role === 'question_figure').map((mediaItem) => (
                        <div key={mediaItem.id} className="space-y-1 border rounded-lg p-2 bg-muted/30 relative group/media">
                          {mediaItem.caption && (
                            <p className="text-xs font-medium text-muted-foreground">{mediaItem.caption}</p>
                          )}
                          <div className="border rounded-lg overflow-hidden bg-background">
                            <img src={mediaItem.url} alt={mediaItem.alt || 'Question figure'} className="max-w-full h-auto" />
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px]">📷 Question Figure</Badge>
                            <button
                              onClick={() => handleDeleteMedia(question.id, mediaItem.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover/media:opacity-100"
                              title="Remove image"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Multiple Choice Answers */}
                  {question.question_type === 'multiple_choice' && question.answers && (
                    <div className="space-y-2 ml-8">
                      {question.answers.map((answer, answerIndex) => {
                        const optionLabel = String.fromCharCode(65 + answerIndex);
                        const isCorrect = answer.is_correct;
                        const shouldShowCorrect = showAnswers && isCorrect;
                        
                        return (
                          <div
                            key={answer.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                              shouldShowCorrect
                                ? 'bg-primary/5 border-primary/20'
                                : 'bg-background border-border hover:bg-muted/30'
                            }`}
                          >
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-semibold text-sm min-w-[1.5rem]">
                                {optionLabel}.
                              </span>
                              {shouldShowCorrect && (
                                <CheckCircle className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div
                              className="flex-1 text-sm text-foreground outline-none hover:bg-muted/30 px-2 py-1 rounded transition-colors"
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => handleAnswerChange(question.id, answer.id, e.currentTarget.textContent || '')}
                            >
                              {answer.text}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Long-form answer display */}
                  {question.question_type === 'long_form' && showAnswers && question.answers && question.answers[0] && (
                    <div className="ml-6 mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">Expected Answer:</span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap"><LatexText text={question.answers[0].text} /></p>
                      
                      {/* Rubric display */}
                      {question.answers[0].rubric && question.answers[0].rubric.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-primary/20">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Marking Rubric:</p>
                          <div className="space-y-1">
                            {question.answers[0].rubric.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 text-xs">
                                <Badge variant="outline" className="shrink-0">{item.points}pts</Badge>
                                <span className="text-muted-foreground"><LatexText text={item.criteria} /></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-questions for long form */}
                  {question.question_type === 'long_form' && question.sub_questions && question.sub_questions.length > 0 && (
                    <div className="ml-6 space-y-3 border-l-2 border-primary/20 pl-4">
                      {question.sub_questions.map((subQ, subIndex) => (
                        <div key={subQ.id} className="space-y-2">
                          <div className="flex items-start gap-2">
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {subQ.display_number || `${questionNumber}.${subIndex + 1}`}
                            </Badge>
                            <div
                              className="flex-1 text-sm text-foreground outline-none hover:bg-muted/30 px-2 py-1 rounded transition-colors"
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => handleSubQuestionChange(question.id, subQ.id, e.currentTarget.textContent || '')}
                            >
                              {subQ.text}
                            </div>
                          </div>
                          
                          {/* Sub-question answer display */}
                          {showAnswers && subQ.answers && subQ.answers[0] && (
                            <div className="ml-8 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle className="h-3 w-3 text-primary" />
                                <span className="text-xs font-semibold text-primary">Expected Answer:</span>
                              </div>
                              <p className="text-xs text-foreground whitespace-pre-wrap"><LatexText text={subQ.answers[0].text} /></p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Answer Figure Media */}
                  {showAnswers && question.media && question.media.filter(m => m.role === 'answer_figure').length > 0 && (
                    <div className="space-y-2 ml-8">
                      {question.media.filter(m => m.role === 'answer_figure').map((mediaItem) => (
                        <div key={mediaItem.id} className="space-y-1 border rounded-lg p-2 bg-primary/5 border-primary/20 relative group/media">
                          {mediaItem.caption && (
                            <p className="text-xs font-medium text-muted-foreground">{mediaItem.caption}</p>
                          )}
                          <div className="border rounded-lg overflow-hidden bg-background">
                            <img src={mediaItem.url} alt={mediaItem.alt || 'Answer figure'} className="max-w-full h-auto" />
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px]">📷 Answer Figure</Badge>
                            <button
                              onClick={() => handleDeleteMedia(question.id, mediaItem.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover/media:opacity-100"
                              title="Remove image"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Image Upload Buttons: Question vs Solution */}
                  <div className="flex items-center gap-2 ml-8 pt-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAddMediaToQuestion(question.id, file, 'question_figure');
                          e.target.value = '';
                        }}
                      />
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-dashed border-muted-foreground/40 hover:border-primary/60 hover:bg-muted/50 text-muted-foreground hover:text-primary transition-colors">
                        <ImagePlus className="h-3.5 w-3.5" />
                        Question Image
                      </span>
                    </label>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAddMediaToQuestion(question.id, file, 'answer_figure');
                          e.target.value = '';
                        }}
                      />
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors">
                        <BookOpen className="h-3.5 w-3.5" />
                        Solution Image
                      </span>
                    </label>
                  </div>

                  {/* Explanatory Note */}
                  {showAnswers && question.explanatory_note && (
                    <div className="ml-6 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">💡 Explanatory Note:</p>
                      <div
                        className="text-sm text-amber-700 dark:text-amber-400 whitespace-pre-wrap outline-none hover:bg-amber-100/50 dark:hover:bg-amber-900/50 px-2 py-1 rounded transition-colors"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleTextChange(question.id, e.currentTarget.textContent || '', 'explanatory_note')}
                      >
                        {question.explanatory_note}
                      </div>
                    </div>
                  )}
                </div>
                <Edit2 className="h-3 w-3 text-muted-foreground absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {renderAddImageButton(item.order)}
            </div>
          );
        }

          return null;
        })}
      </div>
    );
  }

  function renderLegacyFormat(questions: any[]) {
    return (
      <div className="space-y-6">
        {questions.map((question: any, qIndex: number) => (
          <div key={question.id || qIndex} className="border border-border rounded-lg p-4 bg-card group relative">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="text-sm font-semibold shrink-0">
                  {qIndex + 1}
                </Badge>
                <div className="flex-1">
                  <div
                    className="text-base font-medium text-foreground whitespace-pre-wrap outline-none hover:bg-muted/30 px-2 py-1 rounded transition-colors"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleTextChange(question.id, e.currentTarget.textContent || '')}
                  >
                    {question.text}
                  </div>
                </div>
              </div>

              {question.type === 'multiple_choice' && question.answers && (
                <div className="space-y-2 ml-8">
                  {question.answers.map((answer: any, answerIndex: number) => {
                    const optionLabel = String.fromCharCode(65 + answerIndex);
                    const isCorrect = answer.is_correct;
                    const shouldShowCorrect = showAnswers && isCorrect;
                    
                    return (
                      <div
                        key={answer.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          shouldShowCorrect
                            ? 'bg-primary/5 border-primary/20'
                            : 'bg-background border-border hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold text-sm min-w-[1.5rem]">
                            {optionLabel}.
                          </span>
                          {shouldShowCorrect && (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div
                          className="flex-1 text-sm text-foreground outline-none hover:bg-muted/30 px-2 py-1 rounded transition-colors"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => handleAnswerChange(question.id, answer.id, e.currentTarget.textContent || '')}
                        >
                          {answer.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Long-form answer display for legacy format */}
              {question.type === 'long_form' && showAnswers && question.answers && question.answers[0] && (
                <div className="ml-6 mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">Expected Answer:</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap"><LatexText text={question.answers[0].text} /></p>
                  
                  {/* Rubric display */}
                  {question.answers[0].rubric && question.answers[0].rubric.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-primary/20">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Marking Rubric:</p>
                      <div className="space-y-1">
                        {question.answers[0].rubric.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <Badge variant="outline" className="shrink-0">{item.points}pts</Badge>
                            <span className="text-muted-foreground"><LatexText text={item.criteria} /></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Edit2 className="h-3 w-3 text-muted-foreground absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>
    );
  }
}
