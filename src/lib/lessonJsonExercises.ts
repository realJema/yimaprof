/**
 * Lesson practice exercises imported as JSON.
 * A lesson always has three fixed levels; the admin pastes/imports a JSON
 * object keyed by `facile` / `intermediaire` / `difficile`.
 *
 * Two formats are supported:
 * - legacy: each array item is one question (one-question exercise);
 * - grouped: an item has an optional `title` and a `questions` array.
 */
export const JSON_LEVELS = ['facile', 'intermediaire', 'difficile'] as const;
export type JsonLevel = (typeof JSON_LEVELS)[number];

export interface JsonQuestion {
  question: string;
  type: string;
  options?: string[];
  answer: string;
  points: number;
  correction?: string;
}

export interface JsonExercise {
  question?: string;
  type?: string;
  options?: string[];
  answer?: string;
  points?: number;
  correction?: string;
  title?: string;
  questions?: JsonQuestion[];
}

export type LessonExercises = Record<JsonLevel, JsonExercise[]>;

export const emptyLessonExercises = (): LessonExercises => ({
  facile: [],
  intermediaire: [],
  difficile: [],
});

export const jsonLevelLabel = (level: JsonLevel, fr: boolean) =>
  level === 'facile'
    ? fr ? 'Niveau facile' : 'Easy level'
    : level === 'intermediaire'
      ? fr ? 'Niveau intermédiaire' : 'Intermediate level'
      : fr ? 'Niveau difficile' : 'Difficult level';

const isMcq = (type: unknown) =>
  typeof type === 'string' && ['qcm', 'mcq', 'multiple_choice', 'choix_multiple'].includes(type.toLowerCase());

export const isMcqExercise = (ex: JsonQuestion) => isMcq(ex.type) && (ex.options?.length ?? 0) > 0;

const parseQuestion = (value: Record<string, unknown>): JsonQuestion => ({
  question: String(value.question ?? ''),
  type: String(value.type ?? 'qcm'),
  options: Array.isArray(value.options) ? value.options.map((option) => String(option)) : undefined,
  answer: String(value.answer ?? ''),
  points: Number(value.points ?? 1) || 1,
  correction: value.correction ? String(value.correction) : undefined,
});

/** Tolerant read of whatever is stored in `lessons.exercises`. */
export function parseLessonExercises(value: unknown): LessonExercises {
  const out = emptyLessonExercises();
  if (!value || typeof value !== 'object') return out;
  const raw = value as Record<string, unknown>;
  JSON_LEVELS.forEach((level) => {
    const list = raw[level];
    if (!Array.isArray(list)) return;
    out[level] = list
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item): JsonExercise | null => {
        if (Array.isArray(item.questions)) {
          const questions = item.questions
            .filter((question): question is Record<string, unknown> => !!question && typeof question === 'object')
            .map(parseQuestion)
            .filter((question) => question.question.trim().length > 0);
          if (!questions.length) return null;
          return {
            title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : undefined,
            questions,
          };
        }
        const question = parseQuestion(item);
        if (!question.question.trim()) return null;
        return {
          ...question,
          title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : undefined,
        };
      })
      .filter((exercise): exercise is JsonExercise => exercise !== null);
  });
  return out;
}

/** A grouped exercise contributes every one of its questions to an attempt. */
export const exerciseQuestions = (exercise: JsonExercise): JsonQuestion[] => {
  if (exercise.questions?.length) return exercise.questions;
  if (
    typeof exercise.question === 'string'
    && typeof exercise.answer === 'string'
    && typeof exercise.type === 'string'
    && typeof exercise.points === 'number'
  ) {
    return [{
      question: exercise.question,
      type: exercise.type,
      options: exercise.options,
      answer: exercise.answer,
      points: exercise.points,
      correction: exercise.correction,
    }];
  }
  return [];
};

export const flattenExerciseQuestions = (list: JsonExercise[]): JsonQuestion[] =>
  list.flatMap(exerciseQuestions);

/** The free offer grants the first complete exercise, never just its first question. */
export const accessibleExerciseQuestions = (
  list: JsonExercise[],
  hasActiveSubscription: boolean,
): JsonQuestion[] => flattenExerciseQuestions(hasActiveSubscription ? list : list.slice(0, 1));

export const exercisePreviewText = (exercise: JsonExercise): string =>
  exercise.title || exerciseQuestions(exercise)[0]?.question || '';

export const countExercises = (exercises: LessonExercises) =>
  JSON_LEVELS.reduce((sum, level) => sum + exercises[level].length, 0);

export const countExerciseQuestions = (exercises: LessonExercises) =>
  JSON_LEVELS.reduce((sum, level) => sum + flattenExerciseQuestions(exercises[level]).length, 0);

