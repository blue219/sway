import { Button, Card, Progress } from 'animal-island-ui'
import type { ReactNode } from 'react'
import type { TreeStage } from '../game'

type AppHeaderProps = {
  canGoBack: boolean
  onGoBack: () => void
  onGoHome: () => void
  onOpenRecords: () => void
  points: number
  treeStage: TreeStage
  roundPreview?: ReactNode
}

export function AppHeader({ canGoBack, onGoBack, onGoHome, onOpenRecords, points, treeStage, roundPreview }: AppHeaderProps) {
  const progress = Math.min(100, (points / 250) * 100)

  return (
    <header className="app-header">
      <div className="header-navigation">
        {canGoBack ? <Button className="header-back-button" htmlType="button" size="large" type="default" onClick={onGoBack}>Go back</Button> : null}
        <button aria-label="Return to start screen" className="brand brand-home" type="button" onClick={onGoHome}>
          <svg aria-hidden="true" className="brand-mark" viewBox="0 0 48 48">
            <path d="M24 42C10 35 8 21 16 9c8 2 14 8 14 16 0 7-3 12-6 17Z" fill="currentColor" />
            <path d="M28 39c1-13 7-22 16-26 2 12-3 23-16 26Z" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M12 31c8-1 15 2 20 9" fill="none" stroke="#f8f0de" strokeLinecap="round" strokeWidth="3" />
          </svg>
          <span>Whakakori Together</span>
        </button>
      </div>
      {roundPreview ? <div className="header-round-preview">{roundPreview}</div> : null}
      <button className="header-records-link" type="button" onClick={onOpenRecords}>Records</button>
      <div className="header-status" aria-label={`${points} Wellbeing Points, ${treeStage.name}`}>
        <Card className="status-card" color="app-yellow">
          <span className="status-label">Wellbeing Points</span>
          <strong>{points}</strong>
        </Card>
        <Card className="status-card tree-status" color="app-teal">
          <span className="status-label">{treeStage.name}</span>
          <Progress aria-label={`Tree growth: ${treeStage.name}`} percent={progress} showInfo={false} size="small" />
        </Card>
      </div>
    </header>
  )
}
