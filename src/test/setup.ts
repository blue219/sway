import '@testing-library/jest-dom/vitest'

Object.defineProperties(HTMLMediaElement.prototype, {
  pause: { configurable: true, value: () => undefined },
  play: { configurable: true, value: () => Promise.resolve() },
})

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() { return this.store.size }
  clear() { this.store.clear() }
  getItem(key: string) { return this.store.get(key) ?? null }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null }
  removeItem(key: string) { this.store.delete(key) }
  setItem(key: string, value: string) { this.store.set(key, String(value)) }
}

const memoryStorage = new MemoryStorage()
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  enumerable: true,
  writable: true,
  value: memoryStorage,
})
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  enumerable: true,
  writable: true,
  value: memoryStorage,
})
Object.defineProperty(globalThis, 'Storage', {
  configurable: true,
  enumerable: true,
  writable: true,
  value: MemoryStorage,
})
