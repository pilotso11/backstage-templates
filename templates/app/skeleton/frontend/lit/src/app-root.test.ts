import { describe, it, expect } from 'vitest'
import { AppRoot } from './app-root.ts'

describe('AppRoot', () => {
  it('is defined as a custom element', () => {
    expect(AppRoot).toBeDefined()
    expect(customElements.get('app-root')).toBeDefined()
  })
})
