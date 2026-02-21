import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AppRoot } from './app-root.ts'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch as any

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockImplementation((url: string) => {
    if (url === '/api/user') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ email: 'test@example.com', username: 'Test', authenticated: true }),
      })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
})

describe('AppRoot custom element', () => {
  describe('registration', () => {
    it('is registered in the custom element registry', () => {
      expect(customElements.get('app-root')).toBeDefined()
    })

    it('is the AppRoot class', () => {
      expect(customElements.get('app-root')).toBe(AppRoot)
    })
  })

  describe('lifecycle', () => {
    let el: AppRoot

    beforeEach(async () => {
      el = document.createElement('app-root') as AppRoot
      document.body.appendChild(el)
      await el.updateComplete
    })

    afterEach(() => {
      if (el.parentNode) el.parentNode.removeChild(el)
    })

    it('is an instance of AppRoot', () => {
      expect(el).toBeInstanceOf(AppRoot)
    })

    it('is an instance of HTMLElement', () => {
      expect(el).toBeInstanceOf(HTMLElement)
    })

    it('is attached to the DOM', () => {
      expect(document.contains(el)).toBe(true)
    })

    it('has a shadow root', () => {
      expect(el.shadowRoot).not.toBeNull()
    })

    it('updateComplete resolves to true', async () => {
      const result = await el.updateComplete
      expect(result).toBe(true)
    })

    it('fetches /api/user on connect', () => {
      expect(mockFetch).toHaveBeenCalledWith('/api/user')
    })
  })

  describe('styles', () => {
    it('has static styles defined', () => {
      expect(AppRoot.styles).toBeDefined()
    })
  })

  describe('shadow DOM content', () => {
    let el: AppRoot

    beforeEach(async () => {
      el = document.createElement('app-root') as AppRoot
      document.body.appendChild(el)
      await el.updateComplete
    })

    afterEach(() => {
      if (el.parentNode) el.parentNode.removeChild(el)
    })

    it('renders an h1 heading', () => {
      expect(el.shadowRoot?.querySelector('h1')).not.toBeNull()
    })

    it('renders Calculator nav button', () => {
      const buttons = el.shadowRoot?.querySelectorAll('button')
      const texts = Array.from(buttons || []).map(b => b.textContent?.trim())
      expect(texts).toContain('Calculator')
    })

    it('renders Admin nav button', () => {
      const buttons = el.shadowRoot?.querySelectorAll('button')
      const texts = Array.from(buttons || []).map(b => b.textContent?.trim())
      expect(texts).toContain('Admin')
    })

    it('renders number inputs for calculator', () => {
      const inputs = el.shadowRoot?.querySelectorAll('input[type="number"]')
      expect(inputs?.length).toBe(2)
    })

    it('renders operation select', () => {
      expect(el.shadowRoot?.querySelector('select')).not.toBeNull()
    })
  })
})
