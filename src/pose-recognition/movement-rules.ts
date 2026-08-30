import type { Keypoint, Pose } from '@tensorflow-models/posenet'
import type { MovementId } from './types'

type Point = {
  x: number
  y: number
}

export type MovementRuleResult = {
  isMatching: boolean
  measurement: {
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
  } | undefined
}

const minimumKeypointConfidence = 0.3
const minimumMiniSquatKneeAngle = 80
const maximumMiniSquatKneeAngle = 165
const minimumSideLegAngle = 10
const minimumRaisedFootRatio = 0.1
const maximumCrossBodyReachRatio = 1
const minimumArmTorsoAngle = 10
const minimumRowingElbowAngle = 30
const maximumRowingElbowAngle = 165

function findKeypoint(pose: Pose, part: string): Keypoint | undefined {
  return pose.keypoints.find((keypoint) => keypoint.part === part)
}

function angleBetween(first: Point, vertex: Point, third: Point): number {
  const firstVector = {
    x: first.x - vertex.x,
    y: first.y - vertex.y,
  }
  const secondVector = {
    x: third.x - vertex.x,
    y: third.y - vertex.y,
  }
  const dotProduct = firstVector.x * secondVector.x + firstVector.y * secondVector.y
  const firstLength = Math.hypot(firstVector.x, firstVector.y)
  const secondLength = Math.hypot(secondVector.x, secondVector.y)

  if (firstLength === 0 || secondLength === 0) {
    return Number.NaN
  }

  const cosine = Math.max(-1, Math.min(1, dotProduct / (firstLength * secondLength)))
  return Math.acos(cosine) * (180 / Math.PI)
}

function evaluateLeg(pose: Pose, side: 'left' | 'right'): MovementRuleResult | undefined {
  const hip = findKeypoint(pose, `${side}Hip`)
  const knee = findKeypoint(pose, `${side}Knee`)
  const ankle = findKeypoint(pose, `${side}Ankle`)

  if (!hip || !knee || !ankle) {
    return undefined
  }

  const keypointConfidence = Math.min(hip.score, knee.score, ankle.score)
  const measuredAngle = angleBetween(hip.position, knee.position, ankle.position)

  return {
    isMatching: keypointConfidence >= minimumKeypointConfidence
      && Number.isFinite(measuredAngle)
      && measuredAngle >= minimumMiniSquatKneeAngle
      && measuredAngle <= maximumMiniSquatKneeAngle,
    measurement: Number.isFinite(measuredAngle)
      ? {
          type: 'knee-angle',
          value: measuredAngle,
          keypointConfidence,
        }
      : undefined,
  }
}

/** Evaluates a mini squat using the most visible hip-knee-ankle chain. */
export function evaluateMiniSquat(pose: Pose): MovementRuleResult {
  const candidates = [evaluateLeg(pose, 'left'), evaluateLeg(pose, 'right')]
    .filter((candidate): candidate is MovementRuleResult => candidate !== undefined)
    .sort((first, second) => (
      (second.measurement?.keypointConfidence ?? 0)
      - (first.measurement?.keypointConfidence ?? 0)
    ))

  return candidates[0] ?? {
    isMatching: false,
    measurement: undefined,
  }
}

/** Evaluates lateral leg separation using the angle from hip centre to both ankles. */
export function evaluateSideLegMove(pose: Pose): MovementRuleResult {
  const leftHip = findKeypoint(pose, 'leftHip')
  const rightHip = findKeypoint(pose, 'rightHip')
  const leftKnee = findKeypoint(pose, 'leftKnee')
  const rightKnee = findKeypoint(pose, 'rightKnee')
  const leftAnkle = findKeypoint(pose, 'leftAnkle')
  const rightAnkle = findKeypoint(pose, 'rightAnkle')

  if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
    return { isMatching: false, measurement: undefined }
  }

  const hipCentre = {
    x: (leftHip.position.x + rightHip.position.x) / 2,
    y: (leftHip.position.y + rightHip.position.y) / 2,
  }
  const candidates = [
    {
      angle: angleBetween(leftAnkle.position, hipCentre, rightAnkle.position),
      confidence: Math.min(leftHip.score, rightHip.score, leftAnkle.score, rightAnkle.score),
    },
    {
      angle: angleBetween(leftKnee.position, hipCentre, rightKnee.position),
      confidence: Math.min(leftHip.score, rightHip.score, leftKnee.score, rightKnee.score),
    },
  ].filter((candidate) => (
    Number.isFinite(candidate.angle)
    && candidate.confidence >= minimumKeypointConfidence
  ))
  const bestCandidate = candidates.sort((first, second) => second.angle - first.angle)[0]

  return {
    isMatching: bestCandidate !== undefined && bestCandidate.angle > minimumSideLegAngle,
    measurement: bestCandidate
      ? {
          type: 'leg-spread-angle',
          value: bestCandidate.angle,
          keypointConfidence: bestCandidate.confidence,
        }
      : undefined,
  }
}

