import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { FileText, Calendar, Clock, ArrowLeft, X, Play, CheckCircle, BookOpen } from 'lucide-react';
import { ExamContentRenderer } from '@/components/exam/ExamContentRenderer';
import { ExamSidebar } from '@/components/exam/ExamSidebar';
import { ZoomControls } from '@/components/exam/ZoomControls';
import { EvaluationRulesDialog } from '@/components/exam/EvaluationRulesDialog';
import { EvaluationTimer } from '@/components/exam/EvaluationTimer';
import { EvaluationControls } from '@/components/exam/EvaluationControls';
import { EvaluationResultsDialog } from '@/components/exam/EvaluationResultsDialog';
import { EvaluationExitDialog } from '@/components/exam/EvaluationExitDialog';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Exam {
  id: string;
  title: string;
  class_id?: string;
  description?: string;
  language?: string;
  content?: any;
  file_url?: string;
  created_at: string;
  subject_id: string;
  exam_type_id: string;
  period_id: string;
  academic_year_id: string;
  duration_id: string;
  establishment_id?: string;
  classes?: {
    id: string;
    name: string;
    display_name: string;
    section: string;
    level: string;
  };
  subjects?: {
    name: string;
    name_en?: string;
    name_fr?: string;
  };
  exam_types?: {
    name: string;
    name_en?: string;
    name_fr?: string;
  };
  periods?: {
    name: string;
    name_en?: string;
    name_fr?: string;
  };
  academic_years?: {
    year_label: string;
    start_year: number;
    end_year: number;
  };
  durations?: {
    display_label: string;
    minutes: number;
  };
  establishments?: {
    name: string;
    type?: string;
    country?: string;
  };
}

interface SidebarQuestion {
  id: string;
  number: string;
  text: string;
  type: 'heading' | 'question';
}

const DEFAULT_DURATION_MINUTES = 60;

