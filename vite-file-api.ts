import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Connect, Plugin } from 'vite'

const appDir = path.dirname(fileURLToPath(import.meta.url))
const GRAPH_PATH = path.join(appDir, '.generated', 'graph.json')
const ANALYZE_SCRIPT = path.join(appDir, 'scripts', 'analyze.mjs')
const CHANGES_DIR = path.join(appDir, 'changes')
const NOTES_DIR = path.join(appDir, 'notes')

function languageFromPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.ts':
    case '.mts':
    case '.cts':
    case '.tsx':
      return 'typescript'
    case '.js':
    case '.mjs':
    case '.cjs':
    case '.jsx':
      return 'javascript'
    case '.css':
      return 'css'
    case '.json':
      return 'json'
    case '.html':
      return 'html'
    case '.md':
      return 'markdown'
    default:
      return 'plaintext'
  }
}

function displayPath(nodeId: string, displayPrefix: string | undefined) {
  const prefix = (displayPrefix || '').replace(/^\/+|\/+$/g, '')
  if (!prefix) return nodeId
  return `${prefix}/${nodeId}`
}

function fileUriFor(
  nodeId: string,
  fileBase: string | null | undefined,
  displayPrefix: string | undefined,
) {
  if (!fileBase) return null
  const base = fileBase.endsWith('/') ? fileBase : `${fileBase}/`
  return `${base}${displayPath(nodeId, displayPrefix)}`
}

type GraphMeta = {
  root?: string
  configPath?: string
  fileBase?: string | null
  displayPrefix?: string
}

function readGraphMeta(): GraphMeta | null {
  if (!fs.existsSync(GRAPH_PATH)) {
    return null
  }
  return JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8')) as GraphMeta
}

function isInsideRoot(filePath: string, root: string) {
  const rel = path.relative(root, filePath)
  return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel)
}

function sendJson(
  res: Connect.ServerResponse,
  status: number,
  body: Record<string, unknown>,
) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function handleFile(req: Connect.IncomingMessage, res: Connect.ServerResponse) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const url = new URL(req.url || '/', 'http://localhost')
    const nodeId = url.searchParams.get('path')
    if (!nodeId || nodeId.includes('\0') || path.isAbsolute(nodeId)) {
      sendJson(res, 400, { error: 'Invalid path' })
      return
    }

    const meta = readGraphMeta()
    if (!meta?.root) {
      sendJson(res, 503, { error: 'graph.json missing — run analyze first' })
      return
    }

    const scanRoot = path.resolve(meta.root)
    const resolved = path.resolve(scanRoot, nodeId)
    if (!isInsideRoot(resolved, scanRoot)) {
      sendJson(res, 400, { error: 'Path escapes scan root' })
      return
    }

    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      sendJson(res, 404, { error: 'File not found' })
      return
    }

    const content = fs.readFileSync(resolved, 'utf8')
    sendJson(res, 200, {
      path: nodeId,
      displayPath: displayPath(nodeId, meta.displayPrefix),
      fileUri: fileUriFor(nodeId, meta.fileBase, meta.displayPrefix),
      language: languageFromPath(resolved),
      content,
    })
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

function handleReload(
  req: Connect.IncomingMessage,
  res: Connect.ServerResponse,
) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const meta = readGraphMeta()
    if (!meta?.root) {
      sendJson(res, 503, { error: 'graph.json missing — run analyze first' })
      return
    }

    const args = ['--root', path.resolve(meta.root)]
    if (meta.configPath) {
      args.push('--config', path.resolve(meta.configPath))
    }
    if (meta.fileBase) {
      args.push('--file-base', meta.fileBase)
    }
    if (meta.displayPrefix) {
      args.push('--display-prefix', meta.displayPrefix)
    }

    const result = spawnSync(process.execPath, [ANALYZE_SCRIPT, ...args], {
      cwd: appDir,
      encoding: 'utf8',
    })

    if (result.status !== 0) {
      const detail =
        (result.stderr || result.stdout || '').trim() ||
        `analyze exited with ${result.status}`
      sendJson(res, 500, { error: detail })
      return
    }

    sendJson(res, 200, { ok: true })
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

function normalizeConfigPath(raw: string): string {
  let p = raw.trim().replace(/\\/g, '/')
  while (p.startsWith('./')) p = p.slice(2)
  return p
}

function normalizeChangeNotes(
  raw: unknown,
): Array<{ line: number; text: string }> | undefined {
  if (!Array.isArray(raw)) return undefined
  const notes: Array<{ line: number; text: string }> = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const rec = entry as Record<string, unknown>
    const line = Math.floor(Number(rec.line))
    const text = typeof rec.text === 'string' ? rec.text.trim() : ''
    if (!Number.isInteger(line) || line < 1 || !text) continue
    notes.push({ line, text })
  }
  return notes.length > 0 ? notes : undefined
}

