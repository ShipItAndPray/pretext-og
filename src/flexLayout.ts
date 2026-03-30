import type { OGElement, OGNode, ElementStyle, LayoutBox, LayoutLine } from './types'
import { layoutText } from './textLayout'
import { resolvePadding, resolveDimension, buildFontString } from './styleResolver'

/**
 * Pure-JS flexbox layout engine.
 * Computes position and size for each element in the tree.
 * Text nodes use Pretext for accurate intrinsic sizing.
 */
export function computeLayout(
  rootElement: OGElement,
  containerWidth: number,
  containerHeight: number,
): LayoutBox {
  return layoutElement(rootElement, containerWidth, containerHeight, 0, 0)
}

function layoutElement(
  element: OGElement,
  availableWidth: number,
  availableHeight: number,
  offsetX: number,
  offsetY: number,
): LayoutBox {
  const style = element.props.style ?? {}
  const padding = resolvePadding(style)

  // Resolve dimensions
  const explicitWidth = resolveDimension(style.width, availableWidth)
  const explicitHeight = resolveDimension(style.height, availableHeight)

  const boxWidth = explicitWidth ?? availableWidth
  const boxHeight = explicitHeight ?? availableHeight

  const contentWidth = boxWidth - padding.left - padding.right
  const contentHeight = boxHeight - padding.top - padding.bottom

  const children = normalizeChildren(element.props.children)
  const childBoxes: LayoutBox[] = []

  const direction = style.flexDirection ?? 'column'
  const isRow = direction === 'row' || direction === 'row-reverse'
  const justify = style.justifyContent ?? 'flex-start'
  const align = style.alignItems ?? 'stretch'
  const gap = style.gap ?? 0

  // First pass: measure children
  const measuredChildren: Array<{ box: LayoutBox; mainSize: number; crossSize: number }> = []
  let totalMainSize = 0
  let textContent = ''

  for (const child of children) {
    if (typeof child === 'string' || typeof child === 'number') {
      textContent += String(child)
      continue
    }

    if (child && typeof child === 'object' && 'type' in child) {
      const childEl = child as OGElement
      const childStyle = childEl.props.style ?? {}

      // Estimate child size for first pass
      const childAvailW = isRow ? contentWidth : contentWidth
      const childAvailH = isRow ? contentHeight : contentHeight

      const childBox = layoutElement(childEl, childAvailW, childAvailH, 0, 0)

      const mainSize = isRow ? childBox.width : childBox.height
      const crossSize = isRow ? childBox.height : childBox.width

      measuredChildren.push({ box: childBox, mainSize, crossSize })
      totalMainSize += mainSize
    }
  }

  // Handle text content
  let textLines: LayoutLine[] | undefined
  if (textContent) {
    const fontStr = buildFontString(style)
    const fontSize = style.fontSize ?? 16
    const lineHeight = typeof style.lineHeight === 'number' ? style.lineHeight : 1.2

    const result = layoutText(textContent, {
      maxWidth: contentWidth,
      maxHeight: contentHeight,
      font: style.fontFamily ?? 'sans-serif',
      fontSize,
      lineHeight,
      textAlign: style.textAlign,
      wordBreak: style.wordBreak as 'normal' | 'break-all' | 'break-word',
      overflow: style.overflow === 'hidden' ? 'hidden' : style.textOverflow === 'ellipsis' ? 'ellipsis' : 'visible',
    })

    textLines = result.lines
  }

  // Add gaps
  const totalGaps = measuredChildren.length > 1 ? (measuredChildren.length - 1) * gap : 0
  const totalWithGaps = totalMainSize + totalGaps
  const freeSpace = Math.max(0, (isRow ? contentWidth : contentHeight) - totalWithGaps)

  // Position children based on justify-content
  let mainOffset = 0
  let gapExtra = 0

  switch (justify) {
    case 'center':
      mainOffset = freeSpace / 2
      break
    case 'flex-end':
      mainOffset = freeSpace
      break
    case 'space-between':
      gapExtra = measuredChildren.length > 1 ? freeSpace / (measuredChildren.length - 1) : 0
      break
    case 'space-around':
      gapExtra = measuredChildren.length > 0 ? freeSpace / measuredChildren.length : 0
      mainOffset = gapExtra / 2
      break
    case 'space-evenly':
      gapExtra = measuredChildren.length > 0 ? freeSpace / (measuredChildren.length + 1) : 0
      mainOffset = gapExtra
      break
    default: // flex-start
      break
  }

  // Second pass: position children
  for (let i = 0; i < measuredChildren.length; i++) {
    const { box, mainSize, crossSize } = measuredChildren[i]
    const containerCross = isRow ? contentHeight : contentWidth

    // Cross-axis alignment
    let crossOffset = 0
    switch (align) {
      case 'center':
        crossOffset = (containerCross - crossSize) / 2
        break
      case 'flex-end':
        crossOffset = containerCross - crossSize
        break
      case 'stretch':
        if (isRow) {
          box.height = contentHeight
        } else {
          box.width = contentWidth
        }
        break
      default: // flex-start, baseline
        break
    }

    if (isRow) {
      box.x = padding.left + mainOffset
      box.y = padding.top + crossOffset
    } else {
      box.x = padding.left + crossOffset
      box.y = padding.top + mainOffset
    }

    mainOffset += mainSize + gap + gapExtra

    childBoxes.push(box)
  }

  // Calculate actual height if not explicit
  let actualHeight = boxHeight
  if (explicitHeight === undefined) {
    if (textLines && textLines.length > 0) {
      const textBottom = textLines[textLines.length - 1].y + textLines[textLines.length - 1].height
      actualHeight = padding.top + textBottom + padding.bottom
    } else if (childBoxes.length > 0) {
      const lastChild = childBoxes[childBoxes.length - 1]
      const childrenBottom = isRow
        ? Math.max(...childBoxes.map(c => c.y + c.height))
        : lastChild.y + lastChild.height
      actualHeight = childrenBottom + padding.bottom
    } else {
      actualHeight = padding.top + padding.bottom
    }
  }

  return {
    x: offsetX,
    y: offsetY,
    width: boxWidth,
    height: actualHeight,
    style,
    children: childBoxes,
    text: textContent || undefined,
    textLines,
    element,
  }
}

/** Normalize children to a flat array */
function normalizeChildren(children: OGNode | OGNode[] | undefined): OGNode[] {
  if (children === undefined || children === null) return []
  if (Array.isArray(children)) return children.flat()
  return [children]
}
