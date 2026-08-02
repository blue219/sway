import { Card, Radio } from 'animal-island-ui'
import { quiz } from '../game'

type QuizScreenProps = {
  onAnswer: (answer: string) => void
}

export function QuizScreen({ onAnswer }: QuizScreenProps) {
  return (
    <main className="screen quiz-screen">
      <Card className="quiz-panel" color="app-teal" pattern="app-teal" aria-labelledby="quiz-title">
        <div className="quiz-image-wrap">
          <img alt="A tūī perched on a branch" src="/assets/tui.png" />
        </div>
        <div className="quiz-content">
          <h1 id="quiz-title">{quiz.question}</h1>
          <Radio
            className="quiz-options"
            direction="vertical"
            onChange={(answer) => onAnswer(String(answer))}
            options={quiz.options.map((option, index) => ({
              label: <><span className="quiz-option-letter">{String.fromCharCode(65 + index)}.</span> {option}</>,
              value: option,
            }))}
            size="large"
          />
        </div>
      </Card>
    </main>
  )
}
