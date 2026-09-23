export type TreeStage = {
  name: 'Seed' | 'Sprout' | 'Young Tree' | 'Growing Tree' | 'Flourishing Tree'
  minimumPoints: number
}

export type Movement = {
  title: string
  videoSrc: string
  usePoseRecognition?: boolean
}

export type QuizQuestion = {
  question: string
  options: string[]
  correctAnswer: string
  image?: {
    alt: string
    src: string
  }
}

export const questionsPerRound = 5
const pointsPerCorrectAnswer = 10

export const movements: Movement[] = [
  {
    title: 'Side Arm Raise',
    videoSrc: '/assets/side-arm-raise.mp4',
  },
  {
    title: 'Standing March',
    videoSrc: '/assets/standing-march.mp4',
  },
  {
    title: 'Shallow Squat',
    videoSrc: '/assets/shallow-squat.mp4',
  },
  {
    title: 'Standing Side Bend',
    videoSrc: '/assets/standing-side-bend.mp4',
  },
  {
    title: 'Side Leg Lift',
    videoSrc: '/assets/side-leg-lift.mp4',
  },
]

export const seatedMovements: Movement[] = [
  {
    title: 'Seated knee extension',
    videoSrc: '/assets/seated-knee-extension.mp4',
  },
  {
    title: 'Seated torso twist',
    videoSrc: '/assets/seated-torso-twist.mp4',
    usePoseRecognition: false,
  },
  {
    title: 'Seated arm-opening',
    videoSrc: '/assets/seated-arm-opening.mp4',
    usePoseRecognition: false,
  },
  {
    title: 'Seated marching',
    videoSrc: '/assets/seated-marching.mp4',
    usePoseRecognition: false,
  },
  {
    title: 'Seated Overhead Press',
    videoSrc: '/assets/seated-overhead-press.mp4',
    usePoseRecognition: false,
  },
]

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const order = [...items]

  for (let index = order.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(random() * (index + 1))
    ;[order[index], order[nextIndex]] = [order[nextIndex], order[index]]
  }

  return order
}

export function createRandomMovementOrder(count: number, random = Math.random): number[] {
  return shuffle(Array.from({ length: count }, (_, index) => index), random)
}

export function createRandomQuizOrder(count: number, random = Math.random): number[] {
  return createRandomMovementOrder(count, random)
}

export function createRandomAnswerOrder(options: string[], random = Math.random): string[] {
  return shuffle(options, random)
}

export const treeStages: TreeStage[] = [
  { name: 'Seed', minimumPoints: 0 },
  { name: 'Sprout', minimumPoints: 1 },
  { name: 'Young Tree', minimumPoints: 11 },
  { name: 'Growing Tree', minimumPoints: 21 },
  { name: 'Flourishing Tree', minimumPoints: 31 },
]

export function scoreQuiz(correctAnswers: number): number {
  return correctAnswers * pointsPerCorrectAnswer
}

export function getTreeStage(points: number): TreeStage {
  return treeStages.reduce<TreeStage>(
    (currentStage, stage) => (points >= stage.minimumPoints ? stage : currentStage),
    treeStages[0],
  )
}

export const quizQuestions: QuizQuestion[] = [
  {
    question: 'What bird is shown?',
    options: ['Kiwi', 'Tūī', 'Kererū', 'Fantail'],
    correctAnswer: 'Tūī',
    image: {
      alt: 'A tūī perched on a branch',
      src: '/assets/tui.png',
    },
  },
  {
    question: 'What does whānau describe?',
    options: ['A traditional meal', 'An extended family group', 'A meeting house', 'A native bird'],
    correctAnswer: 'An extended family group',
  },
  {
    question: 'What is a marae?',
    options: ['A type of canoe', 'A Māori community gathering place', 'A mountain trail', 'A woven cloak'],
    correctAnswer: 'A Māori community gathering place',
  },
  {
    question: 'What is a hongi?',
    options: ['A song of farewell', 'A greeting that presses noses', 'A carved ancestor figure', 'A shared meal'],
    correctAnswer: 'A greeting that presses noses',
  },
  {
    question: 'Which te reo Māori phrase is widely used as a greeting?',
    options: ['Ka kite anō', 'Kia ora', 'Haere rā', 'Tēnā koutou'],
    correctAnswer: 'Kia ora',
  },
  {
    question: 'Which traditional cooking method is shown?',
    options: ['Hīkoi', 'Hāngī', 'Hui', 'Waiata'],
    correctAnswer: 'Hāngī',
    image: {
      alt: 'A hāngī earth oven with food baskets and heated stones',
      src: '/assets/quiz-hangi.png',
    },
  },
  {
    question: 'What is the main meeting house of a marae called?',
    options: ['Wharekai', 'Wharenui', 'Marae ātea', 'Waka'],
    correctAnswer: 'Wharenui',
    image: {
      alt: 'A traditional Māori wharenui meeting house',
      src: '/assets/quiz-wharenui.png',
    },
  },
  {
    question: 'What is this traditional Māori canoe called?',
    options: ['Whare', 'Waka', 'Pounamu', 'Kōwhaiwhai'],
    correctAnswer: 'Waka',
    image: {
      alt: 'A traditional Māori waka canoe',
      src: '/assets/quiz-waka.png',
    },
  },
  {
    question: 'What is this painted scroll ornamentation called?',
    options: ['Whakairo', 'Kōwhaiwhai', 'Pōwhiri', 'Koha'],
    correctAnswer: 'Kōwhaiwhai',
    image: {
      alt: 'Kōwhaiwhai painted scroll ornamentation on a wooden beam',
      src: '/assets/quiz-kowhaiwhai.png',
    },
  },
  {
    question: 'What is the traditional Māori name for this prized greenstone?',
    options: ['Kōwhai', 'Pounamu', 'Pātaka', 'Wero'],
    correctAnswer: 'Pounamu',
    image: {
      alt: 'An uncarved piece of green pounamu stone',
      src: '/assets/quiz-pounamu.png',
    },
  },
  {
    question: 'What is a hui?',
    options: ['A canoe', 'A meeting or gathering', 'An earth oven', 'A song'],
    correctAnswer: 'A meeting or gathering',
  },
  {
    question: 'What does aroha express?',
    options: ['A challenge', 'Compassion, empathy, or love', 'A farewell', 'A meeting house'],
    correctAnswer: 'Compassion, empathy, or love',
  },
  {
    question: 'What is a pōwhiri?',
    options: ['A ceremony of mourning', 'A process for welcoming visitors', 'A type of carving', 'A woven cloak'],
    correctAnswer: 'A process for welcoming visitors',
  },
  {
    question: 'What is a waiata?',
    options: ['A speech', 'A chant or song', 'A traditional canoe', 'A greenstone'],
    correctAnswer: 'A chant or song',
  },
  {
    question: 'What does kaitiaki mean?',
    options: ['A visitor', 'A custodian or guardian', 'A feast', 'A carved house'],
    correctAnswer: 'A custodian or guardian',
  },
]
