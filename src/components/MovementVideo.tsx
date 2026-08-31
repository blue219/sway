import { useEffect, useRef } from 'react'

type MovementVideoProps = {
  isPaused: boolean
  label: string
  src: string
}

export function MovementVideo({ isPaused, label, src }: MovementVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isPaused) {
      video.pause()
      return
    }

    const playPromise = video.play()
    if (playPromise) {
      void playPromise.catch(() => {
        // Autoplay can be blocked until the participant starts the movement.
      })
    }
  }, [isPaused])

  return <video ref={videoRef} aria-label={label} autoPlay loop muted playsInline preload="metadata" src={src} />
}
