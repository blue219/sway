import type { CustomPoseNet } from '@teachablemachine/pose'
import { useEffect, useRef, useState } from 'react'
import { createMovementTimer, requiredMovementDurationMs, type MovementTimerPhase } from '../poseRecognition'

const defaultModelUrls = {
  model: '/models/pose/model.json',
  metadata: '/models/pose/metadata.json',
}

const modelUrlsByMovement: Record<string, typeof defaultModelUrls> = {
  'Side Arm Raise': {
    model: '/models/side-arm-raise/model.json',
    metadata: '/models/side-arm-raise/metadata.json',
  },
  'Shallow Squat': {
    model: '/models/shallow-squat/model.json',
    metadata: '/models/shallow-squat/metadata.json',
  },
  'Side Leg Lift': {
    model: '/models/side-leg-lift/model.json',
    metadata: '/models/side-leg-lift/metadata.json',
  },
  'Standing Side Bend': {
    model: '/models/standing-side-bend/model.json',
    metadata: '/models/standing-side-bend/metadata.json',
  },
}
const requiredLabels = ['Neutral', 'Side Arm Raise', 'Standing March', 'Shallow Squat', 'Standing Side Bend', 'Side Leg Lift']

type CameraStatus = 'loadingCamera' | 'loadingModel' | 'ready' | 'unavailable' | 'denied' | 'invalidModel' | 'modelError' | 'recognitionError'

export type RecognitionStatus =
  | { kind: 'checking' }
  | { kind: 'ready' }
  | { kind: 'unavailable'; message: string }

type CameraPreviewProps = {
  isTracking: boolean
  movementLabel: string
  onRecognitionStatusChange: (recognitionStatus: RecognitionStatus) => void
  onComplete: () => void
  onActiveDurationChange: (activeDurationMs: number) => void
}

function hasRequiredLabels(labels: string[], movementLabel: string) {
  const isCompleteModel = labels.length === requiredLabels.length && requiredLabels.every((label) => labels.includes(label))
  const isMovementModel = labels.length === 2 && labels.includes('Neutral') && labels.includes(movementLabel)

  return isCompleteModel || isMovementModel
}

function getModelUrls(movementLabel: string) {
  return modelUrlsByMovement[movementLabel] ?? defaultModelUrls
}

function getUnavailableMessage(status: CameraStatus) {
  switch (status) {
    case 'denied':
      return 'Camera permission was not granted.'
    case 'unavailable':
      return 'Camera is unavailable.'
    case 'invalidModel':
      return 'Pose model does not support this movement.'
    case 'modelError':
      return 'Pose model files could not be loaded.'
    case 'recognitionError':
      return 'Pose recognition stopped unexpectedly.'
    default:
      return 'Pose recognition is unavailable.'
  }
}

function getStatusMessage(
  status: CameraStatus,
  deviceName: string | null,
  phase: MovementTimerPhase | null,
  activeDurationMs: number,
  movementLabel: string,
  prediction: string | null,
) {
  switch (status) {
    case 'denied':
      return 'Camera permission was not granted. Pose recognition cannot start.'
    case 'unavailable':
      return 'Camera is unavailable. Pose recognition cannot start.'
    case 'loadingModel':
      return 'Loading pose model…'
    case 'invalidModel':
      return 'Pose model does not support this movement.'
    case 'modelError':
      return 'Pose model files could not be loaded.'
    case 'recognitionError':
      return 'Pose recognition stopped unexpectedly.'
    case 'ready':
      switch (phase) {
        case 'waitingForMovement':
          return `Start ${movementLabel}. 0.0/${requiredMovementDurationMs / 1_000}.0 seconds recognised.`
        case 'tracking':
          return `${prediction === movementLabel ? movementLabel : 'Movement'} recognised. ${(activeDurationMs / 1_000).toFixed(1)}/${requiredMovementDurationMs / 1_000}.0 seconds.`
        case 'paused':
          return `Recognition paused. ${(activeDurationMs / 1_000).toFixed(1)}/${requiredMovementDurationMs / 1_000}.0 seconds.`
        case 'complete':
          return `${movementLabel} complete.`
        default:
          return deviceName ? `Camera and pose model ready: ${deviceName}` : 'Camera and pose model ready'
      }
    default:
      return 'Starting camera preview…'
  }
}

