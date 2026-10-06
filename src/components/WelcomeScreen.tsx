import { Button } from 'animal-island-ui'
import { instructions } from '../bilingual'
import { BilingualText } from './BilingualText'

type WelcomeScreenProps = {
  onStart: () => void
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <main className="welcome-screen" aria-label="Welcome">
      <div className="movement-action-card welcome-card">
        <div className="welcome-demonstration">
          <h1 className="welcome-instruction">
            <BilingualText entry={instructions.welcome.instruction} />
          </h1>
          <img className="welcome-illustration" src="/assets/selection-standing.webp" alt="A standing older adult" />
        </div>
        <Button className="welcome-start-button primary-action" htmlType="button" size="large" type="primary" onClick={onStart}>
          <BilingualText entry={instructions.welcome.start} />
        </Button>
        <p className="welcome-privacy">
          <BilingualText entry={instructions.welcome.privacy} />
        </p>
      </div>
    </main>
  )
}
