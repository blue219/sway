import { describe, expect, it } from 'vitest'
import { createRandomMovementOrder, createRandomQuizOrder, getTreeStage, movements, questionsPerRound, quizQuestions, scoreQuiz } from './game'

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

  it('uses one animated standing march per round', () => {
    expect(movements).toEqual([
      expect.objectContaining({
        title: 'Standing March',
      }),
    ])
  })

  it('creates a shuffled quiz order without repeated questions', () => {
    const questionOrder = createRandomQuizOrder(quizQuestions.length, () => 0)

    expect(new Set(questionOrder.slice(0, questionsPerRound))).toHaveLength(questionsPerRound)
  })

  it('includes 15 Māori culture questions with six illustrations', () => {
    expect(quizQuestions).toHaveLength(15)
    expect(quizQuestions.filter((question) => question.image)).toHaveLength(6)
  })
})
