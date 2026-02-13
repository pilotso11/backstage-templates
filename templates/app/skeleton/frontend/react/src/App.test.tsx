import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App component', () => {
  describe('rendering', () => {
    it('mounts without throwing', () => {
      expect(() => render(<App />)).not.toThrow()
    })

    it('renders exactly one h1 heading', () => {
      const { container } = render(<App />)
      expect(container.querySelectorAll('h1')).toHaveLength(1)
    })

    it('renders exactly one paragraph', () => {
      const { container } = render(<App />)
      expect(container.querySelectorAll('p')).toHaveLength(1)
    })
  })

  describe('content', () => {
    it('heading has non-empty text content', () => {
      render(<App />)
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading.textContent?.trim().length).toBeGreaterThan(0)
    })

    it('paragraph has non-empty text content', () => {
      const { container } = render(<App />)
      const para = container.querySelector('p')
      expect(para?.textContent?.trim().length).toBeGreaterThan(0)
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

    it('card has shadow and padding', () => {
      const { container } = render(<App />)
      const card = container.querySelector('.bg-white')
      expect(card?.className).toContain('shadow')
      expect(card?.className).toContain('p-8')
    })
  })

  describe('accessibility', () => {
    it('heading is findable by role', () => {
      render(<App />)
      expect(screen.getByRole('heading')).toBeDefined()
    })

    it('has no nested headings', () => {
      const { container } = render(<App />)
      expect(container.querySelectorAll('h2,h3,h4,h5,h6')).toHaveLength(0)
    })
  })

  describe('snapshot', () => {
    it('matches snapshot', () => {
      const { container } = render(<App />)
      expect(container.firstChild).toMatchSnapshot()
    })
  })
})
