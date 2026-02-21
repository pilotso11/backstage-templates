import { describe, it, expect, beforeEach, vi } from 'vitest'
import { App } from './app.ts'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

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

  describe('compute form submission', () => {
    it('displays result after successful compute', async () => {
      mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
        if (url === '/api/compute' && opts?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ a: 2, op: 'add', b: 3, result: 5 }),
          })
        }
        if (url === '/api/user') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ email: 'test@example.com', username: 'Test', authenticated: true }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      new App(container).render()
      const inputA = container.querySelector('input[name="a"]') as HTMLInputElement
      const inputB = container.querySelector('input[name="b"]') as HTMLInputElement
      inputA.value = '2'
      inputB.value = '3'

      const form = container.querySelector('form') as HTMLFormElement
      form.dispatchEvent(new Event('submit', { cancelable: true }))
      await new Promise(r => setTimeout(r, 50))

      const card = container.querySelector('[data-page]') as HTMLElement
      const paragraphs = card.querySelectorAll('p')
      expect(paragraphs[0].textContent).toContain('5')
      expect(paragraphs[0].classList.contains('hidden')).toBe(false)
    })

    it('displays error on failed compute', async () => {
      mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
        if (url === '/api/compute' && opts?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Division by zero' }),
          })
        }
        if (url === '/api/user') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ email: 'test@example.com', username: 'Test', authenticated: true }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      new App(container).render()
      const form = container.querySelector('form') as HTMLFormElement
      form.dispatchEvent(new Event('submit', { cancelable: true }))
      await new Promise(r => setTimeout(r, 50))

      const card = container.querySelector('[data-page]') as HTMLElement
      const paragraphs = card.querySelectorAll('p')
      expect(paragraphs[1].textContent).toContain('Division by zero')
      expect(paragraphs[1].classList.contains('hidden')).toBe(false)
    })

    it('displays network error on fetch failure', async () => {
      mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
        if (url === '/api/compute' && opts?.method === 'POST') {
          return Promise.reject(new Error('fetch failed'))
        }
        if (url === '/api/user') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ email: 'test@example.com', username: 'Test', authenticated: true }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      new App(container).render()
      const form = container.querySelector('form') as HTMLFormElement
      form.dispatchEvent(new Event('submit', { cancelable: true }))
      await new Promise(r => setTimeout(r, 50))

      const card = container.querySelector('[data-page]') as HTMLElement
      const paragraphs = card.querySelectorAll('p')
      expect(paragraphs[1].textContent).toContain('Network error')
    })
  })

  describe('admin page', () => {
    it('shows authorized users when authorized', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/admin/users') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ authorized: true, users: ['alice@test.com', 'bob@test.com'] }),
          })
        }
        if (url === '/api/user') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ email: 'test@example.com', username: 'Test', authenticated: true }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      window.location.hash = '#/admin'
      new App(container).render()
      await new Promise(r => setTimeout(r, 50))

      expect(container.textContent).toContain('alice@test.com')
      expect(container.textContent).toContain('bob@test.com')
    })

    it('shows access denied when not authorized', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/admin/users') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ authorized: false, users: [] }),
          })
        }
        if (url === '/api/user') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ email: 'test@example.com', username: 'Test', authenticated: true }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      window.location.hash = '#/admin'
      new App(container).render()
      await new Promise(r => setTimeout(r, 50))

      expect(container.textContent).toContain('Access Denied')
    })

    it('shows error on fetch failure', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/admin/users') {
          return Promise.reject(new Error('network error'))
        }
        if (url === '/api/user') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ email: 'test@example.com', username: 'Test', authenticated: true }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      window.location.hash = '#/admin'
      new App(container).render()
      await new Promise(r => setTimeout(r, 50))

      expect(container.textContent).toContain('Failed to load admin data')
    })
  })
})
