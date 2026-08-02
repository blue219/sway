import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Whakakori Together round', () => {
  it('continues timing automatically after moving to the next pose', () => {
    vi.useFakeTimers()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Seated mode' }))
    const firstMovement = screen.getByRole('heading', { level: 1 }).textContent
    expect(screen.getByLabelText('Movement 1 of 5')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByText('Hold for 5 seconds')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(5_000))

    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toBe(firstMovement)
    expect(screen.getByRole('button', { name: 'Holding' })).toBeDisabled()
    expect(screen.getByLabelText('Movement 2 of 5')).toBeInTheDocument()
  })

  it('freezes the hold timer while paused and resumes it when asked', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Standing mode' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))

    expect(screen.getByRole('dialog', { name: 'Paused' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Resume movement' }))

    expect(screen.queryByRole('dialog', { name: 'Paused' })).not.toBeInTheDocument()
  })

  it('uses every standing movement once in a random order before opening the quiz', () => {
    vi.useFakeTimers()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Standing mode' }))

    const completedMovements = new Set<string>()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    for (let movement = 0; movement < 5; movement += 1) {
      completedMovements.add(screen.getByRole('heading', { level: 1 }).textContent ?? '')
      act(() => vi.advanceTimersByTime(5_000))
    }

    expect(completedMovements).toHaveLength(5)
    expect(screen.getByRole('heading', { name: 'What bird is shown?' })).toBeInTheDocument()
    expect(screen.getByText('5 movements complete')).toBeInTheDocument()
  })

  it('accepts arrow-key quiz selection and returns to the mode selection after finishing', () => {
    vi.useFakeTimers()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Seated mode' }))

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    for (let movement = 0; movement < 5; movement += 1) {
      act(() => vi.advanceTimersByTime(5_000))
    }

    const firstOption = screen.getByRole('radio', { name: 'A. Kiwi' })
    firstOption.focus()
    fireEvent.keyDown(firstOption, { key: 'ArrowDown' })

    expect(screen.getByRole('heading', { name: 'Round complete' })).toBeInTheDocument()
    expect(screen.getByText('+30 Wellbeing Points')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Finish for today' }))
    expect(screen.getByRole('heading', { name: 'Choose a play mode' })).toBeInTheDocument()
  })
})