type CrossBodySide = {
  liftedAnkle: Keypoint
  supportingAnkle: Keypoint
  liftedKnee: Keypoint
  oppositeWrist: Keypoint
}

function evaluateCrossBodySide(
  side: CrossBodySide,
  legLength: number,
  shoulderWidth: number,
): MovementRuleResult {
  const keypointConfidence = Math.min(
    side.liftedAnkle.score,
    side.supportingAnkle.score,
    side.liftedKnee.score,
    side.oppositeWrist.score,
  )
  const raisedFootRatio = (
    side.supportingAnkle.position.y - side.liftedAnkle.position.y
  ) / legLength
  const crossBodyReachRatio = Math.hypot(
    side.oppositeWrist.position.x - side.liftedKnee.position.x,
    side.oppositeWrist.position.y - side.liftedKnee.position.y,
  ) / shoulderWidth

  return {
    isMatching: keypointConfidence >= minimumKeypointConfidence
      && raisedFootRatio >= minimumRaisedFootRatio
      && crossBodyReachRatio <= maximumCrossBodyReachRatio,
    measurement: {
      type: 'raised-foot-ratio',
      value: raisedFootRatio,
      keypointConfidence,
    },
  }
}

/** Evaluates a raised foot together with the opposite hand moving across the body. */
export function evaluateCrossBodyKneeReach(pose: Pose): MovementRuleResult {
  const leftHip = findKeypoint(pose, 'leftHip')
  const rightHip = findKeypoint(pose, 'rightHip')
  const leftKnee = findKeypoint(pose, 'leftKnee')
  const rightKnee = findKeypoint(pose, 'rightKnee')
  const leftAnkle = findKeypoint(pose, 'leftAnkle')
  const rightAnkle = findKeypoint(pose, 'rightAnkle')
  const leftShoulder = findKeypoint(pose, 'leftShoulder')
  const rightShoulder = findKeypoint(pose, 'rightShoulder')
  const leftWrist = findKeypoint(pose, 'leftWrist')
  const rightWrist = findKeypoint(pose, 'rightWrist')

  if (
    !leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle
    || !leftShoulder || !rightShoulder || !leftWrist || !rightWrist
  ) {
    return { isMatching: false, measurement: undefined }
  }

  const hipCentreY = (leftHip.position.y + rightHip.position.y) / 2
  const supportingAnkleY = Math.max(leftAnkle.position.y, rightAnkle.position.y)
  const legLength = Math.max(supportingAnkleY - hipCentreY, 1)
  const shoulderWidth = Math.max(
    Math.abs(leftShoulder.position.x - rightShoulder.position.x),
    1,
  )
  const candidates = [
    evaluateCrossBodySide({
      liftedAnkle: leftAnkle,
      supportingAnkle: rightAnkle,
      liftedKnee: leftKnee,
      oppositeWrist: rightWrist,
    }, legLength, shoulderWidth),
    evaluateCrossBodySide({
      liftedAnkle: rightAnkle,
      supportingAnkle: leftAnkle,
      liftedKnee: rightKnee,
      oppositeWrist: leftWrist,
    }, legLength, shoulderWidth),
  ]

  return candidates.find((candidate) => candidate.isMatching)
    ?? candidates.sort((first, second) => (
      (second.measurement?.keypointConfidence ?? 0)
      - (first.measurement?.keypointConfidence ?? 0)
    ))[0]
}

