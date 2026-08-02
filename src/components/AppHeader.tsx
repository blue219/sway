import { Card, Progress } from 'animal-island-ui'
import type { TreeStage } from '../game'

type AppHeaderProps = {
  points: number
  treeStage: TreeStage
}

const stageNames = ['Seed', 'Sprout', 'Young Tree', 'Growing Tree', 'Flourishing Tree']

export function AppHeader({ points, treeStage }: AppHeaderProps) {
  const currentStage = stageNames.indexOf(treeStage.name)
  const progress = (currentStage / (stageNames.length - 1)) * 100

  return (
    <header className="app-header">
      <div className="brand">
        <svg aria-hidden="true" className="brand-mark" viewBox="0 0 48 48">
          <path d="M24 42C10 35 8 21 16 9c8 2 14 8 14 16 0 7-3 12-6 17Z" fill="currentColor" />
          <path d="M28 39c1-13 7-22 16-26 2 12-3 23-16 26Z" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M12 31c8-1 15 2 20 9" fill="none" stroke="#f8f0de" strokeLinecap="round" strokeWidth="3" />
        </svg>
        <span>Whakakori Together</span>
      </div>
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
