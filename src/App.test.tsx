import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RecognitionStatus } from './components/CameraPreview'
import { quizQuestions } from './game'
import App from './App'

const movementTitles = ['Side Arm Raise', 'Standing March', 'Shallow Squat', 'Standing Side Bend', 'Side Leg Lift']
const cameraRenderSpy = vi.hoisted(() => vi.fn())
let nextRecognitionStatus: RecognitionStatus = { kind: 'ready' }
let nextMovementRecognised = false

vi.mock('./components/CameraPreview', () => ({
  CameraPreview: ({ isTracking, movementLabel, onRecognitionStatusChange, onComplete, onActiveDurationChange, onRecognitionStateChange }: {
    isTracking: boolean
    movementLabel: string
    onRecognitionStatusChange: (recognitionStatus: RecognitionStatus) => void
    onComplete: () => void
    onActiveDurationChange: (activeDurationMs: number) => void
    onRecognitionStateChange: (isRecognised: boolean | null) => void
  }) => {
    cameraRenderSpy()
    useEffect(() => {
      onRecognitionStatusChange(nextRecognitionStatus)
      onRecognitionStateChange(isTracking ? nextMovementRecognised : null)
    }, [isTracking, movementLabel, onRecognitionStateChange, onRecognitionStatusChange])

    return (
      <button
        disabled={!isTracking}
        type="button"
        onClick={() => {
          onActiveDurationChange(5_000)
          onComplete()
        }}
      >
        Complete recognized movement
      </button>
    )
  },
}))

function chooseStanding() {
  fireEvent.click(screen.getByRole('button', { name: /choose standing/i }))
}

