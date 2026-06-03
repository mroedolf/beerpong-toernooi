import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { toasts, toast } from './toast.js'

describe('toast store', () => {
  beforeEach(() => {
    // Clear all toasts before each test
    toasts.splice(0, toasts.length)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    toasts.splice(0, toasts.length)
  })

  it('adds a toast with message, type and id', () => {
    toast('Er is iets misgegaan')
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe('Er is iets misgegaan')
    expect(toasts[0].type).toBe('error')
    expect(typeof toasts[0].id).toBe('string')
    expect(toasts[0].id.length).toBeGreaterThan(0)
  })

  it('defaults type to error', () => {
    toast('test bericht')
    expect(toasts[0].type).toBe('error')
  })

  it('accepts a custom type', () => {
    toast('Gelukt!', 'success')
    expect(toasts[0].type).toBe('success')
  })

  it('assigns unique ids to each toast', () => {
    toast('Eerste')
    toast('Tweede')
    expect(toasts[0].id).not.toBe(toasts[1].id)
  })

  it('auto-dismisses after the default ttl of 4000ms', () => {
    toast('Verdwijnt straks')
    expect(toasts).toHaveLength(1)
    vi.advanceTimersByTime(3999)
    expect(toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toasts).toHaveLength(0)
  })

  it('auto-dismisses after a custom ttl', () => {
    toast('Kort', 'error', 1000)
    vi.advanceTimersByTime(999)
    expect(toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toasts).toHaveLength(0)
  })

  it('only removes the matching toast when multiple are present', () => {
    toast('Eerste', 'error', 1000)
    toast('Tweede', 'error', 5000)
    vi.advanceTimersByTime(1000)
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe('Tweede')
  })
})
