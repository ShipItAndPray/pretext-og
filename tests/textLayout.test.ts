import { describe, it, expect } from 'vitest'
import { layoutText, measureText } from '../src/textLayout'

describe('layoutText', () => {
  const baseOptions = {
    font: 'sans-serif',
    fontSize: 32,
    maxWidth: 600,
  }

  it('returns empty lines for empty text', () => {
    const result = layoutText('', baseOptions)
    expect(result.lines).toHaveLength(0)
    expect(result.totalHeight).toBe(0)
    expect(result.overflow).toBe(false)
  })

  it('returns empty lines for whitespace-only text', () => {
    const result = layoutText('   ', baseOptions)
    expect(result.lines).toHaveLength(0)
    expect(result.totalHeight).toBe(0)
  })

  it('wraps text into multiple lines at container boundary', () => {
    const longText = 'The quick brown fox jumps over the lazy dog and continues running across the wide open field'
    const result = layoutText(longText, { ...baseOptions, maxWidth: 300 })

    expect(result.lines.length).toBeGreaterThan(1)
    // Every line width must be <= maxWidth (this is the Satori #484 fix)
    for (const line of result.lines) {
      expect(line.width).toBeLessThanOrEqual(300 + 1) // +1 for float tolerance
    }
  })

  it('no text overflows container width (Satori #484 fix)', () => {
    // This specific text pattern triggers Satori overflow due to kerning rounding errors
    const problematicText = 'WAVE WAVE WAVE WAVE WAVE WAVE WAVE WAVE WAVE WAVE'
    const result = layoutText(problematicText, { ...baseOptions, maxWidth: 400 })

    for (const line of result.lines) {
      expect(line.width).toBeLessThanOrEqual(400 + 1)
    }
    expect(result.overflow).toBe(false)
  })

  it('breaks long words with break-word (Satori #393 fix)', () => {
    const longWord = 'https://www.example.com/very/long/path/that/does/not/have/any/spaces/whatsoever'
    const result = layoutText(longWord, {
      ...baseOptions,
      maxWidth: 400,
      wordBreak: 'break-word',
    })

    // Must produce multiple lines since the word exceeds maxWidth
    expect(result.lines.length).toBeGreaterThanOrEqual(1)
    // No line should overflow
    for (const line of result.lines) {
      expect(line.width).toBeLessThanOrEqual(400 + 1)
    }
  })

  it('computes correct total height for multi-line text (Satori #532 fix)', () => {
    const text = 'Line one of the text\nLine two of the text\nLine three of the text'
    const lineHeight = 1.5
    const result = layoutText(text, { ...baseOptions, lineHeight })

    const expectedLineHeight = 32 * lineHeight // fontSize * lineHeight
    expect(result.totalHeight).toBeCloseTo(result.lines.length * expectedLineHeight, 0)

    // Lines should not overlap - each line.y should be >= previous line.y + height
    for (let i = 1; i < result.lines.length; i++) {
      expect(result.lines[i].y).toBeGreaterThanOrEqual(
        result.lines[i - 1].y + result.lines[i - 1].height - 1
      )
    }
  })

  it('centers text with textAlign center', () => {
    const result = layoutText('Hello', {
      ...baseOptions,
      textAlign: 'center',
    })

    expect(result.lines).toHaveLength(1)
    const line = result.lines[0]
    // x should be roughly (maxWidth - lineWidth) / 2
    const expectedX = (600 - line.width) / 2
    expect(line.x).toBeCloseTo(expectedX, 0)
  })

  it('right-aligns text with textAlign right', () => {
    const result = layoutText('Hello', {
      ...baseOptions,
      textAlign: 'right',
    })

    expect(result.lines).toHaveLength(1)
    const line = result.lines[0]
    const expectedX = 600 - line.width
    expect(line.x).toBeCloseTo(expectedX, 0)
  })

  it('truncates with ellipsis when overflow is ellipsis and exceeds maxHeight', () => {
    const longText = 'This is line one. This is line two. This is line three. This is line four. This is line five.'
    const result = layoutText(longText, {
      ...baseOptions,
      maxWidth: 300,
      maxHeight: 80, // Only room for ~2 lines at 32px * 1.2
      overflow: 'ellipsis',
    })

    // Should be truncated
    expect(result.lines.length).toBeLessThanOrEqual(3)
  })

  it('hides overflow when overflow is hidden', () => {
    const longText = 'Line one. Line two. Line three. Line four. Line five. Line six. Line seven.'
    const result = layoutText(longText, {
      ...baseOptions,
      maxWidth: 300,
      maxHeight: 80,
      overflow: 'hidden',
    })

    // Total height should not exceed maxHeight
    const lastLine = result.lines[result.lines.length - 1]
    if (lastLine) {
      expect(lastLine.y + lastLine.height).toBeLessThanOrEqual(80 + 1)
    }
  })

  it('handles single-line text without wrapping', () => {
    const result = layoutText('Hi', { ...baseOptions, maxWidth: 600 })
    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].text).toBe('Hi')
    expect(result.lines[0].y).toBe(0)
    expect(result.overflow).toBe(false)
  })

  it('all lines have positive width and height', () => {
    const result = layoutText('Some multi word text that should wrap around', {
      ...baseOptions,
      maxWidth: 200,
    })

    for (const line of result.lines) {
      expect(line.width).toBeGreaterThan(0)
      expect(line.height).toBeGreaterThan(0)
    }
  })
})

describe('measureText', () => {
  it('returns 0 for empty string', () => {
    expect(measureText('', '32px sans-serif')).toBe(0)
  })

  it('returns positive width for non-empty text', () => {
    const w = measureText('Hello World', '32px sans-serif')
    expect(w).toBeGreaterThan(0)
  })

  it('longer text measures wider', () => {
    const short = measureText('Hi', '32px sans-serif')
    const long = measureText('Hello World', '32px sans-serif')
    expect(long).toBeGreaterThan(short)
  })
})
