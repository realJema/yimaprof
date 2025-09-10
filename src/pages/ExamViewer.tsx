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
  class_level: string;
  year?: number;
  period?: string;
  exam_type?: string;
  description?: string;
  language?: string;
  content?: string;
  created_at: string;
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

  const parseCorrectionContent = (content: string) => {
    if (!content) return { questions: '', answers: '' };
    
    // Remove quotes if content is JSON-wrapped
    const cleanContent = content.startsWith('"') && content.endsWith('"') 
      ? content.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"')
      : content;
    
    // Split by the separator (---)
    const sections = cleanContent.split('---');
    
    if (sections.length >= 2) {
      return {
        questions: sections[0].trim(),
        answers: sections[1].trim()
      };
    }
    
    // If no separator found, treat entire content as mixed
    return { questions: cleanContent, answers: '' };
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
              {exam.subject} • {exam.class_level} • {exam.year}
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
                <div className="prose max-w-none">
                  {renderMarkdown(exam.content)}
                </div>
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
                  <div className="prose max-w-none">
                    {renderMarkdown(exam.content || '')}
                  </div>
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
              <div className="space-y-6">
                {/* Questions Section */}
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Questions
                    </CardTitle>
                    <CardDescription>
                      Exam questions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {exam.content ? (
                      <div className="prose max-w-none">
                        {renderMarkdown(exam.content)}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No questions available.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Correction Section */}
                {correction && (() => {
                  const { questions, answers } = parseCorrectionContent(correction.content);
                  return (
                    <>
                      {questions && (
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              Questions (Detailed)
                            </CardTitle>
                            <CardDescription>
                              Complete question formulations
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="prose max-w-none">
                              {renderMarkdown(questions)}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      
                      {answers && (
                        <Card className="border-green-200 bg-green-50 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-800">
                              <CheckCircle className="h-5 w-5" />
                              Complete Solutions
                            </CardTitle>
                            <CardDescription className="text-green-700">
                              Detailed answers and explanations
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6 bg-green-50">
                            <div className="prose max-w-none prose-green">
                              {renderMarkdown(answers)}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  );
                })()}
                
                {!correction && (
                  <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Complete Solution
                      </CardTitle>
                      <CardDescription>
                        Detailed answers and explanations
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <p className="text-muted-foreground">
                        Correction not available for this exam yet.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}