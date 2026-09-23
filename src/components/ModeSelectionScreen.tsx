import { useState } from 'react'

type ModeSelectionScreenProps = {
  onChooseStanding: () => void
}

export function ModeSelectionScreen({ onChooseStanding }: ModeSelectionScreenProps) {
  const [showSeatedNotice, setShowSeatedNotice] = useState(false)

  return (
    <main className="movement-screen mode-selection-screen" aria-labelledby="mode-selection-title">
      <h1 className="mode-selection-title" id="mode-selection-title">Choose how to move</h1>
      <button className="movement-action-card mode-card" type="button" onClick={onChooseStanding}>
        <span className="mode-card-title">Standing</span>
        <img alt="" className="mode-card-illustration" src="/assets/selection-standing.png" />
        <span className="mode-card-action">Choose standing</span>
      </button>
      <button className="movement-camera-card mode-card" type="button" onClick={() => setShowSeatedNotice(true)}>
        <span className="mode-card-title">Seated</span>
        <img alt="" className="mode-card-illustration" src="/assets/selection-seated.png" />
        <span aria-live="polite" className="mode-card-action">{showSeatedNotice ? 'Coming soon' : 'Choose seated'}</span>
      </button>
    </main>
  )
}
