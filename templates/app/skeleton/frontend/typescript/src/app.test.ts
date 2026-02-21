import { describe, it, expect, beforeEach, vi } from 'vitest'
import { App } from './app.ts'

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
  window.location.hash = ''
})

describe('App class', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
  })

  describe('render()', () => {
    it('does not throw on first render', () => {
      expect(() => new App(container).render()).not.toThrow()
    })

    it('produces DOM children', () => {
      new App(container).render()
      expect(container.children.length).toBeGreaterThan(0)
    })

    it('renders exactly one h1 element', () => {
      new App(container).render()
      expect(container.querySelectorAll('h1')).toHaveLength(1)
    })

    it('renders a Calculator heading (h2)', () => {
      new App(container).render()
      const h2 = container.querySelector('h2')
      expect(h2?.textContent).toBe('Calculator')
    })

    it('fetches /api/user on render', () => {
      new App(container).render()
      expect(mockFetch).toHaveBeenCalledWith('/api/user')
    })
  })

  describe('calculator page', () => {
    it('renders number inputs', () => {
      new App(container).render()
      const inputs = container.querySelectorAll('input[type="number"]')
      expect(inputs.length).toBe(2)
    })

    it('renders operation select', () => {
      new App(container).render()
      expect(container.querySelector('select')).not.toBeNull()
    })

    it('renders submit button', () => {
      new App(container).render()
      expect(container.querySelector('button[type="submit"]')).not.toBeNull()
    })

    it('select has all 5 operations', () => {
      new App(container).render()
      const options = container.querySelectorAll('select option')
      expect(options.length).toBe(5)
    })
  })

  describe('navigation', () => {
    it('has Calculator link', () => {
      new App(container).render()
      const link = container.querySelector('a[href="#/"]')
      expect(link).not.toBeNull()
      expect(link?.textContent).toBe('Calculator')
    })

    it('has Admin link', () => {
      new App(container).render()
      const link = container.querySelector('a[href="#/admin"]')
      expect(link).not.toBeNull()
      expect(link?.textContent).toBe('Admin')
    })
  })

  describe('layout classes', () => {
    it('outer wrapper has min-h-screen class', () => {
      new App(container).render()
      expect(container.firstElementChild?.className).toContain('min-h-screen')
    })

    it('card has bg-white class', () => {
      new App(container).render()
      expect(container.querySelector('.bg-white')).not.toBeNull()
    })

    it('card has shadow class', () => {
      new App(container).render()
      const card = container.querySelector('.bg-white.shadow')
      expect(card).not.toBeNull()
    })
  })
})
