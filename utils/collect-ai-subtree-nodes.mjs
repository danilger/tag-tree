#!/usr/bin/env node
/**
 * Collect logical dependency paths for config.nodes[].ai_subtree_nodes.
 *
 * Walks static imports from an entry file under --root. When an import hits a
 * barrel (index.*), expands only the named re-exports that were imported (not
 * the whole public API), then recurses. Skips bare/third-party packages.
 *
 * Usage (from parent project or .tag_tree/):
 *   node utils/collect-ai-subtree-nodes.mjs --root ../src --entry pages/foo/ui/FooPage.tsx
 *   node .tag_tree/utils/collect-ai-subtree-nodes.mjs --root src --entry pages/foo/ui/FooPage.tsx
 *
 * Prints a JSON array of paths relative to --root (graph node ids). Does not
 * include the entry itself.
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

function parseArgs(argv) {
  const args = {
    root: null,
    entry: null,
    graph: path.join(appDir, '.generated', 'graph.json'),
    alias: '@/',
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--root' && argv[i + 1]) args.root = argv[++i]
    else if (a === '--entry' && argv[i + 1]) args.entry = argv[++i]
    else if (a === '--graph' && argv[i + 1]) args.graph = argv[++i]
    else if (a === '--help' || a === '-h') args.help = true
  }
  return args
}

function usage() {
  console.log(`Usage: node utils/collect-ai-subtree-nodes.mjs --root <scan-root> --entry <path> [options]

  --root     Directory scanned by tag-tree (same as analyze --root)
  --entry    File path relative to --root (graph node id)
  --graph    Optional graph.json to filter ids (default: .generated/graph.json)
`)
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
      while (i + 1 < text.length && !(text[i] === '*' && text[i + 1] === '/'))
        i++
      i += 2
      continue
    }
    if (ch === ',') {
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
  return { baseUrl, paths: co.paths || {} }
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
    const star = specifier.slice(
      prefix.length,
      specifier.length - (suffix?.length || 0),
    )
    for (const t of targets) {
      const mapped = t.replace('*', star)
      const resolved = tryFile(path.resolve(baseUrl, mapped))
      if (resolved) return resolved
    }
  }
  return null
}

function isInsideRoot(filePath, scanRoot) {
  const rel = path.relative(scanRoot, filePath)
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel)
}

function resolveSpecifier(fromFile, specifier, scanRoot, aliases) {
  if (!specifier || specifier.startsWith('node:')) return null
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const resolved = tryFile(path.resolve(path.dirname(fromFile), specifier))
    if (resolved && isInsideRoot(resolved, scanRoot)) return resolved
    return null
  }
  const aliased = resolveAlias(specifier, aliases)
  if (aliased && isInsideRoot(aliased, scanRoot)) return aliased
  return null
}

function toRel(abs, scanRoot) {
  return path.relative(scanRoot, abs).split(path.sep).join('/')
}

function isBarrel(abs) {
  return /^index\.(tsx?|jsx?|mts|cts|mjs|cjs)$/.test(path.basename(abs))
}

function parseImports(source) {
  const imports = []
  const re =
    /import\s+(type\s+)?(?:([\w*{} ,\n]+)\s+from\s+)?['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(source))) {
    const isType = Boolean(m[1])
    const clause = (m[2] || '').trim()
    const names = []
    if (clause.startsWith('{')) {
      const inner = clause.replace(/^\{|\}$/g, '').trim()
      for (const part of inner.split(',')) {
        const p = part.trim()
        if (!p) continue
        const cleaned = p
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)[0]
          .trim()
        if (cleaned) names.push(cleaned)
      }
    } else if (clause) {
      names.push('*')
    } else {
      names.push('*')
    }
    imports.push({ isType, names, spec: m[3] })
  }
  return imports
}

function parseBarrelExports(source) {
  const map = new Map()
  const stars = []
  const re = /export\s+(type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(source))) {
    const spec = m[3]
    for (const part of m[2].split(',')) {
      const p = part.trim()
      if (!p) continue
      const bits = p
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)
        .map((s) => s.trim())
      const orig = bits[0]
      const exported = bits[1] || bits[0]
      map.set(exported, spec)
      map.set(orig, spec)
    }
  }
  const re2 = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g
  while ((m = re2.exec(source))) stars.push(m[1])
  return { map, stars }
}

function collectAiSubtreeNodes(scanRoot, entryRel, graphIds) {
  const aliases = loadPathAliases(scanRoot)
  const entryAbs = tryFile(path.join(scanRoot, entryRel))
  if (!entryAbs) {
    throw new Error(`Entry not found under --root: ${entryRel}`)
  }
  const startRel = toRel(entryAbs, scanRoot)
  const walked = new Set()
  const result = new Set()

  function walk(rel) {
    if (walked.has(rel)) return
    walked.add(rel)
    const abs = path.join(scanRoot, rel)
    if (!fs.existsSync(abs)) return
    const source = fs.readFileSync(abs, 'utf8')
    for (const imp of parseImports(source)) {
      if (imp.isType) continue
      const targetAbs = resolveSpecifier(abs, imp.spec, scanRoot, aliases)
      if (!targetAbs) continue
      const targetRel = toRel(targetAbs, scanRoot)
      result.add(targetRel)

      if (isBarrel(targetAbs)) {
        const { map, stars } = parseBarrelExports(
          fs.readFileSync(targetAbs, 'utf8'),
        )
        const expandAll = imp.names.includes('*')
        const moduleRels = new Set()
        if (expandAll) {
          for (const spec of new Set([...map.values(), ...stars])) {
            const resolved = resolveSpecifier(
              targetAbs,
              spec,
              scanRoot,
              aliases,
            )
            if (resolved) moduleRels.add(toRel(resolved, scanRoot))
          }
        } else {
          for (const name of imp.names) {
            const spec = map.get(name)
            if (spec) {
              const resolved = resolveSpecifier(
                targetAbs,
                spec,
                scanRoot,
                aliases,
              )
              if (resolved) moduleRels.add(toRel(resolved, scanRoot))
            } else {
              for (const starSpec of stars) {
                const resolved = resolveSpecifier(
                  targetAbs,
                  starSpec,
                  scanRoot,
                  aliases,
                )
                if (resolved) moduleRels.add(toRel(resolved, scanRoot))
              }
            }
          }
        }
        for (const mrel of moduleRels) {
          result.add(mrel)
          walk(mrel)
        }
      } else {
        walk(targetRel)
      }
    }
  }

  walk(startRel)
  result.delete(startRel)

  let list = [...result].sort()
  if (graphIds) {
    list = list.filter((p) => graphIds.has(p))
  }
  return list
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.root || !args.entry) {
    usage()
    process.exit(args.help ? 0 : 1)
  }

  const scanRoot = path.resolve(args.root)
  let entry = String(args.entry).replace(/\\/g, '/').replace(/^\.\//, '')
  // Allow display paths like src/pages/... when --root is already src
  const rootBase = path.basename(scanRoot)
  if (entry === rootBase || entry.startsWith(`${rootBase}/`)) {
    entry = entry.slice(rootBase.length).replace(/^\//, '')
  }

  const ext = path.extname(entry)
  if (!SOURCE_EXT.has(ext)) {
    console.error(
      `Entry extension ${ext || '(none)'} is not a supported source type; use .ts/.tsx/.js/.jsx (etc.).`,
    )
    process.exit(1)
  }

  let graphIds = null
  if (args.graph && fs.existsSync(args.graph)) {
    try {
      const graph = JSON.parse(fs.readFileSync(args.graph, 'utf8'))
      graphIds = new Set((graph.nodes || []).map((n) => n.id))
    } catch {
      /* ignore broken graph */
    }
  }

  const list = collectAiSubtreeNodes(scanRoot, entry, graphIds)
  process.stdout.write(`${JSON.stringify(list, null, 2)}\n`)
}

main()
