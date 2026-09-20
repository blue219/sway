import { useEffect, useRef } from 'react'

type MovementVideoProps = {
  label: string
  playRequest: number
  src: string
}

export function MovementVideo({ label, playRequest, src }: MovementVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || playRequest === 0) return

    video.pause()
    video.currentTime = 0
    const playPromise = video.play()
    if (playPromise) {
      void playPromise.catch(() => {
        // Playback can be blocked by the browser; avoid an unhandled rejection.
      })
    }
  }, [playRequest])

  return <video ref={videoRef} aria-label={label} loop muted playsInline preload="auto" src={src} />
}
