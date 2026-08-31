import '@testing-library/jest-dom/vitest'

Object.defineProperties(HTMLMediaElement.prototype, {
  pause: { configurable: true, value: () => undefined },
  play: { configurable: true, value: () => Promise.resolve() },
})
