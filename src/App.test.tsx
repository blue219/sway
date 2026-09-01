import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RecognitionStatus } from './components/CameraPreview'
import App from './App'

const movementTitles = ['Side Arm Raise', 'Standing March', 'Shallow Squat', 'Standing Side Bend', 'Side Leg Lift']
let nextRecognitionStatus: RecognitionStatus = { kind: 'ready' }

vi.mock('./components/CameraPreview', () => ({
  CameraPreview: ({ isTracking, onRecognitionStatusChange, onComplete, onRepetitionsChange }: {
    isTracking: boolean
    onRecognitionStatusChange: (recognitionStatus: RecognitionStatus) => void
    onComplete: () => void
    onRepetitionsChange: (repetitions: number) => void
  }) => {
    useEffect(() => {
      onRecognitionStatusChange(nextRecognitionStatus)
    }, [onRecognitionStatusChange])

    return (
      <button
        disabled={!isTracking}
        type="button"
        onClick={() => {
          onRepetitionsChange(5)
          onComplete()
        }}
      >
        Complete recognized movement
      </button>
    )
  },
}))

function startAndCompleteMovementSequence() {
  fireEvent.click(screen.getByRole('button', { name: 'Start' }))
  for (let movement = 0; movement < 5; movement += 1) {
    fireEvent.click(screen.getByRole('button', { name: 'Complete recognized movement' }))
    completeCountdown()
  }
}

function completeCountdown() {
  for (let second = 0; second < 5; second += 1) {
    act(() => vi.advanceTimersByTime(1_000))
  }
}

afterEach(() => {
  cleanup()
  nextRecognitionStatus = { kind: 'ready' }
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('Whakakori Together round', () => {
  it('starts a five-second countdown after the fifth recognised repetition, then advances', () => {
    vi.useFakeTimers()
    render(<App />)

    expect(movementTitles).toContain(screen.getByRole('heading', { level: 1 }).textContent)
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    fireEvent.click(screen.getByRole('button', { name: 'Complete recognized movement' }))

    expect(screen.getByLabelText('5 seconds remaining')).toBeInTheDocument()
    expect(screen.getByText('Movement complete')).toBeInTheDocument()
    expect(screen.getByLabelText('Movement 1 of 5')).toBeInTheDocument()

    completeCountdown()

    expect(screen.getByLabelText('Movement 2 of 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Complete recognized movement' })).toBeEnabled()
  })

  it('offers a timer fallback when recognition is unavailable and applies it to later movements', () => {
    vi.useFakeTimers()
    nextRecognitionStatus = { kind: 'unavailable', message: 'Camera is unavailable.' }
    render(<App />)

    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(screen.getByText('Pose recognition unavailable')).toBeInTheDocument()
    expect(screen.getByText('Camera is unavailable.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByLabelText('5 seconds remaining')).toBeInTheDocument()
    expect(screen.getByText('Timer mode')).toBeInTheDocument()
    completeCountdown()

    expect(screen.getByLabelText('Movement 2 of 5')).toBeInTheDocument()
    expect(screen.getByLabelText('5 seconds remaining')).toBeInTheDocument()
    expect(screen.queryByText('Pose recognition unavailable')).not.toBeInTheDocument()
  })

  it('keeps the current movement playing when the participant declines the fallback', () => {
    nextRecognitionStatus = { kind: 'unavailable', message: 'Camera is unavailable.' }
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    const pausesAfterStart = pause.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))

    expect(screen.queryByText('Pose recognition unavailable')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Movement 1 of 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled()
    expect(pause).toHaveBeenCalledTimes(pausesAfterStart)
  })

  it('shows correct and incorrect answer feedback for one second before advancing', () => {
    vi.useFakeTimers()
    render(<App />)

    startAndCompleteMovementSequence()
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

    startAndCompleteMovementSequence()

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
  })
})
