import type { OGElement, ImageResponseOptions } from './types'
import { renderToBuffer } from './renderToCanvas'

/**
 * Drop-in replacement for @vercel/og ImageResponse.
 *
 * Accepts the same JSX element tree and options as @vercel/og,
 * but uses Pretext for accurate text layout instead of Satori.
 *
 * Usage:
 * ```ts
 * import { ImageResponse } from '@shipitandpray/pretext-og'
 *
 * return new ImageResponse(
 *   <div style={{ ... }}>Hello World</div>,
 *   { width: 1200, height: 630 }
 * )
 * ```
 */
export class ImageResponse extends Response {
  constructor(element: OGElement, options?: ImageResponseOptions) {
    const width = options?.width ?? 1200
    const height = options?.height ?? 630
    const status = options?.status ?? 200

    // Create a ReadableStream that produces the PNG
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await renderToBuffer(element, { ...options, width, height })
          controller.enqueue(new Uint8Array(result.png))
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    const headers = new Headers({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, immutable, no-transform, max-age=31536000',
      ...options?.headers,
    })

    super(stream, { status, headers })
  }
}
