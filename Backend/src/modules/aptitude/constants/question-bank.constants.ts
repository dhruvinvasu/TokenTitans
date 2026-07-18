import { IAptitudeQuestion } from '@/modules/aptitude/models/aptitude-test.model'

/**
 * Deterministic fallback question bank used when the Claude CLI is not
 * configured. Covers general programming, logic and aptitude so a valid test
 * can always be generated regardless of the specific job role.
 */
export const FALLBACK_QUESTION_BANK: IAptitudeQuestion[] = [
  {
    question: 'What is the time complexity of binary search on a sorted array?',
    options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
    correctIndex: 1,
    skillTag: 'Algorithms',
  },
  {
    question: 'Which data structure uses FIFO (First In First Out) ordering?',
    options: ['Stack', 'Queue', 'Tree', 'Graph'],
    correctIndex: 1,
    skillTag: 'Data Structures',
  },
  {
    question: 'In HTTP, which status code represents "Not Found"?',
    options: ['200', '301', '404', '500'],
    correctIndex: 2,
    skillTag: 'Web',
  },
  {
    question: 'Which keyword declares a block-scoped variable in JavaScript?',
    options: ['var', 'let', 'function', 'global'],
    correctIndex: 1,
    skillTag: 'JavaScript',
  },
  {
    question: 'What does SQL stand for?',
    options: [
      'Structured Query Language',
      'Simple Query Logic',
      'Sequential Query Language',
      'Standard Question Language',
    ],
    correctIndex: 0,
    skillTag: 'Databases',
  },
  {
    question: 'Which of these is NOT a primitive type in TypeScript?',
    options: ['string', 'number', 'boolean', 'array'],
    correctIndex: 3,
    skillTag: 'TypeScript',
  },
  {
    question: 'What is the result of 2 + "2" in JavaScript?',
    options: ['4', '"22"', 'NaN', 'undefined'],
    correctIndex: 1,
    skillTag: 'JavaScript',
  },
  {
    question: 'Which HTTP method is idempotent and used to retrieve data?',
    options: ['POST', 'GET', 'PATCH', 'DELETE'],
    correctIndex: 1,
    skillTag: 'Web',
  },
  {
    question: 'Which data structure is ideal for implementing recursion?',
    options: ['Queue', 'Stack', 'Heap', 'Hash Map'],
    correctIndex: 1,
    skillTag: 'Data Structures',
  },
  {
    question: 'What does the CSS property "flex-direction: column" do?',
    options: [
      'Aligns items horizontally',
      'Aligns items vertically',
      'Wraps items',
      'Reverses text',
    ],
    correctIndex: 1,
    skillTag: 'CSS',
  },
  {
    question: 'If a train travels 60 km in 45 minutes, what is its speed?',
    options: ['60 km/h', '75 km/h', '80 km/h', '90 km/h'],
    correctIndex: 2,
    skillTag: 'Aptitude',
  },
  {
    question: 'Which principle states a class should have one reason to change?',
    options: [
      'Open/Closed Principle',
      'Single Responsibility Principle',
      'Liskov Substitution Principle',
      'Interface Segregation Principle',
    ],
    correctIndex: 1,
    skillTag: 'Design',
  },
  {
    question: 'What is the output of typeof null in JavaScript?',
    options: ['"null"', '"undefined"', '"object"', '"boolean"'],
    correctIndex: 2,
    skillTag: 'JavaScript',
  },
  {
    question: 'Which command initializes a new Git repository?',
    options: ['git start', 'git init', 'git new', 'git create'],
    correctIndex: 1,
    skillTag: 'Git',
  },
  {
    question: 'In Big-O, which is the most efficient for large inputs?',
    options: ['O(n^2)', 'O(n log n)', 'O(n)', 'O(log n)'],
    correctIndex: 3,
    skillTag: 'Algorithms',
  },
  {
    question: 'Complete the series: 2, 6, 12, 20, 30, ?',
    options: ['40', '42', '44', '46'],
    correctIndex: 1,
    skillTag: 'Aptitude',
  },
  {
    question: 'Which of the following is a NoSQL database?',
    options: ['PostgreSQL', 'MySQL', 'MongoDB', 'Oracle'],
    correctIndex: 2,
    skillTag: 'Databases',
  },
  {
    question: 'What does a REST API primarily use to identify resources?',
    options: ['Cookies', 'URIs', 'Headers only', 'Sessions'],
    correctIndex: 1,
    skillTag: 'Web',
  },
]
