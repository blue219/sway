import { Button, Card } from 'animal-island-ui'
import type { TreeStage } from '../game'
import type { ScoreRecord } from '../scoreHistory'
import { CelebrationBursts } from './CelebrationBursts'
import { ScoreRecordList } from './ScoreRecordList'

type ResultScreenProps = {
  correctAnswers: number
  totalQuestions: number
  points: number
  totalPoints: number
  treeStage: TreeStage
  records: ScoreRecord[]
  onClearRecords: () => void
  onPlayAgain: () => void
}

export function ResultScreen({ correctAnswers, totalQuestions, points, totalPoints, treeStage, records, onClearRecords, onPlayAgain }: ResultScreenProps) {
  return (
    <main className="screen result-screen">
      <CelebrationBursts variant="result" />
      <Card className="result-panel" color="app-pink" pattern="app-pink" aria-labelledby="result-title">
        <div className="result-copy">
          <p className="result-eyebrow">Round complete</p>
          <h1 id="result-title">Well done!</h1>
          <p className="result-message">You answered {correctAnswers} of {totalQuestions} questions correctly.</p>
          <p className="points-earned">+{points} <span>Wellbeing Points this round</span></p>
          <div className="result-total">
            <span>Total Wellbeing Points</span>
            <strong>{totalPoints}</strong>
          </div>
          <p className="result-stage">Your tree: <strong>{treeStage.name}</strong></p>
        </div>
        <div className="tree-illustration">
          <img alt={`${treeStage.name} wellbeing tree`} src={treeStage.imageSrc} />
        </div>
      </Card>
      <Card className="record-panel" color="app-green" pattern="app-green" aria-labelledby="record-title">
        <div className="record-heading">
          <h2 id="record-title">Score history</h2>
          {records.length > 0 ? <button className="text-link" type="button" onClick={onClearRecords}>Clear all records</button> : null}
        </div>
        <ScoreRecordList records={records} />
      </Card>
      <div className="result-actions">
        <Button className="primary-action" htmlType="button" size="large" type="primary" onClick={onPlayAgain}>
          Play another round
        </Button>
      </div>
    </main>
  )
}
