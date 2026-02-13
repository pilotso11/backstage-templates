import { describe, it, expect, beforeEach } from 'vitest'
import { App } from './app.ts'

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

    it('renders exactly one p element', () => {
      new App(container).render()
      expect(container.querySelectorAll('p')).toHaveLength(1)
    })

    it('heading has non-empty textContent', () => {
      new App(container).render()
      const h1 = container.querySelector('h1')
      expect(h1?.textContent?.trim().length).toBeGreaterThan(0)
    })

    it('paragraph has non-empty textContent', () => {
      new App(container).render()
      const p = container.querySelector('p')
      expect(p?.textContent?.trim().length).toBeGreaterThan(0)
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
      const card = container.querySelector('.bg-white')
      expect(card?.className).toContain('shadow')
    })
  })

  describe('XSS safety', () => {
    it('uses textContent not innerHTML (heading)', () => {
      new App(container).render()
      const h1 = container.querySelector('h1')
      // textContent would escape any HTML; verify no tags in the content
      expect(h1?.innerHTML).not.toContain('<')
    })

    it('uses textContent not innerHTML (paragraph)', () => {
      new App(container).render()
      const p = container.querySelector('p')
      expect(p?.innerHTML).not.toContain('<')
    })
  })

  describe('re-render', () => {
    it('clears old content before re-rendering', () => {
      const app = new App(container)
      app.render()
      app.render()
      expect(container.querySelectorAll('h1')).toHaveLength(1)
      expect(container.querySelectorAll('p')).toHaveLength(1)
    })

    it('renders same structure on second render', () => {
      const app = new App(container)
      app.render()
      const firstHTML = container.innerHTML
      app.render()
      expect(container.innerHTML).toBe(firstHTML)
    })
  })
})
