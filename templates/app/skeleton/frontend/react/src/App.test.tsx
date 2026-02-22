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
    if (url === '/api/features') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(overrides.features ?? { database: true }),
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
    if (url === '/api/todos' && (!opts || !opts.method || opts.method === 'GET')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(overrides.todos ?? [
          { id: 1, title: 'Buy milk', description: 'From store', status: 'open', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
          { id: 2, title: 'Walk dog', description: '', status: 'done', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
        ]),
      })
    }
    if (url === '/api/todos' && opts?.method === 'POST') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 3, title: 'New', description: '', status: 'open', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }),
      })
    }
    if (url?.toString().match(/\/api\/todos\/\d+/) && opts?.method === 'PATCH') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    }
    if (url?.toString().match(/\/api\/todos\/\d+/) && opts?.method === 'DELETE') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
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

  describe('features', () => {
    it('shows Todos nav when database is enabled', async () => {
      await renderApp()
      await waitFor(() => {
        expect(screen.getByText('Todos')).toBeDefined()
      })
    })

    it('hides Todos nav when database is disabled', async () => {
      mockFetch.mockReset()
      mockFetchResponses({ features: { database: false } })
      await renderApp()
      await waitFor(() => {
        expect(screen.queryByText('Todos')).toBeNull()
      })
    })
  })

  describe('todos page', () => {
    it('navigates to todos page and shows items', async () => {
      await renderApp()
      await waitFor(() => { expect(screen.getByText('Todos')).toBeDefined() })
      await act(async () => { fireEvent.click(screen.getByText('Todos')) })
      await waitFor(() => {
        expect(screen.getByText('Buy milk')).toBeDefined()
        expect(screen.getByText('Walk dog')).toBeDefined()
      })
    })

    it('shows add form on todos page', async () => {
      await renderApp()
      await waitFor(() => { expect(screen.getByText('Todos')).toBeDefined() })
      await act(async () => { fireEvent.click(screen.getByText('Todos')) })
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Title')).toBeDefined()
      })
    })

    it('submits new todo via POST', async () => {
      await renderApp()
      await waitFor(() => { expect(screen.getByText('Todos')).toBeDefined() })
      await act(async () => { fireEvent.click(screen.getByText('Todos')) })
      await waitFor(() => { expect(screen.getByPlaceholderText('Title')).toBeDefined() })

      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'New task' } })
        fireEvent.submit(screen.getByPlaceholderText('Title').closest('form')!)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/todos', expect.objectContaining({ method: 'POST' }))
      })
    })

    it('shows Complete button for open todos', async () => {
      await renderApp()
      await waitFor(() => { expect(screen.getByText('Todos')).toBeDefined() })
      await act(async () => { fireEvent.click(screen.getByText('Todos')) })
      await waitFor(() => {
        expect(screen.getByText('Complete')).toBeDefined()
      })
    })

    it('calls PATCH when Complete is clicked', async () => {
      await renderApp()
      await waitFor(() => { expect(screen.getByText('Todos')).toBeDefined() })
      await act(async () => { fireEvent.click(screen.getByText('Todos')) })
      await waitFor(() => { expect(screen.getByText('Complete')).toBeDefined() })

      await act(async () => { fireEvent.click(screen.getByText('Complete')) })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/todos/1', expect.objectContaining({ method: 'PATCH' }))
      })
    })

    it('calls DELETE when Delete is clicked on first item', async () => {
      await renderApp()
      await waitFor(() => { expect(screen.getByText('Todos')).toBeDefined() })
      await act(async () => { fireEvent.click(screen.getByText('Todos')) })
      await waitFor(() => { expect(screen.getAllByText('Delete').length).toBeGreaterThan(0) })

      await act(async () => { fireEvent.click(screen.getAllByText('Delete')[0]) })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/todos/1', expect.objectContaining({ method: 'DELETE' }))
      })
    })

    it('shows empty state when no todos', async () => {
      mockFetch.mockReset()
      mockFetchResponses({ todos: [] })
      await renderApp()
      await waitFor(() => { expect(screen.getByText('Todos')).toBeDefined() })
      await act(async () => { fireEvent.click(screen.getByText('Todos')) })
      await waitFor(() => {
        expect(screen.getByText('No todos yet. Add one above!')).toBeDefined()
      })
    })
  })

  describe('api calls', () => {
    it('fetches /api/user on mount', async () => {
      await renderApp()
      expect(mockFetch).toHaveBeenCalledWith('/api/user')
    })

    it('fetches /api/features on mount', async () => {
      await renderApp()
      expect(mockFetch).toHaveBeenCalledWith('/api/features')
    })
  })
})
