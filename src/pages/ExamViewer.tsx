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
import { FileText, Clock, ArrowLeft, X, Play, CheckCircle, BookOpen, WifiOff, RefreshCw, Crown, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { ExamContentRenderer } from '@/components/exam/ExamContentRenderer';
import { ExamSidebar } from '@/components/exam/ExamSidebar';
import { ZoomControls } from '@/components/exam/ZoomControls';
import { EvaluationRulesDialog } from '@/components/exam/EvaluationRulesDialog';
import { EvaluationTimer } from '@/components/exam/EvaluationTimer';
import { EvaluationControls } from '@/components/exam/EvaluationControls';
import { EvaluationResultsDialog } from '@/components/exam/EvaluationResultsDialog';
import { EvaluationExitDialog } from '@/components/exam/EvaluationExitDialog';
import { ExamReviewSection } from '@/components/exam/ExamReviewSection';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { clearEvaluationSession, enqueuePendingSubmission, loadEvaluationSession, saveEvaluationSession, setLastActiveExamRoute, type EvaluationSession } from '@/lib/evaluationSession';
import { anonymizeSchoolName } from '@/lib/schoolAnonymizer';
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
  series_id?: string;
  visibility?: string; // 'public' | 'free'
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
  series?: {
    code: string;
    name: string;
    name_en?: string;
    name_fr?: string;
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
  const isFreePreview = searchParams.get('freePreview') === '1';

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
  const [userAnswers, setUserAnswers] = useState<Array<{
    questionIndex: number;
    answer: string;
  }>>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<{
    correct: number;
    total: number;
    earnedPoints?: number;
    totalPoints?: number;
  } | null>(null);
  const [aiGrading, setAiGrading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<Array<{
    questionIndex: number;
    score: number;
    maxPoints: number;
    feedback: string;
  }> | null>(null);

  // Resumable evaluation state
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const persistDebounceRef = useRef<number | null>(null);
  const [fetchError, setFetchError] = useState<'network' | 'not_found' | null>(null);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);

  // Enhanced evaluation state
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [showSubscriberOnlyDialog, setShowSubscriberOnlyDialog] = useState(false);
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
      const {
        count,
        error
      } = await supabase.from('user_evaluations').select('*', {
        count: 'exact',
        head: true
      }).eq('user_id', user.id).eq('exam_id', examId);
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

      // Check for active AND non-expired subscription
      const now = new Date().toISOString();
      const {
        data: subscription
      } = await supabase.from('subscriptions').select(`*, subscription_plans (name)`).eq('user_id', user.id).eq('status', 'active').gte('expires_at', now).maybeSingle();
      if (subscription && subscription.expires_at) {
        // Double-check expiration on client side (defense in depth)
        const expirationDate = new Date(subscription.expires_at);
        const currentDate = new Date();
        if (expirationDate.getTime() > currentDate.getTime()) {
          setHasAccess(true);
          setIsFreeUser(false);
        } else {
          // Subscription exists but is expired
          console.log('Subscription expired, restricting access');
          setHasAccess(false);
          setIsFreeUser(true);
        }
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
      setFetchError(null);
      const {
        data: examData,
        error: examError
      } = await supabase.from('exams').select(`
          *,
          classes (id, name, display_name, section, level),
          subjects:subject_id (name, name_en, name_fr),
          exam_types:exam_type_id (name, name_en, name_fr),
          periods:period_id (name, name_en, name_fr),
          academic_years:academic_year_id (year_label, start_year, end_year),
          durations:duration_id (display_label, minutes),
          establishments:establishment_id (name, type, country),
          series:series_id (code, name, name_en, name_fr)
        `).eq('id', examId).single();
      if (examError) throw examError;
      setExam(examData as any);
      if (examData.content) {
        const questions = extractQuestions(examData.content);
        setSidebarQuestions(questions);
        if (questions.length > 0 && questions[0].type === 'question') {
          setActiveQuestion(questions[0].id);
        }
      }
    } catch (error: any) {
      const msg = String(error?.message || '');
      const isNetwork = !navigator.onLine || /failed to fetch|network/i.test(msg);
      setFetchError(isNetwork ? 'network' : 'not_found');
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr' ? "Échec de la récupération des détails de l'épreuve" : 'Failed to fetch exam details',
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

  // Restore evaluation session on refresh/reopen (critical: no session loss).
  useEffect(() => {
    if (!examId) return;

    // Only restore when user is explicitly in evaluation mode and hasn't already started.
    if (mode !== 'evaluation' || evaluationActive || submitted) return;
    const session = loadEvaluationSession(user?.id ?? null, examId);
    if (!session) return;
    setCurrentAttemptNumber(session.attemptNumber);
    setTotalEvaluationSeconds(session.totalSeconds);
    setRemainingSeconds(session.remainingSeconds);
    setTimeSpentSeconds(session.timeSpentSeconds);
    setUserAnswers(session.answers || []);
    if (session.activeQuestionId) setActiveQuestion(session.activeQuestionId);
    if (typeof session.zoom === 'number') setZoom(session.zoom);
    setEvaluationActive(true);
    setEvaluationPaused(session.paused ?? true);
  }, [examId, mode, evaluationActive, submitted, user?.id]);

  // Persist evaluation session while user is working.
  useEffect(() => {
    if (!examId) return;
    if (!evaluationActive || submitted) return;

    // debounce to avoid writing on every keystroke/tick
    if (persistDebounceRef.current) window.clearTimeout(persistDebounceRef.current);
    persistDebounceRef.current = window.setTimeout(() => {
      const route = `/exam/${examId}?mode=evaluation`;
      setLastActiveExamRoute(route);
      const session: EvaluationSession = {
        version: 1,
        userId: user?.id ?? null,
        examId,
        route,
        attemptNumber: currentAttemptNumber,
        totalSeconds: totalEvaluationSeconds,
        remainingSeconds: remainingSeconds ?? totalEvaluationSeconds,
        timeSpentSeconds,
        answers: userAnswers,
        activeQuestionId: activeQuestion,
        zoom,
        paused: evaluationPaused,
        updatedAt: Date.now()
      };
      saveEvaluationSession(session);
    }, 250);
    return () => {
      if (persistDebounceRef.current) window.clearTimeout(persistDebounceRef.current);
    };
  }, [examId, evaluationActive, submitted, user?.id, currentAttemptNumber, totalEvaluationSeconds, remainingSeconds, timeSpentSeconds, userAnswers, activeQuestion, zoom, evaluationPaused]);

  // If user is offline during evaluation, pause automatically to protect remaining time.
  useEffect(() => {
    if (!evaluationActive || submitted) return;
    const onOffline = () => setEvaluationPaused(true);
    window.addEventListener('offline', onOffline);
    return () => window.removeEventListener('offline', onOffline);
  }, [evaluationActive, submitted]);

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

  // Check if exam has MCQ questions
  const hasMcqQuestions = useCallback(() => {
    if (!exam?.content) return false;
    const items = Array.isArray(exam.content) ? exam.content : exam.content.questions || [];
    return items.some((item: any) => item.item_type === 'question' && item.question_type === 'multiple_choice' || item.type === 'multiple_choice');
  }, [exam]);

  // Check if exam has ANY scorable questions (MCQ or long-form with answers)
  const hasScorableQuestions = useCallback(() => {
    if (!exam?.content) return false;
    const items = Array.isArray(exam.content) ? exam.content : exam.content.questions || [];
    return items.some((item: any) => 
      item.item_type === 'question' || item.type === 'multiple_choice' || item.type === 'long_form'
    );
  }, [exam]);
  const calculateScore = useCallback(() => {
    if (!exam?.content) return {
      correct: 0,
      total: 0,
      earnedPoints: 0,
      totalPoints: 0
    };
    let mcqCorrect = 0;
    let mcqTotal = 0;
    let earnedPoints = 0;
    let totalPoints = 0;
    const items = Array.isArray(exam.content) ? exam.content : exam.content.questions || [];
    
    // Build a flat list of all questions maintaining order
    let questionIndex = 0;
    items.forEach((item: any) => {
      if (item.item_type !== 'question' && item.type !== 'multiple_choice' && item.type !== 'long_form') {
        return;
      }
      
      const isMcq = item.question_type === 'multiple_choice' || item.type === 'multiple_choice';
      const questionMarks = item.marks || 1;
      totalPoints += questionMarks;
      
      if (isMcq) {
        mcqTotal++;
        const userAnswer = userAnswers.find(a => a.questionIndex === questionIndex);
        const correctAnswer = item.answers?.find((a: any) => a.is_correct);
        if (correctAnswer && userAnswer?.answer === correctAnswer.text) {
          mcqCorrect++;
          earnedPoints += questionMarks;
        }
      } else {
        // Long-form: keyword/concept-based scoring
        const userAnswer = userAnswers.find(a => a.questionIndex === questionIndex);
        if (userAnswer?.answer && item.answers?.[0]) {
          const scored = scoreLongForm(userAnswer.answer, item.answers[0], questionMarks);
          earnedPoints += scored;
        }
      }
      questionIndex++;
    });
    
    return {
      correct: mcqCorrect,
      total: mcqTotal,
      earnedPoints: Math.round(earnedPoints * 100) / 100,
      totalPoints
    };
  }, [exam, userAnswers]);

  // Score a long-form answer using keyword/concept matching
  const scoreLongForm = (studentAnswer: string, expectedAnswer: any, maxPoints: number): number => {
    const normalize = (text: string) => text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^\w\s]/g, ' ') // remove punctuation
      .replace(/\s+/g, ' ').trim();
    
    const studentNorm = normalize(studentAnswer);
    
    // If rubric criteria exist, score based on those
    if (expectedAnswer.rubric && expectedAnswer.rubric.length > 0) {
      let earned = 0;
      let rubricTotal = 0;
      
      for (const criterion of expectedAnswer.rubric) {
        rubricTotal += criterion.points;
        const criteriaText = normalize(criterion.criteria);
        // Extract key terms (words > 3 chars)
        const keywords = criteriaText.split(' ').filter((w: string) => w.length > 3);
        if (keywords.length === 0) continue;
        
        const matchCount = keywords.filter((kw: string) => studentNorm.includes(kw)).length;
        const matchRatio = matchCount / keywords.length;
        earned += criterion.points * matchRatio;
      }
      
      // Scale to maxPoints if rubric total differs
      if (rubricTotal > 0) {
        return (earned / rubricTotal) * maxPoints;
      }
      return earned;
    }
    
    // Fallback: compare against expected answer text using word overlap
    if (expectedAnswer.text) {
      const expectedNorm = normalize(expectedAnswer.text);
      const expectedWords = [...new Set(expectedNorm.split(' ').filter((w: string) => w.length > 3))];
      if (expectedWords.length === 0) return 0;
      
      const matchCount = expectedWords.filter((w: string) => studentNorm.includes(w)).length;
      return (matchCount / expectedWords.length) * maxPoints;
    }
    
    return 0;
  };

  // Save evaluation to database (reliable: retries + offline queue)
  const saveEvaluation = useCallback(async (mcqScore: {
    correct: number;
    total: number;
    earnedPoints?: number;
    totalPoints?: number;
  } | null) => {
    if (!user || !examId) return {
      ok: false
    };
    const payload = {
      user_id: user.id,
      exam_id: examId,
      attempt_number: currentAttemptNumber,
      mcq_score: mcqScore?.correct ?? null,
      mcq_total: mcqScore?.total ?? null,
      total_score: mcqScore?.earnedPoints ?? null,
      total_possible: mcqScore?.totalPoints ?? null,
      time_spent_seconds: timeSpentSeconds,
      answers: userAnswers
    };

    // If offline, queue immediately.
    if (!navigator.onLine) {
      enqueuePendingSubmission({
        version: 1,
        id: crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAt: Date.now(),
        payload
      });
      return {
        ok: false
      };
    }

    // Retry a few times for transient network glitches.
    for (let attempt = 1; attempt <= 3; attempt++) {
      const {
        error
      } = await supabase.from('user_evaluations').insert(payload);
      if (!error) return {
        ok: true
      };
      const msg = String(error.message || '');
      const transient = /timeout|network|failed to fetch|fetch/i.test(msg);
      if (!transient || attempt === 3) {
        console.error('Error saving evaluation:', error);
        enqueuePendingSubmission({
          version: 1,
          id: crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          createdAt: Date.now(),
          payload
        });
        return {
          ok: false
        };
      }
      await new Promise(r => setTimeout(r, 400 * attempt));
    }
    return {
      ok: false
    };
  }, [user, examId, currentAttemptNumber, timeSpentSeconds, userAnswers]);

  // Start evaluation (after rules dialog)
  const handleStartEvaluation = async () => {
    setShowRulesDialog(false);

    // fresh start: clear any previous local session
    if (examId) clearEvaluationSession(user?.id ?? null, examId);
    setEvaluationActive(true);
    setEvaluationPaused(false);
    setUserAnswers([]);
    setSubmitted(false);
    setScore(null);
    const durationMinutes = exam?.durations?.minutes || DEFAULT_DURATION_MINUTES;
    const totalSeconds = durationMinutes * 60;
    setTotalEvaluationSeconds(totalSeconds);
    setRemainingSeconds(totalSeconds);
    setTimeSpentSeconds(0);

    // Enter fullscreen (best effort; may be blocked without user gesture on some browsers)
    try {
      await document.documentElement.requestFullscreen();
    } catch (error) {
      console.error('Could not enter fullscreen:', error);
    }

    // Navigate to evaluation mode
    navigate(`/exam/${examId}?mode=evaluation`, {
      replace: true
    });
  };

  // Call AI grading for long-form questions
  const callAiGrading = useCallback(async (currentScore: { correct: number; total: number; earnedPoints: number; totalPoints: number }) => {
    if (!exam?.content) return currentScore;
    
    const items = Array.isArray(exam.content) ? exam.content : exam.content.questions || [];
    const longFormQuestions: Array<{ questionText: string; studentAnswer: string; expectedAnswer: string; rubric: string; maxPoints: number; globalIndex: number }> = [];
    
    let questionIndex = 0;
    items.forEach((item: any) => {
      if (item.item_type !== 'question' && item.type !== 'multiple_choice' && item.type !== 'long_form') return;
      const isMcq = item.question_type === 'multiple_choice' || item.type === 'multiple_choice';
      if (!isMcq && item.answers?.[0]) {
        const userAnswer = userAnswers.find(a => a.questionIndex === questionIndex);
        const expectedAnswer = item.answers[0];
        const rubricText = expectedAnswer.rubric?.map((r: any) => `${r.criteria} (${r.points}pts)`).join('\n') || '';
        longFormQuestions.push({
          questionText: item.text || '',
          studentAnswer: userAnswer?.answer || '',
          expectedAnswer: expectedAnswer.text || '',
          rubric: rubricText,
          maxPoints: item.marks || 1,
          globalIndex: questionIndex,
        });
      }
      questionIndex++;
    });
    
    if (longFormQuestions.length === 0) return currentScore;
    
    setAiGrading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ questions: longFormQuestions }),
      });
      
      if (!resp.ok) {
        console.error('AI grading failed:', resp.status);
        return currentScore; // fallback to keyword scoring
      }
      
      const data = await resp.json();
      const grades = data.grades || [];
      
      setAiFeedback(grades);
      
      // Recalculate score: keep MCQ scoring, replace long-form with AI scores
      let aiEarnedPoints = 0;
      // First, get MCQ earned points
      let mcqEarned = 0;
      let qIdx = 0;
      items.forEach((item: any) => {
        if (item.item_type !== 'question' && item.type !== 'multiple_choice' && item.type !== 'long_form') return;
        const isMcq = item.question_type === 'multiple_choice' || item.type === 'multiple_choice';
        if (isMcq) {
          const userAnswer = userAnswers.find(a => a.questionIndex === qIdx);
          const correctAnswer = item.answers?.find((a: any) => a.is_correct);
          if (correctAnswer && userAnswer?.answer === correctAnswer.text) {
            mcqEarned += item.marks || 1;
          }
        }
        qIdx++;
      });
      
      // Add AI-graded long-form scores
      for (const grade of grades) {
        aiEarnedPoints += grade.score;
      }
      
      const newScore = {
        ...currentScore,
        earnedPoints: Math.round((mcqEarned + aiEarnedPoints) * 100) / 100,
      };
      
      setScore(newScore);
      
      // Update database with AI scores
      if (user && examId) {
        await supabase.from('user_evaluations')
          .update({ total_score: newScore.earnedPoints })
          .eq('user_id', user.id)
          .eq('exam_id', examId)
          .eq('attempt_number', currentAttemptNumber);
      }
      
      return newScore;
    } catch (error) {
      console.error('AI grading error:', error);
      return currentScore; // fallback
    } finally {
      setAiGrading(false);
    }
  }, [exam, userAnswers, user, examId, currentAttemptNumber]);

  // Handle evaluation submission
  const handleSubmitEvaluation = async () => {
    if (isSubmittingResult) return;
    setIsSubmittingResult(true);

    // Stop time immediately
    setEvaluationPaused(true);
    const hasScorable = hasScorableQuestions();
    const computedScore = hasScorable ? calculateScore() : null;
    setScore(computedScore);
    setSubmitted(true);
    setEvaluationActive(false);
    setAiFeedback(null);

    // Exit fullscreen
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.error('Could not exit fullscreen:', error);
      }
    }

    // Save to database (retries/queue)
    await saveEvaluation(computedScore);

    // Once submitted, clear local session
    if (examId) clearEvaluationSession(user?.id ?? null, examId);

    // Show results dialog
    setShowResultsDialog(true);
    setIsSubmittingResult(false);

    // Trigger AI grading in background (non-blocking)
    if (computedScore) {
      callAiGrading(computedScore);
    }
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
  const handleTimerTick = (nextRemainingSeconds: number) => {
    setRemainingSeconds(nextRemainingSeconds);
    const durationMinutes = exam?.durations?.minutes || DEFAULT_DURATION_MINUTES;
    const totalSeconds = durationMinutes * 60;
    setTimeSpentSeconds(Math.max(0, totalSeconds - nextRemainingSeconds));
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

    // Clear resumable session explicitly on exit.
    if (examId) clearEvaluationSession(user?.id ?? null, examId);

    // Exit fullscreen
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.error('Could not exit fullscreen:', error);
      }
    }
    navigate(`/exam/${examId}?mode=preview`, {
      replace: true
    });
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
    navigate(`/exam/${examId}?mode=preview`, {
      replace: true
    });
  };

  // Handle view answers - navigate to correction mode with submitted answers
  const handleViewAnswers = () => {
    setShowResultsDialog(false);
    navigate(`/exam/${examId}?mode=correction`, {
      replace: true
    });
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
            <Button onClick={() => navigate('/exams2')} className="mt-4">
              {language === 'fr' ? 'Retour aux épreuves' : 'Back to Exams'}
            </Button>
          </CardContent>
        </Card>
      </div>;
  }

  // Premium Paywall: Show for premium exams when user doesn't have access
  const isPremiumExam = exam.visibility !== 'free';
  // Allow free preview (10 fixed exams from /exams2 list) for non-subscribers
  const showPaywall = isPremiumExam && !hasAccess && isFreeUser && !isFreePreview;

  if (showPaywall) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-primary/20 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
              <Crown className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'fr' ? 'Contenu Premium' : 'Premium Content'}
            </CardTitle>
            <CardDescription className="text-base">
              {language === 'fr' 
                ? 'Cette épreuve nécessite un abonnement actif.' 
                : 'This exam requires an active subscription.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Benefits list */}
            <div className="space-y-3">
              <p className="font-medium text-sm text-muted-foreground">
                {language === 'fr' ? 'Avec Premium vous obtenez :' : 'With Premium you get:'}
              </p>
              <ul className="space-y-2">
                {[
                  { fr: 'Accès illimité à plus de 500 examens', en: 'Unlimited access to 500+ exams' },
                  { fr: 'Corrections et solutions complètes', en: 'Full corrections and solutions' },
                  { fr: 'Mode évaluation avec notation', en: 'Evaluation mode with scoring' },
                  { fr: 'Suivi de votre progression', en: 'Progress tracking' }
                ].map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{language === 'fr' ? benefit.fr : benefit.en}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Price indication */}
            <div className="text-center py-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {language === 'fr' ? 'À partir de' : 'Starting from'}
              </p>
              <p className="text-2xl font-bold text-foreground">
                2 500 XAF<span className="text-sm font-normal text-muted-foreground">/mois</span>
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <Button asChild className="w-full gap-2" size="lg">
                <Link to="/subscriptions">
                  <Crown className="h-4 w-4" />
                  {language === 'fr' ? 'S\'abonner maintenant' : 'Subscribe Now'}
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full gap-2">
                <Link to="/exams2">
                  <BookOpen className="h-4 w-4" />
                  {language === 'fr' ? 'Voir les épreuves gratuites' : 'Browse Free Exams'}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Subscription encouragement banner for free exams or free-preview access (when user is not subscribed)
  const showSubscriptionBanner = (exam.visibility === 'free' || isFreePreview) && isFreeUser && !hasAccess;
  const isFreeExam = exam.visibility === 'free';
  // Treat free-preview the same as a free exam for evaluation gating
  const evaluationLocked = isFreeUser && !hasAccess && (isFreeExam || isFreePreview);
  // Free exams: solutions only shown in correction mode (not instantly)
  const showAnswers = mode === 'correction' || (mode === 'evaluation' && submitted);
  const durationMinutes = exam.durations?.minutes || DEFAULT_DURATION_MINUTES;

  // Fullscreen evaluation mode
  if (evaluationActive && !submitted) {
    return <div className="min-h-screen bg-background flex flex-col">
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
                <EvaluationTimer totalSeconds={totalEvaluationSeconds} initialSeconds={remainingSeconds ?? totalEvaluationSeconds} isPaused={evaluationPaused} onTimeUp={handleTimeUp} onTick={handleTimerTick} />
                <EvaluationControls isPaused={evaluationPaused} onPause={handlePause} onResume={handleResume} onExit={() => setShowExitDialog(true)} onSubmit={handleSubmitEvaluation} canSubmit={userAnswers.length > 0} />
              </div>
            </div>
          </div>
        </header>

        {/* Pause Overlay */}
        {evaluationPaused && <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center">
            <Card className="max-w-md">
              <CardHeader className="text-center">
                <CardTitle>{language === 'fr' ? 'Évaluation en Pause' : 'Evaluation Paused'}</CardTitle>
                <CardDescription>
                  {language === 'fr' ? 'Cliquez sur "Reprendre" pour continuer votre évaluation.' : 'Click "Resume" to continue your evaluation.'}
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
              </div>}
            {exam.series && <div className="bg-background/60 rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">{language === 'fr' ? 'Série' : 'Series'}</p>
                <p className="text-sm font-medium">{exam.series.code}</p>
              </div>}

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <div ref={contentRef} style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left'
          }} className="transition-transform duration-200">
              {exam.content ? <ExamContentRenderer content={exam.content} showAnswers={false} mode="evaluation" questionIdPrefix="question-" userAnswers={userAnswers} onAnswerChange={handleAnswerChange} /> : <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      {language === 'fr' ? 'Aucun contenu disponible' : 'No content available'}
                    </p>
                  </CardContent>
                </Card>}
            </div>
          </div>
        </main>

        <ZoomControls zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleZoomReset} />
        
        <EvaluationExitDialog open={showExitDialog} onOpenChange={setShowExitDialog} onConfirmExit={handleConfirmExit} />
      </div>;
  }

  // Get the preserved filter context from URL params
  const fromUrl = searchParams.get('from');
  const backUrl = fromUrl || '/exams2';
  
  // Build breadcrumb URLs that preserve filter context
  const examsUrl = fromUrl || `/exams2${exam.classes?.section ? `?system=${exam.classes.section}` : ''}`;
  const classUrl = fromUrl || `/exams2?system=${exam.classes?.section || ''}&class=${exam.class_id || ''}`;

  // Normal view
  return <div className="min-h-screen bg-background">
      {/* Mobile-first Header with Back Button */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(backUrl)} className="gap-1 sm:gap-2 px-2 sm:px-3">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'fr' ? 'Retour' : 'Back'}</span>
            </Button>
            <Breadcrumb className="hidden sm:flex">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={examsUrl}>
                      {language === 'fr' ? 'Épreuves' : 'Exams'}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                {exam.classes && <>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to={classUrl}>
                          {exam.classes.display_name}
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>}
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
            {exam.subjects && <div className="bg-background/60 rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">{language === 'fr' ? 'Matière' : 'Subject'}</p>
                <p className="text-sm font-medium truncate">
                  {language === 'fr' ? exam.subjects.name_fr || exam.subjects.name : exam.subjects.name_en || exam.subjects.name}
                </p>
              </div>}
            {exam.classes && <div className="bg-background/60 rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">{language === 'fr' ? 'Classe' : 'Class'}</p>
                <p className="text-sm font-medium truncate">{exam.classes.display_name}</p>
              </div>}
            {exam.academic_years && <div className="bg-background/60 rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">{language === 'fr' ? 'Année' : 'Year'}</p>
                <p className="text-sm font-medium">{exam.academic_years.year_label}</p>
              </div>}
            {exam.durations && <div className="bg-background/60 rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">{language === 'fr' ? 'Durée' : 'Duration'}</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {exam.durations.display_label}
                </p>
              </div>}
          </div>
          
          {/* Mobile: Series badge */}
          {exam.series && (
            <div className="sm:hidden mb-3">
              <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                {language === 'fr' ? 'Série' : 'Series'} {exam.series.code}
              </Badge>
            </div>
          )}
          
          {/* Desktop: Inline Info */}
          <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground flex-wrap mb-3">
            {exam.establishments && exam.establishment_id && <span className="flex items-center gap-1 text-muted-foreground/70">
                <FileText className="h-3.5 w-3.5" />
                {anonymizeSchoolName({ id: exam.establishment_id, name: exam.establishments.name })}
              </span>}
            {exam.series && <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                {language === 'fr' ? 'Série' : 'Series'} {exam.series.code}
              </Badge>}
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
          
          {/* Mobile: Additional Info Badges */}
          <div className="flex flex-wrap gap-1.5 sm:hidden mb-3">
            {exam.establishments && exam.establishment_id && <Badge variant="secondary" className="text-xs text-muted-foreground/70">
                {anonymizeSchoolName({ id: exam.establishment_id, name: exam.establishments.name })}
              </Badge>}
            {exam.periods && <Badge variant="outline" className="text-xs">
                {language === 'fr' ? exam.periods.name_fr || exam.periods.name : exam.periods.name_en || exam.periods.name}
              </Badge>}
            {exam.exam_types && <Badge variant="outline" className="text-xs">
                {language === 'fr' ? exam.exam_types.name_fr || exam.exam_types.name : exam.exam_types.name_en || exam.exam_types.name}
              </Badge>}
          </div>
            
          {/* Action Buttons - Full width on mobile */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Mode Switcher Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button size="sm" className={cn("gap-1.5 sm:gap-2 font-medium flex-1 sm:flex-none text-xs sm:text-sm", mode === 'correction' ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/20 dark:text-indigo-400")} onClick={() => {
              if (mode === 'correction') {
                navigate(`/exam/${examId}?mode=preview`);
              } else {
                setShowCorrectionDialog(true);
              }
            }}>
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">
                  {mode === 'correction' ? language === 'fr' ? 'Masquer' : 'Hide' : language === 'fr' ? 'Correction' : 'Correction'}
                </span>
                <span className="xs:hidden">
                  {language === 'fr' ? 'Corrigé' : 'Solution'}
                </span>
              </Button>
              
              {/* Evaluation button: visible to all, disabled (greyed) for non-subscribers */}
              <Button
                size="sm"
                className={cn(
                  "gap-1.5 sm:gap-2 font-medium flex-1 sm:flex-none text-xs sm:text-sm",
                  evaluationLocked
                    ? "bg-muted text-muted-foreground border border-border opacity-70 cursor-not-allowed hover:bg-muted"
                    : mode === 'evaluation' && submitted
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                )}
                onClick={() => {
                  if (evaluationLocked) {
                    setShowSubscriberOnlyDialog(true);
                  } else {
                    handleEvaluationButtonClick();
                  }
                }}
              >
                {evaluationLocked ? <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                {language === 'fr' ? 'Évaluation' : 'Evaluate'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-[calc(100vh-200px)] sm:h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className={cn("hidden lg:block border-r border-border bg-card transition-all duration-300", sidebarCollapsed ? "w-0 border-0" : "w-80")}>
          <ExamSidebar questions={sidebarQuestions} activeQuestion={activeQuestion} onQuestionClick={handleQuestionClick} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
        </aside>

        {/* Content Area */}
        <main className={cn("flex-1 overflow-auto transition-all duration-300", showPdfSplit && exam.file_url ? "w-1/2" : "w-full")}>
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
            {/* Subscription Banner for Free Exams */}
            {showSubscriptionBanner && (
              <Card className="mb-6 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {language === 'fr' 
                            ? 'Vous aimez cette épreuve gratuite ?' 
                            : 'Enjoying this free exam?'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {language === 'fr' 
                            ? 'Abonnez-vous pour accéder à plus de 500 épreuves premium avec corrections.' 
                            : 'Subscribe to access 500+ premium exams with full solutions.'}
                        </p>
                      </div>
                    </div>
                    <Button asChild size="sm" className="gap-2 flex-shrink-0">
                      <Link to="/subscriptions">
                        <Crown className="h-4 w-4" />
                        {language === 'fr' ? 'S\'abonner' : 'Subscribe'}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
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
                          {score.total > 0 ? Math.round(score.correct / score.total * 100) : 0}%
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

            {/* Review Section - Correction Mode Only */}
            {mode === 'correction' && <ExamReviewSection examId={examId!} />}
          </div>
        </main>

        {/* PDF Split View - Desktop Only */}
        {!isMobile && showPdfSplit && exam.file_url && <aside className="w-1/2 border-l border-border bg-card relative">
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

      {/* Evaluation Rules Dialog */}
      <EvaluationRulesDialog open={showRulesDialog} onOpenChange={setShowRulesDialog} onStart={handleStartEvaluation} durationMinutes={durationMinutes} attemptCount={attemptCount} />

      {/* Evaluation Results Dialog */}
      <EvaluationResultsDialog open={showResultsDialog} onOpenChange={setShowResultsDialog} score={score} hasMcq={hasMcqQuestions()} timeSpentSeconds={timeSpentSeconds} attemptNumber={currentAttemptNumber} onRetry={handleRetry} onClose={handleCloseResults} onViewAnswers={handleViewAnswers} aiGrading={aiGrading} aiFeedback={aiFeedback} />

      {/* Subscriber-only evaluation dialog */}
      <Dialog open={showSubscriberOnlyDialog} onOpenChange={setShowSubscriberOnlyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 p-3 rounded-full bg-primary/10">
              <Crown className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-center">
              {language === 'fr' ? 'Auto-évaluation réservée aux abonnés' : 'Self-evaluation is for subscribers'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center px-2">
            {language === 'fr'
              ? "Le mode auto-évaluation, avec notation et corrections détaillées, est disponible uniquement pour les utilisateurs abonnés."
              : 'Self-evaluation mode, with scoring and detailed corrections, is available only for subscribers.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-center mt-2">
            <Button variant="outline" onClick={() => setShowSubscriberOnlyDialog(false)}>
              {language === 'fr' ? 'Plus tard' : 'Later'}
            </Button>
            <Link to="/subscriptions" onClick={() => setShowSubscriberOnlyDialog(false)}>
              <Button className="gap-2 w-full sm:w-auto">
                <Sparkles className="h-4 w-4" />
                {language === 'fr' ? "Voir les abonnements" : 'View subscriptions'}
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Modal - Mobile Only */}
      <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
        <DialogContent className="max-w-[100vw] w-full h-[100dvh] max-h-[100dvh] p-0 m-0 rounded-none border-0 flex flex-col">
          <DialogHeader className="flex-shrink-0 p-3 border-b border-border flex flex-row items-center justify-between">
            <DialogTitle className="text-base">
              {language === 'fr' ? 'Version PDF' : 'PDF Version'}
            </DialogTitle>
          </DialogHeader>
          {exam.file_url && <iframe src={`${exam.file_url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`} className="flex-1 w-full min-h-0" title="Exam PDF" />}
        </DialogContent>
      </Dialog>
    </div>;
}