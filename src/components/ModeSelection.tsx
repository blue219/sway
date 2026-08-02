import { Button, Card } from 'animal-island-ui'
import type { PlayMode } from '../game'

type ModeSelectionProps = {
  onSelect: (mode: PlayMode) => void
}

export function ModeSelection({ onSelect }: ModeSelectionProps) {
  return (
    <main className="screen mode-screen">
      <section className="welcome-copy" aria-labelledby="mode-title">
        <h1 id="mode-title">Choose a play mode</h1>
        <p>Take part in the way that feels right for you today.</p>
      </section>
      <div className="mode-options">
        <Card className="mode-card" color="app-green" pattern="app-green">
          <div className="mode-illustration">
            <img alt="An older adult demonstrating a seated movement" src="/assets/seated-sky-reach.png" />
          </div>
          <h2>Seated mode</h2>
          <p>Gentle movements with a chair.</p>
          <Button block className="primary-action" htmlType="button" size="large" type="primary" onClick={() => onSelect('seated')}>
            Seated mode
          </Button>
        </Card>
        <Card className="mode-card" color="app-yellow" pattern="app-yellow">
          <div className="mode-illustration">
            <img alt="An older adult demonstrating a standing high-knee march" src="/assets/standing-high-knee.png" />
          </div>
          <h2>Standing mode</h2>
          <p>Dynamic, no-equipment movements to build your challenge.</p>
          <Button block className="primary-action" htmlType="button" size="large" type="primary" onClick={() => onSelect('standing')}>
            Standing mode
          </Button>
        </Card>
      </div>
      <p className="safety-note">Move in your own comfortable way. You can pause at any time.</p>
    </main>
  )
}
