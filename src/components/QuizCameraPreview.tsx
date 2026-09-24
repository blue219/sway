import type { CustomPoseNet } from '@teachablemachine/pose'
import { useEffect, useRef, useState } from 'react'
import { drawInferenceFrame, inferenceFrameSize } from '../cameraFrame'
import { disposePoseModel } from '../poseModel'
import { createQuizGestureTracker, type QuizChoice } from '../quizRecognition'

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

export function QuizCameraPreview({ isActive, isPaused = false, questionKey, waitForIdle, onChoice }: QuizCameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const modelRef = useRef<CustomPoseNet | null>(null)
  const onChoiceRef = useRef(onChoice)
  const trackerRef = useRef<ReturnType<typeof createQuizGestureTracker> | null>(null)
  const trackerKeyRef = useRef('')
  const [cameraReady, setCameraReady] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [modelError, setModelError] = useState('')
  const [holdMs, setHoldMs] = useState(0)
  const [waitingForIdle, setWaitingForIdle] = useState(waitForIdle)
  onChoiceRef.current = onChoice

  function isTrackLive() {
    return streamRef.current?.getVideoTracks().some((track) => track.readyState === 'live' && track.enabled && !track.muted) ?? false
  }

  function handlePlaying() {
    const video = videoRef.current
    if (!video || !isTrackLive()) {
      setCameraReady(false)
      setCameraError('Camera unavailable. Choose A or B on screen.')
      return
    }
    const confirmFrame = () => {
      if (isTrackLive()) {
        setCameraReady(true)
        setCameraError('')
      }
    }
    if (typeof video.requestVideoFrameCallback === 'function') {
      video.requestVideoFrameCallback(confirmFrame)
    } else {
      confirmFrame()
    }
  }

  useEffect(() => {
    const video = videoRef.current
    const getUserMedia = navigator.mediaDevices?.getUserMedia
    if (!video || !getUserMedia) {
      setCameraError('Camera unavailable. Choose A or B on screen.')
      return undefined
    }

    let current = true
    let stream: MediaStream | null = null
    let videoTracks: MediaStreamTrack[] = []
    const handleEnded = () => {
      setCameraReady(false)
      setCameraError('Camera disconnected. Choose A or B on screen.')
    }
    const handleMute = () => {
      setCameraReady(false)
      setCameraError('Camera paused. Choose A or B on screen.')
    }
    void getUserMedia.call(navigator.mediaDevices, { audio: false, video: { facingMode: 'user' } })
      .then(async (cameraStream) => {
        stream = cameraStream
        if (!current) {
          cameraStream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = cameraStream
        videoTracks = cameraStream.getVideoTracks()
        if (!videoTracks.some((track) => track.readyState === 'live')) {
          setCameraError('Camera unavailable. Choose A or B on screen.')
          return
        }
        videoTracks.forEach((track) => {
          track.addEventListener('ended', handleEnded)
          track.addEventListener('mute', handleMute)
          track.addEventListener('unmute', handlePlaying)
        })
        video.srcObject = cameraStream
        try {
          await video.play()
        } catch {
          setCameraError('Camera unavailable. Choose A or B on screen.')
        }
      })
      .catch(() => {
        if (current) {
          setCameraError('Camera permission was not granted. Choose A or B on screen.')
        }
      })

    return () => {
      current = false
      videoTracks.forEach((track) => {
        track.removeEventListener('ended', handleEnded)
        track.removeEventListener('mute', handleMute)
        track.removeEventListener('unmute', handlePlaying)
      })
      video.srcObject = null
      streamRef.current = null
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    let current = true
    setModelError('')
    setModelReady(false)
    void Promise.resolve()
      .then(() => {
        if (!current) return undefined
        if (!window.tmPose) throw new Error('Pose runtime unavailable')
        return window.tmPose.load(modelUrls.model, modelUrls.metadata)
      })
      .then((model) => {
        if (!model) return
        if (!current) {
          disposePoseModel(model)
          return
        }
        const labels = model.getClassLabels()
        if (labels.length !== requiredLabels.length || !requiredLabels.every((label) => labels.includes(label))) {
          disposePoseModel(model)
          setModelError('Quiz gesture model is invalid. Choose A or B on screen.')
          return
        }
        modelRef.current = model
        setModelReady(true)
      })
      .catch(() => {
        if (current) {
          setModelError('Quiz gesture model could not load. Choose A or B on screen.')
        }
      })

    return () => {
      current = false
      if (modelRef.current) disposePoseModel(modelRef.current)
      modelRef.current = null
      setModelReady(false)
    }
  }, [])

  const status = cameraError || modelError ? 'unavailable' : cameraReady && modelReady ? 'ready' : 'loading'
  const message = cameraError || modelError
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
          setModelError('Gesture recognition stopped. Choose A or B on screen.')
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
          <video ref={videoRef} aria-label="Live quiz camera preview" autoPlay muted playsInline onError={() => {
            setCameraReady(false)
            setCameraError('Camera unavailable. Choose A or B on screen.')
          }} onPlaying={handlePlaying} />
          <div aria-hidden="true" className="camera-guide" />
        </div>
      </div>
      <span aria-live="polite" className="screen-reader-only">{statusText}</span>
    </section>
  )
}
