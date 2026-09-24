import type { CustomPoseNet } from '@teachablemachine/pose'

export function disposePoseModel(model: CustomPoseNet) {
  // Teachable Machine's dispose() releases PoseNet but leaves the classifier weights allocated.
  try {
    model.model?.dispose()
  } finally {
    model.dispose()
  }
}
