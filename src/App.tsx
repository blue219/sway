import { Cursor } from 'animal-island-ui'
import { useEffect, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { ModeSelection } from './components/ModeSelection'
import { MovementScreen } from './components/MovementScreen'
import { PauseDialog } from './components/PauseDialog'
import { QuizScreen } from './components/QuizScreen'
import { ResultScreen } from './components/ResultScreen'
import { createRandomMovementOrder, getTreeStage, movements, quiz, scoreQuiz, type PlayMode } from './game'

type Screen = 'mode-select' | 'movement' | 'quiz' | 'result'
const holdSeconds = 5

function App() {
  const [screen, setScreen] = useState<Screen>('mode-select')
  const [mode, setMode] = useState<PlayMode>('seated')
  const [movementIndex, setMovementIndex] = useState(0)
  const [movementOrder, setMovementOrder] = useState(() => createRandomMovementOrder(movements.seated.length))
  const [isHolding, setIsHolding] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(holdSeconds)
  const [points, setPoints] = useState(0)

  useEffect(() => {
    if (!isHolding || isPaused || secondsRemaining === 0) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setSecondsRemaining((seconds) => Math.max(0, seconds - 1))
    }, 1_000)

    return () => window.clearInterval(timer)
  }, [isHolding, isPaused, secondsRemaining])

  useEffect(() => {
    if (isHolding && !isPaused && secondsRemaining === 0) {
      nextMovement()
    }
  }, [isHolding, isPaused, secondsRemaining])

  function resetRound(nextMode = mode) {
    setMovementIndex(0)
    setMovementOrder(createRandomMovementOrder(movements[nextMode].length))
    setIsHolding(false)
    setIsPaused(false)
    setSecondsRemaining(holdSeconds)
    setPoints(0)
  }

  function chooseMode(nextMode: PlayMode) {
    resetRound(nextMode)
    setMode(nextMode)
    setScreen('movement')
  }

  function startHold() {
    setSecondsRemaining(holdSeconds)
    setIsHolding(true)
  }

  function nextMovement() {
    if (movementIndex === movements[mode].length - 1) {
      setIsHolding(false)
      setScreen('quiz')
      return
    }

    setMovementIndex((index) => index + 1)
    setSecondsRemaining(holdSeconds)
  }

  function answerQuiz(answer: string) {
    setPoints(scoreQuiz(movements[mode].length, answer === quiz.correctAnswer))
    setScreen('result')
  }

  function finishRound() {
    resetRound()
    setScreen('mode-select')
  }

  function playAgain() {
    resetRound()
    setScreen('movement')
  }

  const treeStage = getTreeStage(points)
  const activeMovements = movements[mode]
  const roundPreview = screen === 'movement' ? (
    <div className="round-preview quiz-header-preview">
      <img alt="A tūī bird, the quiz subject" src="/assets/tui.png" />
      <div>
        <span>Coming up</span>
        <strong>Quiz after 5 movements</strong>
      </div>
    </div>
  ) : screen === 'quiz' ? (
    <div className="round-preview movement-header-preview">
      <span>5 movements complete</span>
      <strong>Your movement round is done</strong>
    </div>
  ) : undefined

  return (
    <Cursor>
      <div className="app-shell">
        <AppHeader points={points} roundPreview={roundPreview} treeStage={treeStage} />
        {screen === 'mode-select' ? <ModeSelection onSelect={chooseMode} /> : null}
        {screen === 'movement' ? (
          <MovementScreen
            currentMovement={movementIndex + 1}
            isHolding={isHolding}
            movement={activeMovements[movementOrder[movementIndex]]}
            secondsRemaining={secondsRemaining}
            totalMovements={activeMovements.length}
            onPause={() => setIsPaused(true)}
            onStart={startHold}
          />
        ) : null}
        {screen === 'quiz' ? <QuizScreen onAnswer={answerQuiz} /> : null}
        {screen === 'result' ? <ResultScreen points={points} treeStage={treeStage} onFinish={finishRound} onPlayAgain={playAgain} /> : null}
        {screen === 'movement' && isPaused ? <PauseDialog onEnd={finishRound} onResume={() => setIsPaused(false)} /> : null}
      </div>
    </Cursor>
  )
}

export default App
