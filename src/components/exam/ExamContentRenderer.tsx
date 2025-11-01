import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';

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

interface ExamContentRendererProps {
  content: any;
  showAnswers?: boolean;
  mode?: 'preview' | 'evaluation' | 'solution';
  userAnswers?: Array<{ questionIndex: number; answer: string }>;
  onAnswerChange?: (questionIndex: number, answer: string) => void;
  questionIdPrefix?: string;
}

export function ExamContentRenderer({
  content,
  showAnswers = false,
  mode = 'preview',
  userAnswers = [],
  onAnswerChange,
  questionIdPrefix = ''
}: ExamContentRendererProps) {
  if (!content) {
    return <p className="text-muted-foreground">No content available.</p>;
  }

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
              <div key={item.id} className="border-l-4 border-primary pl-4 py-2">
                <h2 className="text-xl font-bold text-foreground uppercase tracking-wide">
                  {item.text}
                </h2>
              </div>
            );
          }

          // Instructions
          if (item.item_type === 'instruction') {
            return (
              <div key={item.id} className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground italic">
                  <span className="font-semibold text-foreground">Instructions: </span>
                  {item.text}
                </p>
              </div>
            );
          }

          // Passages
          if (item.item_type === 'passage') {
            return (
              <div key={item.id} className="bg-accent/30 p-4 rounded-lg border border-accent">
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{item.text}</p>
                </div>
              </div>
            );
          }

          // Images
          if (item.item_type === 'image') {
            const asset = item.assets?.[0];
            return (
              <div key={item.id} className="space-y-2">
                {item.text && (
                  <p className="text-sm font-medium text-muted-foreground">{item.text}</p>
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
              </div>
            );
          }

          // Questions
          if (item.item_type === 'question') {
            questionNumber++;
            const question = item as Question;
            const actualQuestionIndex = questionNumber - 1;
            const currentAnswer = userAnswers?.find(a => a.questionIndex === actualQuestionIndex);
            
            console.log('Question render:', { 
              questionNumber, 
              actualQuestionIndex, 
              questionId: question.id,
              currentAnswer,
              allUserAnswers: userAnswers 
            });

            return (
              <div key={item.id} id={`${questionIdPrefix}${item.id}`} className="border border-border rounded-lg p-4 bg-card scroll-mt-24">
                <div className="space-y-4">
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="text-sm font-semibold shrink-0">
                          {question.paper_number || questionNumber}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-base font-medium text-foreground whitespace-pre-wrap">
                            {question.text}
                          </p>
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
                      {mode === 'evaluation' && onAnswerChange && !showAnswers ? (
                        <RadioGroup
                          value={currentAnswer?.answer || ''}
                          onValueChange={(value) => onAnswerChange(actualQuestionIndex, value)}
                        >
                          {question.answers.map((answer, answerIndex) => (
                            <div
                              key={answer.id}
                              className="flex items-start gap-3 p-3 rounded-lg border transition-colors bg-muted/30 border-border hover:bg-muted/50"
                            >
                              <RadioGroupItem value={answer.text} id={`q${questionNumber}-${answer.id}`} />
                              <Label
                                htmlFor={`q${questionNumber}-${answer.id}`}
                                className="flex-1 cursor-pointer text-sm font-normal"
                              >
                                <span className="font-medium mr-2">
                                  {String.fromCharCode(65 + answerIndex)}.
                                </span>
                                {answer.text}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      ) : (
                        question.answers.map((answer, answerIndex) => {
                          const isSelected = currentAnswer?.answer === answer.text;
                          const shouldHighlight = showAnswers && answer.is_correct;
                          
                          return (
                            <div
                              key={answer.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                                shouldHighlight
                                  ? 'bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-800'
                                  : isSelected
                                  ? 'bg-primary/10 border-primary'
                                  : 'bg-muted/30 border-border'
                              }`}
                            >
                              <span className="font-medium text-sm">
                                {String.fromCharCode(65 + answerIndex)}.
                              </span>
                              <span className="flex-1 text-sm">{answer.text}</span>
                              {shouldHighlight && (
                                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Long Form Answers */}
                  {question.question_type === 'long_form' && (
                    <div className="ml-8 space-y-4">
                      {mode === 'evaluation' && onAnswerChange && !showAnswers ? (
                        <div>
                          <label className="block text-sm font-medium mb-2">Your Answer:</label>
                          <textarea
                            placeholder="Enter your detailed answer here..."
                            value={currentAnswer?.answer || ''}
                            onChange={(e) => onAnswerChange(actualQuestionIndex, e.target.value)}
                            className="w-full min-h-[120px] p-3 border border-input rounded-lg bg-background text-foreground resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            rows={6}
                          />
                        </div>
                      ) : showAnswers && question.answers && question.answers[0] ? (
                        <div className="space-y-3">
                          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                            <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2 text-sm">
                              Expected Answer / Key Points:
                            </h4>
                            <div className="text-sm text-green-700 dark:text-green-400 whitespace-pre-wrap">
                              {question.answers[0].text}
                            </div>
                            
                            {/* Rubric */}
                            {question.answers[0].rubric && question.answers[0].rubric.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                                <h5 className="font-semibold text-green-800 dark:text-green-300 mb-2 text-xs">
                                  Marking Rubric:
                                </h5>
                                <div className="space-y-1">
                                  {question.answers[0].rubric.map((criterion, idx) => (
                                    <div key={idx} className="flex justify-between text-xs">
                                      <span className="text-green-700 dark:text-green-400">
                                        • {criterion.criteria}
                                      </span>
                                      <Badge variant="outline" className="h-5 text-xs">
                                        {criterion.points} pts
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Sub-questions */}
                          {question.sub_questions && question.sub_questions.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm text-foreground">Sub-questions:</h4>
                              {question.sub_questions.map((subQ, subIndex) => (
                                <div
                                  key={subQ.id}
                                  className="ml-4 p-3 bg-muted/50 rounded-lg border border-border"
                                >
                                  <div className="flex items-start gap-2 mb-2">
                                    <Badge variant="outline" className="text-xs">
                                      {subQ.display_number || `${questionNumber}(${String.fromCharCode(97 + subIndex)})`}
                                    </Badge>
                                    <p className="text-sm font-medium flex-1">{subQ.text}</p>
                                  </div>
                                  
                                  {showAnswers && subQ.answers && subQ.answers[0] && (
                                    <div className="ml-6 mt-2 bg-green-50 dark:bg-green-950 p-3 rounded border border-green-200 dark:border-green-800">
                                      <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">
                                        Expected Answer:
                                      </p>
                                      <div className="text-xs text-green-700 dark:text-green-400 whitespace-pre-wrap">
                                        {subQ.answers[0].text}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* User's submitted answer (in results view) */}
                  {showAnswers && currentAnswer && (
                    <div className="ml-8 mt-4 pt-4 border-t bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 text-sm">
                        Your Answer:
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-400 whitespace-pre-wrap">
                        {currentAnswer.answer}
                      </p>
                    </div>
                  )}
                </div>
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
        {questions.map((question: any, index: number) => {
          const currentAnswer = userAnswers?.find(a => a.questionIndex === index);
          
          return (
            <div key={question.id || index} id={`${questionIdPrefix}${question.id || index}`} className="border border-border rounded-lg p-4 bg-card scroll-mt-24">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Badge variant="outline" className="text-sm font-semibold">
                      {index + 1}
                    </Badge>
                    <p className="text-base font-medium text-foreground flex-1">
                      {question.text}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {question.type === 'multiple_choice' ? 'MCQ' : 'Essay'}
                  </Badge>
                </div>

                {question.type === 'multiple_choice' && question.answers && (
                  <div className="space-y-2 ml-8">
                    {mode === 'evaluation' && onAnswerChange && !showAnswers ? (
                      <RadioGroup
                        value={currentAnswer?.answer || ''}
                        onValueChange={(value) => onAnswerChange(index, value)}
                      >
                        {question.answers.map((answer: any, answerIndex: number) => (
                          <div
                            key={answer.id || answerIndex}
                            className="flex items-start gap-3 p-3 rounded-lg border transition-colors bg-muted/30 border-border hover:bg-muted/50"
                          >
                            <RadioGroupItem value={answer.text} id={`legacy-q${index}-${answerIndex}`} />
                            <Label
                              htmlFor={`legacy-q${index}-${answerIndex}`}
                              className="flex-1 cursor-pointer text-sm font-normal"
                            >
                              <span className="font-medium mr-2">
                                {String.fromCharCode(65 + answerIndex)}.
                              </span>
                              {answer.text}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      question.answers.map((answer: any, answerIndex: number) => {
                        const isSelected = currentAnswer?.answer === answer.text;
                        const shouldHighlight = showAnswers && answer.is_correct;
                        
                        return (
                          <div
                            key={answer.id || answerIndex}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              shouldHighlight
                                ? 'bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-800'
                                : isSelected
                                ? 'bg-primary/10 border-primary'
                                : 'bg-muted/30 border-border'
                            }`}
                          >
                            <span className="font-medium text-sm">
                              {String.fromCharCode(65 + answerIndex)}.
                            </span>
                            <span className="flex-1 text-sm">{answer.text}</span>
                            {shouldHighlight && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {question.type === 'long_form' && (
                  <div className="ml-8 space-y-3">
                    {mode === 'evaluation' && onAnswerChange && !showAnswers ? (
                      <div>
                        <label className="block text-sm font-medium mb-2">Your Answer:</label>
                        <textarea
                          placeholder="Enter your detailed answer here..."
                          value={currentAnswer?.answer || ''}
                          onChange={(e) => onAnswerChange(index, e.target.value)}
                          className="w-full min-h-[120px] p-3 border border-input rounded-lg bg-background text-foreground resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          rows={6}
                        />
                      </div>
                    ) : showAnswers && question.answers && question.answers[0] ? (
                      <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2 text-sm">
                          Expected Answer:
                        </h4>
                        <div className="text-sm text-green-700 dark:text-green-400">
                          {question.answers[0].text}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}