export default function ExamViewer() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const mode = searchParams.get('mode') || 'preview';
  
  // Core state
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isFreeUser, setIsFreeUser] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activeQuestion, setActiveQuestion] = useState<string>('');
  const [sidebarQuestions, setSidebarQuestions] = useState<SidebarQuestion[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Collapsed by default
  const [showPdfSplit, setShowPdfSplit] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Evaluation state
  const [userAnswers, setUserAnswers] = useState<Array<{ questionIndex: number; answer: string }>>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  
  // Enhanced evaluation state
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [evaluationActive, setEvaluationActive] = useState(false);
  const [evaluationPaused, setEvaluationPaused] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [currentAttemptNumber, setCurrentAttemptNumber] = useState(1);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [totalEvaluationSeconds, setTotalEvaluationSeconds] = useState(0);

  // Fetch previous attempts count
  const fetchAttemptCount = useCallback(async () => {
    if (!user || !examId) return;
    
    try {
      const { count, error } = await supabase
        .from('user_evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('exam_id', examId);
      
      if (!error && count !== null) {
        setAttemptCount(count);
        setCurrentAttemptNumber(count + 1);
      }
    } catch (error) {
      console.error('Error fetching attempt count:', error);
    }
  }, [user, examId]);

  const checkAccess = useCallback(async () => {
    if (!user) {
      setHasAccess(true);
      setIsFreeUser(true);
      return;
    }
    try {
      const { data: isAdminUser, error: adminError } = await supabase.rpc('is_admin', { user_id: user.id });
      if (!adminError && isAdminUser === true) {
        setHasAccess(true);
        setIsFreeUser(false);
        return;
      }

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select(`*, subscription_plans (name)`)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      
      if (subscription) {
        setHasAccess(true);
        setIsFreeUser(false);
      } else {
        setHasAccess(false);
        setIsFreeUser(true);
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
      setIsFreeUser(true);
    }
  }, [user]);

  const fetchExam = useCallback(async () => {
    try {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select(`
          *,
          classes (id, name, display_name, section, level),
          subjects:subject_id (name, name_en, name_fr),
          exam_types:exam_type_id (name, name_en, name_fr),
          periods:period_id (name, name_en, name_fr),
          academic_years:academic_year_id (year_label, start_year, end_year),
          durations:duration_id (display_label, minutes),
          establishments:establishment_id (name, type, country)
        `)
        .eq('id', examId)
        .single();
      
      if (examError) throw examError;
      setExam(examData as any);

      if (examData.content) {
        const questions = extractQuestions(examData.content);
        setSidebarQuestions(questions);
        if (questions.length > 0 && questions[0].type === 'question') {
          setActiveQuestion(questions[0].id);
        }
      }
    } catch (error) {
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr' ? 'Échec de la récupération des détails de l\'épreuve' : 'Failed to fetch exam details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [examId, language, toast]);

  useEffect(() => {
    if (examId) {
      fetchExam();
      checkAccess();
      fetchAttemptCount();
    }
  }, [examId, fetchExam, checkAccess, fetchAttemptCount]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement && evaluationActive && !submitted) {
        // User exited fullscreen manually - pause the evaluation
        setEvaluationPaused(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [evaluationActive, submitted]);

  const extractQuestions = (content: any): SidebarQuestion[] => {
    const questions: SidebarQuestion[] = [];
    let questionNumber = 0;
    const items = Array.isArray(content) ? content : content.questions || [];
    items.forEach((item: any) => {
      if (item.item_type === 'heading') {
        questions.push({ id: item.id, number: '', text: item.text || '', type: 'heading' });
      } else if (item.item_type === 'question') {
        questionNumber++;
        questions.push({ id: item.id, number: item.paper_number || `Q${questionNumber}`, text: item.text || '', type: 'question' });
      }
    });
    return questions;
  };

  const handleQuestionClick = (questionId: string) => {
    setActiveQuestion(questionId);
    const element = document.getElementById(`question-${questionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setZoom(1);

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setUserAnswers(prev => {
      const existing = prev.findIndex(a => a.questionIndex === questionIndex);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { questionIndex, answer };
        return updated;
      }
      return [...prev, { questionIndex, answer }];
    });
  };

  // Check if exam has MCQ questions
  const hasMcqQuestions = useCallback(() => {
    if (!exam?.content) return false;
    const items = Array.isArray(exam.content) ? exam.content : exam.content.questions || [];
    return items.some((item: any) => 
      (item.item_type === 'question' && item.question_type === 'multiple_choice') || 
      item.type === 'multiple_choice'
    );
  }, [exam]);

  const calculateScore = useCallback(() => {
    if (!exam?.content) return { correct: 0, total: 0 };
    
    let correct = 0;
    let total = 0;
    const items = Array.isArray(exam.content) ? exam.content : exam.content.questions || [];
    const questions = items.filter((item: any) => 
      (item.item_type === 'question' && item.question_type === 'multiple_choice') || 
      item.type === 'multiple_choice'
    );
    
    questions.forEach((question: any, index: number) => {
      total++;
      const userAnswer = userAnswers.find(a => a.questionIndex === index);
      const correctAnswer = question.answers?.find((a: any) => a.is_correct);
      if (correctAnswer && userAnswer?.answer === correctAnswer.text) {
        correct++;
      }
    });
    
    return { correct, total };
  }, [exam, userAnswers]);

  // Save evaluation to database
  const saveEvaluation = useCallback(async (mcqScore: { correct: number; total: number } | null) => {
    if (!user || !examId) return;

    try {
      const { error } = await supabase.from('user_evaluations').insert({
        user_id: user.id,
        exam_id: examId,
        attempt_number: currentAttemptNumber,
        mcq_score: mcqScore?.correct ?? null,
        mcq_total: mcqScore?.total ?? null,
        time_spent_seconds: timeSpentSeconds,
        answers: userAnswers
      });

      if (error) {
        console.error('Error saving evaluation:', error);
      }
    } catch (error) {
      console.error('Error saving evaluation:', error);
    }
  }, [user, examId, currentAttemptNumber, timeSpentSeconds, userAnswers]);

  // Start evaluation (after rules dialog)
  const handleStartEvaluation = async () => {
    setShowRulesDialog(false);
    setEvaluationActive(true);
    setEvaluationPaused(false);
    setUserAnswers([]);
    setSubmitted(false);
    setScore(null);
    
    const durationMinutes = exam?.durations?.minutes || DEFAULT_DURATION_MINUTES;
    setTotalEvaluationSeconds(durationMinutes * 60);
    setTimeSpentSeconds(0);
    
    // Enter fullscreen
    try {
      await document.documentElement.requestFullscreen();
    } catch (error) {
      console.error('Could not enter fullscreen:', error);
    }

    // Navigate to evaluation mode
    navigate(`/exam/${examId}?mode=evaluation`, { replace: true });
  };

  // Handle evaluation submission
  const handleSubmitEvaluation = async () => {
    const hasMcq = hasMcqQuestions();
    const mcqScore = hasMcq ? calculateScore() : null;
    
    setScore(mcqScore);
    setSubmitted(true);
    setEvaluationActive(false);
    
    // Exit fullscreen
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.error('Could not exit fullscreen:', error);
      }
    }

    // Save to database
    await saveEvaluation(mcqScore);
    
    // Show results dialog
    setShowResultsDialog(true);
  };

  // Handle time up
  const handleTimeUp = () => {
    toast({
      title: language === 'fr' ? 'Temps écoulé !' : 'Time\'s up!',
      description: language === 'fr' ? 'Votre évaluation est automatiquement soumise.' : 'Your evaluation is automatically submitted.',
      variant: 'default'
    });
    handleSubmitEvaluation();
  };

  // Handle timer tick
  const handleTimerTick = (remainingSeconds: number) => {
    const durationMinutes = exam?.durations?.minutes || DEFAULT_DURATION_MINUTES;
    const totalSeconds = durationMinutes * 60;
    setTimeSpentSeconds(totalSeconds - remainingSeconds);
  };

  // Handle pause
  const handlePause = () => setEvaluationPaused(true);
  const handleResume = async () => {
    setEvaluationPaused(false);
    // Re-enter fullscreen if needed
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (error) {
        console.error('Could not enter fullscreen:', error);
      }
    }
  };

  // Handle exit confirmation
  const handleConfirmExit = async () => {
    setShowExitDialog(false);
    setEvaluationActive(false);
    setEvaluationPaused(false);
    setUserAnswers([]);
    
    // Exit fullscreen
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.error('Could not exit fullscreen:', error);
      }
    }
    
    navigate(`/exam/${examId}?mode=preview`, { replace: true });
  };

  // Handle retry
  const handleRetry = () => {
    setShowResultsDialog(false);
    setAttemptCount(prev => prev + 1);
    setCurrentAttemptNumber(prev => prev + 1);
    setShowRulesDialog(true);
  };

  // Handle close results
  const handleCloseResults = () => {
    setShowResultsDialog(false);
    navigate(`/exam/${examId}?mode=preview`, { replace: true });
  };

  // Handle view answers - navigate to correction mode with submitted answers
  const handleViewAnswers = () => {
    setShowResultsDialog(false);
    navigate(`/exam/${examId}?mode=correction`, { replace: true });
  };

  // Reset evaluation for retry button in old flow
  const resetEvaluation = () => {
    setUserAnswers([]);
    setSubmitted(false);
    setScore(null);
  };

  // Click handler for evaluation button
  const handleEvaluationButtonClick = () => {
    if (mode === 'evaluation' && !evaluationActive) {
      setShowRulesDialog(true);
    } else if (mode !== 'evaluation') {
      setShowRulesDialog(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-muted-foreground">{language === 'fr' ? 'Chargement...' : 'Loading...'}</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              {language === 'fr' ? 'Épreuve non trouvée' : 'Exam not found'}
            </p>
            <Button onClick={() => navigate('/exams')} className="mt-4">
              {language === 'fr' ? 'Retour aux épreuves' : 'Back to Exams'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showAnswers = mode === 'correction' || (mode === 'evaluation' && submitted) || isFreeUser;
  const durationMinutes = exam.durations?.minutes || DEFAULT_DURATION_MINUTES;

  // Fullscreen evaluation mode
  if (evaluationActive && !submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Fullscreen Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="font-semibold">{exam.title}</h2>
                <Badge variant="secondary">
                  {language === 'fr' ? 'Évaluation' : 'Evaluation'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4">
                <EvaluationTimer
                  totalSeconds={totalEvaluationSeconds}
                  isPaused={evaluationPaused}
                  onTimeUp={handleTimeUp}
                  onTick={handleTimerTick}
                />
                <EvaluationControls
                  isPaused={evaluationPaused}
                  onPause={handlePause}
                  onResume={handleResume}
                  onExit={() => setShowExitDialog(true)}
                  onSubmit={handleSubmitEvaluation}
                  canSubmit={userAnswers.length > 0}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Pause Overlay */}
        {evaluationPaused && (
          <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center">
            <Card className="max-w-md">
              <CardHeader className="text-center">
                <CardTitle>{language === 'fr' ? 'Évaluation en Pause' : 'Evaluation Paused'}</CardTitle>
                <CardDescription>
                  {language === 'fr' 
                    ? 'Cliquez sur "Reprendre" pour continuer votre évaluation.'
                    : 'Click "Resume" to continue your evaluation.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center gap-3">
                <Button onClick={handleResume} className="gap-2">
                  <Play className="h-4 w-4" />
                  {language === 'fr' ? 'Reprendre' : 'Resume'}
                </Button>
                <Button variant="destructive" onClick={() => setShowExitDialog(true)}>
                  {language === 'fr' ? 'Quitter' : 'Exit'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <div ref={contentRef} style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }} className="transition-transform duration-200">
              {exam.content ? (
                <ExamContentRenderer
                  content={exam.content}
                  showAnswers={false}
                  mode="evaluation"
                  questionIdPrefix="question-"
                  userAnswers={userAnswers}
                  onAnswerChange={handleAnswerChange}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      {language === 'fr' ? 'Aucun contenu disponible' : 'No content available'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>

        <ZoomControls zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleZoomReset} />
        
        <EvaluationExitDialog
          open={showExitDialog}
          onOpenChange={setShowExitDialog}
          onConfirmExit={handleConfirmExit}
        />
      </div>
    );
  }

  // Normal view
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-first Header with Back Button */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 sm:gap-2 px-2 sm:px-3">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'fr' ? 'Retour' : 'Back'}</span>
            </Button>
            <Breadcrumb className="hidden sm:flex">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/exams">{language === 'fr' ? 'Épreuves' : 'Exams'}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                {exam.classes && (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to={`/exams/${exam.class_id}/subjects`}>{exam.classes.display_name}</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>
                )}
                <BreadcrumbItem>
                  <BreadcrumbPage className="max-w-[200px] truncate">{exam.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            {/* Mobile: Show title in header */}
            <span className="sm:hidden text-sm font-medium truncate flex-1">{exam.title}</span>
          </div>
        </div>
      </header>

      {/* Exam Details Banner - Redesigned for Mobile */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {/* Title - Hidden on mobile (shown in header) */}
          <h2 className="hidden sm:block font-semibold text-lg mb-3">{exam.title}</h2>
          
          {/* Mobile: Compact Info Grid */}
          <div className="grid grid-cols-2 gap-2 sm:hidden mb-3">
            {exam.subjects && (
              <div className="bg-background/60 rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">{language === 'fr' ? 'Matière' : 'Subject'}</p>
                <p className="text-sm font-medium truncate">
                  {language === 'fr' ? exam.subjects.name_fr || exam.subjects.name : exam.subjects.name_en || exam.subjects.name}
                </p>
              </div>
            )}
            {exam.classes && (
              <div className="bg-background/60 rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">{language === 'fr' ? 'Classe' : 'Class'}</p>
                <p className="text-sm font-medium truncate">{exam.classes.display_name}</p>
              </div>
            )}
            {exam.academic_years && (
              <div className="bg-background/60 rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">{language === 'fr' ? 'Année' : 'Year'}</p>
                <p className="text-sm font-medium">{exam.academic_years.year_label}</p>
              </div>
            )}
            {exam.durations && (
              <div className="bg-background/60 rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">{language === 'fr' ? 'Durée' : 'Duration'}</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {exam.durations.display_label}
                </p>
              </div>
            )}
          </div>
          
          {/* Desktop: Inline Info */}
          <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground flex-wrap mb-3">
            {exam.establishments && (
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {exam.establishments.name}
              </span>
            )}
            {exam.classes && <span>{exam.classes.display_name}</span>}
            {exam.subjects && <span>{language === 'fr' ? exam.subjects.name_fr || exam.subjects.name : exam.subjects.name_en || exam.subjects.name}</span>}
            {exam.periods && <span>{language === 'fr' ? exam.periods.name_fr || exam.periods.name : exam.periods.name_en || exam.periods.name}</span>}
            {exam.academic_years && <span>{exam.academic_years.year_label}</span>}
            {exam.exam_types && <span>{language === 'fr' ? exam.exam_types.name_fr || exam.exam_types.name : exam.exam_types.name_en || exam.exam_types.name}</span>}
            {exam.durations && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {exam.durations.display_label}
              </span>
            )}
          </div>
          
          {/* Mobile: Additional Info Badges */}
          <div className="flex flex-wrap gap-1.5 sm:hidden mb-3">
            {exam.establishments && (
              <Badge variant="secondary" className="text-xs">
                {exam.establishments.name}
              </Badge>
            )}
            {exam.periods && (
              <Badge variant="outline" className="text-xs">
                {language === 'fr' ? exam.periods.name_fr || exam.periods.name : exam.periods.name_en || exam.periods.name}
              </Badge>
            )}
            {exam.exam_types && (
              <Badge variant="outline" className="text-xs">
                {language === 'fr' ? exam.exam_types.name_fr || exam.exam_types.name : exam.exam_types.name_en || exam.exam_types.name}
              </Badge>
            )}
          </div>
            
          {/* Action Buttons - Full width on mobile */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Mode Switcher Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button 
                size="sm" 
                className={cn(
                  "gap-1.5 sm:gap-2 font-medium flex-1 sm:flex-none text-xs sm:text-sm",
                  mode === 'correction' 
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                    : "bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/20 dark:text-indigo-400"
                )}
                onClick={() => {
                  if (mode === 'correction') {
                    navigate(`/exam/${examId}?mode=preview`);
                  } else {
                    setShowCorrectionDialog(true);
                  }
                }}
              >
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">
                  {mode === 'correction' 
                    ? (language === 'fr' ? 'Masquer' : 'Hide')
                    : (language === 'fr' ? 'Correction' : 'Correction')
                  }
                </span>
                <span className="xs:hidden">
                  {language === 'fr' ? 'Corrigé' : 'Solution'}
                </span>
              </Button>
              
              <Button 
                size="sm" 
                className={cn(
                  "gap-1.5 sm:gap-2 font-medium flex-1 sm:flex-none text-xs sm:text-sm",
                  mode === 'evaluation' && submitted
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                )}
                onClick={handleEvaluationButtonClick}
              >
                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {language === 'fr' ? 'Évaluation' : 'Evaluate'}
              </Button>
              
              {/* View PDF Button */}
              {exam.file_url && (
                <Button 
                  size="sm" 
                  className={cn(
                    "gap-1.5 sm:gap-2 font-medium flex-1 sm:flex-none text-xs sm:text-sm",
                    showPdfSplit
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-amber-500/10 border border-amber-500/30 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                  )}
                  onClick={() => {
                    if (isMobile) {
                      setShowPdfModal(true);
                    } else {
                      const newShowPdf = !showPdfSplit;
                      setShowPdfSplit(newShowPdf);
                      if (newShowPdf) {
                        setSidebarCollapsed(true);
                      }
                    }
                  }}
                >
                  <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">
                    {!isMobile && showPdfSplit 
                      ? (language === 'fr' ? 'Masquer PDF' : 'Hide PDF')
                      : (language === 'fr' ? 'PDF' : 'PDF')
                    }
                  </span>
                  <span className="xs:hidden">PDF</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-[calc(100vh-200px)] sm:h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className={cn(
          "hidden lg:block border-r border-border bg-card transition-all duration-300",
          sidebarCollapsed ? "w-0 border-0" : "w-80"
        )}>
          <ExamSidebar
            questions={sidebarQuestions}
            activeQuestion={activeQuestion}
            onQuestionClick={handleQuestionClick}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </aside>

        {/* Content Area */}
        <main className={cn(
          "flex-1 overflow-auto transition-all duration-300",
          showPdfSplit && exam.file_url ? "w-1/2" : "w-full"
        )}>
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
            {/* Score Card for Evaluation Mode */}
            {mode === 'evaluation' && submitted && score && (
              <Card className="mb-6 border-primary bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {t('evaluation_results')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-3xl font-bold text-primary">
                          {score.correct}/{score.total}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('correct_answers')}
                        </p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold">
                          {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('score')}
                        </p>
                      </div>
                    </div>
                    <Button onClick={resetEvaluation} className="w-full">
                      {t('retry_evaluation')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Exam Content */}
            <div 
              ref={contentRef} 
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }} 
              className="transition-transform duration-200"
            >
              {exam.content ? (
                <ExamContentRenderer
                  content={exam.content}
                  showAnswers={showAnswers}
                  mode={mode as 'preview' | 'evaluation' | 'solution'}
                  questionIdPrefix="question-"
                  userAnswers={userAnswers}
                  onAnswerChange={handleAnswerChange}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      {language === 'fr' ? 'Aucun contenu disponible' : 'No content available'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>

        {/* PDF Split View - Desktop Only */}
        {!isMobile && showPdfSplit && exam.file_url && (
          <aside className="w-1/2 border-l border-border bg-card relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-2 top-2 z-10" 
              onClick={() => setShowPdfSplit(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <iframe 
              src={`${exam.file_url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`} 
              className="w-full h-full" 
              title="Exam PDF" 
            />
          </aside>
        )}
      </div>

      {/* Zoom Controls */}
      <ZoomControls zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleZoomReset} />
      
      {/* Correction Confirmation Dialog */}
      <AlertDialog open={showCorrectionDialog} onOpenChange={setShowCorrectionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'fr' ? 'Voir la correction ?' : 'View Correction?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {language === 'fr' 
                  ? 'Vous êtes sur le point de voir les solutions officielles de cette épreuve.'
                  : 'You are about to view the official solutions for this exam.'
                }
              </p>
              <p className="font-semibold text-foreground">
                {language === 'fr' 
                  ? 'Nous vous suggérons de passer d\'abord en mode évaluation pour tester vos connaissances !'
                  : 'We suggest taking the evaluation first to test your knowledge!'
                }
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate(`/exam/${examId}?mode=correction`)}>
              {language === 'fr' ? 'Voir quand même' : 'View Anyway'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Evaluation Rules Dialog */}
      <EvaluationRulesDialog
        open={showRulesDialog}
        onOpenChange={setShowRulesDialog}
        onStart={handleStartEvaluation}
        durationMinutes={durationMinutes}
        attemptCount={attemptCount}
      />

      {/* Evaluation Results Dialog */}
      <EvaluationResultsDialog
        open={showResultsDialog}
        onOpenChange={setShowResultsDialog}
        score={score}
        hasMcq={hasMcqQuestions()}
        timeSpentSeconds={timeSpentSeconds}
        attemptNumber={currentAttemptNumber}
        onRetry={handleRetry}
        onClose={handleCloseResults}
        onViewAnswers={handleViewAnswers}
      />

      {/* PDF Modal - Mobile Only */}
      <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
        <DialogContent className="max-w-[95vw] h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>
              {language === 'fr' ? 'Version PDF' : 'PDF Version'}
            </DialogTitle>
          </DialogHeader>
          {exam.file_url && (
            <iframe 
              src={`${exam.file_url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`} 
              className="w-full h-full rounded-b-lg" 
              title="Exam PDF" 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