function normalizeChangeReview(
  raw: unknown,
): { goal: string; order: string[] } | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const rec = raw as Record<string, unknown>
  const goal = typeof rec.goal === 'string' ? rec.goal.trim() : ''
  if (!goal) return undefined
  const orderRaw = Array.isArray(rec.order) ? rec.order : []
  const order: string[] = []
  const seen = new Set<string>()
  for (const entry of orderRaw) {
    const p = normalizeConfigPath(String(entry ?? ''))
    if (!p || seen.has(p)) continue
    seen.add(p)
    order.push(p)
  }
  if (order.length === 0) return undefined
  return { goal, order }
}

function normalizeChangeHunks(rawNodes: unknown): Array<{
  path: string
  comment?: string
  notes?: Array<{ line: number; text: string }>
  from: number
  to: number
  rows: number[]
  prev_row?: string
}> {
  if (!Array.isArray(rawNodes)) return []
  const out: Array<{
    path: string
    comment?: string
    notes?: Array<{ line: number; text: string }>
    from: number
    to: number
    rows: number[]
    prev_row?: string
  }> = []

  for (const entry of rawNodes) {
    if (!entry || typeof entry !== 'object') continue
    const rec = entry as Record<string, unknown>
    const pathId = normalizeConfigPath(String(rec.path ?? ''))
    if (!pathId) continue

    const rowsRaw = Array.isArray(rec.rows) ? rec.rows : []
    const rows = rowsRaw
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 1)
    if (rows.length === 0) continue

    const from = Math.min(...rows)
    const to = Math.max(...rows)
    const hunk: {
      path: string
      comment?: string
      notes?: Array<{ line: number; text: string }>
      from: number
      to: number
      rows: number[]
      prev_row?: string
    } = {
      path: pathId,
      from,
      to,
      rows: [...new Set(rows)].sort((a, b) => a - b),
    }
    if (typeof rec.comment === 'string' && rec.comment.trim()) {
      hunk.comment = rec.comment.trim()
    }
    const notes = normalizeChangeNotes(rec.notes)
    if (notes) hunk.notes = notes
    if (typeof rec.prev_row === 'string') {
      hunk.prev_row = rec.prev_row
    }
    out.push(hunk)
  }
  return out
}

function listChangeSummaries(): Array<{
  id: string
  label: string
  fileName: string
  mtimeMs: number
}> {
  if (!fs.existsSync(CHANGES_DIR) || !fs.statSync(CHANGES_DIR).isDirectory()) {
    return []
  }
  const names = fs.readdirSync(CHANGES_DIR).filter((n) => n.endsWith('.json'))
  const items: Array<{
    id: string
    label: string
    fileName: string
    mtimeMs: number
  }> = []

  for (const fileName of names) {
    const full = path.join(CHANGES_DIR, fileName)
    let st: fs.Stats
    try {
      st = fs.statSync(full)
      if (!st.isFile()) continue
    } catch {
      continue
    }
    const id = fileName.replace(/\.json$/i, '')
    let label = id
    try {
      const parsed = JSON.parse(fs.readFileSync(full, 'utf8')) as {
        label?: unknown
      }
      if (typeof parsed.label === 'string' && parsed.label.trim()) {
        label = parsed.label.trim()
      }
    } catch {
      /* keep id as label */
    }
    items.push({ id, label, fileName, mtimeMs: st.mtimeMs })
  }

  items.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return items
}

function handleChangesList(
  req: Connect.IncomingMessage,
  res: Connect.ServerResponse,
) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const list = listChangeSummaries().map(({ id, label, fileName }) => ({
      id,
      label,
      fileName,
    }))
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(list))
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

function handleChangeById(
  req: Connect.IncomingMessage,
  res: Connect.ServerResponse,
  id: string,
) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }
  if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
    sendJson(res, 400, { error: 'Invalid change id' })
    return
  }

  try {
    const fileName = `${id}.json`
    const full = path.join(CHANGES_DIR, fileName)
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
      sendJson(res, 404, { error: 'Change set not found' })
      return
    }
    const parsed = JSON.parse(fs.readFileSync(full, 'utf8')) as {
      label?: unknown
      nodes?: unknown
      review?: unknown
    }
    const label =
      typeof parsed.label === 'string' && parsed.label.trim()
        ? parsed.label.trim()
        : id
    const review = normalizeChangeReview(parsed.review)
    sendJson(res, 200, {
      id,
      label,
      fileName,
      nodes: normalizeChangeHunks(parsed.nodes),
      ...(review ? { review } : {}),
    })
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

