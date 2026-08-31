import { Button, Icon } from 'animal-island-ui'
import type { Movement } from '../game'
import { MovementVideo } from './MovementVideo'

type MovementScreenProps = {
  movement: Movement
  isHolding: boolean
  isPaused: boolean
  secondsRemaining: number
  onPause: () => void
  onStart: () => void
}

export function MovementScreen({
  movement,
  isHolding,
  isPaused,
  secondsRemaining,
  onPause,
  onStart,
}: MovementScreenProps) {
  const seconds = isHolding ? secondsRemaining : 5

  return (
    <main className="movement-screen" aria-labelledby="movement-title">
      <section className="movement-command-card">
        <div className="movement-introduction">
          <h1 id="movement-title">{movement.title}</h1>
          <span aria-hidden="true" className="movement-accent" />
          <p>March in place</p>
        </div>
        <div aria-live="polite" className="movement-countdown">
          <strong>{seconds}</strong>
          <span>seconds left</span>
        </div>
        <div className="movement-controls">
          <div className="recognition-status">
            <span aria-hidden="true" className="recognition-dot" />
            <div>
              <strong>Recognition Success</strong>
              <span>Camera Ready</span>
            </div>
            <span aria-label="Movement 1 of 5" className="movement-index">1 / 5</span>
          </div>
          <Button className="start-movement-button" disabled={isHolding} htmlType="button" size="large" type="primary" onClick={onStart}>
            {isHolding ? 'Holding' : 'Start'}
          </Button>
          <Button className="pause-movement-button" htmlType="button" size="middle" type="text" onClick={onPause}>
            Pause
          </Button>
        </div>
      </section>
      <section className="movement-preview-card" aria-label="Movement demonstration and camera preview">
        <div className="movement-video-panel">
          <MovementVideo isPaused={isPaused} label={`An older adult demonstrating ${movement.title.toLowerCase()}`} src={movement.videoSrc} />
        </div>
        <div className="camera-preview-panel">
          <img alt="A bright living room prepared for movement detection" src="/assets/camera-preview-living-room.png" />
          <div className="camera-preview-label">
            <Icon aria-hidden="true" name="icon-camera" size={24} />
            <span>Camera Preview</span>
          </div>
          <div aria-hidden="true" className="camera-guide" />
          <div className="camera-ready-status">
            <span aria-hidden="true" className="camera-ready-mark">✓</span>
            <span>Ready to detect movement</span>
          </div>
        </div>
      </section>
    </main>
  )
}
