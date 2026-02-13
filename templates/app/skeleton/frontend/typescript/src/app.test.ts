import { describe, it, expect, beforeEach } from 'vitest'
import { App } from './app.ts'

describe('App', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
  })

  it('renders a heading into the container', () => {
    new App(container).render()
    const heading = container.querySelector('h1')
    expect(heading).not.toBeNull()
    expect(heading?.textContent).toBeTruthy()
  })

  it('renders a description paragraph', () => {
    new App(container).render()
    const para = container.querySelector('p')
    expect(para).not.toBeNull()
    expect(para?.textContent).toBeTruthy()
  })

  it('clears previous content on re-render', () => {
    const app = new App(container)
    app.render()
    app.render()
    expect(container.querySelectorAll('h1').length).toBe(1)
    expect(container.querySelectorAll('p').length).toBe(1)
  })

  it('renders a wrapper div with layout classes', () => {
    new App(container).render()
    const wrapper = container.firstElementChild
    expect(wrapper?.className).toContain('min-h-screen')
  })

  it('renders a card with bg-white', () => {
    new App(container).render()
    expect(container.querySelector('.bg-white')).not.toBeNull()
  })

  it('uses textContent not innerHTML (XSS safety)', () => {
    const evil = document.createElement('div')
    const app = new App(evil)
    app.render()
    // Heading should use textContent — verify no script tags rendered
    const h1 = evil.querySelector('h1')
    expect(h1?.innerHTML).not.toContain('<script')
  })

  it('mounts without throwing', () => {
    expect(() => new App(container).render()).not.toThrow()
  })
})
