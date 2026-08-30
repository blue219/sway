import type { ExerciseMode, MovementId } from './types'

/**
 * Teachable Machine class labels are an implementation detail. This adapter is
 * intentionally not re-exported by the pose-recognition public contract.
 */
const teachableMachineLabelByMovement = {
  'side-leg-move': 'Side hip strengthening',
  'mini-squat': 'Mini Squat',
  'cross-body-knee-reach': 'Standing March with Opposite Hand Tap',
  'double-arm-raise': 'Standing Double Arm Raise',
  'side-to-side-foot-tap': 'Standing Side-to-Side Foot Tap',
  'frontal-raise': 'Frontal Raise',
  'knee-lift-extension': 'Knee Lift and Extension',
  'lateral-raise': 'Lateral Raise',
  'arm-above-head': 'Arms above Head',
  rowing: 'Rowing',
} as const satisfies Record<MovementId, string>

const movementByTeachableMachineLabel = new Map<string, MovementId>(
  Object.entries(teachableMachineLabelByMovement).map(([movementId, label]) => [
    label,
    movementId as MovementId,
  ]),
)

/** Converts an application movement ID into the label required by TM output. */
export function toTeachableMachineLabel(movementId: MovementId): string {
  return teachableMachineLabelByMovement[movementId]
}

/**
 * Converts a raw Teachable Machine class label into the application's stable
 * movement ID. Unknown labels are deliberately ignored rather than leaked.
 */
export function toMovementId(teachableMachineLabel: string): MovementId | undefined {
  return movementByTeachableMachineLabel.get(teachableMachineLabel)
}

const movementIdsByMode = {
  seated: [
    'frontal-raise',
    'knee-lift-extension',
    'lateral-raise',
    'arm-above-head',
    'rowing'],
  standing: [
    'side-leg-move',
    'mini-squat',
    'cross-body-knee-reach',
    'double-arm-raise',
    'side-to-side-foot-tap',
  ],
} as const satisfies Record<ExerciseMode, readonly MovementId[]>

export function getTeachableMachineLabels(mode: ExerciseMode): readonly string[] {
  return movementIdsByMode[mode].map(toTeachableMachineLabel)
}

export function getMovementMode(movementId: MovementId): ExerciseMode {
  return (movementIdsByMode.seated as readonly MovementId[]).includes(movementId)
    ? 'seated'
    : 'standing'
}
