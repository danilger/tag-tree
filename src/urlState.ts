import type { TagMatchMode, ViewMode } from './types'

export type ThemeMode = 'light' | 'dark'

/** Fields present in the URL after a successful parse (absent = not in query). */
export type DeepLinkParsed = {
  tags?: string[]
  match?: TagMatchMode
  mode?: ViewMode
  /** Present even when empty string (explicit clear). */
  change?: string
  theme?: ThemeMode
  explorer?: boolean
  menu?: boolean
  split?: boolean
  zoom?: boolean
  ratio?: number
  file?: string
  line?: number
  focus?: string
  review?: boolean
}

/** Full UI snapshot used to serialize a shareable query string. */
export type DeepLinkSnapshot = {
  tags: string[]
  match: TagMatchMode
  mode: ViewMode
  change: string
  theme: ThemeMode
  explorer: boolean
  menu: boolean
  split: boolean
  zoom: boolean
  ratio: number
  file: string | null
  line: number | null
  focus: string | null
  review: boolean
}

const VIEW_MODES = new Set<ViewMode>([
  'highlight',
  'isolate',
  'changed',
  'notes',
])
const MATCH_MODES = new Set<TagMatchMode>(['any', 'all'])

/**
 * Parse `location.search` into a partial deep-link patch.
 * Invalid values are skipped (never throw).
 */
export function parseDeepLink(
  search: string,
  ratioClamp: (n: number) => number,
): DeepLinkParsed {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  )
  const out: DeepLinkParsed = {}

  const tagParts: string[] = []
  for (const raw of params.getAll('tags')) {
    for (const part of raw.split(',')) {
      const t = part.trim()
      if (t && !tagParts.includes(t)) tagParts.push(t)
    }
  }
  if (params.has('tags')) out.tags = tagParts

  if (params.has('match')) {
    const m = params.get('match')?.trim()
    if (m && MATCH_MODES.has(m as TagMatchMode)) out.match = m as TagMatchMode
  }

  if (params.has('mode')) {
    const m = params.get('mode')?.trim()
    if (m && VIEW_MODES.has(m as ViewMode)) out.mode = m as ViewMode
  }

  if (params.has('change')) {
    out.change = (params.get('change') || '').trim()
  }

  if (params.has('theme')) {
    const t = params.get('theme')?.trim()
    if (t === 'light' || t === 'dark') out.theme = t
  }

  const explorer = parseBool(params.get('explorer'))
  if (explorer !== undefined) out.explorer = explorer

  const menu = parseBool(params.get('menu'))
  if (menu !== undefined) out.menu = menu

  const split = parseBool(params.get('split'))
  if (split !== undefined) out.split = split

  const zoom = parseBool(params.get('zoom'))
  if (zoom !== undefined) out.zoom = zoom

  if (params.has('ratio')) {
    const n = Number(params.get('ratio'))
    if (Number.isFinite(n)) out.ratio = ratioClamp(n)
  }

  if (params.has('file')) {
    const f = (params.get('file') || '').trim()
    if (f) out.file = f
  }

  if (params.has('line')) {
    const n = Number(params.get('line'))
    if (Number.isFinite(n) && n >= 1) out.line = Math.floor(n)
  }

  if (params.has('focus')) {
    const f = (params.get('focus') || '').trim()
    if (f) out.focus = f
  }

  const review = parseBool(params.get('review'))
  if (review !== undefined) out.review = review

  return out
}

/**
 * Build a query string (leading `?` or empty) from UI state.
 * Omits default-ish values to keep links short.
 */
export function buildDeepLink(state: DeepLinkSnapshot): string {
  const params = new URLSearchParams()

  if (state.tags.length > 0) params.set('tags', state.tags.join(','))
  if (state.match !== 'any') params.set('match', state.match)
  if (state.mode !== 'highlight') params.set('mode', state.mode)
  if (state.change) params.set('change', state.change)
  if (state.theme !== 'light') params.set('theme', state.theme)
  if (state.explorer) params.set('explorer', '1')
  if (!state.menu) params.set('menu', '0')
  if (state.split) params.set('split', '1')
  if (state.split && state.zoom) params.set('zoom', '1')
  if (state.split && Math.abs(state.ratio - 0.5) > 0.001) {
    params.set('ratio', String(Math.round(state.ratio * 1000) / 1000))
  }
  if (state.file) params.set('file', state.file)
  if (state.file && state.line != null && state.line >= 1) {
    params.set('line', String(state.line))
  }
  if (state.focus) params.set('focus', state.focus)
  if (state.review) params.set('review', '1')

  const q = params.toString()
  return q ? `?${q}` : ''
}

export function replaceDeepLinkUrl(search: string): void {
  const next = `${window.location.pathname}${search}${window.location.hash}`
  const cur = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next === cur) return
  window.history.replaceState(null, '', next)
}

// HELPERS

function parseBool(raw: string | null): boolean | undefined {
  if (raw == null) return undefined
  const v = raw.trim().toLowerCase()
  if (v === '1' || v === 'true' || v === 'yes') return true
  if (v === '0' || v === 'false' || v === 'no') return false
  return undefined
}
