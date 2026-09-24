type CelebrationBurstsProps = {
  variant: 'answer' | 'result'
}

const burstCount = { answer: 3, result: 10 }
const particlesPerBurst = 8

export function CelebrationBursts({ variant }: CelebrationBurstsProps) {
  return (
    <span aria-hidden="true" className={`celebration-bursts celebration-bursts-${variant}`}>
      {Array.from({ length: burstCount[variant] }, (_, burst) => (
        <span className="celebration-burst" key={burst}>
          {Array.from({ length: particlesPerBurst }, (_, particle) => (
            <span className="celebration-particle" key={particle} />
          ))}
        </span>
      ))}
    </span>
  )
}
