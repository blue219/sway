import { describe, expect, it } from 'vitest'
import { createBalancedAnswerOrders, createRandomMovementOrder, createRandomQuizOrder, getTreeStage, movements, questionsPerRound, quizQuestions, scoreQuiz, seatedMovements } from './game'

describe('round rewards', () => {
  it('awards 10 points for each correct quiz answer', () => {
    expect(scoreQuiz(1)).toBe(10)
  })

  it('awards 50 points for five correct answers', () => {
    expect(scoreQuiz(5)).toBe(50)
  })

  it('maps cumulative points to three tree stages at their boundaries', () => {
    expect(getTreeStage(0).name).toBe('Sapling')
    expect(getTreeStage(99).name).toBe('Sapling')
    expect(getTreeStage(100).name).toBe('Tree')
    expect(getTreeStage(249).name).toBe('Tree')
    expect(getTreeStage(250).name).toBe('Large Tree')
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

  it('selects five shuffled quiz questions without repeats from the question bank', () => {
    const questionOrder = createRandomQuizOrder(quizQuestions.length, () => 0)

    expect(questionOrder).toHaveLength(questionsPerRound)
    expect(new Set(questionOrder)).toHaveLength(questionsPerRound)
    expect(questionOrder.every((index) => index >= 0 && index < quizQuestions.length)).toBe(true)
  })

  it('places correct answers in both A and B across each five-question round', () => {
    const questions = quizQuestions.slice(0, questionsPerRound)
    const originalOptions = questions.map((question) => [...question.options])

    for (const random of [() => 0, () => 0.99]) {
      const orders = createBalancedAnswerOrders(questions, random)
      const correctA = orders.filter((order, index) => order[0] === questions[index].correctAnswer).length

      expect([correctA, questionsPerRound - correctA].sort()).toEqual([2, 3])
      orders.forEach((order, index) => expect([...order].sort()).toEqual([...originalOptions[index]].sort()))
      expect(questions.map((question) => question.options)).toEqual(originalOptions)
    }
  })

  it('includes ten illustrated questions with two distinct answers each', () => {
    expect(quizQuestions).toHaveLength(10)
    expect(quizQuestions.every((question) =>
      question.options.length === 2 &&
      new Set(question.options).size === 2 &&
      question.options.includes(question.correctAnswer) &&
      question.image?.src.endsWith('.webp'),
    )).toBe(true)
  })
})
