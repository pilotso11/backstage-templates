import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('main entry', () => {
  let root: HTMLDivElement

  beforeEach(() => {
    root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)
  })

  afterEach(() => {
    document.body.removeChild(root)
  })

  it('document has a root element', () => {
    expect(document.getElementById('root')).not.toBeNull()
  })
})
