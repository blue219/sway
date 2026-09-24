import { useEffect, useRef, useState } from 'react'
import { drawInferenceFrame, inferenceFrameSize } from '../cameraFrame'
import { usePoseCamera, type PoseCameraStatus } from '../usePoseCamera'
import { createQuizGestureTracker, type QuizChoice } from '../quizRecognition'
import { usePoseModel } from '../usePoseModel'

type QuizCameraPreviewProps = {
  isActive: boolean
  isPaused?: boolean
  questionKey: number
  waitForIdle: boolean
  onChoice: (choice: QuizChoice) => void
}

const modelUrls = {
  model: '/models/quiz/model.json',
  metadata: '/models/quiz/metadata.json',
}
const requiredLabels = ['Idle', 'Option A', 'Option B']
const hasRequiredLabels = (labels: string[]) => labels.length === requiredLabels.length && requiredLabels.every((label) => labels.includes(label))

function getCameraMessage(status: PoseCameraStatus) {
  switch (status) {
    case 'denied': return 'Camera permission was not granted. Choose A or B on screen.'
    case 'disconnected': return 'Camera disconnected. Choose A or B on screen.'
    case 'paused': return 'Camera paused. Choose A or B on screen.'
    case 'unavailable': return 'Camera unavailable. Choose A or B on screen.'
    default: return ''
  }
}

export function QuizCameraPreview({ isActive, isPaused = false, questionKey, waitForIdle, onChoice }: QuizCameraPreviewProps) {
  const { videoRef, status: cameraStatus, handlePlaying, onVideoError } = usePoseCamera()
  const { modelRef, status: modelStatus } = usePoseModel(modelUrls.model, modelUrls.metadata, hasRequiredLabels)
  const onChoiceRef = useRef(onChoice)
  const trackerRef = useRef<ReturnType<typeof createQuizGestureTracker> | null>(null)
  const trackerKeyRef = useRef('')
  const [recognitionError, setRecognitionError] = useState(false)
  const [holdMs, setHoldMs] = useState(0)
  const [waitingForIdle, setWaitingForIdle] = useState(waitForIdle)
  onChoiceRef.current = onChoice
  const cameraMessage = getCameraMessage(cameraStatus)
  const modelMessage = modelStatus === 'invalid' ? 'Quiz gesture model is invalid. Choose A or B on screen.'
    : modelStatus === 'error' ? 'Quiz gesture model could not load. Choose A or B on screen.'
      : recognitionError ? 'Gesture recognition stopped. Choose A or B on screen.' : ''
  const status = cameraMessage || modelMessage ? 'unavailable' : cameraStatus === 'ready' && modelStatus === 'ready' ? 'ready' : 'loading'
  const message = cameraMessage || modelMessage
  const canRecognize = isActive && !isPaused && status === 'ready'
  useEffect(() => {
    if (!isActive) {
      trackerRef.current = null
      setHoldMs(0)
      setWaitingForIdle(waitForIdle)
      return undefined
    }

    const trackerKey = `${questionKey}:${waitForIdle}`
    if (!trackerRef.current || trackerKeyRef.current !== trackerKey) {
      trackerRef.current = createQuizGestureTracker(waitForIdle)
      trackerKeyRef.current = trackerKey
      setHoldMs(0)
      setWaitingForIdle(waitForIdle)
    }
    if (!canRecognize) return undefined
    const video = videoRef.current
    const model = modelRef.current
    if (!video || !model) return undefined

    let current = true
    let frameRequest = 0
    const canvas = document.createElement('canvas')
    canvas.width = inferenceFrameSize
    canvas.height = inferenceFrameSize
    const tracker = trackerRef.current

    const recognize = async () => {
      if (!current) return
      try {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && drawInferenceFrame(video, canvas)) {
          const { posenetOutput } = await model.estimatePose(canvas)
          const predictions = await model.predict(posenetOutput)
          if (!current) return
          const topPrediction = predictions.reduce((best, next) => next.probability > best.probability ? next : best)
          const result = tracker.observe(topPrediction, performance.now())
          setHoldMs(result.holdMs)
          setWaitingForIdle(result.waitingForIdle)
          if (result.choice) {
            onChoiceRef.current(result.choice)
            return
          }
        }
        frameRequest = window.requestAnimationFrame(() => void recognize())
      } catch {
        if (current) {
          setRecognitionError(true)
        }
      }
    }
    frameRequest = window.requestAnimationFrame(() => void recognize())
    return () => {
      current = false
      window.cancelAnimationFrame(frameRequest)
    }
  }, [canRecognize, isActive, questionKey, waitForIdle])

  const statusText = status === 'unavailable'
    ? message
    : status === 'loading'
      ? 'Starting camera and gesture model…'
      : isPaused
        ? 'Hand choices are paused while viewing records.'
      : !isActive
        ? 'Hand choices pause while the guide or answer is shown.'
        : waitingForIdle
          ? 'Lower your hand to choose again.'
          : ''

  return (
    <section aria-label="Quiz camera preview" className="movement-camera-card">
      <div className="movement-camera-heading">
        <div aria-live="polite" className="movement-progress">
          {canRecognize && isActive ? <span aria-label={holdMs > 0 ? 'Gesture recognised' : 'Gesture not recognised'} className={`movement-recognition-indicator${holdMs > 0 ? ' movement-recognition-indicator-success' : ''}`}>{holdMs > 0 ? '✓' : '×'}</span> : null}
          <span>Hold</span>
          <strong>{(holdMs / 1_000).toFixed(1)}/2 S</strong>
        </div>
      </div>
      <div className="camera-preview-panel">
        <div className="camera-preview-area">
          <video ref={videoRef} aria-label="Live quiz camera preview" autoPlay muted playsInline onError={onVideoError} onPlaying={handlePlaying} />
          <div aria-hidden="true" className="camera-guide" />
        </div>
      </div>
      <span aria-live="polite" className="screen-reader-only">{statusText}</span>
    </section>
  )
}