/** Evaluates whether both wrists are visibly above their corresponding shoulders. */
export function evaluateDoubleArmRaise(pose: Pose): MovementRuleResult {
  const leftShoulder = findKeypoint(pose, 'leftShoulder')
  const rightShoulder = findKeypoint(pose, 'rightShoulder')
  const leftWrist = findKeypoint(pose, 'leftWrist')
  const rightWrist = findKeypoint(pose, 'rightWrist')

  if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist) {
    return { isMatching: false, measurement: undefined }
  }

  const keypointConfidence = Math.min(
    leftShoulder.score,
    rightShoulder.score,
    leftWrist.score,
    rightWrist.score,
  )
  const shoulderWidth = Math.max(
    Math.abs(leftShoulder.position.x - rightShoulder.position.x),
    1,
  )
  const leftRaiseRatio = (leftShoulder.position.y - leftWrist.position.y) / shoulderWidth
  const rightRaiseRatio = (rightShoulder.position.y - rightWrist.position.y) / shoulderWidth
  const raisedHandsRatio = Math.min(leftRaiseRatio, rightRaiseRatio)

  return {
    isMatching: keypointConfidence >= minimumKeypointConfidence
      && leftRaiseRatio > 0
      && rightRaiseRatio > 0,
    measurement: {
      type: 'raised-hands-ratio',
      value: raisedHandsRatio,
      keypointConfidence,
    },
  }
}

/** A static foot tap is represented by either leg opening sideways from the other. */
export function evaluateSideToSideFootTap(pose: Pose): MovementRuleResult {
  return evaluateSideLegMove(pose)
}

function evaluateBothArmTorsoAngle(pose: Pose): MovementRuleResult {
  const leftHip = findKeypoint(pose, 'leftHip')
  const rightHip = findKeypoint(pose, 'rightHip')
  const leftShoulder = findKeypoint(pose, 'leftShoulder')
  const rightShoulder = findKeypoint(pose, 'rightShoulder')
  const leftElbow = findKeypoint(pose, 'leftElbow')
  const rightElbow = findKeypoint(pose, 'rightElbow')

  if (!leftHip || !rightHip || !leftShoulder || !rightShoulder || !leftElbow || !rightElbow) {
    return { isMatching: false, measurement: undefined }
  }

  const keypointConfidence = Math.min(
    leftHip.score,
    rightHip.score,
    leftShoulder.score,
    rightShoulder.score,
    leftElbow.score,
    rightElbow.score,
  )
  const leftArmTorsoAngle = angleBetween(leftElbow.position, leftShoulder.position, leftHip.position)
  const rightArmTorsoAngle = angleBetween(rightElbow.position, rightShoulder.position, rightHip.position)
  const armTorsoAngle = Math.min(leftArmTorsoAngle, rightArmTorsoAngle)

  return {
    isMatching: keypointConfidence >= minimumKeypointConfidence
      && Number.isFinite(armTorsoAngle)
      && armTorsoAngle > minimumArmTorsoAngle,
    measurement: Number.isFinite(armTorsoAngle)
      ? {
          type: 'arm-torso-angle',
          value: armTorsoAngle,
          keypointConfidence,
        }
      : undefined,
  }
}

/** Both upper arms must form a visible angle of more than 10° with the torso. */
export function evaluateFrontalRaise(pose: Pose): MovementRuleResult {
  return evaluateBothArmTorsoAngle(pose)
}

/** Either ankle must be visibly raised relative to the supporting ankle. */
export function evaluateKneeLiftExtension(pose: Pose): MovementRuleResult {
  const leftHip = findKeypoint(pose, 'leftHip')
  const rightHip = findKeypoint(pose, 'rightHip')
  const leftKnee = findKeypoint(pose, 'leftKnee')
  const rightKnee = findKeypoint(pose, 'rightKnee')
  const leftAnkle = findKeypoint(pose, 'leftAnkle')
  const rightAnkle = findKeypoint(pose, 'rightAnkle')

  if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
    return { isMatching: false, measurement: undefined }
  }

  const keypointConfidence = Math.min(
    leftHip.score,
    rightHip.score,
    leftKnee.score,
    rightKnee.score,
    leftAnkle.score,
    rightAnkle.score,
  )
  const hipCentreY = (leftHip.position.y + rightHip.position.y) / 2
  const supportingAnkleY = Math.max(leftAnkle.position.y, rightAnkle.position.y)
  const liftedAnkleY = Math.min(leftAnkle.position.y, rightAnkle.position.y)
  const legLength = Math.max(supportingAnkleY - hipCentreY, 1)
  const raisedFootRatio = (supportingAnkleY - liftedAnkleY) / legLength
  const leftKneeAngle = angleBetween(leftHip.position, leftKnee.position, leftAnkle.position)
  const rightKneeAngle = angleBetween(rightHip.position, rightKnee.position, rightAnkle.position)
  const maximumKneeAngle = Math.max(leftKneeAngle, rightKneeAngle)
  const hasExtendedKnee = maximumKneeAngle >= 135

  return {
    isMatching: keypointConfidence >= minimumKeypointConfidence
      && (raisedFootRatio >= minimumRaisedFootRatio || hasExtendedKnee),
    measurement: raisedFootRatio >= minimumRaisedFootRatio
      ? {
          type: 'raised-foot-ratio',
          value: raisedFootRatio,
          keypointConfidence,
        }
      : {
          type: 'knee-extension-angle',
          value: maximumKneeAngle,
          keypointConfidence,
        },
  }
}

