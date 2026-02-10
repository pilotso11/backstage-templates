import { describe, it, expect, beforeEach } from 'vitest'
import { App } from './app.ts'

describe('App', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
  })

  it('renders a heading into the container', () => {
    const app = new App(container)
    app.render()
    const heading = container.querySelector('h1')
    expect(heading).not.toBeNull()
    expect(heading?.textContent).toBeTruthy()
  })

  it('renders a description paragraph', () => {
    const app = new App(container)
    app.render()
    const para = container.querySelector('p')
    expect(para).not.toBeNull()
  })

  it('clears previous content on re-render', () => {
    const app = new App(container)
    app.render()
    app.render()
    expect(container.querySelectorAll('h1').length).toBe(1)
  })
})
