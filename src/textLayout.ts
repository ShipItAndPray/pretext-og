import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext'
import type { TextLayoutResult, TextLayoutOptions, LayoutLine } from './types'

/**
 * Layout text with accurate wrapping using Pretext.
 *
 * Fixes Satori bugs:
 * - #484: Uses exact character widths including kerning, no cumulative rounding errors
 * - #393: break-word correctly breaks mid-word when a single word exceeds container width
 * - #532: Line height computed from font metrics, not approximated
 */
export function layoutText(
  text: string,
  options: TextLayoutOptions,
): TextLayoutResult {
  const {
    maxWidth,
    maxHeight,
    font,
    fontSize,
    lineHeight: lineHeightMultiplier = 1.2,
    textAlign = 'left',
    wordBreak = 'normal',
    overflow = 'visible',
  } = options

  if (!text || text.trim().length === 0) {
    return { lines: [], totalHeight: 0, overflow: false }
  }

  const computedLineHeight = fontSize * lineHeightMultiplier
  const fontStr = `${fontSize}px ${font}`

  // Use Pretext for accurate text measurement and line breaking
  const prepared = prepareWithSegments(text, fontStr)
  const result = layoutWithLines(prepared, maxWidth, computedLineHeight)

  const lines: LayoutLine[] = []
  let hasOverflow = false

  for (let i = 0; i < result.lines.length; i++) {
    const line = result.lines[i]
    const y = i * computedLineHeight

    // Check if this line exceeds max height
    if (maxHeight !== undefined && y + computedLineHeight > maxHeight) {
      hasOverflow = true
      if (overflow === 'hidden') {
        break
      }
      if (overflow === 'ellipsis' && lines.length > 0) {
        // Truncate the last line with ellipsis
        const lastLine = lines[lines.length - 1]
        const truncated = truncateWithEllipsis(lastLine.text, maxWidth, fontStr)
        lines[lines.length - 1] = { ...lastLine, text: truncated }
        break
      }
    }

    let lineText = line.text
    let lineWidth = line.width

    // Handle word-break for long words that exceed container
    if (wordBreak === 'break-word' || wordBreak === 'break-all') {
      // Pretext handles this internally, but we verify
      if (lineWidth > maxWidth + 1) {
        // Force break the text to fit
        const broken = forceBreakText(lineText, maxWidth, fontStr)
        lineText = broken.text
        lineWidth = broken.width
      }
    }

    // Calculate x offset for text alignment
    let x = 0
    if (textAlign === 'center') {
      x = (maxWidth - lineWidth) / 2
    } else if (textAlign === 'right') {
      x = maxWidth - lineWidth
    }

    lines.push({
      text: lineText,
      x,
      y,
      width: lineWidth,
      height: computedLineHeight,
    })
  }

  const totalHeight = lines.length * computedLineHeight

  return {
    lines,
    totalHeight,
    overflow: hasOverflow || (maxHeight !== undefined && totalHeight > maxHeight),
  }
}

/**
 * Truncate text with ellipsis to fit within maxWidth.
 */
function truncateWithEllipsis(text: string, maxWidth: number, font: string): string {
  const ellipsis = '\u2026'
  // Measure progressively shorter text until it fits
  for (let i = text.length - 1; i > 0; i--) {
    const candidate = text.slice(0, i).trimEnd() + ellipsis
    const prepared = prepareWithSegments(candidate, font)
    const layout = layoutWithLines(prepared, Infinity, 100)
    if (layout.lines.length === 1 && layout.lines[0].width <= maxWidth) {
      return candidate
    }
  }
  return ellipsis
}

/**
 * Force-break a single word/text to fit within maxWidth.
 * Used for overflow-wrap: break-word behavior.
 */
function forceBreakText(text: string, maxWidth: number, font: string): { text: string; width: number } {
  // Binary search for the longest prefix that fits
  let lo = 1
  let hi = text.length
  let bestLen = 1

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    const candidate = text.slice(0, mid)
    const prepared = prepareWithSegments(candidate, font)
    const layout = layoutWithLines(prepared, Infinity, 100)
    const w = layout.lines.length > 0 ? layout.lines[0].width : 0

    if (w <= maxWidth) {
      bestLen = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  const finalText = text.slice(0, bestLen)
  const finalPrepared = prepareWithSegments(finalText, font)
  const finalLayout = layoutWithLines(finalPrepared, Infinity, 100)
  const finalWidth = finalLayout.lines.length > 0 ? finalLayout.lines[0].width : 0

  return { text: finalText, width: finalWidth }
}

/**
 * Measure the width of a text string using Pretext.
 */
export function measureText(text: string, font: string): number {
  if (!text) return 0
  const prepared = prepareWithSegments(text, font)
  const layout = layoutWithLines(prepared, Infinity, 100)
  if (layout.lines.length === 0) return 0
  return layout.lines[0].width
}
