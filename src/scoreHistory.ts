import { questionsPerRound, scoreQuiz } from './game'

export type ScoreRecord = {
  completedAt: string
  correctAnswers: number
  points: number
}

export type ScoreHistoryLoadResult = {
  records: ScoreRecord[]
  error: string | null
}

export const scoreHistoryKey = 'whakakori.scoreHistory.v1'

function isScoreRecord(value: unknown): value is ScoreRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Partial<ScoreRecord>
  return typeof record.completedAt === 'string'
    && !Number.isNaN(Date.parse(record.completedAt))
    && Number.isInteger(record.correctAnswers)
    && record.correctAnswers! >= 0
    && record.correctAnswers! <= questionsPerRound
    && record.points === scoreQuiz(record.correctAnswers!)
}

export function loadScoreHistory(): ScoreHistoryLoadResult {
  try {
    const saved = window.localStorage.getItem(scoreHistoryKey)
    if (saved === null) return { records: [], error: null }
    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed) || !parsed.every(isScoreRecord)) {
      return { records: [], error: 'Saved scores could not be read.' }
    }
    return { records: parsed, error: null }
  } catch {
    return { records: [], error: 'Saved scores could not be read.' }
  }
}

export function saveScoreHistory(records: ScoreRecord[]): boolean {
  try {
    window.localStorage.setItem(scoreHistoryKey, JSON.stringify(records))
    return true
  } catch {
    return false
  }
}

export function clearScoreHistory(): boolean {
  try {
    window.localStorage.removeItem(scoreHistoryKey)
    return true
  } catch {
    return false
  }
}

export function totalScore(records: ScoreRecord[]): number {
  return records.reduce((total, record) => total + record.points, 0)
}
