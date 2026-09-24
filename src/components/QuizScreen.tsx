import { Button } from 'animal-island-ui'
import { useState } from 'react'
import type { QuizQuestion } from '../game'
import type { QuizChoice } from '../quizRecognition'
import { QuizCameraPreview } from './QuizCameraPreview'

type QuizScreenProps = {
  answerOrder: string[]
  quiz: QuizQuestion
  currentQuestion: number
  totalQuestions: number
  selectedAnswer: string | null
  isShowingAnswer: boolean
  isIntroVisible: boolean
  onAnswer: (answer: string) => void
}

export function QuizScreen({ answerOrder, quiz, currentQuestion, totalQuestions, selectedAnswer, isShowingAnswer, isIntroVisible, onAnswer }: QuizScreenProps) {
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
            <img alt="Raise your left hand to choose A, or your right hand to choose B." src="/assets/quiz-gesture-guide.png" />
            <p className="quiz-guide-caption">Left hand: A · Right hand: B</p>
            {isReplayingGuide ? <Button className="quiz-guide-close" htmlType="button" size="large" onClick={() => setIsReplayingGuide(false)}>Close guide</Button> : null}
          </div>
        ) : (
          <>
            <div className="quiz-question-heading">
              <span className="movement-index">Question {currentQuestion} of {totalQuestions}</span>
              <Button htmlType="button" size="large" onClick={() => {
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
                    <button
                      aria-label={`Option ${letter}: ${answer}`}
                      className={`quiz-answer-button${feedback}`}
                      disabled={isShowingAnswer}
                      type="button"
                      key={answer}
                      onClick={() => onAnswer(answer)}
                    >
                      <strong>{letter}</strong><span>{answer}</span>
                    </button>
                  )
                })}
              </div>
              <p aria-live="polite" className="quiz-feedback-message">
                {isShowingAnswer ? `Correct answer: ${quiz.correctAnswer}` : ''}
              </p>
            </div>
          </>
        )}
      </section>
      <QuizCameraPreview
        isActive={isGestureActive}
        onChoice={answerWithGesture}
        questionKey={currentQuestion}
        waitForIdle={currentQuestion > 1 || hasReplayedGuide}
      />
    </main>
  )
}
