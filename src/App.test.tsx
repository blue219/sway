import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RecognitionStatus } from './components/CameraPreview'
import { createRandomQuizOrder, quizQuestions } from './game'
import { scoreHistoryKey } from './scoreHistory'
import App from './App'

const movementTitles = ['Side Arm Raise', 'Standing March', 'Shallow Squat', 'Standing Side Bend', 'Side Leg Lift']
const cameraRenderSpy = vi.hoisted(() => vi.fn())
let nextRecognitionStatus: RecognitionStatus = { kind: 'ready' }
let nextMovementRecognised = false

vi.mock('./components/CameraPreview', () => ({
  CameraPreview: ({ isTracking, isPaused, movementLabel, onRecognitionStatusChange, onComplete, onActiveDurationChange, onRecognitionStateChange }: {
    isTracking: boolean
    isPaused: boolean
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
        disabled={!isTracking || isPaused}
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
  QuizCameraPreview: ({ isActive, isPaused, onChoice }: { isActive: boolean; isPaused: boolean; onChoice: (choice: 'A' | 'B') => void }) => (
    <section aria-label="Quiz camera preview">
      <button disabled={!isActive || isPaused} onClick={() => onChoice('A')} type="button">Choose A gesture</button>
      <button disabled={!isActive || isPaused} onClick={() => onChoice('B')} type="button">Choose B gesture</button>
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
  expect(screen.getByLabelText('3 seconds until quiz')).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(1_000))
  expect(screen.getByLabelText('2 seconds until quiz')).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(1_000))
  expect(screen.getByLabelText('1 second until quiz')).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(1_000))
  expect(screen.queryByRole('region', { name: 'Hand choice guide' })).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
}

function answerButton(answer: string) {
  return screen.getAllByRole('button').find((button) => button.getAttribute('aria-label')?.endsWith(`: ${answer}`))
}

function completePerfectRound() {
  startAndCompleteMovementSequence()
  finishQuizIntro()
  for (let question = 0; question < 5; question += 1) {
    const questionText = screen.getByRole('heading', { level: 1 }).textContent ?? ''
    const correctAnswer = quizQuestions.find((quiz) => quiz.question === questionText)?.correctAnswer
    fireEvent.click(answerButton(correctAnswer ?? '')!)
    act(() => vi.advanceTimersByTime(1_000))
  }
}

afterEach(() => {
  cleanup()
  nextRecognitionStatus = { kind: 'ready' }
  nextMovementRecognised = false
  cameraRenderSpy.mockClear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.clear()
  vi.useRealTimers()
})

describe('Whakakori Together round', () => {
  it('keeps the header focused on the tree, points, and records', () => {
    render(<App />)
    const headerStatus = screen.getByRole('banner').querySelector('.header-status')
    expect(Array.from(headerStatus?.children ?? []).map((element) => element.textContent)).toEqual(['Sapling', 'Points0', 'Records'])

    chooseStanding()
    expect(screen.queryByText('Coming up')).not.toBeInTheDocument()
    expect(screen.queryByText('Quiz after 5 movements')).not.toBeInTheDocument()
  })

  it('preloads every image needed for the selected quiz before the first movement', () => {
    const requestedImages: string[] = []
    const decode = vi.fn().mockResolvedValue(undefined)
    class TestImage {
      set src(value: string) { requestedImages.push(value) }
      decode = decode
    }
    vi.stubGlobal('Image', TestImage)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<App />)
    expect(requestedImages).toHaveLength(0)

    chooseStanding()

    const expectedQuizImages = createRandomQuizOrder(quizQuestions.length, () => 0).map((index) => quizQuestions[index].image?.src)
    expect(requestedImages).toHaveLength(9)
    expect(requestedImages).toEqual(expect.arrayContaining([...expectedQuizImages, '/assets/quiz-gesture-guide.webp', '/assets/tree-sapling.webp', '/assets/tree-medium.webp', '/assets/tree-large.webp']))
    expect(decode).toHaveBeenCalledTimes(9)
  })

  it('shuffles five seated movements and recognizes arm reach and forward reach', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<App />)

    const choices = screen.getAllByRole('button', { name: /choose (standing|seated)/i })
    expect(choices.map((choice) => choice.querySelector('.mode-card-title')?.textContent)).toEqual(['Standing', 'Seated'])
    expect(choices.map((choice) => choice.querySelector('img')?.getAttribute('src'))).toEqual(['/assets/selection-standing.webp', '/assets/selection-seated.webp'])
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
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Return to start screen' }))
    expect(screen.getByRole('button', { name: /choose seated/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Seated arm reach' })).not.toBeInTheDocument()

    chooseStanding()
    expect(cameraRenderSpy).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled()
  })

  it('returns from a completed round to selection and uses the logo to restart', () => {
    vi.useFakeTimers()
    render(<App />)
    chooseStanding()

    for (let movement = 0; movement < 5; movement += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    }
    finishQuizIntro()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()

    for (let question = 0; question < 5; question += 1) {
      const questionText = screen.getByRole('heading', { level: 1 }).textContent ?? ''
      const correctAnswer = quizQuestions.find((quiz) => quiz.question === questionText)?.correctAnswer
      const correctOption = answerButton(correctAnswer ?? '')
      expect(correctOption).toBeDefined()
      fireEvent.click(correctOption!)
      act(() => vi.advanceTimersByTime(1_000))
    }

    expect(screen.getByRole('heading', { name: 'Well done!' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(screen.getByRole('heading', { name: 'Choose how to move' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Go back' })).not.toBeInTheDocument()

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
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
  })

  it('shows the hand guide for three seconds and can reopen it without accepting a gesture', () => {
    vi.useFakeTimers()
    render(<App />)
    chooseStanding()
    for (let movement = 0; movement < 5; movement += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    }

    expect(screen.getByRole('img', { name: /raise your left hand/i })).toHaveAttribute('src', '/assets/quiz-gesture-guide.webp')
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
    fireEvent.click(screen.getByRole('button', { name: 'Records' }))
    act(() => vi.advanceTimersByTime(5_000))
    expect(screen.getByLabelText('5 seconds remaining')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
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
    expect(document.querySelector('.celebration-bursts-answer')).not.toBeInTheDocument()
    screen.getAllByRole('button', { name: /Option [AB]:/ }).forEach((button) => expect(button).toBeDisabled())

    act(() => vi.advanceTimersByTime(1_000))

    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toBe(firstQuestion)
    const secondQuestion = screen.getByRole('heading', { level: 1 }).textContent
    const secondCorrectAnswer = quizQuestions.find((quiz) => quiz.question === secondQuestion)?.correctAnswer
    fireEvent.click(answerButton(secondCorrectAnswer ?? '')!)
    expect(document.querySelectorAll('.celebration-bursts-answer .celebration-burst')).toHaveLength(3)
    expect(answerButton(secondCorrectAnswer ?? '')?.parentElement?.querySelector('.celebration-bursts-answer')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1_000))
    expect(document.querySelector('.celebration-bursts-answer')).not.toBeInTheDocument()
  })

  it('saves one score per completed round and grows the tree from cumulative points', () => {
    vi.useFakeTimers()
    render(<App />)
    completePerfectRound()
    expect(screen.getByRole('heading', { name: 'Well done!' })).toBeInTheDocument()
    expect(document.querySelectorAll('.celebration-bursts-result .celebration-burst')).toHaveLength(10)
    expect(screen.getByText(/You answered 5 of 5 questions correctly/)).toBeInTheDocument()
    expect(screen.getByText('Wellbeing Points this round')).toBeInTheDocument()
    expect(screen.getByLabelText('50 Wellbeing Points, Sapling')).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(scoreHistoryKey) ?? '[]')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Records' }))
    expect(screen.getAllByText('5 of 5 correct')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(JSON.parse(window.localStorage.getItem(scoreHistoryKey) ?? '[]')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Play another round' }))
    expect(screen.getByRole('heading', { name: 'Choose how to move' })).toBeInTheDocument()
    expect(screen.getByLabelText('50 Wellbeing Points, Sapling')).toBeInTheDocument()
    completePerfectRound()
    expect(screen.getByLabelText('100 Wellbeing Points, Tree')).toBeInTheDocument()
    expect(screen.getByAltText('Tree wellbeing tree')).toHaveAttribute('src', '/assets/tree-medium.webp')
    expect(JSON.parse(window.localStorage.getItem(scoreHistoryKey) ?? '[]')).toHaveLength(2)
  })

  it('restores records after refresh and clears them only after confirmation', () => {
    vi.useFakeTimers()
    render(<App />)
    completePerfectRound()
    cleanup()
    render(<App />)
    expect(screen.getByLabelText('50 Wellbeing Points, Sapling')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Records' }))
    expect(screen.getByText('5 of 5 correct')).toBeInTheDocument()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(screen.getByRole('button', { name: 'Clear all records' }))
    expect(JSON.parse(window.localStorage.getItem(scoreHistoryKey) ?? '[]')).toHaveLength(1)
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Clear all records' }))
    expect(window.localStorage.getItem(scoreHistoryKey)).toBeNull()
    expect(screen.getByLabelText('0 Wellbeing Points, Sapling')).toBeInTheDocument()
    expect(screen.getByText('No saved rounds yet.')).toBeInTheDocument()
  })

  it('pauses movement recognition and quiz countdown while records are open', () => {
    vi.useFakeTimers()
    render(<App />)
    chooseStanding()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByRole('button', { name: 'Complete recognized movement' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Records' }))
    expect(screen.getByRole('button', { name: 'Complete recognized movement' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('button', { name: 'Complete recognized movement' })).toBeEnabled()
    for (let movement = 0; movement < 5; movement += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Complete recognized movement' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Records' }))
    act(() => vi.advanceTimersByTime(5_000))
    expect(screen.getByRole('region', { name: 'Hand choice guide' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    finishQuizIntro()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('keeps the current round visible after clearing its saved record', () => {
    vi.useFakeTimers()
    render(<App />)
    completePerfectRound()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Clear all records' }))
    expect(screen.getByRole('heading', { name: 'Well done!' })).toBeInTheDocument()
    expect(screen.getByText('Wellbeing Points this round')).toBeInTheDocument()
    expect(screen.getByLabelText('0 Wellbeing Points, Sapling')).toBeInTheDocument()
    expect(screen.getByText('No saved rounds yet.')).toBeInTheDocument()
    expect(window.localStorage.getItem(scoreHistoryKey)).toBeNull()
  })

  it('does not advance an answered question while records are open', () => {
    vi.useFakeTimers()
    render(<App />)
    startAndCompleteMovementSequence()
    finishQuizIntro()
    const questionText = screen.getByRole('heading', { level: 1 }).textContent ?? ''
    const correctAnswer = quizQuestions.find((quiz) => quiz.question === questionText)?.correctAnswer
    fireEvent.click(answerButton(correctAnswer ?? '')!)
    fireEvent.click(screen.getByRole('button', { name: 'Records' }))
    act(() => vi.advanceTimersByTime(5_000))
    expect(screen.getByRole('heading', { name: questionText })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    act(() => vi.advanceTimersByTime(1_000))
    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toBe(questionText)
  })

  it('shows a notice when this browser cannot save scores', () => {
    vi.useFakeTimers()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
    render(<App />)
    completePerfectRound()
    expect(screen.getByRole('status')).toHaveTextContent('Scores could not be saved on this device.')
    expect(screen.getByRole('heading', { name: 'Well done!' })).toBeInTheDocument()
  })
})
