import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Calendar, Clock, ArrowLeft, X, Play } from 'lucide-react';
import { ExamContentRenderer } from '@/components/exam/ExamContentRenderer';
import { ExamSidebar } from '@/components/exam/ExamSidebar';
import { ZoomControls } from '@/components/exam/ZoomControls';
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
  // Standardized ID fields
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
const DEFAULT_DURATION = 3600; // 1 hour in seconds as default

export default function ExamViewer() {
  const {
    examId
  } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    language,
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
  const [hasAccess, setHasAccess] = useState(false);
  const [isFreeUser, setIsFreeUser] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activeQuestion, setActiveQuestion] = useState<string>('');
  const [sidebarQuestions, setSidebarQuestions] = useState<SidebarQuestion[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPdfSplit, setShowPdfSplit] = useState(false);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Evaluation mode state
  const [userAnswers, setUserAnswers] = useState<Array<{
    questionIndex: number;
    answer: string;
  }>>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<{
    correct: number;
    total: number;
  } | null>(null);
  const checkAccess = useCallback(async () => {
    if (!user) {
      setHasAccess(true); // Allow public access for preview
      setIsFreeUser(true); // Not logged in = free user
      return;
    }
    try {
      // Check if user is admin using the secure is_admin function
      const {
        data: isAdminUser,
        error: adminError
      } = await supabase.rpc('is_admin', {
        user_id: user.id
      });
      if (!adminError && isAdminUser === true) {
        setHasAccess(true);
        setIsFreeUser(false);
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
        setIsFreeUser(false);
      } else {
        setHasAccess(false);
        setIsFreeUser(true); // Logged in but no subscription = free user
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
      setIsFreeUser(true);
    }
  }, [user]);
  const fetchExam = useCallback(async () => {
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
          ),
          subjects:subject_id (
            name,
            name_en,
            name_fr
          ),
          exam_types:exam_type_id (
            name,
            name_en,
            name_fr
          ),
          periods:period_id (
            name,
            name_en,
            name_fr
          ),
          academic_years:academic_year_id (
            year_label,
            start_year,
            end_year
          ),
          durations:duration_id (
            display_label,
            minutes
          ),
          establishments:establishment_id (
            name,
            type,
            country
          )
        `).eq('id', examId).single();
      if (examError) throw examError;
      setExam(examData as any);

      // Extract questions for sidebar
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
    }
  }, [examId, fetchExam, checkAccess]);
  const extractQuestions = (content: any): SidebarQuestion[] => {
    const questions: SidebarQuestion[] = [];
    let questionNumber = 0;
    const items = Array.isArray(content) ? content : content.questions || [];
    items.forEach((item: any) => {
      if (item.item_type === 'heading') {
        questions.push({
          id: item.id,
          number: '',
          text: item.text || '',
          type: 'heading'
        });
      } else if (item.item_type === 'question') {
        questionNumber++;
        questions.push({
          id: item.id,
          number: item.paper_number || `Q${questionNumber}`,
          text: item.text || '',
          type: 'question'
        });
      }
    });
    return questions;
  };
  const handleQuestionClick = (questionId: string) => {
    setActiveQuestion(questionId);
    const element = document.getElementById(`question-${questionId}`);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
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
        updated[existing] = {
          questionIndex,
          answer
        };
        return updated;
      }
      return [...prev, {
        questionIndex,
        answer
      }];
    });
  };
  const calculateScore = () => {
    if (!exam?.content) return;
    let correct = 0;
    let total = 0;
    const items = Array.isArray(exam.content) ? exam.content : exam.content.questions || [];
    const questions = items.filter((item: any) => item.item_type === 'question' && item.question_type === 'multiple_choice' || item.type === 'multiple_choice');
    questions.forEach((question: any, index: number) => {
      total++;
      const userAnswer = userAnswers.find(a => a.questionIndex === index);
      const correctAnswer = question.answers?.find((a: any) => a.is_correct);
      if (correctAnswer && userAnswer?.answer === correctAnswer.text) {
        correct++;
      }
    });
    setScore({
      correct,
      total
    });
    setSubmitted(true);
    toast({
      title: t('evaluation_submitted'),
      description: t('your_score') + `: ${correct}/${total} (${total > 0 ? Math.round(correct / total * 100) : 0}%)`
    });
  };
  const resetEvaluation = () => {
    setUserAnswers([]);
    setSubmitted(false);
    setScore(null);
  };
  if (loading) {
    return <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-muted-foreground">{language === 'fr' ? 'Chargement...' : 'Loading...'}</p>
      </div>;
  }
  if (!exam) {
    return <div className="min-h-screen bg-background p-6 flex items-center justify-center">
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
      </div>;
  }
  const showAnswers = mode === 'correction' || mode === 'evaluation' && submitted || isFreeUser;
  return <div className="min-h-screen bg-background">
      {/* Exam Details Banner */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex flex-col gap-1">
              <h2 className="font-semibold text-lg">{exam.title}</h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                {exam.establishments && <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {exam.establishments.name}
                  </span>}
                {exam.classes && <span>{exam.classes.display_name}</span>}
                {exam.subjects && <span>{language === 'fr' ? exam.subjects.name_fr || exam.subjects.name : exam.subjects.name_en || exam.subjects.name}</span>}
                {exam.periods && <span>{language === 'fr' ? exam.periods.name_fr || exam.periods.name : exam.periods.name_en || exam.periods.name}</span>}
                {exam.academic_years && <span>{exam.academic_years.year_label}</span>}
                {exam.exam_types && <span>{language === 'fr' ? exam.exam_types.name_fr || exam.exam_types.name : exam.exam_types.name_en || exam.exam_types.name}</span>}
                {exam.durations && <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {exam.durations.display_label}
                  </span>}
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Mode Switcher Buttons */}
              <div className="flex items-center gap-2">
                <Button variant={mode === 'correction' ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => {
                if (mode === 'correction') {
                  navigate(`/exam/${examId}?mode=preview`);
                } else {
                  setShowCorrectionDialog(true);
                }
              }}>
                  <FileText className="h-4 w-4" />
                  {mode === 'correction' ? language === 'fr' ? 'Masquer Solutions' : 'Hide Solutions' : language === 'fr' ? 'Voir Correction' : 'View Correction'}
                </Button>
                
                <Button variant={mode === 'evaluation' ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => navigate(`/exam/${examId}?mode=evaluation`)}>
                  <Play className="h-4 w-4" />
                  {language === 'fr' ? 'Évaluation' : 'Evaluation'}
                </Button>
              </div>
              
              {/* View PDF Button */}
              {exam.file_url && <Button variant="outline" size="sm" className="gap-2" onClick={() => {
              const newShowPdf = !showPdfSplit;
              setShowPdfSplit(newShowPdf);
              if (newShowPdf) {
                setSidebarCollapsed(true);
              }
            }}>
                <FileText className="h-4 w-4" />
                {showPdfSplit ? language === 'fr' ? 'Masquer PDF' : 'Hide PDF' : language === 'fr' ? 'Version PDF' : 'PDF version'}
              </Button>}
            </div>
          </div>
        </div>
      </div>
      
      {/* Header with Back Button and Breadcrumb */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {language === 'fr' ? 'Retour' : 'Back'}
            </Button>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/exams">{language === 'fr' ? 'Épreuves' : 'Exams'}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                {exam.classes && <>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to={`/exams/${exam.class_id}/subjects`}>{exam.classes.display_name}</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>}
                <BreadcrumbItem>
                  <BreadcrumbPage>{exam.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className={cn("hidden lg:block border-r border-border bg-card transition-all duration-300", sidebarCollapsed ? "w-0 border-0" : "w-80")}>
          <ExamSidebar questions={sidebarQuestions} activeQuestion={activeQuestion} onQuestionClick={handleQuestionClick} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
        </aside>

        {/* Content Area */}
        <main className={cn("flex-1 overflow-auto transition-all duration-300", showPdfSplit && exam.file_url ? "w-1/2" : "w-full")}>
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            {/* Title Card */}
            

            {/* Score Card for Evaluation Mode */}
            {mode === 'evaluation' && submitted && score && <Card className="mb-6 border-primary bg-primary/5">
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
                          {Math.round(score.correct / score.total * 100)}%
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
              </Card>}

            {/* Exam Content */}
            <div ref={contentRef} style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left'
          }} className="transition-transform duration-200">
              {exam.content ? <ExamContentRenderer content={exam.content} showAnswers={showAnswers} mode={mode as 'preview' | 'evaluation' | 'solution'} questionIdPrefix="question-" userAnswers={userAnswers} onAnswerChange={handleAnswerChange} /> : <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      {language === 'fr' ? 'Aucun contenu disponible' : 'No content available'}
                    </p>
                  </CardContent>
                </Card>}
            </div>

            {/* Submit Button for Evaluation Mode */}
            {mode === 'evaluation' && !submitted && <Card className="mt-6 sticky bottom-4">
                <CardContent className="pt-6">
                  <Button onClick={calculateScore} className="w-full" size="lg" disabled={userAnswers.length === 0}>
                    {t('submit_evaluation')}
                  </Button>
                  {userAnswers.length === 0 && <p className="text-sm text-muted-foreground text-center mt-2">
                      {t('answer_at_least_one')}
                    </p>}
                </CardContent>
              </Card>}
          </div>
        </main>

        {/* PDF Split View */}
        {showPdfSplit && exam.file_url && <aside className="w-1/2 border-l border-border bg-card relative">
            <Button variant="ghost" size="icon" className="absolute right-2 top-2 z-10" onClick={() => setShowPdfSplit(false)}>
              <X className="h-4 w-4" />
            </Button>
            <iframe src={`${exam.file_url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`} className="w-full h-full" title="Exam PDF" />
          </aside>}
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
                {language === 'fr' ? 'Vous êtes sur le point de voir les solutions officielles de cette épreuve.' : 'You are about to view the official solutions for this exam.'}
              </p>
              <p className="font-semibold text-foreground">
                {language === 'fr' ? 'Nous vous suggérons de passer d\'abord en mode évaluation pour tester vos connaissances !' : 'We suggest taking the evaluation first to test your knowledge!'}
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
    </div>;
}