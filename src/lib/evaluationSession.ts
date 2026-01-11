export type EvaluationAnswer = { questionIndex: number; answer: string };

export type EvaluationSession = {
  version: 1;
  userId: string | null;
  examId: string;
  route: string; // e.g. /exam/:id?mode=evaluation

  // evaluation state
  attemptNumber: number;
  totalSeconds: number;
  remainingSeconds: number;
  timeSpentSeconds: number;
  answers: EvaluationAnswer[];
  activeQuestionId?: string;
  zoom?: number;
  paused: boolean;

  // bookkeeping
  updatedAt: number; // epoch ms
};

const KEY_PREFIX = 'eval_session_v1:';

export function getEvaluationSessionKey(userId: string | null, examId: string) {
  return `${KEY_PREFIX}${userId ?? 'anon'}:${examId}`;
}

export function loadEvaluationSession(userId: string | null, examId: string): EvaluationSession | null {
  try {
    const raw = localStorage.getItem(getEvaluationSessionKey(userId, examId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EvaluationSession;
    if (parsed?.version !== 1) return null;
    if (parsed.examId !== examId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveEvaluationSession(session: EvaluationSession) {
  try {
    localStorage.setItem(getEvaluationSessionKey(session.userId, session.examId), JSON.stringify(session));
  } catch {
    // ignore quota/storage errors
  }
}

export function clearEvaluationSession(userId: string | null, examId: string) {
  try {
    localStorage.removeItem(getEvaluationSessionKey(userId, examId));
  } catch {
    // ignore
  }
}

export type PendingEvaluationSubmission = {
  version: 1;
  id: string;
  createdAt: number;
  payload: {
    user_id: string;
    exam_id: string;
    attempt_number: number;
    mcq_score: number | null;
    mcq_total: number | null;
    time_spent_seconds: number;
    answers: EvaluationAnswer[];
  };
};

const PENDING_KEY = 'pending_eval_submissions_v1';

export function enqueuePendingSubmission(item: PendingEvaluationSubmission) {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const list = raw ? (JSON.parse(raw) as PendingEvaluationSubmission[]) : [];
    list.push(item);
    localStorage.setItem(PENDING_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function loadPendingSubmissions(): PendingEvaluationSubmission[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingEvaluationSubmission[]) : [];
  } catch {
    return [];
  }
}

export function replacePendingSubmissions(next: PendingEvaluationSubmission[]) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function getLastActiveExamRoute(): string | null {
  try {
    return localStorage.getItem('last_active_exam_route_v1');
  } catch {
    return null;
  }
}

export function setLastActiveExamRoute(route: string) {
  try {
    localStorage.setItem('last_active_exam_route_v1', route);
  } catch {
    // ignore
  }
}

export function setWasOffline(flag: boolean) {
  try {
    localStorage.setItem('was_offline_v1', flag ? '1' : '0');
  } catch {
    // ignore
  }
}

export function getWasOffline(): boolean {
  try {
    return localStorage.getItem('was_offline_v1') === '1';
  } catch {
    return false;
  }
}
