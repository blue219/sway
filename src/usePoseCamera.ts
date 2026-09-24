import { useCallback, useEffect, useRef, useState } from 'react'

export type PoseCameraStatus = 'loading' | 'ready' | 'denied' | 'unavailable' | 'disconnected' | 'paused'

export function usePoseCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<PoseCameraStatus>('loading')

  const isTrackLive = useCallback(() =>
    streamRef.current?.getVideoTracks().some((track) => track.readyState === 'live' && track.enabled && !track.muted) ?? false, [])

  const handlePlaying = useCallback(() => {
    const video = videoRef.current
    if (!video || !isTrackLive()) {
      setStatus('unavailable')
      return
    }

    const confirmFrame = () => setStatus(isTrackLive() ? 'ready' : 'unavailable')
    if (typeof video.requestVideoFrameCallback === 'function') {
      video.requestVideoFrameCallback(confirmFrame)
    } else {
      // The playing event is the best available signal in older browsers.
      confirmFrame()
    }
  }, [isTrackLive])

  useEffect(() => {
    const video = videoRef.current
    const getUserMedia = navigator.mediaDevices?.getUserMedia
    if (!video || !getUserMedia) {
      setStatus('unavailable')
      return undefined
    }

    let current = true
    let stream: MediaStream | null = null
    let videoTracks: MediaStreamTrack[] = []
    const handleEnded = () => setStatus('disconnected')
    const handleMute = () => setStatus('paused')

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
          if (current) setStatus('unavailable')
        }
      })
      .catch((error: unknown) => {
        if (current) setStatus(error instanceof DOMException && error.name === 'NotAllowedError' ? 'denied' : 'unavailable')
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
  }, [handlePlaying])

  return { videoRef, status, handlePlaying, onVideoError: () => setStatus('unavailable') }
}
