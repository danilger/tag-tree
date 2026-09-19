#!/usr/bin/env node
/**
 * Export a changes/*.json set from git diff against HEAD.
 * Structural fields (path, rows, prev_row) come only from git.
 * Existing per-path comments and line notes are preserved on re-export.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CHANGES_DIR = path.join(appDir, 'changes')
const DEFAULT_GRAPH = path.join(appDir, '.generated', 'graph.json')
const MAX_BYTES = 2 * 1024 * 1024

function parseArgs(argv) {
  const args = {
    root: null,
    id: null,
    label: null,
    graphOnly: false,
    graph: DEFAULT_GRAPH,
    help: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--root' && argv[i + 1]) args.root = argv[++i]
    else if (a === '--id' && argv[i + 1]) args.id = argv[++i]
    else if (a === '--label' && argv[i + 1]) args.label = argv[++i]
    else if (a === '--graph-only') args.graphOnly = true
    else if (a === '--graph' && argv[i + 1]) args.graph = argv[++i]
    else if (a === '--help' || a === '-h') args.help = true
  }
  return args
}

function usage() {
  console.log(`Usage: node scripts/export-change-from-git.mjs --root <scan-root> --id <name> [options]

  --root         Directory scanned by tag-tree (same as analyze --root) (required)
  --id           Output file id → changes/<id>.json (required)
  --label        UI label (default: id; on re-export keeps prior label unless set)
  --graph-only   Keep only paths present in graph.json
  --graph        Path to graph.json (default: .generated/graph.json)
`)
}

function normalizeConfigPath(raw) {
  let p = String(raw || '')
    .trim()
    .replace(/\\/g, '/')
  while (p.startsWith('./')) p = p.slice(2)
  return p
}

function isInsideRoot(filePath, root) {
  const rel = path.relative(root, filePath)
  return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel)
}

function git(toplevel, args, opts = {}) {
  try {
    return execFileSync('git', ['-C', toplevel, ...args], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      ...opts,
    })
  } catch (err) {
    if (opts.allowFail) {
      return err.stdout != null ? String(err.stdout) : ''
    }
    throw err
  }
}

function resolveToplevel(scanRoot) {
  try {
    const out = execFileSync(
      'git',
      ['-C', scanRoot, 'rev-parse', '--show-toplevel'],
      { encoding: 'utf8' },
    )
    return out.trim()
  } catch {
    return null
  }
}

function toPosix(p) {
  return p.split(path.sep).join('/')
}

function lineCount(text) {
  if (text === '') return 0
  const endsWithNewline = text.endsWith('\n')
  const lines = text.split('\n')
  if (endsWithNewline && lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines.length
}

function rowsForContent(text) {
  const n = lineCount(text)
  if (n === 0) return [1]
  return Array.from({ length: n }, (_, i) => i + 1)
}

function looksBinary(buf) {
  const sample = buf.subarray(0, Math.min(buf.length, 8000))
  if (sample.includes(0)) return true
  try {
    const text = sample.toString('utf8')
    if (text.includes('\uFFFD')) return true
  } catch {
    return true
  }
  return false
}

function loadGraphIds(graphPath) {
  if (!fs.existsSync(graphPath)) {
    console.error(`graph.json not found: ${graphPath}`)
    process.exit(1)
  }
  const raw = JSON.parse(fs.readFileSync(graphPath, 'utf8'))
  const ids = new Set()
  for (const n of raw.nodes || []) {
    if (n?.id) ids.add(normalizeConfigPath(n.id))
  }
  return ids
}

function normalizePriorNotes(raw) {
  if (!Array.isArray(raw)) return undefined
  const notes = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const line = Math.floor(Number(entry.line))
    const text = typeof entry.text === 'string' ? entry.text.trim() : ''
    if (!Number.isInteger(line) || line < 1 || !text) continue
    notes.push({ line, text })
  }
  return notes.length > 0 ? notes : undefined
}

function normalizePriorReview(raw) {
  if (!raw || typeof raw !== 'object') return null
  const goal = typeof raw.goal === 'string' ? raw.goal.trim() : ''
  if (!goal) return null
  const orderRaw = Array.isArray(raw.order) ? raw.order : []
  const order = []
  const seen = new Set()
  for (const entry of orderRaw) {
    const p = normalizeConfigPath(String(entry ?? ''))
    if (!p || seen.has(p)) continue
    seen.add(p)
    order.push(p)
  }
  if (order.length === 0) return null
  return { goal, order }
}

function loadPrior(outPath) {
  if (!fs.existsSync(outPath) || !fs.statSync(outPath).isFile()) {
    return { label: null, comments: new Map(), notes: new Map(), review: null }
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(outPath, 'utf8'))
    const comments = new Map()
    const notes = new Map()
    if (Array.isArray(parsed.nodes)) {
      for (const entry of parsed.nodes) {
        if (!entry || typeof entry !== 'object') continue
        const p = normalizeConfigPath(String(entry.path ?? ''))
        if (!p) continue
        if (typeof entry.comment === 'string' && entry.comment.trim()) {
          comments.set(p, entry.comment.trim())
        }
        const priorNotes = normalizePriorNotes(entry.notes)
        if (priorNotes) notes.set(p, priorNotes)
      }
    }
    const label =
      typeof parsed.label === 'string' && parsed.label.trim()
        ? parsed.label.trim()
        : null
    const review = normalizePriorReview(parsed.review)
    return { label, comments, notes, review }
  } catch (err) {
    console.error(
      `Failed to parse existing ${outPath}: ${err instanceof Error ? err.message : String(err)}`,
    )
    process.exit(1)
  }
}

/**
 * Collect repo-relative posix paths that differ from HEAD under scanRoot.
 * Returns { path, kind: 'modified' | 'added' | 'untracked' }[]
 */
