import type { ElementStyle } from './types'

/** Resolved padding values */
export interface ResolvedPadding {
  top: number
  right: number
  bottom: number
  left: number
}

/** Resolve shorthand padding to individual values */
export function resolvePadding(style: ElementStyle): ResolvedPadding {
  const base = { top: 0, right: 0, bottom: 0, left: 0 }

  if (style.padding !== undefined) {
    const val = typeof style.padding === 'number' ? style.padding : parseFloat(String(style.padding)) || 0
    base.top = val
    base.right = val
    base.bottom = val
    base.left = val
  }

  if (style.paddingTop !== undefined) base.top = style.paddingTop
  if (style.paddingRight !== undefined) base.right = style.paddingRight
  if (style.paddingBottom !== undefined) base.bottom = style.paddingBottom
  if (style.paddingLeft !== undefined) base.left = style.paddingLeft

  return base
}

/** Resolve a dimension value to pixels */
export function resolveDimension(
  value: number | string | undefined,
  containerSize: number,
): number | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'number') return value
  if (value.endsWith('%')) {
    return (parseFloat(value) / 100) * containerSize
  }
  if (value.endsWith('px')) {
    return parseFloat(value)
  }
  return parseFloat(value) || undefined
}

/** Parse a CSS color string */
export function resolveColor(color: string | undefined, fallback = 'transparent'): string {
  if (!color) return fallback
  return color
}

/** Parse border-radius to individual corner values */
export function resolveBorderRadius(style: ElementStyle): {
  tl: number
  tr: number
  br: number
  bl: number
} {
  const base = typeof style.borderRadius === 'number'
    ? style.borderRadius
    : parseFloat(String(style.borderRadius)) || 0

  return {
    tl: style.borderTopLeftRadius ?? base,
    tr: style.borderTopRightRadius ?? base,
    br: style.borderBottomRightRadius ?? base,
    bl: style.borderBottomLeftRadius ?? base,
  }
}

/** Build a CSS font string from style properties */
export function buildFontString(style: ElementStyle, defaultFamily = 'sans-serif'): string {
  const weight = style.fontWeight ?? 400
  const styleStr = style.fontStyle === 'italic' ? 'italic' : 'normal'
  const size = style.fontSize ?? 16
  const family = style.fontFamily ?? defaultFamily
  return `${styleStr} ${weight} ${size}px ${family}`
}

/** Parse a linear-gradient string into stops */
export function parseGradient(
  value: string,
): { angle: number; stops: Array<{ color: string; position: number }> } | null {
  const match = /linear-gradient\(\s*(\d+)deg\s*,\s*(.+)\)/.exec(value)
  if (!match) return null

  const angle = parseInt(match[1], 10)
  const stopsStr = match[2]
  const stops: Array<{ color: string; position: number }> = []

  // Parse stops like "#667eea 0%, #764ba2 100%"
  const parts = stopsStr.split(',').map(s => s.trim())
  for (const part of parts) {
    const stopMatch = /^(.+?)\s+(\d+)%$/.exec(part)
    if (stopMatch) {
      stops.push({
        color: stopMatch[1].trim(),
        position: parseInt(stopMatch[2], 10) / 100,
      })
    } else {
      stops.push({ color: part.trim(), position: stops.length === 0 ? 0 : 1 })
    }
  }

  return { angle, stops }
}

/** Parse box-shadow into components */
export function parseBoxShadow(value: string | undefined): {
  offsetX: number
  offsetY: number
  blur: number
  spread: number
  color: string
} | null {
  if (!value || value === 'none') return null

  // Simple parser: offsetX offsetY blur spread? color
  const parts = value.trim().split(/\s+/)
  if (parts.length < 3) return null

  return {
    offsetX: parseFloat(parts[0]) || 0,
    offsetY: parseFloat(parts[1]) || 0,
    blur: parseFloat(parts[2]) || 0,
    spread: parts.length > 4 ? parseFloat(parts[3]) || 0 : 0,
    color: parts.length > 4 ? parts.slice(4).join(' ') : (parts[3] ?? 'rgba(0,0,0,0.1)'),
  }
}
