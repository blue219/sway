import { Button, Cursor, Modal } from 'animal-island-ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { type RecognitionStatus } from './components/CameraPreview'
import { MovementScreen } from './components/MovementScreen'
import { ModeSelectionScreen } from './components/ModeSelectionScreen'
import { QuizScreen } from './components/QuizScreen'
import { ResultScreen } from './components/ResultScreen'
import { createRandomAnswerOrder, createRandomMovementOrder, createRandomQuizOrder, getTreeStage, movements, questionsPerRound, quizQuestions, scoreQuiz, seatedMovements } from './game'
import { requiredMovementDurationMs } from './poseRecognition'

type Screen = 'selection' | 'movement' | 'quiz' | 'result'
type MovementPhase = 'idle' | 'waitingForRecognition' | 'recognizing' | 'countdown'
type MovementStyle = 'standing' | 'seated'

const countdownSeconds = requiredMovementDurationMs / 1_000

function App() {
  const [screen, setScreen] = useState<Screen>('selection')
  const [movementStyle, setMovementStyle] = useState<MovementStyle>('standing')
  const [movementIndex, setMovementIndex] = useState(0)
  const [movementOrder, setMovementOrder] = useState(() => createRandomMovementOrder(movements.length))
  const [quizOrder, setQuizOrder] = useState(() => createRandomQuizOrder(quizQuestions.length))
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0)
  const [quizIntroVisible, setQuizIntroVisible] = useState(false)
  const [answerOrder, setAnswerOrder] = useState(() => createRandomAnswerOrder(quizQuestions[quizOrder[0]].options))
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isShowingAnswer, setIsShowingAnswer] = useState(false)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [movementPhase, setMovementPhase] = useState<MovementPhase>('idle')
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>({ kind: 'checking' })
  const [fallbackTimerEnabled, setFallbackTimerEnabled] = useState(false)
  const [fallbackPromptReason, setFallbackPromptReason] = useState<string | null>(null)
  const [playRequest, setPlayRequest] = useState(0)
  const [activeDurationMs, setActiveDurationMs] = useState(0)
  const [secondsRemaining, setSecondsRemaining] = useState(countdownSeconds)
  const points = screen === 'result' ? scoreQuiz(correctAnswers) : 0
  const activeMovements = movementStyle === 'seated' ? seatedMovements : movements
  const movementIndexRef = useRef(0)
  const screenRef = useRef<Screen>('selection')
  const screenHistoryRef = useRef<Screen[]>([])

  const navigateToScreen = useCallback((nextScreen: Screen) => {
    if (screenRef.current === nextScreen) {
      return
    }

    screenHistoryRef.current.push(screenRef.current)
    screenRef.current = nextScreen
    setScreen(nextScreen)
  }, [])

  const goBack = useCallback(() => {
    const previousScreen = screenHistoryRef.current.pop()
    if (!previousScreen) {
      return
    }

    const currentScreen = screenRef.current
    screenRef.current = previousScreen
    setScreen(previousScreen)

    if (currentScreen === 'movement') {
      setMovementPhase('idle')
      setActiveDurationMs(0)
      setFallbackPromptReason(null)
    }

    if (currentScreen === 'quiz' && previousScreen === 'movement') {
      setQuizIntroVisible(false)
      const currentQuiz = quizQuestions[quizOrder[quizQuestionIndex]]
      if (isShowingAnswer && selectedAnswer === currentQuiz.correctAnswer) {
        setCorrectAnswers((count) => Math.max(0, count - 1))
      }
      setSelectedAnswer(null)
      setIsShowingAnswer(false)
      setMovementPhase('idle')
      setActiveDurationMs(0)
      setFallbackPromptReason(null)
      setPlayRequest((request) => request + 1)
    }
  }, [isShowingAnswer, quizOrder, quizQuestionIndex, selectedAnswer])

  useEffect(() => {
    if (screen !== 'quiz' || !quizIntroVisible) return undefined
    const guideTimer = window.setTimeout(() => setQuizIntroVisible(false), 3_000)
    return () => window.clearTimeout(guideTimer)
  }, [screen, quizIntroVisible])

  useEffect(() => {
    if (!isShowingAnswer) {
      return undefined
    }

    const answerTimer = window.setTimeout(() => {
      if (quizQuestionIndex === questionsPerRound - 1) {
        navigateToScreen('result')
        return
      }

      const nextQuestionIndex = quizQuestionIndex + 1
      setQuizQuestionIndex(nextQuestionIndex)
      setAnswerOrder(createRandomAnswerOrder(quizQuestions[quizOrder[nextQuestionIndex]].options))
      setSelectedAnswer(null)
      setIsShowingAnswer(false)
    }, 1_000)

    return () => window.clearTimeout(answerTimer)
  }, [isShowingAnswer, navigateToScreen, quizQuestionIndex, quizOrder])

  const beginCountdown = useCallback(() => {
    setMovementPhase('countdown')
    setSecondsRemaining(countdownSeconds)
  }, [])

  const advanceMovement = useCallback(() => {
    const currentMovementIndex = movementIndexRef.current
    if (currentMovementIndex === activeMovements.length - 1) {
      setMovementPhase('idle')
      setQuizIntroVisible(true)
      navigateToScreen('quiz')
      return
    }

    movementIndexRef.current = currentMovementIndex + 1
    setMovementIndex(currentMovementIndex + 1)
    setActiveDurationMs(0)
    setPlayRequest((request) => request + 1)

    const nextMovement = activeMovements[movementOrder[currentMovementIndex + 1]]
    if (fallbackTimerEnabled || nextMovement.usePoseRecognition === false) {
      if (fallbackTimerEnabled) {
        beginCountdown()
      } else {
        setMovementPhase('idle')
      }
      return
    }
    // Wait for the next movement's dedicated model before starting recognition.
    setRecognitionStatus({ kind: 'checking' })
    setMovementPhase('waitingForRecognition')
  }, [activeMovements, beginCountdown, fallbackTimerEnabled, movementOrder, navigateToScreen])

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
    const nextQuizOrder = createRandomQuizOrder(quizQuestions.length)

    movementIndexRef.current = 0
    setMovementIndex(0)
    setMovementStyle('standing')
    setMovementOrder(createRandomMovementOrder(movements.length))
    setQuizOrder(nextQuizOrder)
    setQuizQuestionIndex(0)
    setQuizIntroVisible(false)
    setAnswerOrder(createRandomAnswerOrder(quizQuestions[nextQuizOrder[0]].options))
    setSelectedAnswer(null)
    setIsShowingAnswer(false)
    setCorrectAnswers(0)
    setMovementPhase('idle')
    setFallbackTimerEnabled(false)
    setFallbackPromptReason(null)
    setPlayRequest(0)
    setActiveDurationMs(0)
    setSecondsRemaining(countdownSeconds)
    screenHistoryRef.current = []
    screenRef.current = 'selection'
    setScreen('selection')
  }

  function startRound(style: MovementStyle) {
    const selectedMovements = style === 'seated' ? seatedMovements : movements
    const nextMovementOrder = createRandomMovementOrder(selectedMovements.length)
    const nextQuizOrder = createRandomQuizOrder(quizQuestions.length)

    movementIndexRef.current = 0
    setMovementStyle(style)
    setMovementIndex(0)
    setMovementOrder(nextMovementOrder)
    setQuizOrder(nextQuizOrder)
    setQuizQuestionIndex(0)
    setQuizIntroVisible(false)
    setAnswerOrder(createRandomAnswerOrder(quizQuestions[nextQuizOrder[0]].options))
    setSelectedAnswer(null)
    setIsShowingAnswer(false)
    setCorrectAnswers(0)
    setMovementPhase('idle')
    setFallbackTimerEnabled(false)
    setFallbackPromptReason(null)
    setPlayRequest(0)
    setActiveDurationMs(0)
    setSecondsRemaining(countdownSeconds)
    navigateToScreen('movement')
  }

  function startMovement() {
    setActiveDurationMs(0)
    setFallbackPromptReason(null)
    setPlayRequest((request) => request + 1)

    if (fallbackTimerEnabled) {
      beginCountdown()
      return
    }

    const currentMovement = activeMovements[movementOrder[movementIndex]]
    if (currentMovement.usePoseRecognition === false) {
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

  function continueWithoutRecognition() {
    setFallbackTimerEnabled(true)
    setFallbackPromptReason(null)
    setActiveDurationMs(0)
    beginCountdown()
  }

  function cancelFallbackPrompt() {
    setFallbackPromptReason(null)
    setMovementPhase('idle')
  }

  function answerQuiz(answer: string) {
    if (screenRef.current !== 'quiz' || quizIntroVisible || isShowingAnswer) {
      return
    }

    setSelectedAnswer(answer)
    setIsShowingAnswer(true)

    if (answer === activeQuiz.correctAnswer) {
      setCorrectAnswers((count) => count + 1)
    }
  }

  const treeStage = getTreeStage(points)
  const activeQuiz = quizQuestions[quizOrder[quizQuestionIndex]]
  const roundPreview = screen === 'movement' ? (
    <div className="round-preview quiz-header-preview">
      <div>
        <span>Coming up</span>
        <strong>Quiz after {activeMovements.length} {activeMovements.length === 1 ? 'movement' : 'movements'}</strong>
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
        <AppHeader
          canGoBack={screenHistoryRef.current.length > 0}
          onGoBack={goBack}
          onGoHome={resetRound}
          points={points}
          roundPreview={roundPreview}
          treeStage={treeStage}
        />
        {screen === 'selection' ? <ModeSelectionScreen onChooseStanding={() => startRound('standing')} onChooseSeated={() => startRound('seated')} /> : null}
        {screen === 'movement' ? (
          <MovementScreen
            currentMovement={movementIndex + 1}
            isCountingDown={movementPhase === 'countdown'}
            isTracking={movementPhase === 'recognizing'}
            isWaitingForRecognition={movementPhase === 'waitingForRecognition'}
            movement={activeMovements[movementOrder[movementIndex]]}
            usePoseRecognition={activeMovements[movementOrder[movementIndex]].usePoseRecognition !== false}
            playRequest={playRequest}
            activeDurationMs={activeDurationMs}
            secondsRemaining={secondsRemaining}
            totalMovements={activeMovements.length}
            onRecognitionComplete={advanceMovement}
            onRecognitionStatusChange={setRecognitionStatus}
            onActiveDurationChange={setActiveDurationMs}
            onSkip={advanceMovement}
            onStart={startMovement}
          />
        ) : null}
        {screen === 'quiz' ? <QuizScreen answerOrder={answerOrder} currentQuestion={quizQuestionIndex + 1} isIntroVisible={quizIntroVisible} isShowingAnswer={isShowingAnswer} quiz={activeQuiz} selectedAnswer={selectedAnswer} totalQuestions={questionsPerRound} onAnswer={answerQuiz} /> : null}
        {screen === 'result' ? <ResultScreen correctAnswers={correctAnswers} points={points} totalQuestions={questionsPerRound} treeStage={treeStage} onFinish={resetRound} onPlayAgain={resetRound} /> : null}
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
