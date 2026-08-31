import { Cursor } from 'animal-island-ui'
import { useEffect, useRef, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { MovementScreen } from './components/MovementScreen'
import { QuizScreen } from './components/QuizScreen'
import { ResultScreen } from './components/ResultScreen'
import { createRandomMovementOrder, createRandomQuizOrder, getTreeStage, movements, questionsPerRound, quizQuestions, scoreQuiz } from './game'

type Screen = 'movement' | 'quiz' | 'result'
const holdSeconds = 5

function App() {
  const [screen, setScreen] = useState<Screen>('movement')
  const [movementIndex, setMovementIndex] = useState(0)
  const [movementOrder, setMovementOrder] = useState(() => createRandomMovementOrder(movements.length))
  const [quizOrder, setQuizOrder] = useState(() => createRandomQuizOrder(quizQuestions.length))
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isShowingAnswer, setIsShowingAnswer] = useState(false)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [playRequest, setPlayRequest] = useState(0)
  const [secondsRemaining, setSecondsRemaining] = useState(holdSeconds)
  const [points, setPoints] = useState(0)
  const completedMovementRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isHolding || secondsRemaining === 0) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setSecondsRemaining((seconds) => Math.max(0, seconds - 1))
    }, 1_000)

    return () => window.clearInterval(timer)
  }, [isHolding, secondsRemaining])

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

  useEffect(() => {
    if (!isHolding || secondsRemaining !== 0 || completedMovementRef.current === movementIndex) return

    // React Strict Mode can replay effects; each movement index can advance only once.
    completedMovementRef.current = movementIndex
    nextMovement()
  }, [isHolding, movementIndex, secondsRemaining])

  function resetRound() {
    completedMovementRef.current = null
    setMovementIndex(0)
    setMovementOrder(createRandomMovementOrder(movements.length))
    setQuizOrder(createRandomQuizOrder(quizQuestions.length))
    setQuizQuestionIndex(0)
    setSelectedAnswer(null)
    setIsShowingAnswer(false)
    setCorrectAnswers(0)
    setIsHolding(false)
    setPlayRequest(0)
    setSecondsRemaining(holdSeconds)
    setPoints(0)
  }

  function startHold() {
    setPlayRequest((request) => request + 1)
  }

  function startCountdown() {
    setSecondsRemaining(holdSeconds)
    setIsHolding(true)
  }

  function nextMovement() {
    if (movementIndex === movements.length - 1) {
      setIsHolding(false)
      setScreen('quiz')
      return
    }

    setIsHolding(false)
    setMovementIndex((index) => index + 1)
    setSecondsRemaining(holdSeconds)
    setPlayRequest((request) => request + 1)
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

  function openQuiz() {
    setIsHolding(false)
    setScreen('quiz')
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
    <button aria-label="Open quiz" className="round-preview quiz-header-preview" type="button" onClick={openQuiz}>
      <img alt="A tūī bird, the quiz subject" src="/assets/tui.png" />
      <div>
        <span>Coming up</span>
        <strong>Quiz after {movements.length} movement</strong>
      </div>
    </button>
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
            isHolding={isHolding}
            movement={movements[movementOrder[movementIndex]]}
            playRequest={playRequest}
            secondsRemaining={secondsRemaining}
            totalMovements={movements.length}
            onPlaybackStart={startCountdown}
            onStart={startHold}
          />
        ) : null}
        {screen === 'quiz' ? <QuizScreen currentQuestion={quizQuestionIndex + 1} isShowingAnswer={isShowingAnswer} quiz={activeQuiz} selectedAnswer={selectedAnswer} totalQuestions={questionsPerRound} onAnswer={answerQuiz} /> : null}
        {screen === 'result' ? <ResultScreen correctAnswers={correctAnswers} points={points} totalQuestions={questionsPerRound} treeStage={treeStage} onFinish={finishRound} onPlayAgain={playAgain} /> : null}
      </div>
    </Cursor>
  )
}

export default App
