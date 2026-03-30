import type { OGElement, ImageResponseOptions, LayoutBox, RenderResult } from './types'
import { computeLayout } from './flexLayout'
import {
  resolveColor,
  resolveBorderRadius,
  parseGradient,
  parseBoxShadow,
  buildFontString,
} from './styleResolver'

/** Canvas and context pair */
export interface CanvasResult {
  canvas: any
  ctx: any
}

/**
 * Render a JSX-like element tree to a Canvas context.
 *
 * In Node.js, uses @napi-rs/canvas. In the browser, uses native Canvas API.
 */
export async function renderToCanvas(
  element: OGElement,
  options?: ImageResponseOptions,
): Promise<CanvasResult> {
  const width = options?.width ?? 1200
  const height = options?.height ?? 630
  const debug = options?.debug ?? false

  const { canvas, ctx } = await createCanvas(width, height)

  // Register custom fonts if provided
  if (options?.fonts) {
    await registerFonts(options.fonts)
  }

  // Compute layout
  const layoutTree = computeLayout(element, width, height)

  // Render the tree
  renderBox(ctx, layoutTree, debug)

  return { canvas, ctx }
}

/**
 * Render a JSX-like element tree to a PNG buffer.
 */
export async function renderToBuffer(
  element: OGElement,
  options?: ImageResponseOptions,
): Promise<RenderResult> {
  const start = performance.now()
  const { canvas } = await renderToCanvas(element, options)

  let png: Buffer

  if (typeof canvas.toBuffer === 'function') {
    // @napi-rs/canvas or node-canvas
    png = canvas.toBuffer('image/png')
  } else if (typeof canvas.encode === 'function') {
    // @napi-rs/canvas newer API
    png = await canvas.encode('png')
  } else if (typeof canvas.toBlob === 'function') {
    // Browser canvas
    const blob: Blob = await new Promise((resolve) => {
      canvas.toBlob((b: Blob) => resolve(b), 'image/png')
    })
    const arrayBuffer = await blob.arrayBuffer()
    png = Buffer.from(arrayBuffer)
  } else {
    throw new Error('Canvas does not support PNG export. Install @napi-rs/canvas for Node.js.')
  }

  const renderTime = performance.now() - start

  return {
    png,
    width: options?.width ?? 1200,
    height: options?.height ?? 630,
    renderTime,
  }
}

/**
 * Create a canvas instance.
 * Tries @napi-rs/canvas first (Node.js), falls back to browser Canvas.
 */
async function createCanvas(width: number, height: number): Promise<CanvasResult> {
  // Try @napi-rs/canvas (Node.js)
  try {
    const napiCanvas = await import('@napi-rs/canvas')
    const canvas = napiCanvas.createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    return { canvas, ctx }
  } catch {
    // Not available, try browser
  }

  // Browser fallback
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not create 2D rendering context')
    return { canvas, ctx }
  }

  // OffscreenCanvas (Web Worker)
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not create 2D rendering context')
    return { canvas, ctx }
  }

  throw new Error(
    'No canvas implementation available. Install @napi-rs/canvas for Node.js or run in a browser.'
  )
}

/**
 * Register fonts with @napi-rs/canvas (Node.js only).
 */
async function registerFonts(fonts: ImageResponseOptions['fonts']): Promise<void> {
  if (!fonts || fonts.length === 0) return

  try {
    const napiCanvas = await import('@napi-rs/canvas')
    const globalFonts = napiCanvas.GlobalFonts as any
    for (const font of fonts) {
      if (globalFonts && typeof globalFonts.registerFromBuffer === 'function') {
        globalFonts.registerFromBuffer(Buffer.from(font.data), font.name)
      } else if (globalFonts && typeof globalFonts.register === 'function') {
        globalFonts.register(Buffer.from(font.data), font.name)
      }
    }
  } catch {
    // @napi-rs/canvas not available, fonts loaded via fontData in measurement
  }
}

/**
 * Render a single layout box and its children to canvas.
 */
