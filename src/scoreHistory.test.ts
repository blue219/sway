import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearScoreHistory, loadScoreHistory, saveScoreHistory, scoreHistoryKey, totalScore } from './scoreHistory'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('score history', () => {
  const record = { completedAt: '2026-09-24T00:00:00.000Z', correctAnswers: 3, points: 30 }

  it('saves valid rounds and totals their points', () => {
    expect(saveScoreHistory([record, record])).toBe(true)
    expect(loadScoreHistory()).toEqual({ records: [record, record], error: null })
    expect(totalScore([record, record])).toBe(60)
    expect(clearScoreHistory()).toBe(true)
    expect(loadScoreHistory()).toEqual({ records: [], error: null })
  })

  it('rejects malformed stored data without crashing the game', () => {
    window.localStorage.setItem(scoreHistoryKey, '[{"completedAt":"bad","correctAnswers":3,"points":30}]')
    expect(loadScoreHistory()).toEqual({ records: [], error: 'Saved scores could not be read.' })
  })

  it('loads legacy five-question scores alongside new three-question scores', () => {
    const legacyRecord = { ...record, correctAnswers: 5, points: 50 }
    const newRecord = { ...record, totalQuestions: 3 }
    saveScoreHistory([legacyRecord, newRecord])

    expect(loadScoreHistory()).toEqual({ records: [legacyRecord, newRecord], error: null })
    expect(totalScore(loadScoreHistory().records)).toBe(80)
  })

  it('rejects scores with more correct answers than the saved question count', () => {
    saveScoreHistory([{ ...record, totalQuestions: 3, correctAnswers: 4, points: 40 }])

    expect(loadScoreHistory().error).toBe('Saved scores could not be read.')
  })

  it('reports unavailable storage for reads, writes and clears', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied') })
    expect(loadScoreHistory().error).toBe('Saved scores could not be read.')
    expect(saveScoreHistory([record])).toBe(false)
    expect(clearScoreHistory()).toBe(false)
  })
})
