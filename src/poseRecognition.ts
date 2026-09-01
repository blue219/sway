export const confidenceThreshold = 0.7
export const requiredMovementDurationMs = 5_000
export const recognitionGapToleranceMs = 300

export type MovementTimerPhase = 'waitingForMovement' | 'tracking' | 'paused' | 'complete'

export type PosePrediction = {
  className: string
  probability: number
}

export type MovementTimerResult = {
  completed: boolean
  phase: MovementTimerPhase
  activeDurationMs: number
}

export function createMovementTimer(targetClassName: string, requiredDurationMs = requiredMovementDurationMs) {
  let phase: MovementTimerPhase = 'waitingForMovement'
  let activeDurationMs = 0
  let lastRecognisedAt: number | null = null
  let previousPredictionWasRecognised = false
  let hasObservedNeutralStance = false

  function getResult(): MovementTimerResult {
    return { completed: phase === 'complete', phase, activeDurationMs }
  }

  return {
    observe(prediction: PosePrediction, timestamp: number): MovementTimerResult {
      if (phase === 'complete') {
        return getResult()
      }

      const isNeutralStance = prediction.className === 'Neutral' && prediction.probability >= confidenceThreshold
      if (!hasObservedNeutralStance) {
        hasObservedNeutralStance = isNeutralStance
        return getResult()
      }

      const isRecognisedMovement = prediction.className === targetClassName && prediction.probability >= confidenceThreshold
      if (!isRecognisedMovement) {
        if (lastRecognisedAt !== null && timestamp - lastRecognisedAt > recognitionGapToleranceMs) {
          phase = 'paused'
        }
        previousPredictionWasRecognised = false
        return getResult()
      }

      if (phase === 'waitingForMovement' || phase === 'paused') {
        phase = 'tracking'
        lastRecognisedAt = timestamp
        previousPredictionWasRecognised = true
        return getResult()
      }

      if (lastRecognisedAt !== null) {
        const recognisedIntervalMs = timestamp - lastRecognisedAt
        // Count only adjacent, timely correct predictions; a wrong or delayed frame starts a new hold interval.
        if (previousPredictionWasRecognised && recognisedIntervalMs <= recognitionGapToleranceMs) {
          activeDurationMs += recognisedIntervalMs
        }
        lastRecognisedAt = timestamp
      }
      previousPredictionWasRecognised = true
      if (activeDurationMs >= requiredDurationMs) {
        activeDurationMs = requiredDurationMs
        phase = 'complete'
      }

      return getResult()
    },
  }
}
