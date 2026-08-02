export type PlayMode = 'seated' | 'standing'

export type TreeStage = {
  name: 'Seed' | 'Sprout' | 'Young Tree' | 'Growing Tree' | 'Flourishing Tree'
  minimumPoints: number
}

export type Movement = {
  title: string
  guidance: string
  focus: string
  illustration: string
}

const movementPoints = 2
const roundCompletionBonus = 10
const quizAnswerPoints = 5
const correctAnswerBonus = 5

export const movements: Record<PlayMode, Movement[]> = {
  seated: [
    { title: 'Raise one arm', guidance: 'Lift one arm only as far as feels comfortable.', focus: 'Keep your shoulders soft.', illustration: '/assets/seated-raise.png' },
    { title: 'Open your chest', guidance: 'Gently draw your shoulders back while sitting tall.', focus: 'Keep both feet supported.', illustration: '/assets/seated-raise.png' },
    { title: 'Turn and look', guidance: 'Turn your upper body a small amount to one side.', focus: 'Move slowly and breathe easily.', illustration: '/assets/seated-raise.png' },
    { title: 'Reach forward', guidance: 'Reach both hands forward, keeping your feet supported.', focus: 'Stay comfortably upright.', illustration: '/assets/seated-raise.png' },
    { title: 'Lift one knee', guidance: 'Lift one knee a little, or simply press your foot into the floor.', focus: 'Choose the height that feels right.', illustration: '/assets/seated-raise.png' },
  ],
  standing: [
    { title: 'High-knee march', guidance: 'Lift one knee to a height that feels steady, then switch sides.', focus: 'Stand tall through your supporting leg.', illustration: '/assets/standing-high-knee.png' },
    { title: 'Side leg lift', guidance: 'Lift one leg out to the side while keeping both hips facing forward.', focus: 'Stretch your arms wide for balance.', illustration: '/assets/standing-side-leg.png' },
    { title: 'Mini squat', guidance: 'Bend your knees and sit your hips back a little, then stand tall again.', focus: 'Keep your heels grounded.', illustration: '/assets/standing-mini-squat.png' },
    { title: 'Cross-body knee reach', guidance: 'Lift one knee and reach the opposite hand towards it, then switch sides.', focus: 'Move with control, not speed.', illustration: '/assets/standing-cross-body.png' },
    { title: 'Full-body reach', guidance: 'Reach both arms high overhead and grow as tall as you comfortably can.', focus: 'Keep your chest open and gaze forward.', illustration: '/assets/standing-full-body-reach.png' },
  ],
}

export function createRandomMovementOrder(count: number, random = Math.random): number[] {
  const order = Array.from({ length: count }, (_, index) => index)

  for (let index = order.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(random() * (index + 1))
    ;[order[index], order[nextIndex]] = [order[nextIndex], order[index]]
  }

  return order
}

const treeStages: TreeStage[] = [
  { name: 'Seed', minimumPoints: 0 },
  { name: 'Sprout', minimumPoints: 1 },
  { name: 'Young Tree', minimumPoints: 11 },
  { name: 'Growing Tree', minimumPoints: 21 },
  { name: 'Flourishing Tree', minimumPoints: 31 },
]

export function scoreQuiz(completedMovements: number, isCorrect: boolean): number {
  const movementTotal = completedMovements * movementPoints
  const completionTotal = completedMovements === 5 ? roundCompletionBonus : 0

  return movementTotal + completionTotal + quizAnswerPoints + (isCorrect ? correctAnswerBonus : 0)
}

export function getTreeStage(points: number): TreeStage {
  return treeStages.reduce<TreeStage>(
    (currentStage, stage) => (points >= stage.minimumPoints ? stage : currentStage),
    treeStages[0],
  )
}

export const quiz = {
  question: 'What bird is shown?',
  options: ['Kiwi', 'Tūī', 'Kererū', 'Fantail'],
  correctAnswer: 'Tūī',
}
