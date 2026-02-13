import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AppRoot } from './app-root.ts'

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
  })

  describe('styles', () => {
    it('has static styles defined', () => {
      expect(AppRoot.styles).toBeDefined()
    })
  })

  describe('querying', () => {
    let el: AppRoot

    beforeEach(async () => {
      el = document.createElement('app-root') as AppRoot
      document.body.appendChild(el)
      await el.updateComplete
    })

    afterEach(() => {
      if (el.parentNode) el.parentNode.removeChild(el)
    })

    it('can be selected by tag name', () => {
      expect(document.querySelector('app-root')).not.toBeNull()
    })
  })
})
