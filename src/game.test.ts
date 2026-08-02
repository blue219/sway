import { describe, expect, it } from 'vitest'
import { getTreeStage, scoreQuiz } from './game'

describe('round rewards', () => {
  it('awards 30 points for five movements and a correct quiz answer', () => {
    expect(scoreQuiz(5, true)).toBe(30)
  })

  it('awards 25 points for five movements and an incorrect quiz answer', () => {
    expect(scoreQuiz(5, false)).toBe(25)
  })

  it('maps a completed correct round to the Growing Tree stage', () => {
    expect(getTreeStage(30).name).toBe('Growing Tree')
  })
})
