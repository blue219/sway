import { describe, expect, it } from 'vitest'
import { createRepCounter } from './poseRecognition'

const confidence = 0.9

function observeStable(counter: ReturnType<typeof createRepCounter>, className: string, at: number) {
  counter.observe({ className, probability: confidence }, at)
  return counter.observe({ className, probability: confidence }, at + 400)
}

describe('pose repetition counter', () => {
  it('counts each target movement once and requires neutral before the next repetition', () => {
    const counter = createRepCounter('Side Arm Raise')

    expect(observeStable(counter, 'Neutral', 0)).toMatchObject({ phase: 'waitingForMovement', repetitions: 0 })
    expect(observeStable(counter, 'Side Arm Raise', 500)).toMatchObject({ phase: 'waitingForNeutral', repetitions: 1 })
    expect(observeStable(counter, 'Side Arm Raise', 1_000)).toMatchObject({ phase: 'waitingForNeutral', repetitions: 1 })
    expect(observeStable(counter, 'Neutral', 1_500)).toMatchObject({ phase: 'waitingForMovement', repetitions: 1 })
    expect(observeStable(counter, 'Side Arm Raise', 2_000)).toMatchObject({ phase: 'waitingForNeutral', repetitions: 2 })
  })

  it('ignores low-confidence, unstable, and incorrect predictions', () => {
    const counter = createRepCounter('Standing March')

    counter.observe({ className: 'Neutral', probability: 0.84 }, 0)
    expect(counter.observe({ className: 'Neutral', probability: confidence }, 400)).toMatchObject({ phase: 'waitingForInitialNeutral', repetitions: 0 })
    expect(observeStable(counter, 'Shallow Squat', 900)).toMatchObject({ phase: 'waitingForInitialNeutral', repetitions: 0 })
    expect(observeStable(counter, 'Neutral', 1_400)).toMatchObject({ phase: 'waitingForMovement', repetitions: 0 })
    expect(observeStable(counter, 'Shallow Squat', 1_900)).toMatchObject({ phase: 'waitingForMovement', repetitions: 0 })
  })

  it('completes after the fifth neutral-to-target transition', () => {
    const counter = createRepCounter('Side Leg Lift')
    observeStable(counter, 'Neutral', 0)

    let result = counter.observe({ className: 'Neutral', probability: confidence }, 400)
    for (let repetition = 1; repetition <= 5; repetition += 1) {
      result = observeStable(counter, 'Side Leg Lift', repetition * 1_000)
      if (repetition < 5) {
        observeStable(counter, 'Neutral', repetition * 1_000 + 500)
      }
    }

    expect(result).toMatchObject({ phase: 'complete', repetitions: 5, completed: true })
  })
})
