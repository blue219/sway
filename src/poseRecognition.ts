export const confidenceThreshold = 0.85
export const stablePoseDurationMs = 400
export const repetitionsPerMovement = 5

export type RepCounterPhase = 'waitingForInitialNeutral' | 'waitingForMovement' | 'waitingForNeutral' | 'complete'

export type PosePrediction = {
  className: string
  probability: number
}

export type RepCounterResult = {
  completed: boolean
  phase: RepCounterPhase
  repetitions: number
}

export function createRepCounter(targetClassName: string, targetRepetitions = repetitionsPerMovement) {
  let phase: RepCounterPhase = 'waitingForInitialNeutral'
  let repetitions = 0
  let candidateClassName: string | null = null
  let candidateStartedAt: number | null = null
  let lastStableClassName: string | null = null

  function getResult(): RepCounterResult {
    return { completed: phase === 'complete', phase, repetitions }
  }

  function resetCandidate() {
    candidateClassName = null
    candidateStartedAt = null
  }

  function applyStableClass(className: string) {
    if (className === lastStableClassName) {
      return
    }

    lastStableClassName = className
    if (phase === 'waitingForInitialNeutral' && className === 'Neutral') {
      phase = 'waitingForMovement'
      return
    }

    if (phase === 'waitingForMovement' && className === targetClassName) {
      repetitions += 1
      phase = repetitions === targetRepetitions ? 'complete' : 'waitingForNeutral'
      return
    }

    if (phase === 'waitingForNeutral' && className === 'Neutral') {
      phase = 'waitingForMovement'
    }
  }

  return {
    observe(prediction: PosePrediction, timestamp: number): RepCounterResult {
      if (phase === 'complete') {
        return getResult()
      }

      if (prediction.probability < confidenceThreshold) {
        resetCandidate()
        return getResult()
      }

      if (prediction.className !== candidateClassName) {
        candidateClassName = prediction.className
        candidateStartedAt = timestamp
        return getResult()
      }

      if (candidateStartedAt !== null && timestamp - candidateStartedAt >= stablePoseDurationMs) {
        applyStableClass(prediction.className)
      }

      return getResult()
    },
  }
}
