import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Eye, PenTool, CheckCircle, Clock, FileText, Download, ChevronDown, ChevronUp } from 'lucide-react';
interface Exam {
  id: string;
  title: string;
  subject: string;
  class_id?: string;
  year?: number;
  period?: string;
  exam_type?: string;
  description?: string;
  language?: string;
  content?: any; // JSON content with questions and potentially answers
  file_url?: string; // PDF file URL
  created_at: string;
  classes?: {
    id: string;
    name: string;
    display_name: string;
    section: string;
    level: string;
  };
}
interface UserAnswer {
  questionIndex: number;
  answer: string;
  isCorrect?: boolean;
}
const EXAM_DURATION = 3600; // 1 hour in seconds

export default function ExamViewer() {
  const {
    examId
  } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    t
  } = useLanguage();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const mode = searchParams.get('mode') || 'preview';
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(mode);
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  useEffect(() => {
    if (examId) {
      fetchExam();
      checkAccess();
    }
  }, [examId, user]);
  useEffect(() => {
    setActiveTab(mode);
  }, [mode]);
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setIsTimerActive(false);
            handleSubmitEvaluation();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft]);
  const checkAccess = async () => {
    if (!user) {
      setHasAccess(true); // Allow public access for preview
      return;
    }
    try {
      // Check if user is admin
      const {
        data: profile
      } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role === 'admin') {
        setHasAccess(true);
        return;
      }

      // Check subscription for other users
      const {
        data: subscription
      } = await supabase.from('subscriptions').select(`
          *,
          subscription_plans (name)
        `).eq('user_id', user.id).eq('status', 'active').single();
      if (subscription) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    }
  };
  const fetchExam = async () => {
    try {
      const {
        data: examData,
        error: examError
      } = await supabase.from('exams').select(`
          *,
          classes (
            id,
            name,
            display_name,
            section,
            level
          )
        `).eq('id', examId).single();
      if (examError) throw examError;
      setExam(examData);
    } catch (error) {
      toast({
        title: t('error'),
        description: 'Failed to fetch exam details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  const handleStartEvaluation = () => {
    setActiveTab('evaluation');
    setIsTimerActive(true);
    setTimeLeft(EXAM_DURATION);
    setUserAnswers([]);
    setShowResults(false);
  };
  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setUserAnswers(prev => {
      const existing = prev.find(a => a.questionIndex === questionIndex);
      if (existing) {
        return prev.map(a => a.questionIndex === questionIndex ? {
          ...a,
          answer
        } : a);
      } else {
        return [...prev, {
          questionIndex,
          answer
        }];
      }
    });
  };
  const handleSubmitEvaluation = () => {
    setIsTimerActive(false);
    setShowResults(true);
    toast({
      title: 'Evaluation Complete',
      description: 'Your answers have been submitted'
    });
  };
  const renderMarkdown = (content: string) => {
    if (!content) return null;

    const processInlineMarkdown = (text: string) => {
      // Handle bold text **text**
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        // Handle italic text *text*
        if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
          return <em key={index}>{part.slice(1, -1)}</em>;
        }
        return part;
      });
    };

    return content.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold mb-4">{processInlineMarkdown(line.substring(2))}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold mb-3">{processInlineMarkdown(line.substring(3))}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-medium mb-2">{processInlineMarkdown(line.substring(4))}</h3>;
      }
      if (line.trim() === '') {
        return <br key={index} />;
      }
      return <p key={index} className="mb-2">{processInlineMarkdown(line)}</p>;
    });
  };
  const renderJsonContent = (content: any, showAnswers = false) => {
    if (!content) return null;

    // Handle both old string format and new JSON format
    if (typeof content === 'string') {
      return <div className="prose max-w-none">{renderMarkdown(content)}</div>;
    }

    // Handle raw text wrapped content
    if (content.raw_text) {
      return <div className="prose max-w-none">{renderMarkdown(content.raw_text)}</div>;
    }

    // Handle new question format with structured questions
    if (content.questions && Array.isArray(content.questions)) {
      return <div className="space-y-6">
          {content.questions.map((question: any, index: number) => <div key={question.id || index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold">Question {index + 1}</h3>
                <Badge variant="outline" className="text-xs">
                  {question.type === 'multiple_choice' ? 'Multiple Choice' : 'Long Form'}
                </Badge>
              </div>
              
              <div className="mb-4 text-gray-700">{renderMarkdown(question.text)}</div>
              
              {/* Multiple Choice Questions */}
              {question.type === 'multiple_choice' && question.answers && <div className="space-y-3">
                  {question.answers.map((answer: any, answerIndex: number) => <div key={answer.id || answerIndex} className="flex items-start gap-3">
                      {mode === 'evaluation' && isTimerActive && !showResults ? <div className="flex items-center gap-2">
                          <input type="radio" name={`question-${index}`} value={answer.text} checked={userAnswers.find(a => a.questionIndex === index)?.answer === answer.text} onChange={e => handleAnswerChange(index, e.target.value)} className="mt-1" />
                          <label className="cursor-pointer">{String.fromCharCode(65 + answerIndex)}. {renderMarkdown(answer.text)}</label>
                        </div> : <div className={`flex items-center gap-2 p-2 rounded ${showAnswers && answer.is_correct ? 'bg-green-100 border border-green-300' : 'bg-gray-50'}`}>
                          <span className="font-medium">{String.fromCharCode(65 + answerIndex)}.</span>
                          <div>{renderMarkdown(answer.text)}</div>
                          {showAnswers && answer.is_correct && <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />}
                        </div>}
                    </div>)}
                </div>}
              
              {/* Long Form Questions */}
              {question.type === 'long_form' && <div className="space-y-3">
                  {mode === 'evaluation' && isTimerActive && !showResults ? <div>
                      <label className="block text-sm font-medium mb-2">Your Answer:</label>
                      <Textarea placeholder="Enter your detailed answer here..." value={userAnswers.find(a => a.questionIndex === index)?.answer || ''} onChange={e => handleAnswerChange(index, e.target.value)} className="w-full" rows={6} />
                    </div> : showAnswers && question.answers && question.answers[0] ? <div className="space-y-3">
                      <div className="bg-green-50 p-4 rounded border border-green-200">
                        <h4 className="font-semibold text-green-800 mb-2">Expected Answer/Key Points:</h4>
                        <div className="text-green-700">
                          {renderMarkdown(question.answers[0].text)}
                        </div>
                      </div>
                      
                      {/* Display Sub-questions */}
                      {question.sub_questions && question.sub_questions.length > 0 && (
                        <div className="space-y-3 mt-4">
                          <h4 className="font-semibold text-gray-700 mb-2">Sub-questions:</h4>
                          {question.sub_questions.map((subQ: any, subIndex: number) => (
                            <div key={subQ.id || subIndex} className="ml-6 p-3 bg-muted rounded border">
                              <div className="flex items-start gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {index + 1}.{String.fromCharCode(97 + subIndex)}
                                </Badge>
                                <p className="font-medium text-sm">{renderMarkdown(subQ.text)}</p>
                              </div>
                              {showAnswers && subQ.answers && subQ.answers[0] && (
                                <div className="ml-6 bg-green-50 p-3 rounded border border-green-200 mt-2">
                                  <p className="text-xs font-medium text-green-800 mb-1">Expected Answer:</p>
                                  <div className="text-sm text-green-700">
                                    {renderMarkdown(subQ.answers[0].text)}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div> : null}
                </div>}
              
              {/* Show user's answer in results */}
              {showResults && userAnswers.find(a => a.questionIndex === index) && <div className="mt-4 pt-4 border-t bg-blue-50 p-3 rounded">
                  <h4 className="font-semibold text-blue-800 mb-2">Your Answer:</h4>
                  <p className="text-blue-700">{userAnswers.find(a => a.questionIndex === index)?.answer}</p>
                </div>}
            </div>)}
        </div>;
    }

    // Handle old format with nested structure
    if (content.exam_info || content.questions && !Array.isArray(content.questions)) {
      return <div className="space-y-6">
          {content.exam_info && <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Exam Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
                {content.exam_info.duration && <p><strong>Duration:</strong> {content.exam_info.duration}</p>}
                {content.exam_info.total_marks && <p><strong>Total Marks:</strong> {content.exam_info.total_marks}</p>}
                {content.exam_info.instructions && <p className="col-span-2"><strong>Instructions:</strong> {content.exam_info.instructions}</p>}
              </div>
            </div>}
          {/* Handle other legacy formats here if needed */}
        </div>;
    }
    return <p className="text-muted-foreground">No content available.</p>;
  };
  if (loading) {
    return <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>;
  }
  if (!exam) {
    return <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Exam not found</p>
            <Button onClick={() => navigate('/exams')} className="mt-4">
              Back to Exams
            </Button>
          </CardContent>
        </Card>
      </div>;
  }
  const hasAnswers = exam.content?.questions && Array.isArray(exam.content.questions) && exam.content.questions.some((q: any) => q.answers && q.answers.length > 0);
  return <div className="bg-gradient-subtle min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/exams')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{exam.title}</h1>
            <p className="text-muted-foreground">
              {exam.subject} • {exam.classes?.display_name} • {exam.year}
            </p>
          </div>
        </div>

        {/* Timer for evaluation */}
        {mode === 'evaluation' && isTimerActive && <Card className="border-orange-500 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">Time Remaining:</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {formatTime(timeLeft)}
                </div>
              </div>
            </CardContent>
          </Card>}

        {/* Content based on mode */}
        {mode === 'preview' && <div className="space-y-6">
            {/* Layout: PDF on left, Content on right */}
            {exam.file_url ? <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                {/* PDF Viewer (Collapsible) */}
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <Collapsible open={isPdfOpen} onOpenChange={setIsPdfOpen}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            PDF Document
                          </div>
                          {isPdfOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="w-full h-[600px] border rounded-lg overflow-hidden">
                          <iframe src={`${exam.file_url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`} className="w-full h-full" title="Exam PDF" />
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>

                {/* Content */}
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      {t('question_preview') || 'Question Preview'}
                    </CardTitle>
                    <CardDescription>
                      {t('review_questions_desc') || 'Review the exam questions without answers.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 min-h-[60vh]">
                    {exam.content ? renderJsonContent(exam.content, false) : <p className="text-muted-foreground">No content available for preview.</p>}
                  </CardContent>
                </Card>
              </div> : (/* No PDF - Full width content */
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    {t('question_preview') || 'Question Preview'}
                  </CardTitle>
                  <CardDescription>
                    {t('review_questions_desc') || 'Review the exam questions without answers.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 min-h-[60vh]">
                  {exam.content ? renderJsonContent(exam.content, false) : <p className="text-muted-foreground">No content available for preview.</p>}
                </CardContent>
              </Card>)}
          </div>}

        {mode === 'evaluation' && <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5" />
                {t('evaluation') || 'Evaluation Mode'}
              </CardTitle>
              <CardDescription>
                Answer the questions within the time limit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 min-h-[60vh]">
              {!isTimerActive && !showResults ? <div className="text-center py-8">
                  <Button onClick={handleStartEvaluation} size="lg">
                    Start Evaluation ({formatTime(EXAM_DURATION)})
                  </Button>
                </div> : showResults ? <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-green-600">Evaluation Complete!</h3>
                  <p>Your answers have been recorded. You can now view the correction to see the correct answers.</p>
                  {hasAnswers ? <Button onClick={() => navigate(`/exam/${examId}?mode=correction`)} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      View Correction
                    </Button> : <p className="text-muted-foreground">Correction not available for this exam yet.</p>}
                </div> : <div className="space-y-4">
                  {exam.content ? renderJsonContent(exam.content, false) : <p className="text-muted-foreground">No questions available.</p>}
                  <div className="pt-4 border-t flex gap-4">
                    <Button onClick={handleSubmitEvaluation} className="flex items-center gap-2">
                      Submit Answers
                    </Button>
                  </div>
                </div>}
            </CardContent>
          </Card>}

        {mode === 'correction' && <div className="space-y-6">
            {!hasAccess && !user ? <Card className="border-orange-500 bg-orange-50">
                <CardContent className="pt-6 text-center min-h-[60vh] flex flex-col justify-center">
                  <p className="text-orange-700 mb-4">
                    Sign in and subscribe to access corrections
                  </p>
                  <Button onClick={() => navigate('/auth')}>
                    Sign In
                  </Button>
                </CardContent>
              </Card> : !hasAccess ? <Card className="border-orange-500 bg-orange-50">
                <CardContent className="pt-6 text-center min-h-[60vh] flex flex-col justify-center">
                  <p className="text-orange-700 mb-4">
                    Subscribe to access corrections
                  </p>
                  <Button onClick={() => navigate('/subscriptions')}>
                    View Subscription Plans
                  </Button>
                </CardContent>
              </Card> : (/* Layout: PDF on left, Content on right */
        exam.file_url ? <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                  {/* PDF Viewer (Collapsible) */}
                  <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <Collapsible open={isPdfOpen} onOpenChange={setIsPdfOpen}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              PDF Document
                            </div>
                            {isPdfOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent>
                          <div className="w-full h-[600px] border rounded-lg overflow-hidden">
                            <iframe src={`${exam.file_url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`} className="w-full h-full" title="Exam PDF" />
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>

                  {/* Content */}
                  <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Questions & Solutions
                      </CardTitle>
                      <CardDescription>
                        Exam questions with detailed answers
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {hasAnswers ? renderJsonContent(exam.content, true) : <p className="text-muted-foreground">
                          Correction not available for this exam yet.
                        </p>}
                    </CardContent>
                  </Card>
                </div> : (/* No PDF - Full width content */
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Questions & Solutions
                    </CardTitle>
                    <CardDescription>
                      Exam questions with detailed answers
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {hasAnswers ? renderJsonContent(exam.content, true) : <p className="text-muted-foreground">
                        Correction not available for this exam yet.
                      </p>}
                  </CardContent>
                </Card>))}
          </div>}
      </div>
    </div>;
}