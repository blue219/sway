export type TreeStage = {
  name: 'Sapling' | 'Tree' | 'Large Tree'
  minimumPoints: number
  imageSrc: string
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
  return createRandomMovementOrder(count, random).slice(0, Math.min(count, questionsPerRound))
}

export function createRandomAnswerOrder(options: string[], random = Math.random): string[] {
  return shuffle(options, random)
}

export const treeStages: TreeStage[] = [
  { name: 'Sapling', minimumPoints: 0, imageSrc: '/assets/tree-sapling.webp' },
  { name: 'Tree', minimumPoints: 100, imageSrc: '/assets/tree-medium.webp' },
  { name: 'Large Tree', minimumPoints: 250, imageSrc: '/assets/tree-large.webp' },
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
    question: 'In which season do pōhutukawa usually flower?',
    options: ['Winter', 'Summer'],
    correctAnswer: 'Summer',
    image: { alt: 'A pōhutukawa branch with red flowers', src: '/assets/quiz-pohutukawa.webp' },
  },
  {
    question: 'Can a kākāpō fly?',
    options: ['Yes', 'No'],
    correctAnswer: 'No',
    image: { alt: 'A green kākāpō perched on a branch', src: '/assets/quiz-kakapo.webp' },
  },
  {
    question: 'How do ferns make new plants?',
    options: ['Seeds', 'Spores'],
    correctAnswer: 'Spores',
    image: { alt: 'An unfurling fern frond', src: '/assets/quiz-koru.webp' },
  },
  {
    question: 'Where is harakeke commonly found?',
    options: ['Wetlands and rivers', 'Dry inland plains'],
    correctAnswer: 'Wetlands and rivers',
    image: { alt: 'Harakeke leaves beside a woven basket', src: '/assets/quiz-harakeke.webp' },
  },
  {
    question: 'When was the New Zealand flag formally adopted?',
    options: ['1869', '1902'],
    correctAnswer: '1902',
    image: { alt: 'The New Zealand flag with four red stars', src: '/assets/quiz-flag.webp' },
  },
  {
    question: 'Which island is Aoraki / Mount Cook on?',
    options: ['North Island', 'South Island'],
    correctAnswer: 'South Island',
    image: { alt: 'Snowy mountain peaks above an alpine valley', src: '/assets/quiz-aoraki.webp' },
  },
  {
    question: 'What is New Zealand’s longest river?',
    options: ['Waikato River', 'Clutha River'],
    correctAnswer: 'Waikato River',
    image: { alt: 'A wide river winding through green hills', src: '/assets/quiz-river.webp' },
  },
  {
    question: 'What is the name of the strait between the North and South Islands?',
    options: ['Cook Strait', 'Foveaux Strait'],
    correctAnswer: 'Cook Strait',
    image: { alt: 'A sea channel between two green coastlines', src: '/assets/quiz-cook-strait.webp' },
  },
  {
    question: 'When are kiwi usually most active?',
    options: ['At night', 'During the day'],
    correctAnswer: 'At night',
    image: { alt: 'A kiwi bird standing among ferns', src: '/assets/quiz-kiwi.webp' },
  },
  {
    question: 'What is it called when a dolphin uses clicks to find prey?',
    options: ['Echolocation', 'Migration'],
    correctAnswer: 'Echolocation',
    image: { alt: 'A Hector’s dolphin swimming in clear coastal water', src: '/assets/quiz-hectors-dolphin.webp' },
  },
]
