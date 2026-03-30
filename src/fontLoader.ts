/** In-memory font cache */
const fontCache = new Map<string, ArrayBuffer>()

/**
 * Load a font from Google Fonts API.
 *
 * @param family - Google Font family name (e.g. "Inter")
 * @param options - Weight and optional text subset
 * @returns ArrayBuffer of font file data
 */
export async function loadGoogleFont(
  family: string,
  options?: { weight?: number; text?: string },
): Promise<ArrayBuffer> {
  const weight = options?.weight ?? 400
  const cacheKey = `google:${family}:${weight}:${options?.text ?? ''}`

  const cached = fontCache.get(cacheKey)
  if (cached) return cached

  // Build Google Fonts CSS URL
  let url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`
  if (options?.text) {
    url += `&text=${encodeURIComponent(options.text)}`
  }

  // Fetch CSS first to get the actual font URL
  const cssResponse = await fetch(url, {
    headers: {
      // Request woff2 format
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  })

  if (!cssResponse.ok) {
    throw new Error(`Failed to load Google Font CSS for "${family}": ${cssResponse.statusText}`)
  }

  const css = await cssResponse.text()

  // Extract font URL from CSS
  const urlMatch = /src:\s*url\(([^)]+)\)/i.exec(css)
  if (!urlMatch) {
    throw new Error(`Could not find font URL in Google Fonts CSS for "${family}"`)
  }

  const fontUrl = urlMatch[1]
  const fontResponse = await fetch(fontUrl)

  if (!fontResponse.ok) {
    throw new Error(`Failed to download font file for "${family}": ${fontResponse.statusText}`)
  }

  const data = await fontResponse.arrayBuffer()
  fontCache.set(cacheKey, data)
  return data
}

/**
 * Load a font from a local file path (Node.js only).
 *
 * @param path - Path to .ttf, .otf, or .woff2 file
 * @returns ArrayBuffer of font file data
 */
export async function loadLocalFont(path: string): Promise<ArrayBuffer> {
  const cacheKey = `local:${path}`
  const cached = fontCache.get(cacheKey)
  if (cached) return cached

  // Dynamic import to keep browser-compatible
  const fs = await import('fs/promises')
  const buffer = await fs.readFile(path)
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  fontCache.set(cacheKey, ab)
  return ab
}

/**
 * Register a font in the cache by name (for use with Canvas).
 */
export function registerFont(name: string, data: ArrayBuffer, weight?: number): void {
  const cacheKey = `registered:${name}:${weight ?? 400}`
  fontCache.set(cacheKey, data)
}

/**
 * Clear the font cache.
 */
export function clearFontCache(): void {
  fontCache.clear()
}
