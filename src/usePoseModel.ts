import type { CustomPoseNet } from '@teachablemachine/pose'
import { useEffect, useRef, useState } from 'react'
import { disposePoseModel } from './poseModel'

export type PoseModelStatus = 'loading' | 'ready' | 'invalid' | 'error'

export function usePoseModel(modelUrl: string, metadataUrl: string, hasRequiredLabels: (labels: string[]) => boolean) {
  const modelRef = useRef<CustomPoseNet | null>(null)
  const [status, setStatus] = useState<PoseModelStatus>('loading')

  useEffect(() => {
    let current = true
    setStatus('loading')

    void Promise.resolve()
      .then(() => {
        if (!current) return undefined
        if (!window.tmPose) throw new Error('The local pose runtime is unavailable.')
        return window.tmPose.load(modelUrl, metadataUrl)
      })
      .then((model) => {
        if (!model) return
        if (!current) {
          disposePoseModel(model)
          return
        }
        if (!hasRequiredLabels(model.getClassLabels())) {
          disposePoseModel(model)
          setStatus('invalid')
          return
        }
        modelRef.current = model
        setStatus('ready')
      })
      .catch(() => {
        if (current) setStatus('error')
      })

    return () => {
      current = false
      if (modelRef.current) disposePoseModel(modelRef.current)
      modelRef.current = null
    }
  }, [modelUrl, metadataUrl, hasRequiredLabels])

  return { modelRef, status }
}
