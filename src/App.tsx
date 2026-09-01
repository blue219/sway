import { Button, Cursor, Modal } from 'animal-island-ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { type RecognitionStatus } from './components/CameraPreview'
import { MovementScreen } from './components/MovementScreen'
import { QuizScreen } from './components/QuizScreen'
import { ResultScreen } from './components/ResultScreen'
import { createRandomMovementOrder, createRandomQuizOrder, getTreeStage, movements, questionsPerRound, quizQuestions, scoreQuiz } from './game'

type Screen = 'movement' | 'quiz' | 'result'
type MovementPhase = 'idle' | 'waitingForRecognition' | 'recognizing' | 'countdown'

const countdownSeconds = 5

function App() {
  const [screen, setScreen] = useState<Screen>('movement')
  const [movementIndex, setMovementIndex] = useState(0)
  const [movementOrder, setMovementOrder] = useState(() => createRandomMovementOrder(movements.length))
  const [quizOrder, setQuizOrder] = useState(() => createRandomQuizOrder(quizQuestions.length))
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isShowingAnswer, setIsShowingAnswer] = useState(false)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [movementPhase, setMovementPhase] = useState<MovementPhase>('idle')
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>({ kind: 'checking' })
  const [fallbackTimerEnabled, setFallbackTimerEnabled] = useState(false)
  const [fallbackPromptReason, setFallbackPromptReason] = useState<string | null>(null)
  const [playRequest, setPlayRequest] = useState(0)
  const [repetitions, setRepetitions] = useState(0)
  const [secondsRemaining, setSecondsRemaining] = useState(countdownSeconds)
  const [points, setPoints] = useState(0)
  const movementIndexRef = useRef(0)

  useEffect(() => {
    if (!isShowingAnswer) {
      return undefined
    }

    const answerTimer = window.setTimeout(() => {
      if (quizQuestionIndex === questionsPerRound - 1) {
        setPoints(scoreQuiz(correctAnswers))
        setScreen('result')
        return
      }

      setQuizQuestionIndex((index) => index + 1)
      setSelectedAnswer(null)
      setIsShowingAnswer(false)
    }, 1_000)

    return () => window.clearTimeout(answerTimer)
  }, [correctAnswers, isShowingAnswer, quizQuestionIndex])

  const beginCountdown = useCallback(() => {
    setMovementPhase('countdown')
    setSecondsRemaining(countdownSeconds)
  }, [])

  const advanceMovement = useCallback(() => {
    const currentMovementIndex = movementIndexRef.current
    if (currentMovementIndex === movements.length - 1) {
      setMovementPhase('idle')
      setScreen('quiz')
      return
    }

    movementIndexRef.current = currentMovementIndex + 1
    setMovementIndex(currentMovementIndex + 1)
    setRepetitions(0)
    setPlayRequest((request) => request + 1)

    if (fallbackTimerEnabled) {
      beginCountdown()
      return
    }

    if (recognitionStatus.kind === 'ready') {
      setMovementPhase('recognizing')
      return
    }

    if (recognitionStatus.kind === 'unavailable') {
      setMovementPhase('idle')
      setFallbackPromptReason(recognitionStatus.message)
      return
    }

    setMovementPhase('waitingForRecognition')
  }, [beginCountdown, fallbackTimerEnabled, recognitionStatus])

  useEffect(() => {
    if (movementPhase !== 'countdown') {
      return undefined
    }

    if (secondsRemaining === 0) {
      advanceMovement()
      return undefined
    }

    const timer = window.setTimeout(() => {
      setSecondsRemaining((seconds) => Math.max(0, seconds - 1))
    }, 1_000)

    return () => window.clearTimeout(timer)
  }, [advanceMovement, movementPhase, secondsRemaining])

  useEffect(() => {
    if (movementPhase === 'waitingForRecognition' && recognitionStatus.kind === 'ready') {
      setMovementPhase('recognizing')
    }
  }, [movementPhase, recognitionStatus])

  useEffect(() => {
    if (fallbackTimerEnabled || recognitionStatus.kind !== 'unavailable') {
      return
    }

    if (movementPhase === 'waitingForRecognition' || movementPhase === 'recognizing') {
      setMovementPhase('idle')
      setFallbackPromptReason(recognitionStatus.message)
    }
  }, [fallbackTimerEnabled, movementPhase, recognitionStatus])

  function resetRound() {
    movementIndexRef.current = 0
    setMovementIndex(0)
    setMovementOrder(createRandomMovementOrder(movements.length))
    setQuizOrder(createRandomQuizOrder(quizQuestions.length))
    setQuizQuestionIndex(0)
    setSelectedAnswer(null)
    setIsShowingAnswer(false)
    setCorrectAnswers(0)
    setMovementPhase('idle')
    setFallbackTimerEnabled(false)
    setFallbackPromptReason(null)
    setPlayRequest(0)
    setRepetitions(0)
    setSecondsRemaining(countdownSeconds)
    setPoints(0)
  }

  function startMovement() {
    setRepetitions(0)
    setFallbackPromptReason(null)
    setPlayRequest((request) => request + 1)

    if (fallbackTimerEnabled) {
      beginCountdown()
      return
    }

    if (recognitionStatus.kind === 'ready') {
      setMovementPhase('recognizing')
      return
    }

    if (recognitionStatus.kind === 'unavailable') {
      setFallbackPromptReason(recognitionStatus.message)
      return
    }

    setMovementPhase('waitingForRecognition')
  }

  const handleRecognitionStatusChange = useCallback((nextRecognitionStatus: RecognitionStatus) => {
    setRecognitionStatus(nextRecognitionStatus)
  }, [])

  const handleRepetitionsChange = useCallback((nextRepetitions: number) => {
    setRepetitions(nextRepetitions)
  }, [])

  const handleRecognitionComplete = useCallback(() => {
    beginCountdown()
  }, [beginCountdown])

  function continueWithoutRecognition() {
    setFallbackTimerEnabled(true)
    setFallbackPromptReason(null)
    setRepetitions(0)
    beginCountdown()
  }

  function cancelFallbackPrompt() {
    setFallbackPromptReason(null)
    setMovementPhase('idle')
  }

  function answerQuiz(answer: string) {
    if (isShowingAnswer) {
      return
    }

    setSelectedAnswer(answer)
    setIsShowingAnswer(true)

    if (answer === activeQuiz.correctAnswer) {
      setCorrectAnswers((count) => count + 1)
    }
  }

  function finishRound() {
    resetRound()
    setScreen('movement')
  }

  function playAgain() {
    resetRound()
    setScreen('movement')
  }

  const treeStage = getTreeStage(points)
  const activeQuiz = quizQuestions[quizOrder[quizQuestionIndex]]
  const roundPreview = screen === 'movement' ? (
    <div className="round-preview quiz-header-preview">
      <img alt="A tūī bird, the quiz subject" src="/assets/tui.png" />
      <div>
        <span>Coming up</span>
        <strong>Quiz after {movements.length} movement</strong>
      </div>
    </div>
  ) : screen === 'quiz' ? (
    <div className="round-preview movement-header-preview">
      <span>Question {quizQuestionIndex + 1} of {questionsPerRound}</span>
      <strong>Choose your answer</strong>
    </div>
  ) : undefined

  return (
    <Cursor>
      <div className="app-shell">
        <AppHeader points={points} roundPreview={roundPreview} treeStage={treeStage} />
        {screen === 'movement' ? (
          <MovementScreen
            currentMovement={movementIndex + 1}
            fallbackTimerEnabled={fallbackTimerEnabled}
            isCountingDown={movementPhase === 'countdown'}
            isTracking={movementPhase === 'recognizing'}
            isWaitingForRecognition={movementPhase === 'waitingForRecognition'}
            movement={movements[movementOrder[movementIndex]]}
            playRequest={playRequest}
            repetitions={repetitions}
            secondsRemaining={secondsRemaining}
            totalMovements={movements.length}
            onRecognitionComplete={handleRecognitionComplete}
            onRecognitionStatusChange={handleRecognitionStatusChange}
            onRepetitionsChange={handleRepetitionsChange}
            onStart={startMovement}
          />
        ) : null}
        {screen === 'quiz' ? <QuizScreen currentQuestion={quizQuestionIndex + 1} isShowingAnswer={isShowingAnswer} quiz={activeQuiz} selectedAnswer={selectedAnswer} totalQuestions={questionsPerRound} onAnswer={answerQuiz} /> : null}
        {screen === 'result' ? <ResultScreen correctAnswers={correctAnswers} points={points} totalQuestions={questionsPerRound} treeStage={treeStage} onFinish={finishRound} onPlayAgain={playAgain} /> : null}
        <Modal
          className="recognition-fallback-modal"
          footer={(
            <div className="dialog-actions">
              <Button htmlType="button" size="large" type="default" onClick={cancelFallbackPrompt}>Not now</Button>
              <Button htmlType="button" size="large" type="primary" onClick={continueWithoutRecognition}>Continue</Button>
            </div>
          )}
          maskClosable={false}
          open={fallbackPromptReason !== null}
          title="Pose recognition unavailable"
          typewriter={false}
          onClose={cancelFallbackPrompt}
        >
          <p className="fallback-dialog-copy">{fallbackPromptReason}</p>
          <p className="fallback-dialog-copy">Continue with a five-second timer for each remaining movement?</p>
        </Modal>
      </div>
    </Cursor>
  )
}

export default App