function startAndCompleteMovementSequence() {
  chooseStanding()
  fireEvent.click(screen.getByRole('button', { name: 'Start' }))
  for (let movement = 0; movement < 5; movement += 1) {
    fireEvent.click(screen.getByRole('button', { name: 'Complete recognized movement' }))
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
  nextMovementRecognised = false
  cameraRenderSpy.mockClear()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('Whakakori Together round', () => {
  it('opens the seated movement and retains the standing round entry', () => {
    render(<App />)

    const choices = screen.getAllByRole('button', { name: /choose (standing|seated)/i })
    expect(choices.map((choice) => choice.querySelector('.mode-card-title')?.textContent)).toEqual(['Standing', 'Seated'])
    expect(choices.map((choice) => choice.querySelector('img')?.getAttribute('src'))).toEqual(['/assets/selection-standing.png', '/assets/selection-seated.png'])
    expect(cameraRenderSpy).not.toHaveBeenCalled()

    fireEvent.click(choices[1])
    expect(screen.getByRole('heading', { name: 'Seated knee extension' })).toBeInTheDocument()
    expect(screen.getByLabelText('Movement 1 of 1')).toBeInTheDocument()
    expect(cameraRenderSpy).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    fireEvent.click(screen.getByRole('button', { name: 'Complete recognized movement' }))
    expect(screen.getAllByText('Question 1 of 5')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Return to start screen' }))
    expect(screen.getByRole('button', { name: /choose seated/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Seated knee extension' })).not.toBeInTheDocument()

    chooseStanding()
    expect(cameraRenderSpy).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled()
  })

  it('goes back through the visited screens and uses the logo to restart at selection', () => {
    vi.useFakeTimers()
    render(<App />)
    chooseStanding()

    for (let movement = 0; movement < 5; movement += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    }
    expect(screen.getAllByText('Question 1 of 5')).toHaveLength(2)

    for (let question = 0; question < 5; question += 1) {
      const questionText = screen.getByRole('heading', { level: 1 }).textContent ?? ''
      const correctAnswer = quizQuestions.find((quiz) => quiz.question === questionText)?.correctAnswer
      const correctOption = screen.getAllByRole('radio').find((radio) => radio.closest('label')?.textContent?.includes(correctAnswer ?? ''))
      expect(correctOption).toBeDefined()
      fireEvent.click(correctOption!)
      act(() => vi.advanceTimersByTime(1_000))
    }

    expect(screen.getByRole('heading', { name: 'Round complete' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(screen.getAllByText('Question 5 of 5')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(screen.getByLabelText('Movement 5 of 5')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(screen.getByRole('heading', { name: 'Choose how to move' })).toBeInTheDocument()

    chooseStanding()
    fireEvent.click(screen.getByRole('button', { name: 'Return to start screen' }))
    expect(screen.getByRole('heading', { name: 'Choose how to move' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Go back' })).not.toBeInTheDocument()

    chooseStanding()
    expect(screen.getByLabelText('Movement 1 of 5')).toBeInTheDocument()
  })

  it('advances immediately after five seconds of recognised movement', () => {
    vi.useFakeTimers()
    render(<App />)
    chooseStanding()

    expect(movementTitles).toContain(screen.getByRole('heading', { level: 1 }).textContent)
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Start' }).closest('.movement-action-card')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    fireEvent.click(screen.getByRole('button', { name: 'Complete recognized movement' }))

    expect(screen.getByLabelText('Movement 2 of 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Complete recognized movement' })).toBeEnabled()
    expect(screen.queryByLabelText('5 seconds remaining')).not.toBeInTheDocument()
  })

  it('shows the live recognition state beside Hold while tracking', () => {
    nextMovementRecognised = true
    render(<App />)
    chooseStanding()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    const recognitionIndicator = screen.getByLabelText('Movement recognised')
    expect(recognitionIndicator.closest('.movement-progress')).toHaveTextContent('✓Hold0.0/5 S')
  })

  it('skips the current movement and opens the quiz after the fifth skip', () => {
    render(<App />)
    chooseStanding()

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.getByLabelText('Movement 2 of 5')).toBeInTheDocument()

    for (let movement = 0; movement < 4; movement += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    }

    expect(screen.getAllByText('Question 1 of 5')).toHaveLength(2)
  })

  it('offers a timer fallback when recognition is unavailable and applies it to later movements', () => {
    vi.useFakeTimers()
    nextRecognitionStatus = { kind: 'unavailable', message: 'Camera is unavailable.' }
    render(<App />)
    chooseStanding()

    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(screen.getByText('Pose recognition unavailable')).toBeInTheDocument()
    expect(screen.getByText('Camera is unavailable.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByLabelText('5 seconds remaining')).toBeInTheDocument()
    expect(screen.getByText('Next movement in')).toBeInTheDocument()
    completeCountdown()

    expect(screen.getByLabelText('Movement 2 of 5')).toBeInTheDocument()
    expect(screen.getByLabelText('5 seconds remaining')).toBeInTheDocument()
    expect(screen.queryByText('Pose recognition unavailable')).not.toBeInTheDocument()
  })

  it('keeps the current movement playing when the participant declines the fallback', () => {
    nextRecognitionStatus = { kind: 'unavailable', message: 'Camera is unavailable.' }
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause')
    render(<App />)
    chooseStanding()

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
    const correctAnswer = quizQuestions.find((quiz) => quiz.question === firstQuestion)?.correctAnswer
    const incorrectOption = screen.getAllByRole('radio').find((radio) => !radio.closest('label')?.textContent?.includes(correctAnswer ?? ''))
    expect(incorrectOption).toBeDefined()
    fireEvent.click(incorrectOption!)

    expect(document.querySelector('.quiz-option-feedback-correct')).toBeInTheDocument()
    expect(document.querySelector('.quiz-option-feedback-incorrect')).toBeInTheDocument()
    screen.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled())

    act(() => vi.advanceTimersByTime(1_000))

    expect(screen.getAllByText('Question 2 of 5')).toHaveLength(2)
    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toBe(firstQuestion)
  })

  it.each(['Play another round', 'Finish for today'])('totals the score and resets the round with %s', (resetAction) => {
    vi.useFakeTimers()
    render(<App />)

    startAndCompleteMovementSequence()

    const answeredQuestions = new Set<string>()
    for (let question = 0; question < 5; question += 1) {
      const questionText = screen.getByRole('heading', { level: 1 }).textContent ?? ''
      answeredQuestions.add(questionText)
      const correctAnswer = quizQuestions.find((quiz) => quiz.question === questionText)?.correctAnswer
      const correctOption = screen.getByText(correctAnswer ?? '', { exact: false }).closest('label')?.querySelector('input')

      expect(correctOption).not.toBeNull()
      fireEvent.click(correctOption!)
      expect(document.querySelector('.quiz-option-feedback-correct')).toBeInTheDocument()
      act(() => vi.advanceTimersByTime(1_000))
    }

    expect(screen.getByRole('heading', { name: 'Round complete' })).toBeInTheDocument()
    expect(answeredQuestions).toHaveLength(5)
    expect(screen.getByText(/You answered 5 of 5 questions correctly/)).toBeInTheDocument()
    expect(screen.getByText('+50 Wellbeing Points')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: resetAction }))

    expect(screen.getByRole('heading', { name: 'Choose how to move' })).toBeInTheDocument()
    expect(screen.getByLabelText('0 Wellbeing Points, Seed')).toBeInTheDocument()
    chooseStanding()
    expect(screen.getByLabelText('Movement 1 of 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled()
  })
})
