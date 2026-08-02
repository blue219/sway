import { Button, Card } from 'animal-island-ui'
import type { TreeStage } from '../game'

type ResultScreenProps = {
  points: number
  treeStage: TreeStage
  onFinish: () => void
  onPlayAgain: () => void
}

export function ResultScreen({ points, treeStage, onFinish, onPlayAgain }: ResultScreenProps) {
  return (
    <main className="screen result-screen">
      <Card className="result-panel" color="app-pink" pattern="app-pink" aria-labelledby="result-title">
        <div className="result-copy">
          <h1 id="result-title">Round complete</h1>
          <p className="result-message">You moved in your own way.</p>
          <p className="points-earned">+{points} Wellbeing Points</p>
          <h2>Your tree is growing</h2>
        </div>
        <div className="tree-illustration">
          <img alt={`A ${treeStage.name.toLowerCase()} wellbeing tree`} src="/assets/growing-tree.png" />
          <p>{treeStage.name}</p>
        </div>
      </Card>
      <Card className="community-note" color="app-green" pattern="app-green">Every movement helps our community tree.</Card>
      <div className="result-actions">
        <Button className="primary-action" htmlType="button" size="large" type="primary" onClick={onPlayAgain}>
          Play another round
        </Button>
        <Button className="secondary-action" htmlType="button" size="large" onClick={onFinish}>
          Finish for today
        </Button>
      </div>
    </main>
  )
}
