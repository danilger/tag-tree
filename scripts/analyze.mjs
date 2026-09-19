#!/usr/bin/env node
/**
 * Scan a project root for source files, // tag:* markers, and static imports.
 * Writes .generated/graph.json next to this app.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mts',
  '.cts',
  '.mjs',
  '.cjs',
])
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'dist-ssr',
  '.git',
  '.generated',
  'coverage',
  'build',
  '.tag_tree',
])

function normalizeFileBase(value) {
  if (!value) return null
  let base = String(value).trim()
  if (!base) return null
  if (!base.endsWith('/')) base += '/'
  return base
}

function normalizeDisplayPrefix(value) {
  if (!value) return ''
  return String(value).replace(/^\/+|\/+$/g, '')
}

function parseArgs(argv) {
  const args = {
    root: null,
    config: path.join(appDir, 'config.json'),
    out: null,
    fileBase: null,
    displayPrefix: '',
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--root' && argv[i + 1]) {
      args.root = argv[++i]
    } else if (a === '--config' && argv[i + 1]) {
      args.config = argv[++i]
    } else if (a === '--out' && argv[i + 1]) {
      args.out = argv[++i]
    } else if (a === '--file-base' && argv[i + 1]) {
      args.fileBase = argv[++i]
    } else if (a === '--display-prefix' && argv[i + 1]) {
      args.displayPrefix = argv[++i]
    } else if (a === '--help' || a === '-h') {
      args.help = true
    }
  }
  return args
}

function usage() {
  console.log(`Usage: node scripts/analyze.mjs --root <path> [options]

  --root              Directory to scan (required)
  --config            Tag catalog JSON (default: ./config.json)
  --out               Output path (default: .generated/graph.json)
  --file-base         Client file URI prefix, e.g. file:///D:/project/frontend/
  --display-prefix    Prefix for display paths, e.g. src
`)
}

function walkFiles(dir, acc = []) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return acc
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walkFiles(full, acc)
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name)
      if (SOURCE_EXT.has(ext)) acc.push(full)
    }
  }
  return acc
}

function parseTags(content) {
  const lines = content.split(/\r?\n/)
  let first = ''
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue
    first = trimmed
    break
  }
  const tags = []
  const re = /\btag:([a-z0-9_-]+)\b/g
  let m
  while ((m = re.exec(first)) !== null) {
    tags.push(m[1])
  }
  return [...new Set(tags)]
}

function extractImportSpecifiers(content) {
  const specs = new Set()
  const patterns = [
    /\bimport\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g,
    /\bexport\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(content)) !== null) {
      specs.add(m[1])
    }
  }
  return [...specs]
}

function stripJsonc(text) {
  let out = ''
  let i = 0
  let inString = false
  let escaped = false
  while (i < text.length) {
    const ch = text[i]
    const next = text[i + 1]
    if (inString) {
      out += ch
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      i++
      continue
    }
    if (ch === '"') {
      inString = true
      out += ch
      i++
      continue
    }
    if (ch === '/' && next === '/') {
      i += 2
      while (i < text.length && text[i] !== '\n') i++
      continue
    }
    if (ch === '/' && next === '*') {
      i += 2
      while (i + 1 < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++
      i += 2
      continue
    }
    // drop trailing commas before } or ]
    if (ch === ',' ) {
      let j = i + 1
      while (j < text.length && /\s/.test(text[j])) j++
      if (text[j] === '}' || text[j] === ']') {
        i++
        continue
      }
    }
    out += ch
    i++
  }
  return out
}

function findConfigNear(startDir) {
  let dir = path.resolve(startDir)
  for (let i = 0; i < 8; i++) {
    for (const name of ['tsconfig.app.json', 'tsconfig.json', 'jsconfig.json']) {
      const candidate = path.join(dir, name)
      if (fs.existsSync(candidate)) {
        try {
          const raw = fs.readFileSync(candidate, 'utf8')
          const json = JSON.parse(stripJsonc(raw))
          if (json.compilerOptions?.paths || json.compilerOptions?.baseUrl) {
            return { dir, json }
          }
          // solution-style tsconfig with only references — keep looking
          if (json.references && name === 'tsconfig.json') continue
          return { dir, json }
        } catch {
          /* ignore */
        }
      }
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

function loadPathAliases(scanRoot) {
  const found = findConfigNear(scanRoot)
  if (!found) return { baseUrl: scanRoot, paths: {} }
  const { dir, json } = found
  const co = json.compilerOptions || {}
  const baseUrl = path.resolve(dir, co.baseUrl || '.')
  return { baseUrl, paths: co.paths || {}, configDir: dir }
}

