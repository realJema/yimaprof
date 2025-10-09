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
import { ExamContentRenderer } from '@/components/exam/ExamContentRenderer';
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
  const renderJsonContent = (content: any, showAnswers = false) => {
    return (
      <ExamContentRenderer
        content={content}
        showAnswers={showAnswers}
        mode={mode as 'preview' | 'evaluation' | 'solution'}
        userAnswers={userAnswers}
        onAnswerChange={handleAnswerChange}
      />
    );
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
  const hasAnswers = 
    exam.content?.questions && 
    Array.isArray(exam.content.questions) && 
    exam.content.questions.some((q: any) => q.answers && q.answers.length > 0) ||
    (Array.isArray(exam.content) && exam.content.some((item: any) => 
      item.item_type === 'question' && item.answers && item.answers.length > 0
    ));
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
                    {t('sign_in_subscribe_correction') || 'Sign in and subscribe to access corrections'}
                  </p>
                  <Button onClick={() => navigate('/auth')}>
                    {t('sign_in')}
                  </Button>
                </CardContent>
              </Card> : !hasAccess ? <Card className="border-orange-500 bg-orange-50">
                <CardContent className="pt-6 text-center min-h-[60vh] flex flex-col justify-center">
                  <p className="text-orange-700 mb-4">
                    {t('subscribe_for_corrections') || 'Subscribe to access corrections'}
                  </p>
                  <Button onClick={() => navigate('/subscriptions')}>
                    {t('view_subscriptions')}
                  </Button>
                </CardContent>
              </Card> : hasAnswers ? (
                /* Two-column layout: Questions on left, Answers on right */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Questions Column */}
                  <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 border-b">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5" />
                        {t('questions') || 'Questions'}
                      </CardTitle>
                      <CardDescription>
                        {t('exam_questions_desc') || 'Exam questions'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                      {renderJsonContent(exam.content, false)}
                    </CardContent>
                  </Card>

                  {/* Answers Column */}
                  <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 border-b">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        {t('solutions') || 'Solutions'}
                      </CardTitle>
                      <CardDescription>
                        {t('detailed_answers_desc') || 'Detailed answers and explanations'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                      {renderJsonContent(exam.content, true)}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardContent className="pt-6 text-center min-h-[60vh] flex flex-col justify-center">
                    <p className="text-muted-foreground">
                      {t('correction_not_available') || 'Correction not available for this exam yet.'}
                    </p>
                  </CardContent>
                </Card>
              )}
          </div>}
      </div>
    </div>;
}