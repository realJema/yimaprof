import type { JsonLevel } from '@/lib/lessonJsonExercises';

/** Central store of pedagogical feedback shown after each lesson exercise level. */
export const APPRECIATIONS: Record<JsonLevel, [string, string, string, string]> = {
  facile: [
    'Ce résultat montre que les notions de base ne sont pas encore stabilisées. Reprends tranquillement les points essentiels du cours avant de refaire l’exercice. C’est une étape normale dans l’apprentissage.',
    'Tu as déjà acquis une partie des connaissances, mais des lacunes importantes subsistent. Relis attentivement les passages concernés et refais l’exercice pour consolider les bases.',
    'Bon travail : tu maîtrises une bonne partie des notions. Quelques points restent encore fragiles. Identifie-les et travaille-les pour atteindre une maîtrise plus solide.',
    'Excellent ! Tu as très bien assimilé les notions de base. Tu peux maintenant passer à des exercices de niveau intermédiaire avec confiance.',
  ],
  intermediaire: [
    'Ce score indique que les notions intermédiaires ne sont pas encore bien maîtrisées. Il est recommandé de revenir sur les prérequis et de retravailler les points fondamentaux avant de poursuivre.',
    'Tu as compris une partie des mécanismes, mais la compréhension reste partielle. Analyse tes erreurs, revois les explications du cours, puis réessaie. Le progrès viendra avec la répétition.',
    'Résultat encourageant. Tu es sur la bonne voie, mais certaines notions demandent encore à être approfondies. Concentre-toi sur les points où tu as hésité pour progresser davantage.',
    'Très bon niveau de maîtrise. Tu gères bien les situations intermédiaires. Tu peux maintenant te confronter aux exercices difficiles pour continuer à progresser.',
  ],
  difficile: [
    'Ce type d’exercice est exigeant. Un score bas à ce niveau est fréquent au début. Reprends les notions avancées étape par étape et n’hésite pas à revoir les exercices intermédiaires pour renforcer tes bases.',
    'Tu abordes correctement certains aspects complexes, mais la maîtrise n’est pas encore stabilisée. Analyse précisément tes erreurs : elles constituent un excellent levier d’apprentissage.',
    'Bon résultat sur un exercice difficile. Tu montres une compréhension solide, même si quelques points restent à affiner. Continue sur cette dynamique, tu es proche d’une très bonne maîtrise.',
    'Excellent travail. Tu maîtrises des notions avancées avec précision. C’est le signe d’une compréhension approfondie. Tu peux maintenant viser des situations encore plus complexes ou des mises en application.',
  ],
};

/** 0-25 → 0, 25-50 → 1, 50-75 → 2, 75-100 → 3 */
export const appreciationBand = (percent: number) => (percent >= 75 ? 3 : percent >= 50 ? 2 : percent >= 25 ? 1 : 0);

export const BAND_STYLES = [
  'border-border bg-muted/50',
  'border-secondary/40 bg-secondary/5',
  'border-primary/40 bg-primary/5',
  'border-accent/50 bg-accent/10',
];

export const getAppreciation = (level: JsonLevel, percent: number) => {
  const band = appreciationBand(percent);
  return { band, text: APPRECIATIONS[level][band], className: BAND_STYLES[band] };
};
