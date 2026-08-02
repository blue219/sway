import { Button, Card } from 'animal-island-ui'
import type { Movement, PlayMode } from '../game'

type MovementScreenProps = {
  mode: PlayMode
  movement: Movement
  movementIndex: number
  isHolding: boolean
  secondsRemaining: number
  onNext: () => void
  onPause: () => void
  onStart: () => void
}

export function MovementScreen({
  mode,
  movement,
  movementIndex,
  isHolding,
  secondsRemaining,
  onNext,
  onPause,
  onStart,
}: MovementScreenProps) {
  const isComplete = isHolding && secondsRemaining === 0
  const figure = mode === 'seated' ? '/assets/seated-raise.png' : '/assets/standing-raise.png'

  return (
    <main className="screen movement-screen">
      <Card className="movement-card" color="app-blue" pattern="app-blue" aria-labelledby="movement-title">
        <div className="movement-copy">
          <p className="movement-count">Movement {movementIndex + 1} of 5</p>
          <h1 id="movement-title">{movement.title}</h1>
          <p className="guidance">{movement.guidance}</p>
          <p className="comfortable-note">Move in your own comfortable way.</p>
        </div>
        <div className="movement-demo">
          <img alt={`An older adult demonstrating ${movement.title.toLowerCase()}`} src={figure} />
          <div aria-live="polite" className={isComplete ? 'countdown is-complete' : 'countdown'}>
            {isComplete ? (
              <>
                <strong>✓</strong>
                <span>Movement complete</span>
              </>
            ) : (
              <>
                <strong>{isHolding ? secondsRemaining : 4}</strong>
                <span>Hold for {isHolding ? secondsRemaining : 4} seconds</span>
              </>
            )}
          </div>
        </div>
        <div className="movement-actions">
          {isComplete ? (
            <Button className="primary-action" htmlType="button" size="large" type="primary" onClick={onNext}>
              Next movement
            </Button>
          ) : (
            <Button className="primary-action" disabled={isHolding} htmlType="button" size="large" type="primary" onClick={onStart}>
              I’m ready
            </Button>
          )}
          <Button className="secondary-action" htmlType="button" size="large" onClick={onPause}>
            Pause
          </Button>
        </div>
      </Card>
      <Card className="quiz-preview" color="app-yellow" pattern="app-yellow">
        <img alt="A tūī bird, the next quiz subject" src="/assets/tui.png" />
        <div>
          <h2>Quiz unlocks after your movement round</h2>
          <p>One question, just for fun.</p>
        </div>
      </Card>
    </main>
  )
}
