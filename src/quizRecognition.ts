import { confidenceThreshold, createMovementTimer, type PosePrediction } from './poseRecognition'

export type QuizChoice = 'A' | 'B'
export const requiredQuizHoldMs = 2_000

export function createQuizGestureTracker(waitForIdle = false) {
  let armed = !waitForIdle
  let target: 'Option A' | 'Option B' | null = null
  let timer: ReturnType<typeof createMovementTimer> | null = null

  return {
    observe(prediction: PosePrediction, timestamp: number) {
      if (!armed) {
        if (prediction.className === 'Idle' && prediction.probability >= confidenceThreshold) {
          armed = true
        }
        return { choice: null as QuizChoice | null, holdMs: 0, waitingForIdle: !armed }
      }

      const nextTarget = prediction.probability >= confidenceThreshold &&
        (prediction.className === 'Option A' || prediction.className === 'Option B')
        ? prediction.className
        : null

      if (nextTarget && nextTarget !== target) {
        // A deliberate switch starts a fresh hold; Idle and weak frames only pause it.
        target = nextTarget
        timer = createMovementTimer(target, requiredQuizHoldMs)
      }

      if (!timer) {
        return { choice: null as QuizChoice | null, holdMs: 0, waitingForIdle: false }
      }

      const result = timer.observe(prediction, timestamp)
      if (result.completed && target) {
        armed = false
        return { choice: (target === 'Option A' ? 'A' : 'B') as QuizChoice, holdMs: requiredQuizHoldMs, waitingForIdle: true }
      }
      return { choice: null as QuizChoice | null, holdMs: result.activeDurationMs, waitingForIdle: false }
    },
  }
}