/** Both upper arms must open away from the torso. */
export function evaluateLateralRaise(pose: Pose): MovementRuleResult {
  return evaluateBothArmTorsoAngle(pose)
}

/** Both wrists must be above their corresponding shoulders. */
export function evaluateArmAboveHead(pose: Pose): MovementRuleResult {
  return evaluateDoubleArmRaise(pose)
}

/** Both upper arms must leave the torso while both elbows remain visibly bent. */
export function evaluateRowing(pose: Pose): MovementRuleResult {
  const leftHip = findKeypoint(pose, 'leftHip')
  const rightHip = findKeypoint(pose, 'rightHip')
  const leftShoulder = findKeypoint(pose, 'leftShoulder')
  const rightShoulder = findKeypoint(pose, 'rightShoulder')
  const leftElbow = findKeypoint(pose, 'leftElbow')
  const rightElbow = findKeypoint(pose, 'rightElbow')
  const leftWrist = findKeypoint(pose, 'leftWrist')
  const rightWrist = findKeypoint(pose, 'rightWrist')

  if (
    !leftHip || !rightHip || !leftShoulder || !rightShoulder
    || !leftElbow || !rightElbow || !leftWrist || !rightWrist
  ) {
    return { isMatching: false, measurement: undefined }
  }

  const candidates = [
    {
      armTorsoAngle: angleBetween(leftElbow.position, leftShoulder.position, leftHip.position),
      elbowAngle: angleBetween(leftShoulder.position, leftElbow.position, leftWrist.position),
      confidence: Math.min(leftHip.score, leftShoulder.score, leftElbow.score, leftWrist.score),
    },
    {
      armTorsoAngle: angleBetween(rightElbow.position, rightShoulder.position, rightHip.position),
      elbowAngle: angleBetween(rightShoulder.position, rightElbow.position, rightWrist.position),
      confidence: Math.min(rightHip.score, rightShoulder.score, rightElbow.score, rightWrist.score),
    },
  ].sort((first, second) => second.confidence - first.confidence)
  const bestArm = candidates[0]

  return {
    isMatching: bestArm.confidence >= minimumKeypointConfidence
      && bestArm.armTorsoAngle > minimumArmTorsoAngle
      && bestArm.elbowAngle >= minimumRowingElbowAngle
      && bestArm.elbowAngle <= maximumRowingElbowAngle,
    measurement: Number.isFinite(bestArm.elbowAngle)
      ? {
          type: 'elbow-angle',
          value: bestArm.elbowAngle,
          keypointConfidence: bestArm.confidence,
        }
      : undefined,
  }
}

type MovementRule = (pose: Pose) => MovementRuleResult

const movementRuleById = {
  'side-leg-move': evaluateSideLegMove,
  'mini-squat': evaluateMiniSquat,
  'cross-body-knee-reach': evaluateCrossBodyKneeReach,
  'double-arm-raise': evaluateDoubleArmRaise,
  'side-to-side-foot-tap': evaluateSideToSideFootTap,
  'frontal-raise': evaluateFrontalRaise,
  'knee-lift-extension': evaluateKneeLiftExtension,
  'lateral-raise': evaluateLateralRaise,
  'arm-above-head': evaluateArmAboveHead,
  rowing: evaluateRowing,
} satisfies Record<MovementId, MovementRule>

/** Selects and evaluates the rule owned by a standard movement ID. */
export function evaluateMovementRule(
  pose: Pose,
  targetMovement: MovementId,
): MovementRuleResult {
  return movementRuleById[targetMovement](pose)
}
