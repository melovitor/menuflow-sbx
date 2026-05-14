import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatPhone,
  generateSlug,
  generateAccessCode,
} from '../../utils/formatters'

describe('formatCurrency', () => {
  it('formats BRL currency', () => {
    expect(formatCurrency(12.5)).toContain('12,50')
    expect(formatCurrency(0)).toContain('0,00')
  })
})

describe('formatPhone', () => {
  it('formats 11-digit mobile', () => {
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321')
  })
  it('formats 10-digit landline', () => {
    expect(formatPhone('1134567890')).toBe('(11) 3456-7890')
  })
})

describe('generateSlug', () => {
  it('lowercases and replaces spaces', () => {
    expect(generateSlug('Bar do João')).toBe('bar-do-joao')
  })
  it('removes special characters', () => {
    expect(generateSlug('Café & Bistrô!')).toBe('cafe-bistro')
  })
})

describe('generateAccessCode', () => {
  it('returns 6-digit string', () => {
    const code = generateAccessCode()
    expect(code).toHaveLength(6)
    expect(Number(code)).toBeGreaterThanOrEqual(100000)
    expect(Number(code)).toBeLessThanOrEqual(999999)
  })
})
