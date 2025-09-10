import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Eye, 
  PenTool, 
  CheckCircle, 
  Clock, 
  FileText,
  Download
} from 'lucide-react';

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
  content?: any; // JSON content
  created_at: string;
  classes?: {
    id: string;
    name: string;
    display_name: string;
    section: string;
    level: string;
  };
}

interface Correction {
  id: string;
  title: string;
  content: string | any; // Handle JSON content
}

interface UserAnswer {
  questionIndex: number;
  answer: string;
  isCorrect?: boolean;
}

const EXAM_DURATION = 3600; // 1 hour in seconds

export default function ExamViewer() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const mode = searchParams.get('mode') || 'preview';
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(mode);
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

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
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        setHasAccess(true);
        return;
      }

      // Check subscription for other users
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

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
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (examError) throw examError;
      setExam(examData);

      // Fetch correction
      const { data: correctionData } = await supabase
        .from('corrections')
        .select('*')
        .eq('exam_id', examId)
        .eq('is_published', true)
        .single();

      if (correctionData) {
        setCorrection({
          ...correctionData,
          content: typeof correctionData.content === 'string' ? correctionData.content : JSON.stringify(correctionData.content)
        });
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: 'Failed to fetch exam details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
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
        return prev.map(a => 
          a.questionIndex === questionIndex ? { ...a, answer } : a
        );
      } else {
        return [...prev, { questionIndex, answer }];
      }
    });
  };

  const handleSubmitEvaluation = () => {
    setIsTimerActive(false);
    setShowResults(true);
    toast({
      title: 'Evaluation Complete',
      description: 'Your answers have been submitted',
    });
  };

  const renderMarkdown = (content: string) => {
    if (!content) return null;
    
    // Simple markdown rendering (you might want to use a proper markdown library)
    return content.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold mb-4">{line.substring(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold mb-3">{line.substring(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-medium mb-2">{line.substring(4)}</h3>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={index} className="font-bold mb-2">{line.slice(2, -2)}</p>;
      }
      if (line.trim() === '') {
        return <br key={index} />;
      }
      return <p key={index} className="mb-2">{line}</p>;
    });
  };

  const renderJsonContent = (content: any) => {
    if (!content) return null;
    
    // Handle both old string format and new JSON format
    if (typeof content === 'string') {
      return <div className="prose max-w-none">{renderMarkdown(content)}</div>;
    }
    
    // Handle JSON format
    if (content.questions && Array.isArray(content.questions)) {
      return (
        <div className="space-y-6">
          {content.exam_info && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Exam Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
                {content.exam_info.duration && <p><strong>Duration:</strong> {content.exam_info.duration}</p>}
                {content.exam_info.total_marks && <p><strong>Total Marks:</strong> {content.exam_info.total_marks}</p>}
                {content.exam_info.instructions && <p className="col-span-2"><strong>Instructions:</strong> {content.exam_info.instructions}</p>}
              </div>
            </div>
          )}
          
          {content.questions.map((question: any, index: number) => (
            <div key={question.id || index} className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">{question.title}</h3>
              {question.content && <p className="mb-3">{question.content}</p>}
              {question.parts && question.parts.length > 0 && (
                <div className="space-y-2">
                  {question.parts.map((part: string, partIndex: number) => (
                    <p key={partIndex} className="pl-4">{part}</p>
                  ))}
                </div>
              )}
              {question.marks && (
                <p className="text-sm text-gray-600 mt-2 font-medium">[{question.marks} marks]</p>
              )}
            </div>
          ))}
        </div>
      );
    }
    
    return <p className="text-muted-foreground">No content available.</p>;
  };

  const renderCorrectionContent = (correction: any) => {
    if (!correction || !correction.content) return null;
    
    const content = typeof correction.content === 'string' 
      ? JSON.parse(correction.content) 
      : correction.content;

    if (!content.questions || !content.answers) return null;

    return (
      <div className="space-y-8">
        {content.questions.map((question: any, index: number) => {
          // Find the corresponding answer
          const answer = content.answers.find((ans: any) => ans.question_id === question.id);
          
          return (
            <div key={question.id || index} className="space-y-4">
              {/* Question */}
              <div className="border border-gray-200 rounded-lg p-6 bg-white">
                <h4 className="text-lg font-semibold mb-3 text-gray-800">{question.title}</h4>
                {question.content && <p className="mb-3 text-gray-700">{question.content}</p>}
                {question.parts && question.parts.length > 0 && (
                  <div className="space-y-2">
                    {question.parts.map((part: string, partIndex: number) => (
                      <p key={partIndex} className="pl-4 text-gray-700">{part}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Answer */}
              {answer && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold mb-4 text-green-800">{answer.title}</h4>
                  {answer.solutions && answer.solutions.map((solution: any, solIndex: number) => (
                    <div key={solIndex} className="mb-4 last:mb-0">
                      {solution.part && <p className="font-medium text-green-700 mb-2">Part {solution.part}:</p>}
                      <div className="bg-green-25 p-4 rounded border-l-4 border-green-400">
                        <pre className="whitespace-pre-wrap text-sm text-green-800 font-mono leading-relaxed">
                          {solution.solution}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Exam not found</p>
            <Button onClick={() => navigate('/exams')} className="mt-4">
              Back to Exams
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gradient-subtle min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/exams')}
            className="flex items-center gap-2"
          >
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
        {mode === 'evaluation' && isTimerActive && (
          <Card className="border-orange-500 bg-orange-50">
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
          </Card>
        )}

        {/* Content based on mode */}
        {mode === 'preview' && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('question_preview') || 'Question Preview'}
              </CardTitle>
              <CardDescription>
                {t('review_questions_desc') || 'Review the exam questions without answers.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 min-h-[60vh]">
              {exam.content ? (
                renderJsonContent(exam.content)
              ) : (
                <p className="text-muted-foreground">No content available for preview.</p>
              )}
            </CardContent>
          </Card>
        )}

        {mode === 'evaluation' && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
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
              {!isTimerActive && !showResults ? (
                <div className="text-center py-8">
                  <Button onClick={handleStartEvaluation} size="lg">
                    Start Evaluation ({formatTime(EXAM_DURATION)})
                  </Button>
                </div>
              ) : showResults ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-green-600">Evaluation Complete!</h3>
                  <p>Your answers have been recorded. You can now view the correction to see the correct answers.</p>
                  <Button 
                    onClick={() => navigate(`/exam/${examId}?mode=correction`)}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    View Correction
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {exam.content ? (
                    renderJsonContent(exam.content)
                  ) : (
                    <p className="text-muted-foreground">No questions available.</p>
                  )}
                  <div className="pt-4 border-t flex gap-4">
                    <Button 
                      onClick={handleSubmitEvaluation}
                      className="flex items-center gap-2"
                    >
                      Submit Answers
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {mode === 'correction' && (
          <>
            {!hasAccess && !user ? (
              <Card className="border-orange-500 bg-orange-50">
                <CardContent className="pt-6 text-center min-h-[60vh] flex flex-col justify-center">
                  <p className="text-orange-700 mb-4">
                    Sign in and subscribe to access corrections
                  </p>
                  <Button onClick={() => navigate('/auth')}>
                    Sign In
                  </Button>
                </CardContent>
              </Card>
            ) : !hasAccess ? (
              <Card className="border-orange-500 bg-orange-50">
                <CardContent className="pt-6 text-center min-h-[60vh] flex flex-col justify-center">
                  <p className="text-orange-700 mb-4">
                    Subscribe to access corrections
                  </p>
                  <Button onClick={() => navigate('/subscriptions')}>
                    View Subscription Plans
                  </Button>
                </CardContent>
              </Card>
            ) : (
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
                  {correction ? (
                    renderCorrectionContent(correction)
                  ) : (
                    <p className="text-muted-foreground">
                      Correction not available for this exam yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}