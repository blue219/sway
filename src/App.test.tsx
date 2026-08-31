import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const movementTitles = ['Side Arm Raise', 'Standing March', 'Shallow Squat', 'Standing Side Bend', 'Side Leg Lift']
const movementVideoSources = ['/assets/side-arm-raise.mp4', '/assets/standing-march.mp4', '/assets/shallow-squat.mp4', '/assets/standing-side-bend.mp4', '/assets/side-leg-lift.mp4']

function completeMovementSequence() {
  for (let movement = 0; movement < 5; movement += 1) {
    fireEvent.play(screen.getByLabelText(/An older adult demonstrating/))
    act(() => vi.advanceTimersByTime(5_000))
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('Whakakori Together round', () => {
  it('opens the quiz after five non-repeating movement holds complete', () => {
    vi.useFakeTimers()
    render(<App />)

    expect(movementTitles).toContain(screen.getByRole('heading', { level: 1 }).textContent)
    expect(screen.getByText('Whakakori Together')).toBeInTheDocument()
    expect(screen.getByLabelText('Movement 1 of 5')).toBeInTheDocument()
    expect(document.querySelector('img[src="/assets/movement-activity-icon.png"]')).toBeInTheDocument()
    expect(screen.getByText('1/5')).toBeInTheDocument()
    expect(document.querySelector('.movement-card-heading .movement-index')).toBeInTheDocument()
    expect(document.querySelector('.movement-video-frame .movement-countdown')).toBeInTheDocument()
    expect(screen.queryByText('seconds left')).not.toBeInTheDocument()
    expect(document.querySelector('.recognition-status')).not.toBeInTheDocument()
    expect(screen.queryByText('Follow the demonstration')).not.toBeInTheDocument()
    expect(document.querySelector('.movement-ready-dot')).not.toBeInTheDocument()
    const movementVideo = screen.getByLabelText(/An older adult demonstrating/)
    expect(movementVideoSources).toContain(movementVideo.getAttribute('src'))
    expect(movementVideo).not.toHaveAttribute('autoplay')
    expect(movementVideo).toHaveAttribute('preload', 'auto')
    expect(screen.getByRole('img', { name: 'A bright living room prepared for movement detection' })).toHaveAttribute('src', '/assets/camera-preview-living-room.png')

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByLabelText('5 seconds remaining')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1_000))
    expect(screen.getByText('5')).toBeInTheDocument()

    fireEvent.play(screen.getByLabelText(/An older adult demonstrating/))
    act(() => vi.advanceTimersByTime(1_000))
    expect(screen.getByText('4')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(4_000))
    expect(screen.getByLabelText('Movement 2 of 5')).toBeInTheDocument()

    for (let movement = 0; movement < 4; movement += 1) {
      fireEvent.play(screen.getByLabelText(/An older adult demonstrating/))
      act(() => vi.advanceTimersByTime(5_000))
    }

    expect(screen.getAllByText('Question 1 of 5')).toHaveLength(2)
  })

  it('uses every movement once before opening the quiz', () => {
    vi.useFakeTimers()
    render(<App />)

    const displayedTitles = new Set<string>()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    for (let movement = 0; movement < 5; movement += 1) {
      displayedTitles.add(screen.getByRole('heading', { level: 1 }).textContent ?? '')
      fireEvent.play(screen.getByLabelText(/An older adult demonstrating/))
      act(() => vi.advanceTimersByTime(5_000))
    }

    expect(screen.getAllByText('Question 1 of 5')).toHaveLength(2)
    expect(displayedTitles).toEqual(new Set(movementTitles))
  })

  it('shows correct and incorrect answer feedback for one second before advancing', () => {
    vi.useFakeTimers()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    completeMovementSequence()
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

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    completeMovementSequence()

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
    expect(movementTitles).toContain(screen.getByRole('heading', { level: 1 }).textContent)
  })
})