function renderBox(
  ctx: CanvasRenderingContext2D,
  box: LayoutBox,
  debug: boolean,
): void {
  ctx.save()
  ctx.translate(box.x, box.y)

  const style = box.style

  // Clipping for overflow: hidden
  if (style.overflow === 'hidden') {
    const radius = resolveBorderRadius(style)
    roundedRect(ctx, 0, 0, box.width, box.height, radius)
    ctx.clip()
  }

  // Background
  drawBackground(ctx, box)

  // Box shadow
  const shadow = parseBoxShadow(style.boxShadow)
  if (shadow) {
    ctx.shadowOffsetX = shadow.offsetX
    ctx.shadowOffsetY = shadow.offsetY
    ctx.shadowBlur = shadow.blur
    ctx.shadowColor = shadow.color
  }

  // Border
  drawBorder(ctx, box)

  // Reset shadow after border
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'

  // Text
  if (box.textLines && box.textLines.length > 0) {
    drawText(ctx, box)
  }

  // Debug bounding boxes
  if (debug) {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, box.width, box.height)

    if (box.textLines) {
      ctx.strokeStyle = 'rgba(0, 0, 255, 0.3)'
      for (const line of box.textLines) {
        ctx.strokeRect(line.x, line.y, line.width, line.height)
      }
    }
  }

  // Render children
  for (const child of box.children) {
    renderBox(ctx, child, debug)
  }

  ctx.restore()
}

/**
 * Draw background color or gradient.
 */
function drawBackground(ctx: CanvasRenderingContext2D, box: LayoutBox): void {
  const style = box.style
  const bg = style.background ?? style.backgroundColor

  if (!bg) return

  const radius = resolveBorderRadius(style)

  // Check for gradient
  const gradient = parseGradient(bg)
  if (gradient) {
    const angleRad = (gradient.angle - 90) * (Math.PI / 180)
    const cx = box.width / 2
    const cy = box.height / 2
    const len = Math.max(box.width, box.height)

    const x0 = cx - Math.cos(angleRad) * len / 2
    const y0 = cy - Math.sin(angleRad) * len / 2
    const x1 = cx + Math.cos(angleRad) * len / 2
    const y1 = cy + Math.sin(angleRad) * len / 2

    const grad = ctx.createLinearGradient(x0, y0, x1, y1)
    for (const stop of gradient.stops) {
      grad.addColorStop(stop.position, stop.color)
    }
    ctx.fillStyle = grad
  } else {
    ctx.fillStyle = resolveColor(bg)
  }

  roundedRect(ctx, 0, 0, box.width, box.height, radius)
  ctx.fill()
}

/**
 * Draw border.
 */
function drawBorder(ctx: CanvasRenderingContext2D, box: LayoutBox): void {
  const style = box.style
  const borderWidth = style.borderWidth ?? 0
  if (borderWidth <= 0) return

  const color = resolveColor(style.borderColor, '#000000')
  const radius = resolveBorderRadius(style)

  ctx.strokeStyle = color
  ctx.lineWidth = borderWidth
  roundedRect(ctx, 0, 0, box.width, box.height, radius)
  ctx.stroke()
}

/**
 * Draw text lines.
 */
function drawText(ctx: CanvasRenderingContext2D, box: LayoutBox): void {
  if (!box.textLines) return

  const style = box.style
  const fontStr = buildFontString(style)
  const color = resolveColor(style.color, '#000000')
  const opacity = style.opacity ?? 1

  ctx.font = fontStr
  ctx.fillStyle = color
  ctx.globalAlpha = opacity
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'

  const padding = {
    left: style.paddingLeft ?? (typeof style.padding === 'number' ? style.padding : 0),
    top: style.paddingTop ?? (typeof style.padding === 'number' ? style.padding : 0),
  }

  for (const line of box.textLines) {
    ctx.fillText(line.text, padding.left + line.x, padding.top + line.y)
  }

  ctx.globalAlpha = 1
}

/**
 * Draw a rounded rectangle path.
 */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: { tl: number; tr: number; br: number; bl: number },
): void {
  ctx.beginPath()
  ctx.moveTo(x + radius.tl, y)
  ctx.lineTo(x + w - radius.tr, y)
  if (radius.tr > 0) ctx.arcTo(x + w, y, x + w, y + radius.tr, radius.tr)
  ctx.lineTo(x + w, y + h - radius.br)
  if (radius.br > 0) ctx.arcTo(x + w, y + h, x + w - radius.br, y + h, radius.br)
  ctx.lineTo(x + radius.bl, y + h)
  if (radius.bl > 0) ctx.arcTo(x, y + h, x, y + h - radius.bl, radius.bl)
  ctx.lineTo(x, y + radius.tl)
  if (radius.tl > 0) ctx.arcTo(x, y, x + radius.tl, y, radius.tl)
  ctx.closePath()
}
