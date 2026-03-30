import type { OGElement, OGNode, ElementStyle } from './types'

/**
 * Supported element types for OG image rendering.
 *
 * Mirrors the subset of HTML elements that @vercel/og supports:
 * - div: Flex container (the primary building block)
 * - span: Inline text
 * - p: Paragraph text
 * - img: Image element (fetched and drawn)
 * - svg: SVG element (rendered as paths)
 */
export const SUPPORTED_ELEMENTS = ['div', 'span', 'p', 'img', 'svg'] as const

export type SupportedElement = (typeof SUPPORTED_ELEMENTS)[number]

/**
 * Check if an element type is supported.
 */
export function isSupportedElement(type: string): type is SupportedElement {
  return (SUPPORTED_ELEMENTS as readonly string[]).includes(type)
}

/**
 * Create an OG element (factory function for non-JSX usage).
 */
export function createElement(
  type: string,
  props: { style?: ElementStyle; [key: string]: unknown } | null,
  ...children: OGNode[]
): OGElement {
  return {
    type,
    props: {
      ...(props ?? {}),
      children: children.length === 1 ? children[0] : children,
    },
  }
}

/**
 * Get the default style for an element type.
 */
export function getDefaultStyle(type: string): ElementStyle {
  switch (type) {
    case 'div':
      return { display: 'flex' }
    case 'span':
      return { display: 'flex' }
    case 'p':
      return { display: 'flex' }
    case 'img':
      return { display: 'flex' }
    case 'svg':
      return { display: 'flex' }
    default:
      return { display: 'flex' }
  }
}

/**
 * Normalize a JSX element tree, handling React createElement output.
 * Converts React-style { type, props: { children } } to our OGElement format.
 */
export function normalizeElement(node: unknown): OGElement | null {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return null
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return {
      type: 'span',
      props: { children: String(node) },
    }
  }

  if (typeof node === 'object' && node !== null) {
    const el = node as Record<string, unknown>

    // React createElement format: { type, props, key, ref }
    if ('type' in el && 'props' in el) {
      const type = typeof el.type === 'string' ? el.type : 'div'
      const props = (el.props ?? {}) as Record<string, unknown>

      return {
        type,
        props: {
          ...props,
          style: props.style as ElementStyle | undefined,
        },
      }
    }

    // Already our format
    if ('type' in el) {
      return el as unknown as OGElement
    }
  }

  return null
}
