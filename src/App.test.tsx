import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Whakakori Together round', () => {
  it('opens the quiz after the standing march hold completes', () => {
    vi.useFakeTimers()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Standing March' })).toBeInTheDocument()
    expect(screen.getByLabelText('Movement 1 of 1')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'An older adult demonstrating standing march' })).toHaveClass('standing-march-character')

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByText('Hold for 5 seconds')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(5_000))

    expect(screen.getAllByText('Question 1 of 5')).toHaveLength(2)
  })

  it('freezes the hold timer while paused and resumes it when asked', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))

    expect(screen.getByRole('dialog', { name: 'Paused' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Resume movement' }))

    expect(screen.queryByRole('dialog', { name: 'Paused' })).not.toBeInTheDocument()
  })

  it('opens the quiz when the header quiz preview is selected', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Open quiz' }))

    expect(screen.getAllByText('Question 1 of 5')).toHaveLength(2)
    expect(screen.getAllByRole('radio')).toHaveLength(4)
  })

  it('uses the single standing march before opening the quiz', () => {
    vi.useFakeTimers()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    act(() => vi.advanceTimersByTime(5_000))

    expect(screen.getAllByText('Question 1 of 5')).toHaveLength(2)
  })

  it('shows correct and incorrect answer feedback for one second before advancing', () => {
    vi.useFakeTimers()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Open quiz' }))
    const firstQuestion = screen.getByRole('heading', { level: 1 }).textContent
    fireEvent.click(screen.getAllByRole('radio')[0])

    expect(document.querySelector('.quiz-option-feedback-correct')).toBeInTheDocument()
    expect(document.querySelector('.quiz-option-feedback-incorrect')).toBeInTheDocument()
    screen.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled())

    act(() => vi.advanceTimersByTime(1_000))

    expect(screen.getAllByText('Question 2 of 5')).toHaveLength(2)
    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toBe(firstQuestion)
  })

  it('accepts keyboard answers for five non-repeating questions and totals the score', () => {
    vi.useFakeTimers()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Open quiz' }))

    const answeredQuestions = new Set<string>()
    for (let question = 0; question < 5; question += 1) {
      answeredQuestions.add(screen.getByRole('heading', { level: 1 }).textContent ?? '')
      const firstOption = screen.getAllByRole('radio')[0]
      firstOption.focus()
      fireEvent.keyDown(firstOption, { key: 'ArrowDown' })
      expect(document.querySelector('.quiz-option-feedback-correct')).toBeInTheDocument()
      act(() => vi.advanceTimersByTime(1_000))
    }

    expect(screen.getByRole('heading', { name: 'Round complete' })).toBeInTheDocument()
    expect(answeredQuestions).toHaveLength(5)
    expect(screen.getByText(/You answered 5 of 5 questions correctly/)).toBeInTheDocument()
    expect(screen.getByText('+50 Wellbeing Points')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Finish for today' }))
    expect(screen.getByRole('heading', { name: 'Standing March' })).toBeInTheDocument()
  })
})