export const totalPoints = (list: JsonExercise[]) =>
  flattenExerciseQuestions(list).reduce((sum, question) => sum + (Number(question.points) || 0), 0);

export interface ValidationResult {
  ok: boolean;
  error?: string;
  data?: LessonExercises;
}

/**
 * Strict validation used before saving: nothing is stored unless every level
 * is valid and every question carries question / answer / points.
 */
export function validateLessonExercisesJson(input: string, fr: boolean): ValidationResult {
  const text = input.trim();
  if (!text) {
    return { ok: false, error: fr ? 'Aucun JSON fourni.' : 'No JSON provided.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: fr ? `JSON invalide : ${message}` : `Invalid JSON: ${message}`,
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      error: fr
        ? 'Le JSON doit être un objet contenant les clés « facile », « intermediaire » et « difficile ».'
        : 'The JSON must be an object with the keys "facile", "intermediaire" and "difficile".',
    };
  }

  const raw = parsed as Record<string, unknown>;
  const data = emptyLessonExercises();

  const validateQuestion = (value: unknown, where: string): { question?: JsonQuestion; error?: string } => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { error: fr ? `${where} : format invalide.` : `${where}: invalid format.` };
    }
    const ex = value as Record<string, unknown>;
    if (typeof ex.question !== 'string' || !ex.question.trim()) {
      return { error: fr ? `${where} : champ « question » manquant.` : `${where}: missing "question" field.` };
    }
    if (typeof ex.answer !== 'string' || !ex.answer.trim()) {
      return { error: fr ? `${where} : champ « answer » manquant.` : `${where}: missing "answer" field.` };
    }
    const points = Number(ex.points);
    if (ex.points === undefined || Number.isNaN(points) || points <= 0) {
      return {
        error: fr
          ? `${where} : champ « points » manquant ou invalide.`
          : `${where}: missing or invalid "points" field.`,
      };
    }

    let options: string[] | undefined;
    if (isMcq(ex.type)) {
      if (!Array.isArray(ex.options) || ex.options.length < 2) {
        return {
          error: fr
            ? `${where} : un QCM doit contenir au moins deux « options ».`
            : `${where}: an MCQ must contain at least two "options".`,
        };
      }
      options = ex.options.map((option) => String(option));
      if (!options.includes(ex.answer)) {
        return {
          error: fr
            ? `${where} : la réponse « ${ex.answer} » doit être recopiée exactement dans « options ».`
            : `${where}: the answer "${ex.answer}" must appear exactly in "options".`,
        };
      }
    } else if (Array.isArray(ex.options)) {
      options = ex.options.map((option) => String(option));
    }

    return {
      question: {
        question: ex.question.trim(),
        type: typeof ex.type === 'string' && ex.type.trim() ? ex.type.trim() : 'qcm',
        options,
        answer: ex.answer.trim(),
        points,
        correction: typeof ex.correction === 'string' && ex.correction.trim() ? ex.correction.trim() : undefined,
      },
    };
  };

  for (const level of JSON_LEVELS) {
    const list = raw[level];
    if (list === undefined) {
      return { ok: false, error: fr ? `La clé « ${level} » est absente.` : `The key "${level}" is missing.` };
    }
    if (!Array.isArray(list)) {
      return { ok: false, error: fr ? `La clé « ${level} » doit être un tableau.` : `The key "${level}" must be an array.` };
    }

    for (let index = 0; index < list.length; index++) {
      const where = fr ? `« ${level} », exercice ${index + 1}` : `"${level}", exercise ${index + 1}`;
      const item = list[index];
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return { ok: false, error: fr ? `${where} : format invalide.` : `${where}: invalid format.` };
      }
      const exercise = item as Record<string, unknown>;
      if (Array.isArray(exercise.questions)) {
        if (!exercise.questions.length) {
          return { ok: false, error: fr ? `${where} : ajoutez au moins une question.` : `${where}: add at least one question.` };
        }
        const questions: JsonQuestion[] = [];
        for (let questionIndex = 0; questionIndex < exercise.questions.length; questionIndex++) {
          const questionWhere = fr
            ? `${where}, question ${questionIndex + 1}`
            : `${where}, question ${questionIndex + 1}`;
          const result = validateQuestion(exercise.questions[questionIndex], questionWhere);
          if (result.error || !result.question) return { ok: false, error: result.error };
          questions.push(result.question);
        }
        data[level].push({
          title: typeof exercise.title === 'string' && exercise.title.trim() ? exercise.title.trim() : undefined,
          questions,
        });
        continue;
      }

      const result = validateQuestion(item, where);
      if (result.error || !result.question) return { ok: false, error: result.error };
      data[level].push({
        ...result.question,
        title: typeof exercise.title === 'string' && exercise.title.trim() ? exercise.title.trim() : undefined,
      });
    }
  }

  return { ok: true, data };
}