function normalizeNoteGuide(raw: unknown): { goal: string; order: string[] } | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Record<string, unknown>
  const goal = typeof rec.goal === 'string' ? rec.goal.trim() : ''
  if (!goal) return null
  const orderRaw = Array.isArray(rec.order) ? rec.order : []
  const order: string[] = []
  for (const item of orderRaw) {
    if (typeof item !== 'string') continue
    const p = item.trim().replace(/\\/g, '/')
    if (p && !order.includes(p)) order.push(p)
  }
  if (order.length === 0) return null
  return { goal, order }
}

function normalizeNoteNodes(raw: unknown): Array<{
  path: string
  comment?: string
  notes?: Array<{ line: number; text: string }>
}> {
  if (!Array.isArray(raw)) return []
  const out: Array<{
    path: string
    comment?: string
    notes?: Array<{ line: number; text: string }>
  }> = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const p =
      typeof rec.path === 'string' ? rec.path.trim().replace(/\\/g, '/') : ''
    if (!p) continue
    const node: {
      path: string
      comment?: string
      notes?: Array<{ line: number; text: string }>
    } = { path: p }
    if (typeof rec.comment === 'string' && rec.comment.trim()) {
      node.comment = rec.comment.trim()
    }
    const notes = normalizeChangeNotes(rec.notes)
    if (notes) node.notes = notes
    out.push(node)
  }
  return out
}

function listNoteSummaries(): Array<{
  id: string
  label: string
  fileName: string
  mtimeMs: number
}> {
  if (!fs.existsSync(NOTES_DIR) || !fs.statSync(NOTES_DIR).isDirectory()) {
    return []
  }
  const names = fs.readdirSync(NOTES_DIR).filter((n) => n.endsWith('.json'))
  const items: Array<{
    id: string
    label: string
    fileName: string
    mtimeMs: number
  }> = []

  for (const fileName of names) {
    const full = path.join(NOTES_DIR, fileName)
    let st: fs.Stats
    try {
      st = fs.statSync(full)
      if (!st.isFile()) continue
    } catch {
      continue
    }
    const id = fileName.replace(/\.json$/i, '')
    let label = ''
    let usable = false
    try {
      const parsed = JSON.parse(fs.readFileSync(full, 'utf8')) as {
        label?: unknown
        guide?: unknown
      }
      if (typeof parsed.label === 'string' && parsed.label.trim()) {
        label = parsed.label.trim()
      }
      usable = Boolean(label && normalizeNoteGuide(parsed.guide))
    } catch {
      usable = false
    }
    if (!usable) continue
    items.push({ id, label, fileName, mtimeMs: st.mtimeMs })
  }

  items.sort((a, b) => a.label.localeCompare(b.label))
  return items
}

function handleNotesList(
  req: Connect.IncomingMessage,
  res: Connect.ServerResponse,
) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const list = listNoteSummaries().map(({ id, label, fileName }) => ({
      id,
      label,
      fileName,
    }))
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(list))
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

function handleNoteById(
  req: Connect.IncomingMessage,
  res: Connect.ServerResponse,
  id: string,
) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }
  if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
    sendJson(res, 400, { error: 'Invalid note id' })
    return
  }

  try {
    const fileName = `${id}.json`
    const full = path.join(NOTES_DIR, fileName)
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
      sendJson(res, 404, { error: 'Note not found' })
      return
    }
    const parsed = JSON.parse(fs.readFileSync(full, 'utf8')) as {
      label?: unknown
      nodes?: unknown
      guide?: unknown
    }
    const label =
      typeof parsed.label === 'string' && parsed.label.trim()
        ? parsed.label.trim()
        : ''
    const guide = normalizeNoteGuide(parsed.guide)
    if (!label || !guide) {
      sendJson(res, 422, {
        error: 'Note requires non-empty label and guide (goal + order)',
      })
      return
    }
    sendJson(res, 200, {
      id,
      label,
      fileName,
      guide,
      nodes: normalizeNoteNodes(parsed.nodes),
    })
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Vite plugin: GET /api/file, POST /api/reload, GET /api/changes, GET /api/changes/:id,
 * GET /api/notes, GET /api/notes/:id
 */
export function tagTreeFileApi(): Plugin {
  return {
    name: 'tag-tree-file-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost')
        if (url.pathname === '/api/file') {
          handleFile(req, res)
          return
        }
        if (url.pathname === '/api/reload') {
          handleReload(req, res)
          return
        }
        if (url.pathname === '/api/changes') {
          handleChangesList(req, res)
          return
        }
        const changeMatch = url.pathname.match(/^\/api\/changes\/([^/]+)$/)
        if (changeMatch) {
          handleChangeById(req, res, decodeURIComponent(changeMatch[1]))
          return
        }
        if (url.pathname === '/api/notes') {
          handleNotesList(req, res)
          return
        }
        const noteMatch = url.pathname.match(/^\/api\/notes\/([^/]+)$/)
        if (noteMatch) {
          handleNoteById(req, res, decodeURIComponent(noteMatch[1]))
          return
        }
        next()
      })
    },
  }
}
