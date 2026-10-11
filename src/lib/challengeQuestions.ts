/** Normalize challenge imports to the existing paper renderer without changing papers. */
export function parseChallengeQuestions(input: unknown): unknown[] | { questions: unknown[] } {
  const items = Array.isArray(input) ? input : input && typeof input === 'object' && 'questions' in input ? (input as { questions: unknown }).questions : null;
  if (!Array.isArray(items) || !items.length) throw new Error('Ajoutez au moins une question / Add at least one question.');
  const normalized = items.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new Error(`Question ${index + 1} : format invalide / invalid format.`);
    const item = raw as Record<string, unknown>;
    if (item.item_type && item.item_type !== 'question') return item;
    const text = item.text ?? item.question;
    if (typeof text !== 'string' || !text.trim()) throw new Error(`Question ${index + 1} : énoncé requis / text required.`);
    const type = item.question_type ?? item.type;
    const mcq = ['qcm', 'mcq', 'multiple_choice'].includes(String(type));
    const marks = Number(item.marks ?? item.points ?? 1);
    if (!Number.isFinite(marks) || marks <= 0) throw new Error(`Question ${index + 1} : points invalides / invalid points.`);
    let answers = item.answers;
    if (!Array.isArray(answers)) {
      if (mcq) {
        if (!Array.isArray(item.options) || item.options.length < 2 || !item.options.every((o) => typeof o === 'string') || !item.options.includes(item.answer)) throw new Error(`Question ${index + 1} : options et réponse QCM invalides / invalid MCQ options and answer.`);
        answers = item.options.map((text, i) => ({ id: `a-${index}-${i}`, text, is_correct: text === item.answer }));
      } else {
        if (typeof item.answer !== 'string' || !item.answer.trim()) throw new Error(`Question ${index + 1} : réponse requise / answer required.`);
        answers = [{ id: `a-${index}`, text: item.answer, is_correct: true }];
      }
    }
    const answerList = answers as Record<string, unknown>[];
    if (mcq && (answerList.length < 2 || answerList.filter((a) => a.is_correct === true).length !== 1)) throw new Error(`Question ${index + 1} : une seule bonne réponse requise / exactly one correct answer required.`);
    return { ...item, id: item.id || `q-${index}`, item_type: 'question', text, question_type: mcq ? 'multiple_choice' : 'long_form', marks, order: item.order ?? index, answers };
  });
  return normalized;
}