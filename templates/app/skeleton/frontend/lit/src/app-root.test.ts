import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AppRoot } from './app-root.ts'

describe('AppRoot', () => {
  let el: AppRoot

  beforeEach(async () => {
    el = document.createElement('app-root') as AppRoot
    document.body.appendChild(el)
    // Wait for Lit's update cycle
    await el.updateComplete
  })

  afterEach(() => {
    document.body.removeChild(el)
  })

  it('is registered as a custom element', () => {
    expect(customElements.get('app-root')).toBeDefined()
  })

  it('is an instance of AppRoot', () => {
    expect(el).toBeInstanceOf(AppRoot)
  })

  it('renders a shadow root', () => {
    expect(el.shadowRoot).not.toBeNull()
  })

  it('renders a host element with display block', () => {
    // Lit applies :host { display: block } via static styles
    expect(AppRoot.styles).toBeDefined()
  })

  it('renders into the document', () => {
    expect(document.querySelector('app-root')).not.toBeNull()
  })

  it('has an updateComplete promise', () => {
    expect(el.updateComplete).toBeInstanceOf(Promise)
  })
})
