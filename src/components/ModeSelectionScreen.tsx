type ModeSelectionScreenProps = {
  onChooseStanding: () => void
  onChooseSeated: () => void
}

export function ModeSelectionScreen({ onChooseStanding, onChooseSeated }: ModeSelectionScreenProps) {
  return (
    <main className="movement-screen mode-selection-screen" aria-labelledby="mode-selection-title">
      <h1 className="mode-selection-title" id="mode-selection-title">Choose how to move</h1>
      <button className="movement-action-card mode-card" type="button" onClick={onChooseStanding}>
        <span className="mode-card-title">Standing</span>
        <img alt="" className="mode-card-illustration" src="/assets/selection-standing.webp" />
        <span className="mode-card-action">Choose standing</span>
      </button>
      <button className="movement-camera-card mode-card" type="button" onClick={onChooseSeated}>
        <span className="mode-card-title">Seated</span>
        <img alt="" className="mode-card-illustration" src="/assets/selection-seated.webp" />
        <span className="mode-card-action">Choose seated</span>
      </button>
    </main>
  )
}