function tryFile(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.mts`,
    `${basePath}.cts`,
    `${basePath}.mjs`,
    `${basePath}.cjs`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.jsx'),
  ]
  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return path.normalize(c)
    } catch {
      /* ignore */
    }
  }
  return null
}

function resolveAlias(specifier, aliases) {
  const { baseUrl, paths } = aliases
  for (const [pattern, targets] of Object.entries(paths)) {
    if (!pattern.includes('*')) {
      if (specifier === pattern) {
        for (const t of targets) {
          const resolved = tryFile(path.resolve(baseUrl, t))
          if (resolved) return resolved
        }
      }
      continue
    }
    const [prefix, suffix] = pattern.split('*')
    if (!specifier.startsWith(prefix)) continue
    if (suffix && !specifier.endsWith(suffix)) continue
    const star = specifier.slice(prefix.length, specifier.length - (suffix?.length || 0))
    for (const t of targets) {
      const mapped = t.replace('*', star)
      const resolved = tryFile(path.resolve(baseUrl, mapped))
      if (resolved) return resolved
    }
  }
  return null
}

function resolveSpecifier(fromFile, specifier, scanRoot, aliases) {
  if (!specifier || specifier.startsWith('node:')) return null
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const base = path.resolve(path.dirname(fromFile), specifier)
    const resolved = tryFile(base)
    if (resolved && isInsideRoot(resolved, scanRoot)) return resolved
    return null
  }
  // path alias or absolute-from-root style
  const aliased = resolveAlias(specifier, aliases)
  if (aliased && isInsideRoot(aliased, scanRoot)) return aliased
  // bare specifier → third-party, skip
  return null
}

function isInsideRoot(filePath, root) {
  const rel = path.relative(root, filePath)
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel)
}

function toNodeId(filePath, scanRoot) {
  return path.relative(scanRoot, filePath).split(path.sep).join('/')
}

/** Normalize config node path: trim, `/` separators, strip leading `./`. */
function normalizeConfigPath(raw) {
  if (typeof raw !== 'string') return ''
  let p = raw.trim().replace(/\\/g, '/')
  while (p.startsWith('./')) p = p.slice(2)
  return p
}

function normalizeConfigNodes(entries) {
  const out = []
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue
    const pathId = normalizeConfigPath(entry.path)
    if (!pathId) continue
    const node = { path: pathId }
    if (typeof entry.color === 'string' && entry.color.trim()) {
      node.color = entry.color.trim()
    }
    if (typeof entry.textColor === 'string' && entry.textColor.trim()) {
      node.textColor = entry.textColor.trim()
    }
    if (typeof entry.bgColor === 'string' && entry.bgColor.trim()) {
      node.bgColor = entry.bgColor.trim()
    }
    if (typeof entry.title === 'string' && entry.title.trim()) {
      node.title = entry.title.trim()
    }
    if (typeof entry.description === 'string' && entry.description.trim()) {
      node.description = entry.description.trim()
    }
    if (Array.isArray(entry.ai_subtree_nodes)) {
      const list = []
      for (const raw of entry.ai_subtree_nodes) {
        const id = normalizeConfigPath(raw)
        if (id) list.push(id)
      }
      if (list.length > 0) {
        node.ai_subtree_nodes = [...new Set(list)]
      }
    }
    out.push(node)
  }
  return out
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.root) {
    usage()
    process.exit(args.help ? 0 : 1)
  }

  const scanRoot = path.resolve(process.cwd(), args.root)
  if (!fs.existsSync(scanRoot) || !fs.statSync(scanRoot).isDirectory()) {
    console.error(`Root is not a directory: ${scanRoot}`)
    process.exit(1)
  }

  const configPath = path.resolve(process.cwd(), args.config)
  let configTags = []
  let configNodes = []
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    configTags = Array.isArray(config.tags) ? config.tags : []
    configNodes = normalizeConfigNodes(
      Array.isArray(config.nodes) ? config.nodes : [],
    )
  } else {
    console.warn(`Config not found: ${configPath} (continuing with empty tag catalog)`)
  }

  const aliases = loadPathAliases(scanRoot)
  const files = walkFiles(scanRoot)
  const fileSet = new Set(files.map((f) => path.normalize(f)))

  const nodes = []
  const edges = []
  const edgeKeys = new Set()

  for (const file of files) {
    let content
    try {
      content = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const id = toNodeId(file, scanRoot)
    const tags = parseTags(content)
    nodes.push({ id, tags })

    for (const spec of extractImportSpecifiers(content)) {
      const target = resolveSpecifier(file, spec, scanRoot, aliases)
      if (!target || !fileSet.has(path.normalize(target))) continue
      const targetId = toNodeId(target, scanRoot)
      if (targetId === id) continue
      const key = `${id}→${targetId}`
      if (edgeKeys.has(key)) continue
      edgeKeys.add(key)
      edges.push({ source: id, target: targetId })
    }
  }

  nodes.sort((a, b) => a.id.localeCompare(b.id))

  const outPath =
    args.out != null
      ? path.resolve(process.cwd(), args.out)
      : path.join(appDir, '.generated', 'graph.json')

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  const payload = {
    root: scanRoot,
    configPath,
    fileBase: normalizeFileBase(args.fileBase),
    displayPrefix: normalizeDisplayPrefix(args.displayPrefix),
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
    configTags,
    configNodes,
  }
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2))
  console.log(
    `Wrote ${nodes.length} nodes, ${edges.length} edges → ${outPath}`,
  )
}

main()
