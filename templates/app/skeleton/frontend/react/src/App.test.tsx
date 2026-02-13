import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders a heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined()
  })

  it('renders a paragraph description', () => {
    render(<App />)
    expect(screen.getByRole('paragraph')).toBeDefined()
  })

  it('heading has non-empty text content', () => {
    render(<App />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toBeTruthy()
    expect(heading.textContent!.length).toBeGreaterThan(0)
  })

  it('renders a full-screen wrapper', () => {
    const { container } = render(<App />)
    const wrapper = container.firstElementChild
    expect(wrapper?.className).toContain('min-h-screen')
  })

  it('renders a card container', () => {
    const { container } = render(<App />)
    const card = container.querySelector('.bg-white')
    expect(card).not.toBeNull()
  })

  it('mounts without throwing', () => {
    expect(() => render(<App />)).not.toThrow()
  })
})
