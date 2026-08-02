import { Cursor } from 'animal-island-ui'
import { useEffect, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { ModeSelection } from './components/ModeSelection'
import { MovementScreen } from './components/MovementScreen'
import { PauseDialog } from './components/PauseDialog'
import { QuizScreen } from './components/QuizScreen'
import { ResultScreen } from './components/ResultScreen'
import { getTreeStage, movements, quiz, scoreQuiz, type PlayMode } from './game'

type Screen = 'mode-select' | 'movement' | 'quiz' | 'result'

function App() {
  const [screen, setScreen] = useState<Screen>('mode-select')
  const [mode, setMode] = useState<PlayMode>('seated')
  const [movementIndex, setMovementIndex] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(4)
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

  function resetRound() {
    setMovementIndex(0)
    setIsHolding(false)
    setIsPaused(false)
    setSecondsRemaining(4)
    setPoints(0)
  }

  function chooseMode(nextMode: PlayMode) {
    resetRound()
    setMode(nextMode)
    setScreen('movement')
  }

  function startHold() {
    setSecondsRemaining(4)
    setIsHolding(true)
  }

  function nextMovement() {
    if (movementIndex === movements[mode].length - 1) {
      setIsHolding(false)
      setScreen('quiz')
      return
    }

    setMovementIndex((index) => index + 1)
    setSecondsRemaining(4)
    setIsHolding(false)
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

  return (
    <Cursor>
      <div className="app-shell">
        <AppHeader points={points} treeStage={treeStage} />
        {screen === 'mode-select' ? <ModeSelection onSelect={chooseMode} /> : null}
        {screen === 'movement' ? (
          <MovementScreen
            isHolding={isHolding}
            mode={mode}
            movement={movements[mode][movementIndex]}
            movementIndex={movementIndex}
            secondsRemaining={secondsRemaining}
            onNext={nextMovement}
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
