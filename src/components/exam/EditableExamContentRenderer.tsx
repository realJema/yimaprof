import { Badge } from '@/components/ui/badge';
import { CheckCircle, Edit2 } from 'lucide-react';
import { useState } from 'react';

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

export function EditableExamContentRenderer({
  content,
  onContentChange,
  showAnswers = false
}: EditableExamContentRendererProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!content) {
    return <p className="text-muted-foreground">No content available.</p>;
  }

  const handleTextChange = (itemId: string, newText: string, field: 'text' = 'text') => {
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

    return (
      <div className="space-y-6">
        {sortedItems.map((item) => {
          // Headings
          if (item.item_type === 'heading') {
            return (
              <div key={item.id} className="border-l-4 border-primary pl-4 py-2 group relative">
                <div 
                  className="text-xl font-bold text-foreground uppercase tracking-wide outline-none hover:bg-muted/30 px-2 py-1 rounded transition-colors"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleTextChange(item.id, e.currentTarget.textContent || '')}
                  onFocus={() => setEditingId(item.id)}
                >
                  {item.text}
                </div>
                <Edit2 className="h-3 w-3 text-muted-foreground absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          }

          // Instructions
          if (item.item_type === 'instruction') {
            return (
              <div key={item.id} className="bg-muted/50 p-4 rounded-lg border border-border group relative">
                <p className="text-sm text-muted-foreground italic">
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
                <Edit2 className="h-3 w-3 text-muted-foreground absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          }

          // Passages
          if (item.item_type === 'passage') {
            return (
              <div key={item.id} className="bg-accent/30 p-4 rounded-lg border border-accent group relative">
                <div className="prose prose-sm max-w-none">
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
                <Edit2 className="h-3 w-3 text-muted-foreground absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          }

          // Images
          if (item.item_type === 'image') {
            const asset = item.assets?.[0];
            return (
              <div key={item.id} className="space-y-2 group relative">
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
                  <div className="border rounded-lg overflow-hidden bg-background">
                    <img
                      src={asset.url}
                      alt={asset.alt || 'Exam figure'}
                      className="max-w-full h-auto"
                    />
                  </div>
                )}
                <Edit2 className="h-3 w-3 text-muted-foreground absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          }

          // Questions
          if (item.item_type === 'question') {
            questionNumber++;
            const question = item as Question;

            return (
              <div key={item.id} className="border border-border rounded-lg p-4 bg-card group relative">
                <div className="space-y-4">
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="text-sm font-semibold shrink-0">
                          {question.paper_number || questionNumber}
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
                      <p className="text-sm text-foreground whitespace-pre-wrap">{question.answers[0].text}</p>
                      
                      {/* Rubric display */}
                      {question.answers[0].rubric && question.answers[0].rubric.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-primary/20">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Marking Rubric:</p>
                          <div className="space-y-1">
                            {question.answers[0].rubric.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 text-xs">
                                <Badge variant="outline" className="shrink-0">{item.points}pts</Badge>
                                <span className="text-muted-foreground">{item.criteria}</span>
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
                              <p className="text-xs text-foreground whitespace-pre-wrap">{subQ.answers[0].text}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Edit2 className="h-3 w-3 text-muted-foreground absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                  <p className="text-sm text-foreground whitespace-pre-wrap">{question.answers[0].text}</p>
                  
                  {/* Rubric display */}
                  {question.answers[0].rubric && question.answers[0].rubric.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-primary/20">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Marking Rubric:</p>
                      <div className="space-y-1">
                        {question.answers[0].rubric.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <Badge variant="outline" className="shrink-0">{item.points}pts</Badge>
                            <span className="text-muted-foreground">{item.criteria}</span>
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
