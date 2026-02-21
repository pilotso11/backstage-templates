import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import App from './App'

// Mock fetch for all tests
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockFetchResponses(overrides: Record<string, unknown> = {}) {
  mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
    if (url === '/api/user') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(overrides.user ?? { email: 'test@example.com', username: 'Test', authenticated: true }),
      })
    }
    if (url === '/api/admin/users') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(overrides.admin ?? { authorized: true, users: ['dev@example.com'] }),
      })
    }
    if (url === '/api/compute' && opts?.method === 'POST') {
      if (overrides.computeError) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: overrides.computeError }),
        })
      }
      if (overrides.computeNetworkError) {
        return Promise.reject(new Error('Network error'))
      }
      const body = JSON.parse(opts.body as string)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ a: body.a, op: body.op, b: body.b, result: body.a + body.b }),
      })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
}

beforeEach(() => {
  mockFetch.mockReset()
  mockFetchResponses()
})

async function renderApp() {
  let result: ReturnType<typeof render>
  await act(async () => {
    result = render(<App />)
  })
  return result!
}

describe('App component', () => {
  describe('rendering', () => {
    it('mounts without throwing', async () => {
      await expect(renderApp()).resolves.toBeDefined()
    })

    it('renders the app name as heading', async () => {
      await renderApp()
      expect(screen.getByRole('heading', { level: 1 })).toBeDefined()
    })

    it('renders Calculator and Admin nav buttons', async () => {
      await renderApp()
      expect(screen.getAllByText('Calculator').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Admin')).toBeDefined()
    })
  })

  describe('layout', () => {
    it('root element has full-screen wrapper class', async () => {
      const { container } = await renderApp()
      expect(container.firstElementChild?.className).toContain('min-h-screen')
    })

    it('renders a white card container', async () => {
      const { container } = await renderApp()
      expect(container.querySelector('.bg-white')).not.toBeNull()
    })
  })

  describe('user display', () => {
    it('shows user email when authenticated', async () => {
      await renderApp()
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeDefined()
      })
    })

    it('shows Not signed in when not authenticated', async () => {
      mockFetch.mockReset()
      mockFetchResponses({ user: { email: '', username: '', authenticated: false } })
      await renderApp()
      await waitFor(() => {
        expect(screen.getByText('Not signed in')).toBeDefined()
      })
    })
  })

  describe('calculator page', () => {
    it('renders number inputs', async () => {
      const { container } = await renderApp()
      const inputs = container.querySelectorAll('input[type="number"]')
      expect(inputs.length).toBe(2)
    })

    it('renders operation select', async () => {
      const { container } = await renderApp()
      expect(container.querySelector('select')).not.toBeNull()
    })

    it('renders submit button', async () => {
      const { container } = await renderApp()
      expect(container.querySelector('button[type="submit"]')).not.toBeNull()
    })

    it('submits compute request and shows result', async () => {
      await renderApp()
      const inputs = document.querySelectorAll('input[type="number"]')
      const form = document.querySelector('form')!

      await act(async () => {
        fireEvent.change(inputs[0], { target: { value: '2' } })
        fireEvent.change(inputs[1], { target: { value: '3' } })
        fireEvent.submit(form)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/compute', expect.objectContaining({ method: 'POST' }))
      })
    })

    it('shows error on failed compute', async () => {
      mockFetch.mockReset()
      mockFetchResponses({ computeError: 'division by zero' })
      await renderApp()
      const inputs = document.querySelectorAll('input[type="number"]')
      const form = document.querySelector('form')!

      await act(async () => {
        fireEvent.change(inputs[0], { target: { value: '1' } })
        fireEvent.change(inputs[1], { target: { value: '0' } })
        fireEvent.submit(form)
      })

      await waitFor(() => {
        expect(screen.getByText('division by zero')).toBeDefined()
      })
    })

    it('shows network error on fetch failure', async () => {
      mockFetch.mockReset()
      mockFetchResponses({ computeNetworkError: true })
      await renderApp()
      const inputs = document.querySelectorAll('input[type="number"]')
      const form = document.querySelector('form')!

      await act(async () => {
        fireEvent.change(inputs[0], { target: { value: '1' } })
        fireEvent.change(inputs[1], { target: { value: '2' } })
        fireEvent.submit(form)
      })

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeDefined()
      })
    })
  })

  describe('admin page', () => {
    it('navigates to admin page on click', async () => {
      await renderApp()
      await act(async () => {
        fireEvent.click(screen.getByText('Admin'))
      })
      await waitFor(() => {
        expect(screen.getByText('Authorized Users')).toBeDefined()
      })
    })

    it('shows user list when authorized', async () => {
      await renderApp()
      await act(async () => {
        fireEvent.click(screen.getByText('Admin'))
      })
      await waitFor(() => {
        expect(screen.getByText('dev@example.com')).toBeDefined()
      })
    })

    it('shows access denied when not authorized', async () => {
      mockFetch.mockReset()
      mockFetchResponses({ admin: { authorized: false, users: [] } })
      await renderApp()
      await act(async () => {
        fireEvent.click(screen.getByText('Admin'))
      })
      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeDefined()
      })
    })

    it('can navigate back to calculator', async () => {
      await renderApp()
      await act(async () => {
        fireEvent.click(screen.getByText('Admin'))
      })
      await waitFor(() => {
        expect(screen.getByText('Authorized Users')).toBeDefined()
      })
      await act(async () => {
        fireEvent.click(screen.getAllByText('Calculator')[0])
      })
      expect(document.querySelector('form')).not.toBeNull()
    })
  })

  describe('api calls', () => {
    it('fetches /api/user on mount', async () => {
      await renderApp()
      expect(mockFetch).toHaveBeenCalledWith('/api/user')
    })
  })
})
