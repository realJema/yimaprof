/**
 * Lesson practice exercises imported as JSON.
 * A lesson always has three fixed levels; the admin pastes/imports a JSON
 * object keyed by `facile` / `intermediaire` / `difficile`.
 */
export const JSON_LEVELS = ['facile', 'intermediaire', 'difficile'] as const;
export type JsonLevel = (typeof JSON_LEVELS)[number];

export interface JsonExercise {
  question: string;
  type: string;
  options?: string[];
  answer: string;
  points: number;
  correction?: string;
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

export const isMcqExercise = (ex: JsonExercise) => isMcq(ex.type) && (ex.options?.length ?? 0) > 0;

/** Tolerant read of whatever is stored in `lessons.exercises`. */
export function parseLessonExercises(value: unknown): LessonExercises {
  const out = emptyLessonExercises();
  if (!value || typeof value !== 'object') return out;
  const raw = value as Record<string, unknown>;
  JSON_LEVELS.forEach((level) => {
    const list = raw[level];
    if (!Array.isArray(list)) return;
    out[level] = list
      .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
      .map((i) => ({
        question: String(i.question ?? ''),
        type: String(i.type ?? 'qcm'),
        options: Array.isArray(i.options) ? i.options.map((o) => String(o)) : undefined,
        answer: String(i.answer ?? ''),
        points: Number(i.points ?? 1) || 1,
        correction: i.correction ? String(i.correction) : undefined,
      }))
      .filter((e) => e.question.trim().length > 0);
  });
  return out;
}

export const countExercises = (ex: LessonExercises) =>
  JSON_LEVELS.reduce((sum, level) => sum + ex[level].length, 0);

export const totalPoints = (list: JsonExercise[]) =>
  list.reduce((sum, e) => sum + (Number(e.points) || 0), 0);

export interface ValidationResult {
  ok: boolean;
  error?: string;
  data?: LessonExercises;
}

/**
 * Strict validation used before saving: nothing is stored unless every level
 * is a valid array and every exercise carries question / answer / points.
 */
export function validateLessonExercisesJson(input: string, fr: boolean): ValidationResult {
  const text = input.trim();
  if (!text) {
    return { ok: false, error: fr ? 'Aucun JSON fourni.' : 'No JSON provided.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
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

  for (const level of JSON_LEVELS) {
    const list = raw[level];
    if (list === undefined) {
      return {
        ok: false,
        error: fr ? `La clé « ${level} » est absente.` : `The key "${level}" is missing.`,
      };
    }
    if (!Array.isArray(list)) {
      return {
        ok: false,
        error: fr ? `La clé « ${level} » doit être un tableau.` : `The key "${level}" must be an array.`,
      };
    }

    for (let i = 0; i < list.length; i++) {
      const where = fr ? `« ${level} », exercice ${i + 1}` : `"${level}", exercise ${i + 1}`;
      const item = list[i];
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return { ok: false, error: fr ? `${where} : format invalide.` : `${where}: invalid format.` };
      }
      const ex = item as Record<string, unknown>;

      if (typeof ex.question !== 'string' || !ex.question.trim()) {
        return {
          ok: false,
          error: fr ? `${where} : champ « question » manquant.` : `${where}: missing "question" field.`,
        };
      }
      if (typeof ex.answer !== 'string' || !ex.answer.trim()) {
        return {
          ok: false,
          error: fr ? `${where} : champ « answer » manquant.` : `${where}: missing "answer" field.`,
        };
      }
      const points = Number(ex.points);
      if (ex.points === undefined || Number.isNaN(points) || points <= 0) {
        return {
          ok: false,
          error: fr
            ? `${where} : champ « points » manquant ou invalide.`
            : `${where}: missing or invalid "points" field.`,
        };
      }

      let options: string[] | undefined;
      if (isMcq(ex.type)) {
        if (!Array.isArray(ex.options) || ex.options.length < 2) {
          return {
            ok: false,
            error: fr
              ? `${where} : un QCM doit contenir au moins deux « options ».`
              : `${where}: an MCQ must contain at least two "options".`,
          };
        }
        options = ex.options.map((o) => String(o));
        if (!options.includes(ex.answer)) {
          return {
            ok: false,
            error: fr
              ? `${where} : la réponse « ${ex.answer} » doit être recopiée exactement dans « options ».`
              : `${where}: the answer "${ex.answer}" must appear exactly in "options".`,
          };
        }
      } else if (Array.isArray(ex.options)) {
        options = ex.options.map((o) => String(o));
      }

      data[level].push({
        question: ex.question.trim(),
        type: typeof ex.type === 'string' && ex.type.trim() ? ex.type.trim() : 'qcm',
        options,
        answer: ex.answer.trim(),
        points,
        correction: typeof ex.correction === 'string' && ex.correction.trim() ? ex.correction.trim() : undefined,
      });
    }
  }

  return { ok: true, data };
}
