import { describe, expect, it } from 'vitest'
import { createMovementTimer, requiredMovementDurationMs } from './poseRecognition'

describe('movement timer', () => {
  it('completes after five seconds of continuous recognised movement at 70% confidence', () => {
    const timer = createMovementTimer('Standing March')

    expect(timer.observe({ className: 'Standing March', probability: 0.7 }, 0)).toMatchObject({ activeDurationMs: 0, phase: 'tracking' })
    for (let timestamp = 100; timestamp < requiredMovementDurationMs; timestamp += 100) {
      timer.observe({ className: 'Standing March', probability: 0.7 }, timestamp)
    }
    expect(timer.observe({ className: 'Standing March', probability: 0.7 }, requiredMovementDurationMs - 100)).toMatchObject({ completed: false, activeDurationMs: requiredMovementDurationMs - 100 })
    expect(timer.observe({ className: 'Standing March', probability: 0.7 }, requiredMovementDurationMs)).toMatchObject({ completed: true, activeDurationMs: requiredMovementDurationMs, phase: 'complete' })
  })

  it('does not count low-confidence or different movements', () => {
    const timer = createMovementTimer('Standing March')

    expect(timer.observe({ className: 'Standing March', probability: 0.69 }, 0)).toMatchObject({ activeDurationMs: 0, phase: 'waitingForMovement' })
    expect(timer.observe({ className: 'Neutral', probability: 0.95 }, 500)).toMatchObject({ activeDurationMs: 0, phase: 'waitingForMovement' })
  })

  it('pauses after a 300ms recognition gap and continues without resetting progress', () => {
    const timer = createMovementTimer('Standing March')

    timer.observe({ className: 'Standing March', probability: 0.9 }, 0)
    for (let timestamp = 100; timestamp <= 1_000; timestamp += 100) {
      timer.observe({ className: 'Standing March', probability: 0.9 }, timestamp)
    }
    expect(timer.observe({ className: 'Standing March', probability: 0.9 }, 1_000)).toMatchObject({ activeDurationMs: 1_000, phase: 'tracking' })
    expect(timer.observe({ className: 'Neutral', probability: 0.9 }, 1_301)).toMatchObject({ activeDurationMs: 1_000, phase: 'paused' })
    expect(timer.observe({ className: 'Standing March', probability: 0.9 }, 2_000)).toMatchObject({ activeDurationMs: 1_000, phase: 'tracking' })
    for (let timestamp = 2_100; timestamp <= 3_000; timestamp += 100) {
      timer.observe({ className: 'Standing March', probability: 0.9 }, timestamp)
    }
    expect(timer.observe({ className: 'Standing March', probability: 0.9 }, 3_000)).toMatchObject({ activeDurationMs: 2_000, phase: 'tracking' })
  })

  it('does not add an unobserved recognition gap when the correct movement resumes', () => {
    const timer = createMovementTimer('Standing March')

    timer.observe({ className: 'Standing March', probability: 0.9 }, 0)
    for (let timestamp = 100; timestamp <= 1_000; timestamp += 100) {
      timer.observe({ className: 'Standing March', probability: 0.9 }, timestamp)
    }
    expect(timer.observe({ className: 'Standing March', probability: 0.9 }, 1_000)).toMatchObject({ activeDurationMs: 1_000, phase: 'tracking' })
    expect(timer.observe({ className: 'Standing March', probability: 0.9 }, 1_500)).toMatchObject({ activeDurationMs: 1_000, phase: 'tracking' })
  })
})
