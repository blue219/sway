import { Button } from 'animal-island-ui'
import type { RecognitionStatus } from './CameraPreview'
import type { Movement } from '../game'
import { CameraPreview } from './CameraPreview'
import { MovementVideo } from './MovementVideo'

type MovementScreenProps = {
  currentMovement: number
  fallbackTimerEnabled: boolean
  isCountingDown: boolean
  isTracking: boolean
  isWaitingForRecognition: boolean
  movement: Movement
  activeDurationMs: number
  secondsRemaining: number
  totalMovements: number
  playRequest: number
  onRecognitionComplete: () => void
  onRecognitionStatusChange: (recognitionStatus: RecognitionStatus) => void
  onActiveDurationChange: (activeDurationMs: number) => void
  onStart: () => void
}

export function MovementScreen({
  currentMovement,
  fallbackTimerEnabled,
  isCountingDown,
  isTracking,
  isWaitingForRecognition,
  movement,
  activeDurationMs,
  secondsRemaining,
  totalMovements,
  playRequest,
  onRecognitionComplete,
  onRecognitionStatusChange,
  onActiveDurationChange,
  onStart,
}: MovementScreenProps) {
  const statusLabel = isCountingDown
    ? fallbackTimerEnabled ? 'Timer mode' : 'Movement complete'
    : isTracking ? 'Recognizing movement'
    : isWaitingForRecognition ? 'Checking pose recognition'
    : 'Movement ready'

  return (
    <main className="movement-screen" aria-labelledby="movement-title">
      <section className="movement-action-card">
        <div className="movement-card-heading">
          <img alt="" className="movement-action-icon" src="/assets/movement-activity-icon.png" />
          <div className="movement-introduction">
            <h1 id="movement-title">{movement.title}</h1>
          </div>
          <span aria-label={`Movement ${currentMovement} of ${totalMovements}`} className="movement-index">
            {currentMovement}/{totalMovements}
          </span>
        </div>
        <div className="movement-video-panel">
          <div className="movement-video-frame">
            {isCountingDown ? (
              <div aria-label={`${secondsRemaining} seconds remaining`} aria-live="polite" className="movement-countdown">
                <strong>{secondsRemaining}</strong>
              </div>
            ) : null}
            <MovementVideo key={movement.videoSrc} label={`An older adult demonstrating ${movement.title.toLowerCase()}`} playRequest={playRequest} src={movement.videoSrc} />
          </div>
        </div>
      </section>
      <section className="movement-camera-card" aria-label="Movement camera preview">
        <div className="movement-camera-heading">
          <div>
            <h2>{statusLabel}</h2>
            <p className="movement-repetition-count" aria-live="polite">{(activeDurationMs / 1_000).toFixed(1)} / 5.0 seconds recognised</p>
          </div>
          <Button className="start-movement-button" disabled={isTracking || isWaitingForRecognition || isCountingDown} htmlType="button" size="large" type="primary" onClick={onStart}>
            Start
          </Button>
        </div>
        <div className="camera-preview-panel">
          <CameraPreview
            isTracking={isTracking}
            movementLabel={movement.title}
            onComplete={onRecognitionComplete}
            onRecognitionStatusChange={onRecognitionStatusChange}
            onActiveDurationChange={onActiveDurationChange}
          />
        </div>
      </section>
    </main>
  )
}
