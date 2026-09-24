import { Button, Cursor, Modal } from 'animal-island-ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { type RecognitionStatus } from './components/CameraPreview'
import { MovementScreen } from './components/MovementScreen'
import { ModeSelectionScreen } from './components/ModeSelectionScreen'
import { QuizScreen } from './components/QuizScreen'
import { ResultScreen } from './components/ResultScreen'
import { ScoreRecordList } from './components/ScoreRecordList'
import { createBalancedAnswerOrders, createRandomMovementOrder, createRandomQuizOrder, getTreeStage, movements, questionsPerRound, quizQuestions, scoreQuiz, seatedMovements, treeStages } from './game'
import { requiredMovementDurationMs } from './poseRecognition'
import { clearScoreHistory, loadScoreHistory, saveScoreHistory, totalScore } from './scoreHistory'

type Screen = 'selection' | 'movement' | 'quiz' | 'result'
type MovementPhase = 'idle' | 'waitingForRecognition' | 'recognizing' | 'countdown'
type MovementStyle = 'standing' | 'seated'

const countdownSeconds = requiredMovementDurationMs / 1_000
const quizIntroCountdownSeconds = 3

function preloadRoundImages(quizOrder: number[]) {
  const quizImages = quizOrder.flatMap((index) => {
    const image = quizQuestions[index].image
    return image ? [image.src] : []
  })
  const urls = ['/assets/quiz-gesture-guide.webp', ...quizImages, ...treeStages.map((stage) => stage.imageSrc)]

  return urls.map((src) => {
    const image = new Image()
    image.decoding = 'async'
    image.fetchPriority = 'low'
    image.src = src
    if (typeof image.decode === 'function') {
      void image.decode().catch(() => undefined)
    }
    return image
  })
}

