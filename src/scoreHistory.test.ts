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

  it('reports unavailable storage for reads, writes and clears', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied') })
    expect(loadScoreHistory().error).toBe('Saved scores could not be read.')
    expect(saveScoreHistory([record])).toBe(false)
    expect(clearScoreHistory()).toBe(false)
  })
})
