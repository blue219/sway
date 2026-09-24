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

vi.mock('./components/QuizCameraPreview', () => ({
  QuizCameraPreview: ({ isActive, onChoice }: { isActive: boolean; onChoice: (choice: 'A' | 'B') => void }) => (
    <section aria-label="Quiz camera preview">
      <button disabled={!isActive} onClick={() => onChoice('A')} type="button">Choose A gesture</button>
      <button disabled={!isActive} onClick={() => onChoice('B')} type="button">Choose B gesture</button>
    </section>
  ),
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

function finishQuizIntro() {
  expect(screen.getByRole('region', { name: 'Hand choice guide' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Quiz camera preview' })).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(3_000))
}

function answerButton(answer: string) {
  return screen.getAllByRole('button').find((button) => button.getAttribute('aria-label')?.endsWith(`: ${answer}`))
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
  it('shuffles five seated movements and recognizes arm reach and forward reach', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<App />)

    const choices = screen.getAllByRole('button', { name: /choose (standing|seated)/i })
    expect(choices.map((choice) => choice.querySelector('.mode-card-title')?.textContent)).toEqual(['Standing', 'Seated'])
    expect(choices.map((choice) => choice.querySelector('img')?.getAttribute('src'))).toEqual(['/assets/selection-standing.png', '/assets/selection-seated.png'])
    expect(cameraRenderSpy).not.toHaveBeenCalled()

    fireEvent.click(choices[1])
    expect(screen.getByRole('heading', { name: 'Seated arm opening' })).toBeInTheDocument()
    expect(screen.getByLabelText('Movement 1 of 5')).toBeInTheDocument()
    expect(cameraRenderSpy).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    fireEvent.click(screen.getByRole('button', { name: 'Complete recognized movement' }))
    expect(screen.getByRole('heading', { name: 'Seated overhead press' })).toBeInTheDocument()
    expect(screen.getByLabelText('Movement 2 of 5')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Movement camera preview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Complete recognized movement' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Complete recognized movement' }))
    expect(screen.getByRole('heading', { name: 'Seated arm reach' })).toBeInTheDocument()
    expect(screen.getByLabelText('Movement 3 of 5')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Movement camera preview' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Complete recognized movement' }))
    expect(screen.getByRole('heading', { name: 'Seated Forward Reach' })).toBeInTheDocument()
    expect(screen.getByLabelText('Movement 4 of 5')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Movement camera preview' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Complete recognized movement' }))
    expect(screen.getByRole('heading', { name: 'Seated torso twist' })).toBeInTheDocument()
    expect(screen.getByLabelText('Movement 5 of 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Complete recognized movement' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Complete recognized movement' }))
    finishQuizIntro()
    expect(screen.getAllByText('Question 1 of 5')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Return to start screen' }))
    expect(screen.getByRole('button', { name: /choose seated/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Seated arm reach' })).not.toBeInTheDocument()

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
    finishQuizIntro()
    expect(screen.getAllByText('Question 1 of 5')).toHaveLength(2)

    for (let question = 0; question < 5; question += 1) {
      const questionText = screen.getByRole('heading', { level: 1 }).textContent ?? ''
      const correctAnswer = quizQuestions.find((quiz) => quiz.question === questionText)?.correctAnswer
      const correctOption = answerButton(correctAnswer ?? '')
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
    vi.useFakeTimers()
    render(<App />)
    chooseStanding()

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.getByLabelText('Movement 2 of 5')).toBeInTheDocument()

    for (let movement = 0; movement < 4; movement += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    }

    finishQuizIntro()
    expect(screen.getAllByText('Question 1 of 5')).toHaveLength(2)
  })

  it('shows the hand guide for three seconds and can reopen it without accepting a gesture', () => {
    vi.useFakeTimers()
    render(<App />)
    chooseStanding()
    for (let movement = 0; movement < 5; movement += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    }

    expect(screen.getByRole('img', { name: /raise your left hand/i })).toHaveAttribute('src', '/assets/quiz-gesture-guide.png')
    expect(screen.getByRole('button', { name: 'Choose A gesture' })).toBeDisabled()
    act(() => vi.advanceTimersByTime(2_999))
    expect(screen.getByRole('region', { name: 'Hand choice guide' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('button', { name: 'Choose A gesture' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'View hand guide' }))
    expect(screen.getByRole('button', { name: 'Choose A gesture' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Close guide' }))
    expect(screen.getByRole('button', { name: 'Choose A gesture' })).toBeEnabled()
  })

  it('maps gesture A and B to the currently displayed answers', () => {
    vi.useFakeTimers()
    render(<App />)
    startAndCompleteMovementSequence()
    finishQuizIntro()

    const optionA = screen.getByRole('button', { name: /^Option A:/ }).getAttribute('aria-label')?.split(': ')[1]
    fireEvent.click(screen.getByRole('button', { name: 'Choose A gesture' }))
    expect(screen.getByRole('button', { name: /^Option A:/ })).toHaveClass(optionA === quizQuestions.find((quiz) => quiz.question === screen.getByRole('heading', { level: 1 }).textContent)?.correctAnswer ? 'quiz-option-correct' : 'quiz-option-incorrect')
    act(() => vi.advanceTimersByTime(1_000))

    fireEvent.click(screen.getByRole('button', { name: 'Choose B gesture' }))
    expect(screen.getByRole('button', { name: /^Option B:/ })).toBeDisabled()
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
    finishQuizIntro()
    const firstQuestion = screen.getByRole('heading', { level: 1 }).textContent
    const correctAnswer = quizQuestions.find((quiz) => quiz.question === firstQuestion)?.correctAnswer
    const incorrectOption = screen.getAllByRole('button').find((button) => button.getAttribute('aria-label')?.startsWith('Option ') && !button.getAttribute('aria-label')?.endsWith(`: ${correctAnswer}`))
    expect(incorrectOption).toBeDefined()
    fireEvent.click(incorrectOption!)

    expect(document.querySelector('.quiz-option-correct')).toBeInTheDocument()
    expect(document.querySelector('.quiz-option-incorrect')).toBeInTheDocument()
    screen.getAllByRole('button', { name: /Option [AB]:/ }).forEach((button) => expect(button).toBeDisabled())

    act(() => vi.advanceTimersByTime(1_000))

    expect(screen.getAllByText('Question 2 of 5')).toHaveLength(2)
    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toBe(firstQuestion)
  })

  it.each(['Play another round', 'Finish for today'])('totals the score and resets the round with %s', (resetAction) => {
    vi.useFakeTimers()
    render(<App />)

    startAndCompleteMovementSequence()
    finishQuizIntro()

    const answeredQuestions = new Set<string>()
    for (let question = 0; question < 5; question += 1) {
      const questionText = screen.getByRole('heading', { level: 1 }).textContent ?? ''
      answeredQuestions.add(questionText)
      const correctAnswer = quizQuestions.find((quiz) => quiz.question === questionText)?.correctAnswer
      const correctOption = answerButton(correctAnswer ?? '')

      expect(correctOption).toBeDefined()
      fireEvent.click(correctOption!)
      expect(document.querySelector('.quiz-option-correct')).toBeInTheDocument()
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
