import { useEffect, useRef, useState } from 'react'
import { drawInferenceFrame, inferenceFrameSize } from '../cameraFrame'
import { usePoseCamera, type PoseCameraStatus } from '../usePoseCamera'
import { createQuizGestureTracker, type QuizChoice } from '../quizRecognition'
import { usePoseModel } from '../usePoseModel'
import { formatBilingual, instructions } from '../bilingual'
import { BilingualText } from './BilingualText'

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
    case 'denied': return instructions.quiz.cameraPermissionDenied
    case 'disconnected': return instructions.quiz.cameraDisconnected
    case 'paused': return instructions.quiz.cameraPaused
    case 'unavailable': return instructions.quiz.cameraUnavailable
    default: return null
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
  const modelMessage = modelStatus === 'invalid'
    ? instructions.quiz.modelInvalid
    : modelStatus === 'error'
      ? instructions.quiz.modelError
      : recognitionError
        ? instructions.quiz.recognitionStopped
        : null
  const messageEntry = cameraMessage || modelMessage
  const status = messageEntry ? 'unavailable' : cameraStatus === 'ready' && modelStatus === 'ready' ? 'ready' : 'loading'
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

  const statusEntry = status === 'unavailable'
    ? messageEntry
    : status === 'loading'
      ? instructions.quiz.starting
      : isPaused
        ? instructions.quiz.pausedRecords
      : !isActive
        ? instructions.quiz.pausedGuide
        : waitingForIdle
          ? instructions.quiz.lowerHand
          : null

  const statusText = statusEntry ? formatBilingual(statusEntry) : ''

  return (
    <section aria-label="Quiz camera preview" className="movement-camera-card">
      <div className="movement-camera-heading">
        <div aria-live="polite" className="movement-progress">
          {canRecognize && isActive ? <span aria-label={holdMs > 0 ? 'Gesture recognised' : 'Gesture not recognised'} className={`movement-recognition-indicator${holdMs > 0 ? ' movement-recognition-indicator-success' : ''}`}>{holdMs > 0 ? '✓' : '×'}</span> : null}
          <span><BilingualText entry={instructions.movement.hold} /></span>
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
