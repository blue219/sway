import { useEffect, useRef, useState } from 'react'

type CameraStatus = 'loading' | 'ready' | 'unavailable' | 'denied'

function getStatusMessage(status: CameraStatus, deviceName: string | null) {
  switch (status) {
    case 'ready':
      return deviceName ? `Camera ready: ${deviceName}` : 'Camera ready'
    case 'denied':
      return 'Camera permission was not granted'
    case 'unavailable':
      return 'Camera is unavailable'
    default:
      return 'Starting camera preview…'
  }
}

export function CameraPreview() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | undefined>(undefined)
  const [status, setStatus] = useState<CameraStatus>('loading')
  const [deviceName, setDeviceName] = useState<string | null>(null)

  function isVideoTrackLive() {
    return streamRef.current?.getVideoTracks().some((track) => track.readyState === 'live' && track.enabled && !track.muted) ?? false
  }

  function handlePreviewPlaying() {
    const video = videoRef.current
    if (!video || !isVideoTrackLive()) {
      setStatus('unavailable')
      return
    }

    const confirmFrame = () => setStatus(isVideoTrackLive() ? 'ready' : 'unavailable')
    if ('requestVideoFrameCallback' in video) {
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
          track.addEventListener('ended', () => setStatus('unavailable'))
          track.addEventListener('mute', () => setStatus('loading'))
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

  const isReady = status === 'ready'

  return (
    <div className="camera-preview-area">
      <video ref={videoRef} aria-label="Live camera preview" autoPlay muted playsInline onError={() => setStatus('unavailable')} onPlaying={handlePreviewPlaying} />
      <div aria-hidden="true" className="camera-guide" />
      <div aria-live="polite" className={`camera-ready-status${isReady ? '' : ' camera-ready-status-warning'}`}>
        <span aria-hidden="true" className="camera-ready-mark">{isReady ? '✓' : '!'}</span>
        <span>{getStatusMessage(status, deviceName)}</span>
      </div>
    </div>
  )
}
