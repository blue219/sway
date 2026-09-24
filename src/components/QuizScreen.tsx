import { Button } from 'animal-island-ui'
import { useState } from 'react'
import type { QuizQuestion } from '../game'
import type { QuizChoice } from '../quizRecognition'
import { CelebrationBursts } from './CelebrationBursts'
import { QuizCameraPreview } from './QuizCameraPreview'

type QuizScreenProps = {
  answerOrder: string[]
  quiz: QuizQuestion
  currentQuestion: number
  totalQuestions: number
  selectedAnswer: string | null
  introSecondsRemaining: number
  isShowingAnswer: boolean
  isIntroVisible: boolean
  isPaused: boolean
  onAnswer: (answer: string) => void
}

export function QuizScreen({ answerOrder, quiz, currentQuestion, totalQuestions, selectedAnswer, introSecondsRemaining, isShowingAnswer, isIntroVisible, isPaused, onAnswer }: QuizScreenProps) {
  const [isReplayingGuide, setIsReplayingGuide] = useState(false)
  const [hasReplayedGuide, setHasReplayedGuide] = useState(false)
  const guideVisible = isIntroVisible || isReplayingGuide
  const isGestureActive = !guideVisible && !isShowingAnswer

  function answerWithGesture(choice: QuizChoice) {
    if (isGestureActive) {
      onAnswer(answerOrder[choice === 'A' ? 0 : 1])
    }
  }

  return (
    <main aria-label="Quiz" className="movement-screen quiz-round-screen">
      <section aria-label={guideVisible ? 'Hand choice guide' : 'Quiz question'} className="movement-action-card quiz-action-card">
        {guideVisible ? (
          <div className="quiz-guide">
            <div className="quiz-guide-image-wrap">
              <img alt="Raise your left hand to choose A, or your right hand to choose B." src="/assets/quiz-gesture-guide.webp" />
              {isIntroVisible && !isReplayingGuide ? <span aria-label={`${introSecondsRemaining} second${introSecondsRemaining === 1 ? '' : 's'} until quiz`} aria-live="polite" className="quiz-guide-countdown">{introSecondsRemaining}</span> : null}
            </div>
            <p className="quiz-guide-caption">Left hand: A · Right hand: B</p>
            {isReplayingGuide ? <Button className="quiz-guide-close" disabled={isPaused} htmlType="button" size="large" onClick={() => setIsReplayingGuide(false)}>Close guide</Button> : null}
          </div>
        ) : (
          <>
            <div className="quiz-question-heading">
              <span className="movement-index">Question {currentQuestion} of {totalQuestions}</span>
              <Button disabled={isPaused} htmlType="button" size="large" onClick={() => {
                setHasReplayedGuide(true)
                setIsReplayingGuide(true)
              }}>View hand guide</Button>
            </div>
            <div className="quiz-question-body">
              <img alt={quiz.image?.alt ?? ''} className="quiz-illustration" src={quiz.image?.src} />
              <h1 id="quiz-title">{quiz.question}</h1>
              <div aria-labelledby="quiz-title" className="quiz-answer-options" role="group">
                {answerOrder.map((answer, index) => {
                  const letter = index === 0 ? 'A' : 'B'
                  const feedback = isShowingAnswer && answer === quiz.correctAnswer
                    ? ' quiz-option-correct'
                    : isShowingAnswer && answer === selectedAnswer
                      ? ' quiz-option-incorrect'
                      : ''
                  return (
                    <div className="quiz-answer-wrap" key={answer}>
                      <button
                        aria-label={`Option ${letter}: ${answer}`}
                        className={`quiz-answer-button${feedback}`}
                        disabled={isShowingAnswer || isPaused}
                        type="button"
                        onClick={() => onAnswer(answer)}
                      >
                        <strong>{letter}</strong><span>{answer}</span>
                      </button>
                      {isShowingAnswer && selectedAnswer === answer && answer === quiz.correctAnswer ? <CelebrationBursts variant="answer" /> : null}
                    </div>
                  )
                })}
              </div>
              <p aria-live="polite" className="screen-reader-only">
                {isShowingAnswer ? `Correct answer: ${quiz.correctAnswer}` : ''}
              </p>
            </div>
          </>
        )}
      </section>
      <QuizCameraPreview
        isActive={isGestureActive}
        isPaused={isPaused}
        onChoice={answerWithGesture}
        questionKey={currentQuestion}
        waitForIdle={currentQuestion > 1 || hasReplayedGuide}
      />
    </main>
  )
}
