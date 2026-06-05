import { describe, it, expect } from 'vitest'
import { useRoute, navigate } from './router.js'

function fireHash(hash) {
  window.location.hash = hash
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

describe('hash router', () => {
  it('treats empty or slash-less hashes as the landing route', () => {
    const { path } = useRoute()
    fireHash('')
    expect(path.value).toBe('/')
    fireHash('#garbage')
    expect(path.value).toBe('/')
  })
  it('follows hash changes reactively', () => {
    const { path } = useRoute()
    fireHash('#/mex')
    expect(path.value).toBe('/mex')
    fireHash('#/beerpong')
    expect(path.value).toBe('/beerpong')
  })
  it('navigate() sets the location hash', () => {
    navigate('/mex')
    expect(window.location.hash).toBe('#/mex')
  })
  it('survives copy-paste mangling: trailing slashes and query suffixes', () => {
    const { path } = useRoute()
    fireHash('#/beerpong/')
    expect(path.value).toBe('/beerpong')
    fireHash('#/mex?utm=chat')
    expect(path.value).toBe('/mex')
    fireHash('#/')
    expect(path.value).toBe('/')
  })
})
