export const EXAM_JSON_TEMPLATE = `[
  {
    "id": "secA_head",
    "item_type": "heading",
    "text": "SECTION A — MULTIPLE CHOICE",
    "order": 1
  },
  {
    "id": "instr_01",
    "item_type": "instruction",
    "text": "Answer all questions in this section. Each question carries 2 marks.",
    "order": 2
  },
  {
    "id": "q1",
    "item_type": "question",
    "question_type": "multiple_choice",
    "paper_number": "1",
    "text": "What is the capital of France?",
    "marks": 2,
    "order": 3,
    "explanatory_note": "The correct answer is Paris, as it is the official capital of the French Republic.",
    "answers": [
      {"id": "a1", "text": "Paris", "is_correct": true},
      {"id": "a2", "text": "London", "is_correct": false},
      {"id": "a3", "text": "Berlin", "is_correct": false},
      {"id": "a4", "text": "Madrid", "is_correct": false}
    ]
  },
  {
    "id": "p1",
    "item_type": "passage",
    "text": "Read the following passage about the Industrial Revolution before answering questions 2 and 3.\\n\\nThe Industrial Revolution, which began in Britain in the late 18th century, marked a major turning point in history.",
    "order": 4
  },
  {
    "id": "q2",
    "item_type": "question",
    "question_type": "long_form",
    "paper_number": "2",
    "text": "Explain the causes of the Industrial Revolution.",
    "context_ref": "p1",
    "marks": 8,
    "order": 5,
    "explanatory_note": "The expected answer should demonstrate that the Industrial Revolution was caused primarily by technological innovations, population growth, capital accumulation, and natural resource availability.",
    "answers": [
      {
        "id": "a5",
        "text": "Technological innovations, population growth, capital accumulation, and natural resources.",
        "is_correct": true,
        "rubric": [
          {"criteria": "Mentions technological innovations", "points": 2},
          {"criteria": "Mentions population growth", "points": 2},
          {"criteria": "Mentions capital accumulation", "points": 2},
          {"criteria": "Mentions natural resources", "points": 2}
        ]
      }
    ]
  },
  {
    "id": "q3",
    "item_type": "question",
    "question_type": "long_form",
    "paper_number": "3",
    "text": "Analyze the following literary text:",
    "context_ref": "p1",
    "marks": 10,
    "order": 6,
    "explanatory_note": "The answer should analyze the text covering main themes, writing style, and production context.",
    "answers": [
      {"id": "a6", "text": "Analysis of themes, style, and context.", "is_correct": true}
    ],
    "sub_questions": [
      {
        "id": "q3_a",
        "text": "Identify the main literary devices used",
        "question_type": "long_form",
        "paper_number": "3",
        "sub_number": "a",
        "display_number": "3(a)",
        "explanatory_note": "Student should cite and explain devices like metaphor, symbolism, irony, etc.",
        "answers": [
          {"id": "a7", "text": "Metaphors, symbolism, irony.", "is_correct": true}
        ]
      },
      {
        "id": "q3_b",
        "text": "Explain the author's purpose",
        "question_type": "long_form",
        "paper_number": "3",
        "sub_number": "b",
        "display_number": "3(b)",
        "explanatory_note": "The answer should show the author's purpose: social critique, education, or entertainment.",
        "answers": [
          {"id": "a8", "text": "Social critique, education, entertainment.", "is_correct": true}
        ]
      }
    ]
  },
  {
    "id": "img_1",
    "item_type": "image",
    "text": "Figure 1: Water cycle diagram",
    "assets": [
      {"type": "image", "url": "https://example.com/water_cycle.png", "alt": "Water cycle diagram"}
    ],
    "order": 7
  },
  {
    "id": "q4",
    "item_type": "question",
    "question_type": "multiple_choice",
    "paper_number": "4",
    "text": "Which process is illustrated in Figure 1?",
    "context_ref": "img_1",
    "marks": 2,
    "order": 8,
    "media": [
      {
        "id": "img_1",
        "role": "question_figure",
        "type": "image",
        "url": "https://example.com/water_cycle.png",
        "alt": "Water cycle diagram",
        "caption": "Figure 1: Water cycle diagram"
      }
    ],
    "explanatory_note": "The figure represents the complete water cycle process in nature.",
    "answers": [
      {"id": "a9", "text": "Evaporation", "is_correct": false},
      {"id": "a10", "text": "Water cycle", "is_correct": true},
      {"id": "a11", "text": "Photosynthesis", "is_correct": false},
      {"id": "a12", "text": "Condensation", "is_correct": false}
    ]
  }
]`;

export const LEGACY_JSON_TEMPLATE = `{
  "questions": [
    {
      "id": "q1",
      "text": "What is 2 + 2?",
      "type": "multiple_choice",
      "answers": [
        {"id": "a1", "text": "3", "is_correct": false},
        {"id": "a2", "text": "4", "is_correct": true},
        {"id": "a3", "text": "5", "is_correct": false},
        {"id": "a4", "text": "6", "is_correct": false}
      ]
    },
    {
      "id": "q2",
      "text": "Explain the process of photosynthesis.",
      "type": "long_form",
      "answers": [
        {
          "id": "a5",
          "text": "Photosynthesis is the process by which plants convert light energy into chemical energy...",
          "is_correct": true
        }
      ]
    }
  ]
}`;
