import type {
  ContinuousPoseResult,
  MovementId,
  PoseRecognitionResult,
} from './types'

export type PoseHoldTrackerOptions = {
  /** Duration for which the movement must be held. Defaults to 2 seconds. */
  holdDurationMs?: number
  /** Required proportion of matching frames in the hold window. Defaults to 80%. */
  requiredMatchRatio?: number
  /** Prevents a sparse pair of frames from counting as a continuous hold. */
  minimumSamples?: number
}

const defaultHoldDurationMs = 2_000
const defaultRequiredMatchRatio = 0.8
const defaultMinimumSamples = 8

/** Aggregates single-frame recognition results into a continuous hold result. */
export class PoseHoldTracker {
  private readonly holdDurationMs: number
  private readonly requiredMatchRatio: number
  private readonly minimumSamples: number
  private samples: PoseRecognitionResult[] = []
  private targetMovement: MovementId | undefined
  private trackingStartedAt: number | undefined
  private lastTimestamp: number | undefined

  constructor(options: PoseHoldTrackerOptions = {}) {
    this.holdDurationMs = options.holdDurationMs ?? defaultHoldDurationMs
    this.requiredMatchRatio = options.requiredMatchRatio ?? defaultRequiredMatchRatio
    this.minimumSamples = options.minimumSamples ?? defaultMinimumSamples

    if (this.holdDurationMs <= 0) {
      throw new RangeError('holdDurationMs must be greater than 0')
    }
    if (this.requiredMatchRatio <= 0 || this.requiredMatchRatio > 1) {
      throw new RangeError('requiredMatchRatio must be greater than 0 and at most 1')
    }
    if (!Number.isInteger(this.minimumSamples) || this.minimumSamples <= 0) {
      throw new RangeError('minimumSamples must be a positive integer')
    }
  }

  add(result: PoseRecognitionResult): ContinuousPoseResult {
    if (this.targetMovement !== result.targetMovement) {
      this.reset()
      this.targetMovement = result.targetMovement
    }

    if (this.lastTimestamp !== undefined && result.timestamp < this.lastTimestamp) {
      throw new RangeError('Pose recognition timestamps must be monotonic')
    }

    this.trackingStartedAt ??= result.timestamp
    this.lastTimestamp = result.timestamp
    this.samples.push(result)
    this.removeExpiredSamples(result.timestamp)

    const matchingSamples = this.samples.filter((sample) => sample.isMatching).length
    const matchRatio = matchingSamples / this.samples.length
    const elapsedMs = result.timestamp - this.trackingStartedAt
    const durationProgress = Math.min(elapsedMs / this.holdDurationMs, 1)
    const ratioProgress = Math.min(matchRatio / this.requiredMatchRatio, 1)
    const completed = elapsedMs >= this.holdDurationMs
      && this.samples.length >= this.minimumSamples
      && matchRatio >= this.requiredMatchRatio

    const continuousResult: ContinuousPoseResult = {
      targetMovement: result.targetMovement,
      isHolding: result.isMatching,
      progress: completed ? 1 : durationProgress * ratioProgress,
      completed,
    }

    if (completed) {
      this.reset()
    }

    return continuousResult
  }

  reset(): void {
    this.samples = []
    this.targetMovement = undefined
    this.trackingStartedAt = undefined
    this.lastTimestamp = undefined
  }

  private removeExpiredSamples(now: number): void {
    const windowStart = now - this.holdDurationMs
    this.samples = this.samples.filter((sample) => sample.timestamp >= windowStart)
  }
}
