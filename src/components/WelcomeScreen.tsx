import { Button } from 'animal-island-ui'

type WelcomeScreenProps = {
  onStart: () => void
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <main className="welcome-screen" aria-label="Welcome">
      <div className="movement-action-card welcome-card">
        <div className="welcome-demonstration">
          <h1 className="welcome-instruction">Move along with the character</h1>
          <img className="welcome-illustration" src="/assets/selection-standing.webp" alt="A standing older adult" />
        </div>
        <Button className="welcome-start-button primary-action" htmlType="button" size="large" type="primary" onClick={onStart}>Start</Button>
        <p className="welcome-privacy">Camera footage is not recorded or stored</p>
      </div>
    </main>
  )
}
