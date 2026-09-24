import type { CustomPoseNet } from '@teachablemachine/pose'
import { useEffect, useRef, useState } from 'react'
import { drawInferenceFrame, inferenceFrameSize } from '../cameraFrame'
import { createQuizGestureTracker, type QuizChoice } from '../quizRecognition'

type QuizCameraPreviewProps = {
  isActive: boolean
  questionKey: number
  waitForIdle: boolean
  onChoice: (choice: QuizChoice) => void
}

const modelUrls = {
  model: '/models/quiz/model.json',
  metadata: '/models/quiz/metadata.json',
}
const requiredLabels = ['Idle', 'Option A', 'Option B']

export function QuizCameraPreview({ isActive, questionKey, waitForIdle, onChoice }: QuizCameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const modelRef = useRef<CustomPoseNet | null>(null)
  const onChoiceRef = useRef(onChoice)
  const [cameraReady, setCameraReady] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [message, setMessage] = useState('')
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
      setStatus('unavailable')
      setMessage('Camera unavailable. Choose A or B on screen.')
      return
    }
    const confirmFrame = () => {
      if (isTrackLive()) setCameraReady(true)
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
      setStatus('unavailable')
      setMessage('Camera unavailable. Choose A or B on screen.')
      return undefined
    }

    let current = true
    let stream: MediaStream | null = null
    let videoTracks: MediaStreamTrack[] = []
    const handleEnded = () => {
      setCameraReady(false)
      setStatus('unavailable')
      setMessage('Camera disconnected. Choose A or B on screen.')
    }
    const handleMute = () => {
      setCameraReady(false)
      setStatus('unavailable')
      setMessage('Camera paused. Choose A or B on screen.')
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
          setStatus('unavailable')
          setMessage('Camera unavailable. Choose A or B on screen.')
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
          setStatus('unavailable')
          setMessage('Camera unavailable. Choose A or B on screen.')
        }
      })
      .catch(() => {
        if (current) {
          setStatus('unavailable')
          setMessage('Camera permission was not granted. Choose A or B on screen.')
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
    if (!cameraReady) return undefined
    let current = true
    setStatus('loading')
    setModelReady(false)
    void Promise.resolve()
      .then(() => {
        if (!window.tmPose) throw new Error('Pose runtime unavailable')
        return window.tmPose.load(modelUrls.model, modelUrls.metadata)
      })
      .then((model) => {
        if (!current) {
          model.dispose()
          return
        }
        const labels = model.getClassLabels()
        if (labels.length !== requiredLabels.length || !requiredLabels.every((label) => labels.includes(label))) {
          model.dispose()
          setStatus('unavailable')
          setMessage('Quiz gesture model is invalid. Choose A or B on screen.')
          return
        }
        modelRef.current = model
        setModelReady(true)
        setStatus('ready')
      })
      .catch(() => {
        if (current) {
          setStatus('unavailable')
          setMessage('Quiz gesture model could not load. Choose A or B on screen.')
        }
      })

    return () => {
      current = false
      modelRef.current?.dispose()
      modelRef.current = null
      setModelReady(false)
    }
  }, [cameraReady])

  const canRecognize = isActive && cameraReady && modelReady && status === 'ready'
  useEffect(() => {
    setHoldMs(0)
    setWaitingForIdle(waitForIdle)
    if (!canRecognize) return undefined
    const video = videoRef.current
    const model = modelRef.current
    if (!video || !model) return undefined

    let current = true
    let frameRequest = 0
    const canvas = document.createElement('canvas')
    canvas.width = inferenceFrameSize
    canvas.height = inferenceFrameSize
    const tracker = createQuizGestureTracker(waitForIdle)

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
          setStatus('unavailable')
          setMessage('Gesture recognition stopped. Choose A or B on screen.')
        }
      }
    }
    frameRequest = window.requestAnimationFrame(() => void recognize())
    return () => {
      current = false
      window.cancelAnimationFrame(frameRequest)
    }
  }, [canRecognize, questionKey, waitForIdle])

  const statusText = status === 'unavailable'
    ? message
    : status === 'loading'
      ? 'Starting camera and gesture model…'
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
            setStatus('unavailable')
            setMessage('Camera unavailable. Choose A or B on screen.')
          }} onPlaying={handlePlaying} />
          <div aria-hidden="true" className="camera-guide" />
        </div>
      </div>
      <span aria-live="polite" className="screen-reader-only">{statusText}</span>
    </section>
  )
}
