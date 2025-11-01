import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, Printer, Share2, FileText } from 'lucide-react';
import { ExamContentRenderer } from '@/components/exam/ExamContentRenderer';
import { ExamSidebar } from '@/components/exam/ExamSidebar';
import { ZoomControls } from '@/components/exam/ZoomControls';
import { Link } from 'react-router-dom';
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

interface SidebarQuestion {
  id: string;
  number: string;
  text: string;
  type: 'heading' | 'question';
}

const DEFAULT_DURATION = 3600; // 1 hour in seconds as default

export default function ExamViewer() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const mode = searchParams.get('mode') || 'preview';
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activeQuestion, setActiveQuestion] = useState<string>('');
  const [sidebarQuestions, setSidebarQuestions] = useState<SidebarQuestion[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (examId) {
      fetchExam();
      checkAccess();
    }
  }, [examId, user]);
  const checkAccess = async () => {
    if (!user) {
      setHasAccess(true); // Allow public access for preview
      return;
    }
    try {
      // Check if user is admin using the secure is_admin function
      const { data: isAdminUser, error: adminError } = await supabase.rpc('is_admin', {
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
  };

  const fetchExam = async () => {
    try {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select(`
          *,
          classes (
            id,
            name,
            display_name,
            section,
            level
          )
        `)
        .eq('id', examId)
        .single();

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
        description: 'Failed to fetch exam details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

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
    const element = document.getElementById(questionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setZoom(1);

  const handleDownload = () => {
    if (exam?.file_url) {
      window.open(exam.file_url, '_blank');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: language === 'fr' ? 'Lien copié' : 'Link copied',
      description: language === 'fr' ? 'Le lien a été copié dans le presse-papiers' : 'Link copied to clipboard'
    });
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

  const showAnswers = mode === 'correction';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Breadcrumb */}
            <Breadcrumb>
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
                  <BreadcrumbPage>{exam.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {exam.file_url && (
                <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">PDF</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">{language === 'fr' ? 'Imprimer' : 'Print'}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">{language === 'fr' ? 'Partager' : 'Share'}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="w-80 hidden lg:block border-r border-border bg-card">
          <ExamSidebar
            questions={sidebarQuestions}
            activeQuestion={activeQuestion}
            onQuestionClick={handleQuestionClick}
          />
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            {/* Title Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-2xl">{exam.title}</CardTitle>
                <CardDescription>
                  {mode === 'correction' 
                    ? (language === 'fr' ? 'Correction officielle' : 'Official Corrections')
                    : mode === 'evaluation'
                    ? (language === 'fr' ? 'Mode évaluation' : 'Evaluation Mode')
                    : (language === 'fr' ? 'Aperçu des questions' : 'Question Preview')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {exam.classes && (
                    <Badge variant="secondary">{exam.classes.display_name}</Badge>
                  )}
                  {exam.subject && (
                    <Badge variant="outline">{exam.subject}</Badge>
                  )}
                  {exam.year && (
                    <Badge variant="outline">{exam.year}</Badge>
                  )}
                  {exam.exam_type && (
                    <Badge variant="outline">{exam.exam_type}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* PDF Preview (if mode is preview and PDF exists) */}
            {mode === 'preview' && exam.file_url && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    {language === 'fr' ? 'Document PDF' : 'PDF Document'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[600px] border rounded-lg overflow-hidden bg-muted">
                    <iframe
                      src={`${exam.file_url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                      className="w-full h-full"
                      title="Exam PDF"
                    />
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
      </div>

      {/* Zoom Controls */}
      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleZoomReset}
      />
    </div>
  );
}