import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Calendar, Clock, ArrowLeft, X } from 'lucide-react';
import { ExamContentRenderer } from '@/components/exam/ExamContentRenderer';
import { ExamSidebar } from '@/components/exam/ExamSidebar';
import { ZoomControls } from '@/components/exam/ZoomControls';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
  duration_minutes?: number;
  content?: any;
  file_url?: string;
  created_at: string;
  classes?: {
    id: string;
    name: string;
    display_name: string;
    section: string;
    level: string;
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
    language
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
  const [zoom, setZoom] = useState(1);
  const [activeQuestion, setActiveQuestion] = useState<string>('');
  const [sidebarQuestions, setSidebarQuestions] = useState<SidebarQuestion[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPdfSplit, setShowPdfSplit] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const checkAccess = useCallback(async () => {
    if (!user) {
      setHasAccess(true); // Allow public access for preview
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
          )
        `).eq('id', examId).single();
      if (examError) throw examError;
      setExam(examData);

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
  const showAnswers = mode === 'correction';
  return <div className="min-h-screen bg-background">
      {/* Exam Details Banner */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="font-semibold text-lg">{exam.title}</h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {exam.year && <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{exam.year}</span>
                  </div>}
                {exam.period && <Badge variant="outline" className="text-xs">{exam.period}</Badge>}
                {exam.exam_type && <Badge variant="outline" className="text-xs">{exam.exam_type}</Badge>}
                {exam.duration_minutes && <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{exam.duration_minutes} min</span>
                  </div>}
              </div>
            </div>
            
            {/* View PDF Button */}
            {exam.file_url && <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => {
                  const newShowPdf = !showPdfSplit;
                  setShowPdfSplit(newShowPdf);
                  if (newShowPdf) {
                    setSidebarCollapsed(true);
                  }
                }}
              >
                <FileText className="h-4 w-4" />
                {showPdfSplit 
                  ? (language === 'fr' ? 'Masquer PDF' : 'Hide PDF')
                  : (language === 'fr' ? 'Voir PDF' : 'View PDF')
                }
              </Button>}
          </div>
        </div>
      </div>
      
      {/* Header with Back Button and Breadcrumb */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/exams/${exam.class_id}/list?subject=${exam.subject}`)}
              className="gap-2"
            >
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
                  <BreadcrumbPage>{exam.subject}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-64px)]">
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
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            {/* Title Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-2xl">{exam.title}</CardTitle>
                <CardDescription>
                  {mode === 'correction' ? language === 'fr' ? 'Correction officielle' : 'Official Corrections' : mode === 'evaluation' ? language === 'fr' ? 'Mode évaluation' : 'Evaluation Mode' : language === 'fr' ? 'Aperçu des questions' : 'Question Preview'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {exam.classes && <Badge variant="secondary">{exam.classes.display_name}</Badge>}
                  {exam.subject && <Badge variant="outline">{exam.subject}</Badge>}
                  {exam.year && <Badge variant="outline">{exam.year}</Badge>}
                  {exam.exam_type && <Badge variant="outline">{exam.exam_type}</Badge>}
                </div>
              </CardContent>
            </Card>

            {/* Exam Content */}
            <div ref={contentRef} style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left'
          }} className="transition-transform duration-200">
              {exam.content ? <ExamContentRenderer content={exam.content} showAnswers={showAnswers} mode={mode as 'preview' | 'evaluation' | 'solution'} questionIdPrefix="question-" /> : <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      {language === 'fr' ? 'Aucun contenu disponible' : 'No content available'}
                    </p>
                  </CardContent>
                </Card>}
            </div>
          </div>
        </main>

        {/* PDF Split View */}
        {showPdfSplit && exam.file_url && (
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
    </div>;
}