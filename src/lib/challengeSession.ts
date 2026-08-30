import type { SimpleAnswer } from '@/lib/examScoring';

export type ChallengeSession = {
  version: 1;
  challengeId: string;
  userId: string;
  answers: SimpleAnswer[];
  remainingSeconds: number;
  timeSpentSeconds: number;
  viewedBefore: boolean;
  startedAt: number;
  updatedAt: number;
};

const KEY = (userId: string, challengeId: string) => `challenge_session_v1:${userId}:${challengeId}`;
const VIEWED_KEY = (userId: string, challengeId: string) => `challenge_viewed_v1:${userId}:${challengeId}`;
const PENDING_KEY = 'pending_challenge_submissions_v1';

export type PendingChallengeSubmission = {
  version: 1;
  id: string;
  createdAt: number;
  challengeId: string;
  userId: string;
  payload: Record<string, unknown>;
};

export function loadChallengeSession(userId: string, challengeId: string): ChallengeSession | null {
  try {
    const raw = localStorage.getItem(KEY(userId, challengeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChallengeSession;
    return parsed?.version === 1 && parsed.challengeId === challengeId ? parsed : null;
  } catch {
    return null;
  }
}

export function saveChallengeSession(session: ChallengeSession) {
  try {
    localStorage.setItem(KEY(session.userId, session.challengeId), JSON.stringify(session));
  } catch {
    // ignore storage errors
  }
}

export function clearChallengeSession(userId: string, challengeId: string) {
  try {
    localStorage.removeItem(KEY(userId, challengeId));
  } catch {
    // ignore
  }
}

/** "Consulted the paper before taking it" flag (yes/no). */
export function markChallengeViewed(userId: string, challengeId: string) {
  try {
    localStorage.setItem(VIEWED_KEY(userId, challengeId), '1');
  } catch {
    // ignore
  }
}

export function wasChallengeViewed(userId: string, challengeId: string): boolean {
  try {
    return localStorage.getItem(VIEWED_KEY(userId, challengeId)) === '1';
  } catch {
    return false;
  }
}

export function enqueueChallengeSubmission(item: PendingChallengeSubmission) {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const list = raw ? (JSON.parse(raw) as PendingChallengeSubmission[]) : [];
    list.push(item);
    localStorage.setItem(PENDING_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function loadChallengeSubmissions(): PendingChallengeSubmission[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingChallengeSubmission[]) : [];
  } catch {
    return [];
  }
}

export function replaceChallengeSubmissions(next: PendingChallengeSubmission[]) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
