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
  options: [string, string]
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
    title: 'Seated torso twist',
    videoSrc: '/assets/seated-torso-twist.mp4',
  },
  {
    title: 'Seated arm opening',
    videoSrc: '/assets/seated-arm-opening.mp4',
  },
  {
    title: 'Seated overhead press',
    videoSrc: '/assets/seated-overhead-press.mp4',
  },
  {
    title: 'Seated arm reach',
    videoSrc: '/assets/seated-arm-reach.mp4',
  },
  {
    title: 'Seated Forward Reach',
    videoSrc: '/assets/seated-forward-reach.mp4',
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
    question: 'What colour are pōhutukawa flowers?',
    options: ['Red', 'Blue'],
    correctAnswer: 'Red',
    image: { alt: 'A pōhutukawa branch with red flowers', src: '/assets/quiz-pohutukawa.svg' },
  },
  {
    question: 'What kind of bird is a kākāpō?',
    options: ['Parrot', 'Penguin'],
    correctAnswer: 'Parrot',
    image: { alt: 'A green kākāpō in the forest', src: '/assets/quiz-kakapo.svg' },
  },
  {
    question: 'What plant inspires the koru shape?',
    options: ['Fern', 'Palm'],
    correctAnswer: 'Fern',
    image: { alt: 'An unfurling fern frond', src: '/assets/quiz-koru.svg' },
  },
  {
    question: 'What is harakeke often used for?',
    options: ['Weaving', 'Pottery'],
    correctAnswer: 'Weaving',
    image: { alt: 'Harakeke leaves beside a woven basket', src: '/assets/quiz-harakeke.svg' },
  },
  {
    question: 'How many red stars are on the New Zealand flag?',
    options: ['Four', 'Five'],
    correctAnswer: 'Four',
    image: { alt: 'The New Zealand flag with four red stars', src: '/assets/quiz-flag.svg' },
  },
]
