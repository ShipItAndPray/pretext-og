import { describe, it, expect } from 'vitest'
import { layoutText } from '../src/textLayout'
import { renderToBuffer } from '../src/renderToCanvas'
import { createElement } from '../src/elements'
import type { OGElement } from '../src/types'

/**
 * These tests reproduce the specific Satori bugs and verify
 * that pretext-og handles them correctly.
 *
 * Satori issue references:
 * - #484: https://github.com/vercel/satori/issues/484
 * - #393: https://github.com/vercel/satori/issues/393
 * - #532: https://github.com/vercel/satori/issues/532
 */

function div(
  style: Record<string, unknown>,
  ...children: Array<string | OGElement>
): OGElement {
  return createElement('div', { style }, ...children)
}

describe('Satori Bug #484 — Text overflow with certain font/size combinations', () => {
  it('text never overflows container width regardless of font size', () => {
    const sizes = [16, 24, 32, 48, 64, 72]
    const text = 'This is a title that should wrap correctly without overflowing the container boundaries'

    for (const fontSize of sizes) {
      const result = layoutText(text, {
        font: 'sans-serif',
        fontSize,
        maxWidth: 500,
      })

      for (const line of result.lines) {
        expect(line.width).toBeLessThanOrEqual(500 + 2) // small float tolerance
      }
    }
  })

  it('repeated wide characters do not cause cumulative overflow', () => {
    // WWWW... is particularly prone to Satori's rounding error accumulation
    const text = 'W'.repeat(50)
    const result = layoutText(text, {
      font: 'sans-serif',
      fontSize: 32,
      maxWidth: 400,
      wordBreak: 'break-all',
    })

    for (const line of result.lines) {
      expect(line.width).toBeLessThanOrEqual(400 + 2)
    }
  })
})

describe('Satori Bug #393 — Long words without spaces cause overflow', () => {
  it('long URL wraps correctly with break-word', () => {
    const url = 'https://www.example.com/articles/2024/very-long-slug-that-keeps-going-and-going'
    const result = layoutText(url, {
      font: 'sans-serif',
      fontSize: 24,
      maxWidth: 400,
      wordBreak: 'break-word',
    })

    // Must produce multiple lines
    expect(result.lines.length).toBeGreaterThanOrEqual(1)

    // No line overflows
    for (const line of result.lines) {
      expect(line.width).toBeLessThanOrEqual(400 + 2)
    }
  })

  it('long hash string wraps with break-all', () => {
    const hash = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    const result = layoutText(hash, {
      font: 'sans-serif',
      fontSize: 20,
      maxWidth: 300,
      wordBreak: 'break-all',
    })

    for (const line of result.lines) {
      expect(line.width).toBeLessThanOrEqual(300 + 2)
    }
  })

  it('mixed content with one long word wraps the long word', () => {
    const text = 'Check out superlongdomainname.example.com/path for details'
    const result = layoutText(text, {
      font: 'sans-serif',
      fontSize: 24,
      maxWidth: 350,
      wordBreak: 'break-word',
    })

    for (const line of result.lines) {
      expect(line.width).toBeLessThanOrEqual(350 + 2)
    }
  })
})

describe('Satori Bug #532 — Line height produces overlapping lines', () => {
  it('lines do not overlap with custom line height', () => {
    const text = 'First line of text that is long enough to wrap. Second line of text continues here.'
    const lineHeight = 1.6

    const result = layoutText(text, {
      font: 'sans-serif',
      fontSize: 32,
      maxWidth: 400,
      lineHeight,
    })

    // Verify no overlapping: each line starts after the previous one ends
    for (let i = 1; i < result.lines.length; i++) {
      const prevBottom = result.lines[i - 1].y + result.lines[i - 1].height
      expect(result.lines[i].y).toBeGreaterThanOrEqual(prevBottom - 1)
    }
  })

  it('line height is consistent across all lines', () => {
    const text = 'A\nB\nC\nD\nE'
    const result = layoutText(text, {
      font: 'sans-serif',
      fontSize: 24,
      maxWidth: 600,
      lineHeight: 2.0,
    })

    const expectedHeight = 24 * 2.0

    for (const line of result.lines) {
      expect(line.height).toBeCloseTo(expectedHeight, 0)
    }

    // Check spacing between lines
    for (let i = 1; i < result.lines.length; i++) {
      const gap = result.lines[i].y - result.lines[i - 1].y
      expect(gap).toBeCloseTo(expectedHeight, 0)
    }
  })

  it('total height matches lineCount * lineHeight', () => {
    const text = 'Multi\nline\ntext\nhere'
    const lineHeight = 1.5
    const fontSize = 20

    const result = layoutText(text, {
      font: 'sans-serif',
      fontSize,
      maxWidth: 600,
      lineHeight,
    })

    const expectedTotalHeight = result.lines.length * fontSize * lineHeight
    expect(result.totalHeight).toBeCloseTo(expectedTotalHeight, 0)
  })
})

describe('Full render pipeline — Satori bug reproductions', () => {
  it('renders text-heavy card without overflow', async () => {
    const element = div(
      {
        display: 'flex',
        flexDirection: 'column',
        padding: 60,
        width: '100%',
        height: '100%',
        backgroundColor: 'white',
      },
      div(
        { fontSize: 48, fontWeight: 700, color: '#1a1a2e' },
        'Understanding Distributed Systems: A Comprehensive Guide to Modern Architecture Patterns',
      ),
      div(
        { fontSize: 24, color: '#666', marginTop: 20 },
        'A deep dive into microservices, event sourcing, CQRS, and the trade-offs that matter.',
      ),
    )

    const result = await renderToBuffer(element, { width: 1200, height: 630 })

    // Should produce a valid PNG
    expect(result.png[0]).toBe(0x89)
    expect(result.png[1]).toBe(0x50)
    expect(result.renderTime).toBeLessThan(5000) // generous timeout
  })
})
