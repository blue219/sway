import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Whakakori Together round', () => {
  it('lets a player choose seated mode and complete a timed movement', () => {
    vi.useFakeTimers()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Seated mode' }))
    expect(screen.getByRole('heading', { name: 'Raise one arm' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'I’m ready' }))
    expect(screen.getByText('Hold for 4 seconds')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(4_000))

    expect(screen.getByText('Movement complete')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next movement' })).toBeInTheDocument()
  })

  it('freezes the hold timer while paused and resumes it when asked', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Standing mode' }))
    fireEvent.click(screen.getByRole('button', { name: 'I’m ready' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))

    expect(screen.getByRole('dialog', { name: 'Paused' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Resume movement' }))

    expect(screen.queryByRole('dialog', { name: 'Paused' })).not.toBeInTheDocument()
  })

  it('accepts arrow-key quiz selection and returns to the mode selection after finishing', () => {
    vi.useFakeTimers()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Seated mode' }))

    for (let movement = 0; movement < 5; movement += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'I’m ready' }))
      act(() => vi.advanceTimersByTime(4_000))
      fireEvent.click(screen.getByRole('button', { name: 'Next movement' }))
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
