import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AppRoot } from './app-root.ts'

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

  describe('compute form', () => {
    let el: AppRoot

    beforeEach(async () => {
      el = document.createElement('app-root') as AppRoot
      document.body.appendChild(el)
      await el.updateComplete
    })

    afterEach(() => {
      if (el.parentNode) el.parentNode.removeChild(el)
    })

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

      const form = el.shadowRoot?.querySelector('form') as HTMLFormElement
      const inputs = el.shadowRoot?.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>
      inputs[0].value = '2'
      inputs[1].value = '3'
      form.dispatchEvent(new Event('submit', { cancelable: true }))
      await new Promise(r => setTimeout(r, 50))
      await el.updateComplete

      const text = el.shadowRoot?.textContent || ''
      expect(text).toContain('5')
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

      const form = el.shadowRoot?.querySelector('form') as HTMLFormElement
      form.dispatchEvent(new Event('submit', { cancelable: true }))
      await new Promise(r => setTimeout(r, 50))
      await el.updateComplete

      const text = el.shadowRoot?.textContent || ''
      expect(text).toContain('Division by zero')
    })

    it('displays network error', async () => {
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

      const form = el.shadowRoot?.querySelector('form') as HTMLFormElement
      form.dispatchEvent(new Event('submit', { cancelable: true }))
      await new Promise(r => setTimeout(r, 50))
      await el.updateComplete

      const text = el.shadowRoot?.textContent || ''
      expect(text).toContain('Network error')
    })
  })

  describe('admin page', () => {
    let el: AppRoot

    beforeEach(async () => {
      el = document.createElement('app-root') as AppRoot
      document.body.appendChild(el)
      await el.updateComplete
    })

    afterEach(() => {
      if (el.parentNode) el.parentNode.removeChild(el)
    })

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

      const buttons = el.shadowRoot?.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
      const adminBtn = Array.from(buttons).find(b => b.textContent?.trim() === 'Admin')
      adminBtn?.click()
      await new Promise(r => setTimeout(r, 50))
      await el.updateComplete

      const text = el.shadowRoot?.textContent || ''
      expect(text).toContain('alice@test.com')
      expect(text).toContain('bob@test.com')
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

      const buttons = el.shadowRoot?.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
      const adminBtn = Array.from(buttons).find(b => b.textContent?.trim() === 'Admin')
      adminBtn?.click()
      await new Promise(r => setTimeout(r, 50))
      await el.updateComplete

      const text = el.shadowRoot?.textContent || ''
      expect(text).toContain('Access Denied')
    })
  })
})
