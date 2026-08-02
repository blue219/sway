import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Whakakori Together round', () => {
  it('continues timing automatically after moving to the next pose', () => {
    vi.useFakeTimers()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Seated mode' }))
    const firstMovement = screen.getByRole('heading', { level: 1 }).textContent
    expect(screen.getByLabelText('Movement 1 of 5')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByText('Hold for 5 seconds')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(5_000))

    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toBe(firstMovement)
    expect(screen.getByRole('button', { name: 'Holding' })).toBeDisabled()
    expect(screen.getByLabelText('Movement 2 of 5')).toBeInTheDocument()
  })

  it('freezes the hold timer while paused and resumes it when asked', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Standing mode' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))

    expect(screen.getByRole('dialog', { name: 'Paused' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Resume movement' }))

    expect(screen.queryByRole('dialog', { name: 'Paused' })).not.toBeInTheDocument()
  })

  it('opens the quiz when the header quiz preview is selected', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Seated mode' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open quiz' }))

    expect(screen.getAllByText('Question 1 of 5')).toHaveLength(2)
    expect(screen.getAllByRole('radio')).toHaveLength(4)
  })

  it('uses every standing movement once in a random order before opening the quiz', () => {
    vi.useFakeTimers()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Standing mode' }))

    const completedMovements = new Set<string>()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    for (let movement = 0; movement < 5; movement += 1) {
      completedMovements.add(screen.getByRole('heading', { level: 1 }).textContent ?? '')
      act(() => vi.advanceTimersByTime(5_000))
    }

    expect(completedMovements).toHaveLength(5)
    expect(screen.getAllByText('Question 1 of 5')).toHaveLength(2)
  })

  it('shows correct and incorrect answer feedback for one second before advancing', () => {
    vi.useFakeTimers()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Seated mode' }))
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

    fireEvent.click(screen.getByRole('button', { name: 'Seated mode' }))
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
    expect(screen.getByRole('heading', { name: 'Choose a play mode' })).toBeInTheDocument()
  })
})
