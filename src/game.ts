export type PlayMode = 'seated' | 'standing'

export type TreeStage = {
  name: 'Seed' | 'Sprout' | 'Young Tree' | 'Growing Tree' | 'Flourishing Tree'
  minimumPoints: number
}

export type Movement = {
  title: string
  guidance: string
}

const movementPoints = 2
const roundCompletionBonus = 10
const quizAnswerPoints = 5
const correctAnswerBonus = 5

export const movements: Record<PlayMode, Movement[]> = {
  seated: [
    { title: 'Raise one arm', guidance: 'Lift one arm only as far as feels comfortable.' },
    { title: 'Open your chest', guidance: 'Gently draw your shoulders back while sitting tall.' },
    { title: 'Turn and look', guidance: 'Turn your upper body a small amount to one side.' },
    { title: 'Reach forward', guidance: 'Reach both hands forward, keeping your feet supported.' },
    { title: 'Lift one knee', guidance: 'Lift one knee a little, or simply press your foot into the floor.' },
  ],
  standing: [
    { title: 'Raise one arm', guidance: 'Lift one arm only as far as feels comfortable.' },
    { title: 'Open your chest', guidance: 'Gently draw your shoulders back and stand tall.' },
    { title: 'Turn and look', guidance: 'Turn your upper body a small amount to one side.' },
    { title: 'Lean to one side', guidance: 'Keep a chair nearby and make only a small, comfortable lean.' },
    { title: 'Shift your weight', guidance: 'With chair support if needed, gently shift from one foot to the other.' },
  ],
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
