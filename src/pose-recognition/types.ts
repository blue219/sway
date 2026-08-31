/** Exercise modes supported by the pose-recognition module */
export type ExerciseMode = 'seated' | 'standing'
/** Movements supported by the pose-recognition module */
export type MovementId = StandingMovementId | SeatedMovementId

/**
 * These identifiers are independent of the labels produced by the underlying
 * machine-learning model.
 *
 * Values must remain aligned with the application's movement-to-model label mapping.
 */
export type StandingMovementId =
  | 'side-leg-move'
  | 'mini-squat'
  | 'cross-body-knee-reach'
  | 'double-arm-raise'
  | 'side-to-side-foot-tap'

export type SeatedMovementId =
  | 'frontal-raise'
  | 'knee-lift-extension'
  | 'lateral-raise'
  | 'arm-above-head'
  | 'rowing'

/** A decoded image frame supplied to the pose-recognition model. */
export type PoseInput = ImageData

/** Public contract for loading and invoking the pose-recognition model. */
export interface PoseRecognizer {
  /**
   * Loads and initializes the model.
   */
  load(): Promise<void>
  /**
   * Evaluates one image frame against the requested target movement.
   *
   * @param input Decoded image frame to evaluate.
   * @param targetMovement Movement that the user is expected to perform.
   * @returns The recognition result for the supplied frame.
   * @throws If the model has not been loaded or prediction fails.
   */
  predict(
    input: PoseInput,
    targetMovement: MovementId,
  ): Promise<PoseRecognitionResult>
}

/** Result produced when evaluating an image frame against a target movement. */
export type PoseRecognitionResult = {
    targetMovement: MovementId
    /** Raw confidence assigned to the target class by the TM classifier. */
    targetConfidence?: number
    /** Highest-confidence movement predicted by the model. */
    detectedMovement?: MovementId
    detectedConfidence?: number
    isMatching: boolean
    /** Which stage made the final positive decision, or none when rejected. */
    matchSource: 'rule' | 'model' | 'none'
    /** Movement-specific measurement, when a rule-based evaluator is used. */
    measurement?: {
      type:
        | 'knee-angle'
        | 'leg-spread-angle'
        | 'raised-foot-ratio'
        | 'raised-hands-ratio'
        | 'arm-torso-angle'
        | 'elbow-angle'
        | 'knee-extension-angle'
      value: number
      keypointConfidence: number
    }
    /** Monotonic prediction timestamp in milliseconds. */
    timestamp: number
}

/** Aggregated state produced from a sequence of single-frame results. */
export type ContinuousPoseResult = {
  targetMovement: MovementId
  /** Whether the latest frame matches the target movement. */
  isHolding: boolean
  /** Hold progress from 0 to 1. */
  progress: number
  /** True once when the required hold has been completed. */
  completed: boolean
}
