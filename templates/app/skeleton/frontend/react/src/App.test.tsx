import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

// Mock fetch for all tests
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockImplementation((url: string) => {
    if (url === '/api/user') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ email: 'test@example.com', username: 'Test', authenticated: true }),
      })
    }
    if (url === '/api/admin/users') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ authorized: true, users: ['dev@example.com'] }),
      })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
})

describe('App component', () => {
  describe('rendering', () => {
    it('mounts without throwing', () => {
      expect(() => render(<App />)).not.toThrow()
    })

    it('renders the app name as heading', () => {
      render(<App />)
      expect(screen.getByRole('heading', { level: 1 })).toBeDefined()
    })

    it('renders Calculator and Admin nav buttons', () => {
      render(<App />)
      expect(screen.getByText('Calculator')).toBeDefined()
      expect(screen.getByText('Admin')).toBeDefined()
    })
  })

  describe('layout', () => {
    it('root element has full-screen wrapper class', () => {
      const { container } = render(<App />)
      expect(container.firstElementChild?.className).toContain('min-h-screen')
    })

    it('renders a white card container', () => {
      const { container } = render(<App />)
      expect(container.querySelector('.bg-white')).not.toBeNull()
    })
  })

  describe('calculator page', () => {
    it('renders number inputs', () => {
      const { container } = render(<App />)
      const inputs = container.querySelectorAll('input[type="number"]')
      expect(inputs.length).toBe(2)
    })

    it('renders operation select', () => {
      const { container } = render(<App />)
      expect(container.querySelector('select')).not.toBeNull()
    })

    it('renders submit button', () => {
      const { container } = render(<App />)
      expect(container.querySelector('button[type="submit"]')).not.toBeNull()
    })
  })

  describe('api calls', () => {
    it('fetches /api/user on mount', () => {
      render(<App />)
      expect(mockFetch).toHaveBeenCalledWith('/api/user')
    })
  })
})
