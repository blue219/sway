import { Button } from 'animal-island-ui'
import { requiredMovementDurationMs } from '../poseRecognition'
import { useState } from 'react'
import type { RecognitionStatus } from './CameraPreview'
import type { Movement } from '../game'
import { CameraPreview } from './CameraPreview'
import { MovementVideo } from './MovementVideo'

type MovementScreenProps = {
  currentMovement: number
  isCountingDown: boolean
  isTracking: boolean
  isWaitingForRecognition: boolean
  movement: Movement
  usePoseRecognition: boolean
  activeDurationMs: number
  secondsRemaining: number
  totalMovements: number
  playRequest: number
  onRecognitionComplete: () => void
  onRecognitionStatusChange: (recognitionStatus: RecognitionStatus) => void
  onActiveDurationChange: (activeDurationMs: number) => void
  onSkip: () => void
  onStart: () => void
}

export function MovementScreen({
  currentMovement,
  isCountingDown,
  isTracking,
  isWaitingForRecognition,
  movement,
  usePoseRecognition,
  activeDurationMs,
  secondsRemaining,
  totalMovements,
  playRequest,
  onRecognitionComplete,
  onRecognitionStatusChange,
  onActiveDurationChange,
  onSkip,
  onStart,
}: MovementScreenProps) {
  const [isMovementRecognised, setIsMovementRecognised] = useState<boolean | null>(null)
  const progressLabel = isCountingDown ? 'Next movement in' : usePoseRecognition ? 'Hold' : ''
  const progressValue = isCountingDown
    ? `${secondsRemaining} s`
    : usePoseRecognition
      ? `${(activeDurationMs / 1_000).toFixed(1)}/${requiredMovementDurationMs / 1_000} S`
      : ''

  return (
    <main className="movement-screen" aria-labelledby="movement-title">
      <section className="movement-action-card">
        <div className="movement-card-heading">
          <img alt="" className="movement-action-icon" src="/assets/movement-activity-icon.png" />
          <div className="movement-introduction">
            <h1 id="movement-title">{movement.title}</h1>
          </div>
          <div className="movement-action-controls">
            <span aria-label={`Movement ${currentMovement} of ${totalMovements}`} className="movement-index">
              {currentMovement}/{totalMovements}
            </span>
            <Button className="start-movement-button" disabled={isTracking || isWaitingForRecognition || isCountingDown} htmlType="button" size="large" type="primary" onClick={onStart}>
              Start
            </Button>
            <Button className="skip-movement-button" htmlType="button" size="large" type="default" onClick={onSkip}>
              Skip
            </Button>
          </div>
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
      <section className="movement-camera-card" aria-label={usePoseRecognition ? 'Movement camera preview' : isCountingDown ? 'Movement timer' : 'Pose model pending'}>
        <div className="movement-camera-heading">
          {usePoseRecognition || isCountingDown ? (
            <div className="movement-progress" aria-live="polite">
              {isTracking && isMovementRecognised !== null ? <span aria-label={isMovementRecognised ? 'Movement recognised' : 'Movement not recognised'} className={`movement-recognition-indicator${isMovementRecognised ? ' movement-recognition-indicator-success' : ''}`}>{isMovementRecognised ? '✓' : '×'}</span> : null}
              <span>{progressLabel}</span>
              <strong>{progressValue}</strong>
            </div>
          ) : null}
        </div>
        <div className="camera-preview-panel">
          {usePoseRecognition ? (
            <CameraPreview
              isTracking={isTracking}
              movementLabel={movement.title}
              onComplete={onRecognitionComplete}
              onRecognitionStateChange={setIsMovementRecognised}
              onRecognitionStatusChange={onRecognitionStatusChange}
              onActiveDurationChange={onActiveDurationChange}
            />
          ) : (
            <div aria-label={isCountingDown ? 'Timer mode' : 'Pose model not connected yet'} className="camera-preview-area movement-model-placeholder">
              {isCountingDown ? 'Timer mode' : 'Model coming soon'}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