function collectChanged(toplevel, scanRoot) {
  const scanRel = toPosix(path.relative(toplevel, scanRoot))
  const pathspec = scanRel === '' ? '.' : scanRel

  const byPath = new Map()

  const nameStatus = git(toplevel, [
    'diff',
    '--name-status',
    '--find-renames',
    'HEAD',
    '--',
    pathspec,
  ])
  for (const line of nameStatus.split('\n')) {
    if (!line.trim()) continue
    const tab = line.indexOf('\t')
    if (tab < 0) continue
    const status = line.slice(0, tab).trim()
    const rest = line.slice(tab + 1)
    const code = status[0]
    if (code === 'D') {
      const delPath = rest.split('\t')[0]
      console.warn(`skip deleted: ${delPath}`)
      continue
    }
    let repoPath
    if (code === 'R' || code === 'C') {
      const parts = rest.split('\t')
      repoPath = parts[parts.length - 1]
    } else {
      repoPath = rest.split('\t')[0]
    }
    repoPath = toPosix(repoPath)
    const abs = path.resolve(toplevel, repoPath)
    if (!isInsideRoot(abs, scanRoot) && abs !== scanRoot) {
      continue
    }
    byPath.set(repoPath, code === 'A' ? 'added' : 'modified')
  }

  const untracked = git(toplevel, [
    'ls-files',
    '--others',
    '--exclude-standard',
    '--',
    pathspec,
  ])
  for (const line of untracked.split('\n')) {
    const repoPath = toPosix(line.trim())
    if (!repoPath) continue
    const abs = path.resolve(toplevel, repoPath)
    if (!isInsideRoot(abs, scanRoot) && abs !== scanRoot) continue
    if (!byPath.has(repoPath)) byPath.set(repoPath, 'untracked')
  }

  return [...byPath.entries()]
    .map(([repoPath, kind]) => ({ repoPath, kind }))
    .sort((a, b) => a.repoPath.localeCompare(b.repoPath))
}

function showHead(toplevel, repoPath) {
  try {
    return execFileSync('git', ['-C', toplevel, 'show', `HEAD:${repoPath}`], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    return null
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    usage()
    process.exit(0)
  }
  if (!args.root || !args.id) {
    usage()
    process.exit(1)
  }
  if (
    !args.id ||
    args.id.includes('..') ||
    args.id.includes('/') ||
    args.id.includes('\\') ||
    args.id.includes('\0')
  ) {
    console.error('Invalid --id (no path separators or ..)')
    process.exit(1)
  }

  const scanRoot = path.resolve(args.root)
  if (!fs.existsSync(scanRoot) || !fs.statSync(scanRoot).isDirectory()) {
    console.error(`--root is not a directory: ${scanRoot}`)
    process.exit(1)
  }

  const toplevel = resolveToplevel(scanRoot)
  if (!toplevel) {
    console.error(
      `Not a git work tree: ${scanRoot} (run inside a repository or pass a --root under one)`,
    )
    process.exit(1)
  }

  const outPath = path.join(CHANGES_DIR, `${args.id}.json`)
  const prior = loadPrior(outPath)

  let graphIds = null
  if (args.graphOnly) {
    graphIds = loadGraphIds(path.resolve(args.graph))
  }

  const changed = collectChanged(toplevel, scanRoot)
  const nodes = []

  for (const { repoPath, kind } of changed) {
    const abs = path.resolve(toplevel, repoPath)
    const nodeId = normalizeConfigPath(toPosix(path.relative(scanRoot, abs)))
    if (!nodeId) continue

    if (graphIds && !graphIds.has(nodeId)) {
      continue
    }

    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      console.warn(`skip missing on disk: ${repoPath}`)
      continue
    }

    let st
    try {
      st = fs.statSync(abs)
    } catch {
      console.warn(`skip unreadable: ${repoPath}`)
      continue
    }
    if (st.size > MAX_BYTES) {
      console.warn(`skip oversized (>${MAX_BYTES} bytes): ${repoPath}`)
      continue
    }

    const buf = fs.readFileSync(abs)
    if (looksBinary(buf)) {
      console.warn(`skip binary: ${repoPath}`)
      continue
    }

    const current = buf.toString('utf8')
    let prev_row = ''
    if (kind === 'untracked' || kind === 'added') {
      // New vs HEAD — DiffEditor original is empty.
      prev_row = ''
    } else {
      const head = showHead(toplevel, repoPath)
      if (head == null) {
        console.warn(`skip (no HEAD blob): ${repoPath}`)
        continue
      }
      prev_row = head
    }

    const node = {
      path: nodeId,
      rows: rowsForContent(current),
      prev_row,
    }
    const comment = prior.comments.get(nodeId)
    if (comment) node.comment = comment
    const notes = prior.notes.get(nodeId)
    if (notes) node.notes = notes
    nodes.push(node)
  }

  let label = args.id
  if (args.label != null && String(args.label).trim()) {
    label = String(args.label).trim()
  } else if (prior.label) {
    label = prior.label
  }

  if (!fs.existsSync(CHANGES_DIR)) {
    fs.mkdirSync(CHANGES_DIR, { recursive: true })
  }

  const payload = { label, nodes }
  if (prior.review) payload.review = prior.review
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(
    `Wrote ${outPath} (${nodes.length} file${nodes.length === 1 ? '' : 's'})`,
  )
}

main()
