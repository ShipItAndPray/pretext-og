import { describe, it, expect } from 'vitest'
import { ImageResponse } from '../src/ImageResponse'
import { renderToBuffer } from '../src/renderToCanvas'
import { createElement } from '../src/elements'
import type { OGElement } from '../src/types'

// Helper to create test elements without JSX
function div(
  style: Record<string, unknown>,
  ...children: Array<string | OGElement>
): OGElement {
  return createElement('div', { style }, ...children)
}

describe('ImageResponse', () => {
  it('creates a Response with correct content type', () => {
    const element = div(
      {
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
      },
      'Hello World',
    )

    const response = new ImageResponse(element, { width: 1200, height: 630 })
    expect(response).toBeInstanceOf(Response)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.status).toBe(200)
  })

  it('respects custom status and headers', () => {
    const element = div({ display: 'flex' }, 'Test')

    const response = new ImageResponse(element, {
      status: 201,
      headers: { 'X-Custom': 'test' },
    })

    expect(response.status).toBe(201)
    expect(response.headers.get('X-Custom')).toBe('test')
  })

  it('sets cache-control header', () => {
    const element = div({ display: 'flex' }, 'Test')
    const response = new ImageResponse(element)
    expect(response.headers.get('Cache-Control')).toContain('max-age=31536000')
  })
})

describe('renderToBuffer', () => {
  it('renders a simple element to PNG buffer', async () => {
    const element = div(
      {
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: 'white',
        color: 'black',
        fontSize: 48,
      },
      'Hello World',
    )

    const result = await renderToBuffer(element, { width: 600, height: 315 })

    expect(result.png).toBeInstanceOf(Buffer)
    expect(result.png.length).toBeGreaterThan(0)
    expect(result.width).toBe(600)
    expect(result.height).toBe(315)
    expect(result.renderTime).toBeGreaterThanOrEqual(0)

    // Verify PNG magic bytes
    expect(result.png[0]).toBe(0x89)
    expect(result.png[1]).toBe(0x50) // P
    expect(result.png[2]).toBe(0x4e) // N
    expect(result.png[3]).toBe(0x47) // G
  })

  it('renders nested elements', async () => {
    const element = div(
      {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a2e',
        padding: 40,
      },
      div({ fontSize: 48, color: 'white', fontWeight: 700 }, 'Title'),
      div({ fontSize: 24, color: '#aaa' }, 'Subtitle here'),
    )

    const result = await renderToBuffer(element, { width: 1200, height: 630 })
    expect(result.png).toBeInstanceOf(Buffer)
    expect(result.png.length).toBeGreaterThan(100)
  })

  it('renders with gradient background', async () => {
    const element = div(
      {
        display: 'flex',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        justifyContent: 'center',
        alignItems: 'center',
      },
      div({ fontSize: 64, color: 'white' }, 'Gradient'),
    )

    const result = await renderToBuffer(element, { width: 1200, height: 630 })
    expect(result.png).toBeInstanceOf(Buffer)
  })

  it('renders with debug mode showing bounding boxes', async () => {
    const element = div(
      { display: 'flex', width: '100%', height: '100%', backgroundColor: 'white' },
      div({ fontSize: 32 }, 'Debug test'),
    )

    const result = await renderToBuffer(element, {
      width: 600,
      height: 315,
      debug: true,
    })
    expect(result.png).toBeInstanceOf(Buffer)
  })

  it('handles empty text gracefully', async () => {
    const element = div({
      display: 'flex',
      width: '100%',
      height: '100%',
      backgroundColor: 'black',
    })

    const result = await renderToBuffer(element, { width: 600, height: 315 })
    expect(result.png).toBeInstanceOf(Buffer)
  })
})
