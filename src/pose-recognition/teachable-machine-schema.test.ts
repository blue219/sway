import { describe, expect, it } from 'vitest'
import { toMovementId, toTeachableMachineLabel } from './teachable-machine-schema'

describe('Teachable Machine schema adapter', () => {
  it('converts Teachable Machine labels to stable application movement IDs', () => {
    expect(toMovementId('Standing March with Opposite Hand Tap')).toBe('cross-body-knee-reach')
    expect(toMovementId('Arms above Head')).toBe('arm-above-head')
  })

  it('converts stable application movement IDs to Teachable Machine labels', () => {
    expect(toTeachableMachineLabel('side-to-side-foot-tap')).toBe('Standing Side-to-Side Foot Tap')
    expect(toTeachableMachineLabel('rowing')).toBe('Rowing')
  })

  it('does not expose unknown model labels as application movements', () => {
    expect(toMovementId('Unknown label')).toBeUndefined()
  })
})
