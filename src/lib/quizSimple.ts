export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export const simpleJsQuizQuestions: QuizQuestion[] = [
  {
    question: "What is the result of `typeof null` in JavaScript?",
    options: ["\"null\"", "\"object\"", "\"undefined\"", "\"number\""],
    correctIndex: 1,
    explanation: "`typeof null` is a historical JavaScript quirk and returns \"object\".",
  },
  {
    question: "Which method creates a new array without mutating the original?",
    options: ["splice()", "push()", "map()", "sort()"],
    correctIndex: 2,
    explanation: "`map()` returns a new array; `splice()`, `push()`, and often `sort()` mutate.",
  },
  {
    question: "What does `===` check?",
    options: [
      "Value only after type coercion",
      "Reference identity only",
      "Value and type without coercion",
      "Only if both are strings",
    ],
    correctIndex: 2,
    explanation: "Strict equality (`===`) compares both type and value with no coercion.",
  },
  {
    question: "Which statement about `let` is true?",
    options: [
      "It is function-scoped",
      "It is block-scoped",
      "It can be redeclared in the same block",
      "It is hoisted and initialized to null",
    ],
    correctIndex: 1,
    explanation: "`let` is block-scoped and cannot be redeclared in the same scope.",
  },
  {
    question: "What does this expression return: `[1, 2, 3].filter(n => n > 1)`?",
    options: ["[1, 2, 3]", "[1]", "[2, 3]", "true"],
    correctIndex: 2,
    explanation: "`filter` keeps elements where the predicate is true, so it returns [2, 3].",
  },
];
