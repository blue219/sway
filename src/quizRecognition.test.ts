import { describe, expect, it } from 'vitest'
import { createQuizGestureTracker } from './quizRecognition'

function observeRange(tracker: ReturnType<typeof createQuizGestureTracker>, className: string, from: number, through: number, probability = 0.9) {
  let result = tracker.observe({ className, probability }, from)
  for (let timestamp = from + 100; timestamp <= through; timestamp += 100) {
    result = tracker.observe({ className, probability }, timestamp)
  }
  return result
}

describe('quiz gesture tracker', () => {
  it('chooses A after two seconds of recognised hold', () => {
    const tracker = createQuizGestureTracker()
    expect(observeRange(tracker, 'Option A', 0, 1_900).choice).toBeNull()
    expect(tracker.observe({ className: 'Option A', probability: 0.9 }, 2_000)).toMatchObject({
      choice: 'A',
      holdMs: 2_000,
    })
  })

  it('pauses on Idle and low confidence, then resumes cumulative hold', () => {
    const tracker = createQuizGestureTracker()
    expect(observeRange(tracker, 'Option B', 0, 1_000).holdMs).toBe(1_000)
    expect(tracker.observe({ className: 'Idle', probability: 0.99 }, 1_100).choice).toBeNull()
    expect(tracker.observe({ className: 'Option B', probability: 0.69 }, 1_500).holdMs).toBe(1_000)
    expect(observeRange(tracker, 'Option B', 1_600, 2_600)).toMatchObject({ choice: 'B', holdMs: 2_000 })
  })

  it('starts a new hold when the participant switches options', () => {
    const tracker = createQuizGestureTracker()
    expect(observeRange(tracker, 'Option A', 0, 1_000).holdMs).toBe(1_000)
    expect(observeRange(tracker, 'Option B', 1_100, 2_100)).toMatchObject({ choice: null, holdMs: 1_000 })
    expect(observeRange(tracker, 'Option A', 2_200, 3_200)).toMatchObject({ choice: null, holdMs: 1_000 })
  })

  it('waits for a confident Idle before accepting another question', () => {
    const tracker = createQuizGestureTracker(true)
    expect(observeRange(tracker, 'Option A', 0, 2_500)).toMatchObject({ choice: null, waitingForIdle: true })
    expect(tracker.observe({ className: 'Idle', probability: 0.6 }, 2_600).waitingForIdle).toBe(true)
    expect(tracker.observe({ className: 'Idle', probability: 0.9 }, 2_700).waitingForIdle).toBe(false)
    expect(observeRange(tracker, 'Option A', 2_800, 4_800).choice).toBe('A')
  })
})
