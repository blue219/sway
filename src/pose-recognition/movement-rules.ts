import type { Keypoint, Pose } from '@tensorflow-models/posenet'

type Point = {
  x: number
  y: number
}

export type MovementRuleResult = {
  isMatching: boolean
  keypointConfidence: number
  measuredAngle: number | undefined
}

const minimumKeypointConfidence = 0.3
const minimumMiniSquatKneeAngle = 80
const maximumMiniSquatKneeAngle = 165

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
    keypointConfidence,
    measuredAngle: Number.isFinite(measuredAngle) ? measuredAngle : undefined,
  }
}

/** Evaluates a mini squat using the most visible hip-knee-ankle chain. */
export function evaluateMiniSquat(pose: Pose): MovementRuleResult {
  const candidates = [evaluateLeg(pose, 'left'), evaluateLeg(pose, 'right')]
    .filter((candidate): candidate is MovementRuleResult => candidate !== undefined)
    .sort((first, second) => second.keypointConfidence - first.keypointConfidence)

  return candidates[0] ?? {
    isMatching: false,
    keypointConfidence: 0,
    measuredAngle: undefined,
  }
}