function App() {
  const [screen, setScreen] = useState<Screen>('selection')
  const [movementStyle, setMovementStyle] = useState<MovementStyle>('standing')
  const [movementIndex, setMovementIndex] = useState(0)
  const [movementOrder, setMovementOrder] = useState(() => createRandomMovementOrder(movements.length))
  const [quizOrder, setQuizOrder] = useState(() => createRandomQuizOrder(quizQuestions.length))
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0)
  const [quizIntroVisible, setQuizIntroVisible] = useState(false)
  const [quizIntroSecondsRemaining, setQuizIntroSecondsRemaining] = useState(quizIntroCountdownSeconds)
  const [answerOrders, setAnswerOrders] = useState(() => createBalancedAnswerOrders(quizOrder.map((index) => quizQuestions[index])))
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
  const [historyState, setHistoryState] = useState(loadScoreHistory)
  const [historyOpen, setHistoryOpen] = useState(false)
  const points = screen === 'result' ? scoreQuiz(correctAnswers) : 0
  const totalPoints = totalScore(historyState.records)
  const activeMovements = movementStyle === 'seated' ? seatedMovements : movements
  const movementIndexRef = useRef(0)
  const screenRef = useRef<Screen>('selection')
  const screenHistoryRef = useRef<Screen[]>([])
  const preloadedImagesRef = useRef<HTMLImageElement[]>([])
  const historyRef = useRef(historyState.records)
  const savedRoundRef = useRef(false)
  const quizIntroRemainingRef = useRef(quizIntroCountdownSeconds)

  const navigateToScreen = useCallback((nextScreen: Screen) => {
    if (screenRef.current === nextScreen) {
      return
    }

    screenHistoryRef.current.push(screenRef.current)
    screenRef.current = nextScreen
    setScreen(nextScreen)
  }, [])

  function goBack() {
    if (screenRef.current === 'result') {
      resetRound()
      return
    }
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
  }

  useEffect(() => {
    if (screen !== 'quiz' || !quizIntroVisible || historyOpen) return undefined
    const timer = window.setInterval(() => {
      if (quizIntroRemainingRef.current <= 1) {
        setQuizIntroVisible(false)
      } else {
        quizIntroRemainingRef.current -= 1
        setQuizIntroSecondsRemaining(quizIntroRemainingRef.current)
      }
    }, 1_000)
    return () => window.clearInterval(timer)
  }, [screen, quizIntroVisible, historyOpen])

  useEffect(() => {
    if (!isShowingAnswer || historyOpen) {
      return undefined
    }

    const answerTimer = window.setTimeout(() => {
      if (quizQuestionIndex === questionsPerRound - 1) {
        if (!savedRoundRef.current) {
          savedRoundRef.current = true
          const records = [...historyRef.current, {
            completedAt: new Date().toISOString(),
            correctAnswers,
            points: scoreQuiz(correctAnswers),
          }]
          historyRef.current = records
          setHistoryState({ records, error: saveScoreHistory(records) ? null : 'Scores could not be saved on this device.' })
        }
        navigateToScreen('result')
        return
      }

      const nextQuestionIndex = quizQuestionIndex + 1
      setQuizQuestionIndex(nextQuestionIndex)
      setSelectedAnswer(null)
      setIsShowingAnswer(false)
    }, 1_000)

    return () => window.clearTimeout(answerTimer)
  }, [correctAnswers, historyOpen, isShowingAnswer, navigateToScreen, quizQuestionIndex, quizOrder])

  const beginCountdown = useCallback(() => {
    setMovementPhase('countdown')
    setSecondsRemaining(countdownSeconds)
  }, [])

  const advanceMovement = useCallback(() => {
    const currentMovementIndex = movementIndexRef.current
    if (currentMovementIndex === activeMovements.length - 1) {
      setMovementPhase('idle')
      quizIntroRemainingRef.current = quizIntroCountdownSeconds
      setQuizIntroSecondsRemaining(quizIntroCountdownSeconds)
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
    if (movementPhase !== 'countdown' || historyOpen) {
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
  }, [advanceMovement, historyOpen, movementPhase, secondsRemaining])

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

    preloadedImagesRef.current = []
    movementIndexRef.current = 0
    setMovementIndex(0)
    setMovementStyle('standing')
    setMovementOrder(createRandomMovementOrder(movements.length))
    setQuizOrder(nextQuizOrder)
    setQuizQuestionIndex(0)
    setQuizIntroSecondsRemaining(quizIntroCountdownSeconds)
    quizIntroRemainingRef.current = quizIntroCountdownSeconds
    setQuizIntroVisible(false)
    setAnswerOrders(createBalancedAnswerOrders(nextQuizOrder.map((index) => quizQuestions[index])))
    setSelectedAnswer(null)
    setIsShowingAnswer(false)
    setCorrectAnswers(0)
    setMovementPhase('idle')
    setFallbackTimerEnabled(false)
    setFallbackPromptReason(null)
    setPlayRequest(0)
    setActiveDurationMs(0)
    setSecondsRemaining(countdownSeconds)
    savedRoundRef.current = false
    setHistoryOpen(false)
    screenHistoryRef.current = []
    screenRef.current = 'selection'
    setScreen('selection')
  }

  function startRound(style: MovementStyle) {
    const selectedMovements = style === 'seated' ? seatedMovements : movements
    const nextMovementOrder = createRandomMovementOrder(selectedMovements.length)
    const nextQuizOrder = createRandomQuizOrder(quizQuestions.length)

    preloadedImagesRef.current = preloadRoundImages(nextQuizOrder)
    movementIndexRef.current = 0
    setMovementStyle(style)
    setMovementIndex(0)
    setMovementOrder(nextMovementOrder)
    setQuizOrder(nextQuizOrder)
    setQuizQuestionIndex(0)
    setQuizIntroSecondsRemaining(quizIntroCountdownSeconds)
    quizIntroRemainingRef.current = quizIntroCountdownSeconds
    setQuizIntroVisible(false)
    setAnswerOrders(createBalancedAnswerOrders(nextQuizOrder.map((index) => quizQuestions[index])))
    setSelectedAnswer(null)
    setIsShowingAnswer(false)
    setCorrectAnswers(0)
    setMovementPhase('idle')
    setFallbackTimerEnabled(false)
    setFallbackPromptReason(null)
    setPlayRequest(0)
    setActiveDurationMs(0)
    setSecondsRemaining(countdownSeconds)
    savedRoundRef.current = false
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
    if (screenRef.current !== 'quiz' || quizIntroVisible || isShowingAnswer || historyOpen) {
      return
    }

    setSelectedAnswer(answer)
    setIsShowingAnswer(true)

    if (answer === activeQuiz.correctAnswer) {
      setCorrectAnswers((count) => count + 1)
    }
  }

  function clearRecords() {
    if (!window.confirm('Clear all saved score records? This cannot be undone.')) return
    if (!clearScoreHistory()) {
      setHistoryState((current) => ({ ...current, error: 'Saved scores could not be cleared.' }))
      return
    }
    historyRef.current = []
    setHistoryState({ records: [], error: null })
  }

  const treeStage = getTreeStage(totalPoints)
  const activeQuiz = quizQuestions[quizOrder[quizQuestionIndex]]
  return (
    <Cursor>
      <div className="app-shell">
        <AppHeader
          canGoBack={screenHistoryRef.current.length > 0}
          onGoBack={goBack}
          onGoHome={resetRound}
          onOpenRecords={() => setHistoryOpen(true)}
          points={totalPoints}
          treeStage={treeStage}
        />
        {historyState.error ? <p className="storage-notice" role="status">{historyState.error}</p> : null}
        {screen === 'selection' ? <ModeSelectionScreen onChooseStanding={() => startRound('standing')} onChooseSeated={() => startRound('seated')} /> : null}
        {screen === 'movement' ? (
          <MovementScreen
            currentMovement={movementIndex + 1}
            isCountingDown={movementPhase === 'countdown'}
            isTracking={movementPhase === 'recognizing'}
            isPaused={historyOpen}
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
        {screen === 'quiz' ? <QuizScreen answerOrder={answerOrders[quizQuestionIndex]} currentQuestion={quizQuestionIndex + 1} introSecondsRemaining={quizIntroSecondsRemaining} isIntroVisible={quizIntroVisible} isShowingAnswer={isShowingAnswer} isPaused={historyOpen} quiz={activeQuiz} selectedAnswer={selectedAnswer} totalQuestions={questionsPerRound} onAnswer={answerQuiz} /> : null}
        {screen === 'result' ? <ResultScreen correctAnswers={correctAnswers} points={points} totalPoints={totalPoints} totalQuestions={questionsPerRound} treeStage={treeStage} records={historyState.records} onClearRecords={clearRecords} onPlayAgain={resetRound} /> : null}
        <Modal
          className="records-modal"
          footer={<Button htmlType="button" size="large" onClick={() => setHistoryOpen(false)}>Close</Button>}
          open={historyOpen}
          title="Score history"
          typewriter={false}
          onClose={() => setHistoryOpen(false)}
        >
          <p className="records-total">Total Wellbeing Points: <strong>{totalPoints}</strong></p>
          <ScoreRecordList records={historyState.records} />
          {historyState.records.length > 0 || historyState.error ? <button className="text-link" type="button" onClick={clearRecords}>Clear all records</button> : null}
        </Modal>
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
