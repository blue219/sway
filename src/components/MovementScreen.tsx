import { Button, Card } from 'animal-island-ui'
import type { Movement } from '../game'
import { StandingMarchCharacter } from './StandingMarchCharacter'

type MovementScreenProps = {
  currentMovement: number
  movement: Movement
  totalMovements: number
  isHolding: boolean
  secondsRemaining: number
  onPause: () => void
  onStart: () => void
}

export function MovementScreen({
  currentMovement,
  movement,
  totalMovements,
  isHolding,
  secondsRemaining,
  onPause,
  onStart,
}: MovementScreenProps) {
  return (
    <main className="screen movement-screen">
      <Card className="movement-card" color="app-blue" pattern="app-blue" aria-labelledby="movement-title">
        <div aria-label={`Movement ${currentMovement} of ${totalMovements}`} className="movement-progress">
          <span aria-hidden="true" className="movement-progress-icon" />
          <strong>{currentMovement} of {totalMovements}</strong>
        </div>
        <div className="movement-copy">
          <h1 id="movement-title">{movement.title}</h1>
        </div>
        <div className="movement-figure">
          <StandingMarchCharacter label={`An older adult demonstrating ${movement.title.toLowerCase()}`} />
        </div>
        <div aria-live="polite" className="countdown">
          <strong>{isHolding ? secondsRemaining : 5}</strong>
          <span>Hold for {isHolding ? secondsRemaining : 5} seconds</span>
        </div>
        <div className="movement-actions">
          <Button className="primary-action" disabled={isHolding} htmlType="button" size="large" type="primary" onClick={onStart}>
            {isHolding ? 'Holding' : 'Start'}
          </Button>
          <Button className="secondary-action" htmlType="button" size="large" onClick={onPause}>
            Pause
          </Button>
        </div>
      </Card>
    </main>
  )
}
