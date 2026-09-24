import { describe, expect, it } from 'vitest'
import { createRandomAnswerOrder, createRandomMovementOrder, createRandomQuizOrder, getTreeStage, movements, questionsPerRound, quizQuestions, scoreQuiz, seatedMovements } from './game'

describe('round rewards', () => {
  it('awards 10 points for each correct quiz answer', () => {
    expect(scoreQuiz(1)).toBe(10)
  })

  it('awards 50 points for five correct answers', () => {
    expect(scoreQuiz(5)).toBe(50)
  })

  it('maps a perfect round to the Flourishing Tree stage', () => {
    expect(getTreeStage(50).name).toBe('Flourishing Tree')
  })

  it('shuffles the movement order without repeating an action', () => {
    expect(createRandomMovementOrder(5, () => 0)).toEqual([1, 2, 3, 4, 0])
  })

  it('includes five named movement videos per round', () => {
    expect(movements.map((movement) => movement.title)).toEqual([
      'Side Arm Raise',
      'Standing March',
      'Shallow Squat',
      'Standing Side Bend',
      'Side Leg Lift',
    ])
    expect(movements.every((movement) => movement.videoSrc.startsWith('/assets/') && movement.videoSrc.endsWith('.mp4'))).toBe(true)
  })

  it('includes all seated videos with model recognition enabled', () => {
    expect(seatedMovements).toEqual([
      { title: 'Seated torso twist', videoSrc: '/assets/seated-torso-twist.mp4' },
      { title: 'Seated arm opening', videoSrc: '/assets/seated-arm-opening.mp4' },
      { title: 'Seated overhead press', videoSrc: '/assets/seated-overhead-press.mp4' },
      { title: 'Seated arm reach', videoSrc: '/assets/seated-arm-reach.mp4' },
      { title: 'Seated Forward Reach', videoSrc: '/assets/seated-forward-reach.mp4' },
    ])
  })

  it('creates a shuffled quiz order without repeated questions', () => {
    const questionOrder = createRandomQuizOrder(quizQuestions.length, () => 0)

    expect(new Set(questionOrder.slice(0, questionsPerRound))).toHaveLength(questionsPerRound)
  })

  it('shuffles answer choices without modifying the question bank', () => {
    const options = ['A', 'B', 'C', 'D']

    expect(createRandomAnswerOrder(options, () => 0)).toEqual(['B', 'C', 'D', 'A'])
    expect(options).toEqual(['A', 'B', 'C', 'D'])
  })

  it('includes five new illustrated questions with two distinct answers each', () => {
    expect(quizQuestions).toHaveLength(5)
    expect(quizQuestions.every((question) =>
      question.options.length === 2 &&
      new Set(question.options).size === 2 &&
      question.options.includes(question.correctAnswer) &&
      question.image?.src.endsWith('.svg'),
    )).toBe(true)
  })
})
