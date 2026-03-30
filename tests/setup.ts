/**
 * Test setup: Polyfill OffscreenCanvas using @napi-rs/canvas
 * so that @chenglou/pretext can measure text in Node.js.
 */
import { createCanvas } from '@napi-rs/canvas'

// Pretext's measurement module checks for OffscreenCanvas first.
// We create a minimal polyfill that returns a @napi-rs/canvas 2D context.
if (typeof globalThis.OffscreenCanvas === 'undefined') {
  (globalThis as any).OffscreenCanvas = class OffscreenCanvas {
    private _canvas: ReturnType<typeof createCanvas>

    constructor(width: number, height: number) {
      this._canvas = createCanvas(width, height)
    }

    getContext(type: string) {
      if (type === '2d') {
        return this._canvas.getContext('2d')
      }
      return null
    }
  }
}
