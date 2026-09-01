import { describe, expect, it } from 'vitest'
import { createMovementTimer, requiredMovementDurationMs } from './poseRecognition'

describe('movement timer', () => {
  it('starts tracking the target movement without requiring a neutral stance first', () => {
    const timer = createMovementTimer('Standing March')

    expect(timer.observe({ className: 'Standing March', probability: 0.9 }, 0)).toMatchObject({ activeDurationMs: 0, phase: 'tracking' })
    expect(timer.observe({ className: 'Standing March', probability: 0.9 }, 100)).toMatchObject({ activeDurationMs: 100, phase: 'tracking' })
  })

  it('completes after five seconds of continuous recognised movement at 70% confidence', () => {
    const timer = createMovementTimer('Standing March')

    expect(timer.observe({ className: 'Neutral', probability: 0.7 }, 0)).toMatchObject({ activeDurationMs: 0, phase: 'waitingForMovement' })
    expect(timer.observe({ className: 'Standing March', probability: 0.7 }, 100)).toMatchObject({ activeDurationMs: 0, phase: 'tracking' })
    for (let timestamp = 200; timestamp < requiredMovementDurationMs; timestamp += 100) {
      timer.observe({ className: 'Standing March', probability: 0.7 }, timestamp)
    }
    expect(timer.observe({ className: 'Standing March', probability: 0.7 }, requiredMovementDurationMs)).toMatchObject({ completed: false, activeDurationMs: requiredMovementDurationMs - 100 })
    expect(timer.observe({ className: 'Standing March', probability: 0.7 }, requiredMovementDurationMs + 100)).toMatchObject({ completed: true, activeDurationMs: requiredMovementDurationMs, phase: 'complete' })
  })

  it('does not count low-confidence or different movements', () => {
    const timer = createMovementTimer('Standing March')

    expect(timer.observe({ className: 'Standing March', probability: 0.69 }, 0)).toMatchObject({ activeDurationMs: 0, phase: 'waitingForMovement' })
    expect(timer.observe({ className: 'Neutral', probability: 0.95 }, 500)).toMatchObject({ activeDurationMs: 0, phase: 'waitingForMovement' })
  })

  it('does not add time while the prediction is not the target movement', () => {
    const timer = createMovementTimer('Standing March')

    timer.observe({ className: 'Standing March', probability: 0.9 }, 0)
    expect(timer.observe({ className: 'Standing March', probability: 0.9 }, 100)).toMatchObject({ activeDurationMs: 100, phase: 'tracking' })
    expect(timer.observe({ className: 'Neutral', probability: 0.99 }, 200)).toMatchObject({ activeDurationMs: 100 })
    expect(timer.observe({ className: 'Neutral', probability: 0.99 }, 500)).toMatchObject({ activeDurationMs: 100, phase: 'paused' })
    expect(timer.observe({ className: 'Standing March', probability: 0.69 }, 600)).toMatchObject({ activeDurationMs: 100, phase: 'paused' })
    expect(timer.observe({ className: 'Side Arm Raise', probability: 0.99 }, 700)).toMatchObject({ activeDurationMs: 100, phase: 'paused' })
  })

  it('preserves progress after a 300ms recognition gap', () => {
    const timer = createMovementTimer('Standing March')

    timer.observe({ className: 'Standing March', probability: 0.9 }, 0)
    for (let timestamp = 100; timestamp <= 1_000; timestamp += 100) {
      timer.observe({ className: 'Standing March', probability: 0.9 }, timestamp)
    }
    expect(timer.observe({ className: 'Standing March', probability: 0.9 }, 1_000)).toMatchObject({ activeDurationMs: 1_000, phase: 'tracking' })
    expect(timer.observe({ className: 'Neutral', probability: 0.99 }, 1_301)).toMatchObject({ activeDurationMs: 1_000, phase: 'paused' })
    expect(timer.observe({ className: 'Standing March', probability: 0.9 }, 1_400)).toMatchObject({ activeDurationMs: 1_000, phase: 'tracking' })
    expect(timer.observe({ className: 'Standing March', probability: 0.9 }, 1_500)).toMatchObject({ activeDurationMs: 1_100, phase: 'tracking' })
  })

  it('does not add an unobserved gap when target predictions are more than 300ms apart', () => {
    const timer = createMovementTimer('Standing March')

    timer.observe({ className: 'Standing March', probability: 0.9 }, 0)
    for (let timestamp = 100; timestamp <= 1_000; timestamp += 100) {
      timer.observe({ className: 'Standing March', probability: 0.9 }, timestamp)
    }
    expect(timer.observe({ className: 'Standing March', probability: 0.9 }, 1_000)).toMatchObject({ activeDurationMs: 1_000, phase: 'tracking' })
    expect(timer.observe({ className: 'Standing March', probability: 0.9 }, 1_301)).toMatchObject({ activeDurationMs: 1_000, phase: 'tracking' })
  })
})
