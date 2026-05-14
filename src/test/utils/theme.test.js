import { describe, it, expect, beforeEach } from 'vitest'
import { getInitialTheme, applyTheme, toggleTheme } from '../../utils/theme'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
})

describe('getInitialTheme', () => {
  it('defaults to dark when nothing saved', () => {
    expect(getInitialTheme()).toBe('dark')
  })
  it('returns saved preference', () => {
    localStorage.setItem('theme', 'light')
    expect(getInitialTheme()).toBe('light')
  })
})

describe('applyTheme', () => {
  it('adds dark class for dark theme', () => {
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
  it('removes dark class for light theme', () => {
    applyTheme('dark')
    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
  it('saves to localStorage', () => {
    applyTheme('light')
    expect(localStorage.getItem('theme')).toBe('light')
  })
})

describe('toggleTheme', () => {
  it('toggles dark to light', () => {
    localStorage.setItem('theme', 'dark')
    expect(toggleTheme()).toBe('light')
  })
  it('toggles light to dark', () => {
    localStorage.setItem('theme', 'light')
    expect(toggleTheme()).toBe('dark')
  })
})
