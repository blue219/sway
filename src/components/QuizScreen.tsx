import { Card, Radio } from 'animal-island-ui'
import type { QuizQuestion } from '../game'

type QuizScreenProps = {
  quiz: QuizQuestion
  currentQuestion: number
  totalQuestions: number
  selectedAnswer: string | null
  isShowingAnswer: boolean
  onAnswer: (answer: string) => void
}

export function QuizScreen({ quiz, currentQuestion, totalQuestions, selectedAnswer, isShowingAnswer, onAnswer }: QuizScreenProps) {
  return (
    <main className="screen quiz-screen">
      <Card className={`quiz-panel${quiz.image ? '' : ' quiz-panel-text-only'}`} color="app-teal" pattern="app-teal" aria-labelledby="quiz-title">
        {quiz.image ? (
          <div className="quiz-image-wrap">
            <img alt={quiz.image.alt} src={quiz.image.src} />
          </div>
        ) : null}
        <div className="quiz-content">
          <p className="quiz-progress">Question {currentQuestion} of {totalQuestions}</p>
          <h1 id="quiz-title">{quiz.question}</h1>
          <Radio
            className="quiz-options"
            disabled={isShowingAnswer}
            direction="vertical"
            key={currentQuestion}
            onChange={(answer) => onAnswer(String(answer))}
            options={quiz.options.map((option, index) => ({
              label: (
                <span className={`quiz-option-feedback${isShowingAnswer && option === quiz.correctAnswer ? ' quiz-option-feedback-correct' : ''}${isShowingAnswer && option === selectedAnswer && option !== quiz.correctAnswer ? ' quiz-option-feedback-incorrect' : ''}`}>
                  <span className="quiz-option-letter">{String.fromCharCode(65 + index)}.</span> {option}
                </span>
              ),
              value: option,
            }))}
            size="large"
            value={selectedAnswer ?? ''}
          />
          <p aria-live="polite" className="quiz-feedback-message">
            {isShowingAnswer ? `Correct answer: ${quiz.correctAnswer}` : ''}
          </p>
        </div>
      </Card>
    </main>
  )
}
