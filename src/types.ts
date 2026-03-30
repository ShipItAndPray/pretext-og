/** Font configuration for custom fonts */
export interface FontConfig {
  /** Font family name */
  name: string
  /** Font file data (.ttf, .otf, .woff2) */
  data: ArrayBuffer
  /** Font weight (100-900) */
  weight?: number
  /** Font style */
  style?: 'normal' | 'italic'
}

/** Options for ImageResponse and rendering functions */
export interface ImageResponseOptions {
  /** Image width in pixels (default: 1200) */
  width?: number
  /** Image height in pixels (default: 630) */
  height?: number
  /** Custom fonts to load */
  fonts?: FontConfig[]
  /** Draw debug bounding boxes */
  debug?: boolean
  /** HTTP response headers */
  headers?: Record<string, string>
  /** HTTP status code */
  status?: number
}

/** Result from renderToBuffer */
export interface RenderResult {
  /** PNG image data */
  png: Buffer
  /** Image width */
  width: number
  /** Image height */
  height: number
  /** Milliseconds to render */
  renderTime: number
}

/** A single laid-out line of text */
export interface LayoutLine {
  /** The text content of this line */
  text: string
  /** X position */
  x: number
  /** Y position */
  y: number
  /** Measured width */
  width: number
  /** Line height */
  height: number
}

/** Result from layoutText */
export interface TextLayoutResult {
  /** Individual lines with positions */
  lines: LayoutLine[]
  /** Total height of all lines */
  totalHeight: number
  /** True if text exceeds container bounds */
  overflow: boolean
}

/** Options for standalone text layout */
export interface TextLayoutOptions {
  /** Maximum width for text wrapping */
  maxWidth: number
  /** Maximum height (text beyond is overflow) */
  maxHeight?: number
  /** CSS font string (e.g. "bold 32px Inter") */
  font: string
  /** Font size in pixels */
  fontSize: number
  /** Line height multiplier (default: 1.2) */
  lineHeight?: number
  /** Text alignment */
  textAlign?: 'left' | 'center' | 'right'
  /** Word break behavior */
  wordBreak?: 'normal' | 'break-all' | 'break-word'
  /** Overflow handling */
  overflow?: 'visible' | 'hidden' | 'ellipsis'
  /** Font data for accurate measurement */
  fontData?: ArrayBuffer
}

/** Inline style object (CSS-in-JS) */
export interface ElementStyle {
  display?: 'flex' | 'none'
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline'
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse'
  flexGrow?: number
  flexShrink?: number
  flexBasis?: number | string
  gap?: number
  width?: number | string
  height?: number | string
  minWidth?: number | string
  minHeight?: number | string
  maxWidth?: number | string
  maxHeight?: number | string
  padding?: number | string
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  margin?: number | string
  marginTop?: number
  marginRight?: number
  marginBottom?: number
  marginLeft?: number
  position?: 'relative' | 'absolute'
  top?: number
  right?: number
  bottom?: number
  left?: number
  overflow?: 'visible' | 'hidden'
  background?: string
  backgroundColor?: string
  backgroundImage?: string
  borderRadius?: number | string
  borderTopLeftRadius?: number
  borderTopRightRadius?: number
  borderBottomLeftRadius?: number
  borderBottomRightRadius?: number
  border?: string
  borderWidth?: number
  borderColor?: string
  borderStyle?: string
  borderTop?: string
  borderBottom?: string
  borderLeft?: string
  borderRight?: string
  boxShadow?: string
  color?: string
  fontSize?: number
  fontWeight?: number | string
  fontFamily?: string
  fontStyle?: 'normal' | 'italic'
  lineHeight?: number | string
  letterSpacing?: number
  textAlign?: 'left' | 'center' | 'right'
  textDecoration?: string
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  textOverflow?: 'clip' | 'ellipsis'
  whiteSpace?: 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line'
  wordBreak?: 'normal' | 'break-all' | 'break-word'
  overflowWrap?: 'normal' | 'break-word' | 'anywhere'
  opacity?: number
  transform?: string
  objectFit?: 'contain' | 'cover' | 'fill' | 'none'
}

/** An element in the JSX-like tree */
export interface OGElement {
  type: string
  props: {
    style?: ElementStyle
    children?: OGNode | OGNode[]
    src?: string
    alt?: string
    width?: number
    height?: number
    tw?: string
    [key: string]: unknown
  }
}

/** A node in the element tree */
export type OGNode = OGElement | string | number | boolean | null | undefined

/** Resolved box after layout */
export interface LayoutBox {
  x: number
  y: number
  width: number
  height: number
  style: ElementStyle
  children: LayoutBox[]
  text?: string
  textLines?: LayoutLine[]
  element?: OGElement
}
