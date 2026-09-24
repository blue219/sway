import type { ScoreRecord } from '../scoreHistory'
import { questionsPerRound } from '../game'

type ScoreRecordListProps = {
  records: ScoreRecord[]
}

export function ScoreRecordList({ records }: ScoreRecordListProps) {
  if (records.length === 0) {
    return <p className="record-empty">No saved rounds yet.</p>
  }

  return (
    <ol className="score-record-list">
      {[...records].sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt)).map((record, index) => (
        <li className="score-record" key={`${record.completedAt}-${index}`}>
          <time dateTime={record.completedAt}>{new Date(record.completedAt).toLocaleString()}</time>
          <span>{record.correctAnswers} of {questionsPerRound} correct</span>
          <strong>+{record.points}</strong>
        </li>
      ))}
    </ol>
  )
}