export function CameraPreview({ isTracking, movementLabel, onRecognitionStatusChange, onComplete, onActiveDurationChange }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | undefined>(undefined)
  const modelRef = useRef<CustomPoseNet | undefined>(undefined)
  const timerRef = useRef<ReturnType<typeof createMovementTimer> | undefined>(undefined)
  const [cameraReady, setCameraReady] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [status, setStatus] = useState<CameraStatus>('loadingCamera')
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [phase, setPhase] = useState<MovementTimerPhase | null>(null)
  const [activeDurationMs, setActiveDurationMs] = useState(0)
  const [prediction, setPrediction] = useState<string | null>(null)

  function isVideoTrackLive() {
    return streamRef.current?.getVideoTracks().some((track) => track.readyState === 'live' && track.enabled && !track.muted) ?? false
  }

  function handlePreviewPlaying() {
    const video = videoRef.current
    if (!video || !isVideoTrackLive()) {
      setCameraReady(false)
      setStatus('unavailable')
      return
    }

    const confirmFrame = () => {
      if (isVideoTrackLive()) {
        setCameraReady(true)
      } else {
        setCameraReady(false)
        setStatus('unavailable')
      }
    }
    if (typeof video.requestVideoFrameCallback === 'function') {
      video.requestVideoFrameCallback(confirmFrame)
      return
    }

    // Older browsers do not expose frame callbacks; the playing event is their best available signal.
    confirmFrame()
  }

  useEffect(() => {
    const video = videoRef.current
    const getUserMedia = navigator.mediaDevices?.getUserMedia
    if (!video || !getUserMedia) {
      setStatus('unavailable')
      return undefined
    }

    let isCurrent = true
    let stream: MediaStream | undefined

    void getUserMedia.call(navigator.mediaDevices, { audio: false, video: { facingMode: 'user' } })
      .then(async (cameraStream) => {
        stream = cameraStream
        if (!isCurrent) {
          cameraStream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = cameraStream
        const videoTracks = cameraStream.getVideoTracks()
        if (!videoTracks.some((track) => track.readyState === 'live')) {
          setStatus('unavailable')
          return
        }

        setDeviceName(videoTracks[0].label || null)
        videoTracks.forEach((track) => {
          track.addEventListener('ended', () => {
            setCameraReady(false)
            setStatus('unavailable')
          })
          track.addEventListener('mute', () => {
            setCameraReady(false)
            setStatus('loadingCamera')
          })
          track.addEventListener('unmute', handlePreviewPlaying)
        })
        video.srcObject = cameraStream
        try {
          await video.play()
        } catch {
          setStatus('unavailable')
        }
      })
      .catch((error: unknown) => {
        if (!isCurrent) return
        setDeviceName(null)
        setStatus(error instanceof DOMException && error.name === 'NotAllowedError' ? 'denied' : 'unavailable')
      })

    return () => {
      isCurrent = false
      video.srcObject = null
      streamRef.current = undefined
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    if (!cameraReady) {
      return undefined
    }

    let isCurrent = true
    const modelUrls = getModelUrls(movementLabel)
    setStatus('loadingModel')
    setModelReady(false)

    void Promise.resolve()
      .then(() => {
        if (!window.tmPose) {
          throw new Error('The local pose runtime is unavailable.')
        }
        return window.tmPose.load(modelUrls.model, modelUrls.metadata)
      })
      .then((model) => {
        if (!isCurrent) {
          model.dispose()
          return
        }
        if (!hasRequiredLabels(model.getClassLabels(), movementLabel)) {
          model.dispose()
          setStatus('invalidModel')
          return
        }
        modelRef.current = model
        setModelReady(true)
        setStatus('ready')
      })
      .catch(() => {
        if (isCurrent) {
          setStatus('modelError')
        }
      })

    return () => {
      isCurrent = false
      modelRef.current?.dispose()
      modelRef.current = undefined
      setModelReady(false)
    }
  }, [cameraReady, movementLabel])

  useEffect(() => {
    if (cameraReady && modelReady && status === 'ready') {
      onRecognitionStatusChange({ kind: 'ready' })
      return
    }

    if (['denied', 'unavailable', 'invalidModel', 'modelError', 'recognitionError'].includes(status)) {
      onRecognitionStatusChange({ kind: 'unavailable', message: getUnavailableMessage(status) })
      return
    }

    onRecognitionStatusChange({ kind: 'checking' })
  }, [cameraReady, modelReady, onRecognitionStatusChange, status])

  const isAvailable = cameraReady && modelReady && status === 'ready'

  useEffect(() => {
    if (!isTracking || !isAvailable) {
      timerRef.current = undefined
      setPhase(null)
      setPrediction(null)
      return undefined
    }

    const video = videoRef.current
    const model = modelRef.current
    if (!video || !model) {
      return undefined
    }

    let frameRequest = 0
    let isCurrent = true
    timerRef.current = createMovementTimer(movementLabel)
    setPhase('waitingForMovement')
    setActiveDurationMs(0)
    onActiveDurationChange(0)

    const recognize = async () => {
      if (!isCurrent) return

      try {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const { posenetOutput } = await model.estimatePose(video, true)
          const predictions = await model.predict(posenetOutput)
          if (!isCurrent) return

          const topPrediction = predictions.reduce((current, next) => (next.probability > current.probability ? next : current))
          const result = timerRef.current?.observe(topPrediction, performance.now())
          if (result) {
            setPrediction(topPrediction.className)
            setPhase(result.phase)
            setActiveDurationMs(result.activeDurationMs)
            onActiveDurationChange(result.activeDurationMs)
            if (result.completed) {
              onComplete()
              return
            }
          }
        }
        frameRequest = window.requestAnimationFrame(() => void recognize())
      } catch {
        if (isCurrent) {
          setStatus('recognitionError')
        }
      }
    }

    frameRequest = window.requestAnimationFrame(() => void recognize())
    return () => {
      isCurrent = false
      window.cancelAnimationFrame(frameRequest)
    }
  }, [isAvailable, isTracking, movementLabel, onActiveDurationChange, onComplete])

  const isReady = status === 'ready'

  return (
    <div className="camera-preview-area">
      <video ref={videoRef} aria-label="Live camera preview" autoPlay muted playsInline onError={() => setStatus('unavailable')} onPlaying={handlePreviewPlaying} />
      <div aria-hidden="true" className="camera-guide" />
      <div aria-live="polite" className={`camera-ready-status${isReady ? '' : ' camera-ready-status-warning'}`} role="status">
        <span aria-hidden="true" className="camera-ready-mark">{isReady ? '✓' : '!'}</span>
        <span>{getStatusMessage(status, deviceName, phase, activeDurationMs, movementLabel, prediction)}</span>
      </div>
    </div>
  )
}
