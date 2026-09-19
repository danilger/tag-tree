export type DefinitionHit = {
  path: string
  /** 1-based line */
  line: number
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Word / identifier under cursor (JS/TS). */
export function identifierAt(
  content: string,
  lineNumber: number,
  column: number,
): string | null {
  const lines = content.split(/\r?\n/)
  const line = lines[lineNumber - 1]
  if (!line) return null
  const idx = Math.max(0, column - 1)
  if (!/[\w$]/.test(line[idx] ?? '') && idx > 0 && /[\w$]/.test(line[idx - 1] ?? '')) {
    // cursor after identifier
  }
  let start = idx
  let end = idx
  const ch = line[idx]
  if (ch && /[\w$]/.test(ch)) {
    while (start > 0 && /[\w$]/.test(line[start - 1]!)) start--
    while (end < line.length && /[\w$]/.test(line[end]!)) end++
  } else if (idx > 0 && /[\w$]/.test(line[idx - 1]!)) {
    start = idx - 1
    end = idx
    while (start > 0 && /[\w$]/.test(line[start - 1]!)) start--
  } else {
    return null
  }
  const word = line.slice(start, end)
  if (!word || /^\d/.test(word)) return null
  return word
}

/** Module string literal under / next to cursor. */
export function stringLiteralAt(
  content: string,
  lineNumber: number,
  column: number,
): string | null {
  const lines = content.split(/\r?\n/)
  const line = lines[lineNumber - 1]
  if (!line) return null
  const idx = Math.max(0, column - 1)
  const quoteMatch = /(['"])([^'"]*)\1/g
  let m: RegExpExecArray | null
  while ((m = quoteMatch.exec(line)) !== null) {
    const from = m.index
    const to = m.index + m[0].length
    if (idx >= from && idx <= to) {
      return m[2] || null
    }
  }
  return null
}

type ImportBinding = {
  local: string
  imported: string | 'default' | '*'
  specifier: string
}

function parseImportBindings(content: string): ImportBinding[] {
  const out: ImportBinding[] = []
  const re =
    /\b(?:import|export)\s+(?:type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    const clause = m[1].trim()
    const specifier = m[2]
    if (!clause || clause.startsWith('{') === false && !clause.includes('{')) {
      // default / namespace / side-effect mixed
      const ns = clause.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)/)
      if (ns) {
        out.push({ local: ns[1], imported: '*', specifier })
        continue
      }
      const def = clause.match(/^([A-Za-z_$][\w$]*)/)
      if (def && !clause.startsWith('{')) {
        out.push({ local: def[1], imported: 'default', specifier })
      }
      const namedInSame = clause.match(/\{([^}]+)\}/)
      if (namedInSame) {
        parseNamed(namedInSame[1], specifier, out)
      }
      continue
    }
    const named = clause.match(/\{([^}]+)\}/)
    if (named) parseNamed(named[1], specifier, out)
    const before = clause.split('{')[0]?.trim()
    if (before) {
      const def = before.match(/^([A-Za-z_$][\w$]*)/)
      if (def) out.push({ local: def[1], imported: 'default', specifier })
      const ns = before.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)/)
      if (ns) out.push({ local: ns[1], imported: '*', specifier })
    }
  }
  return out
}

function parseNamed(inner: string, specifier: string, out: ImportBinding[]) {
  for (const part of inner.split(',')) {
    const bit = part.trim()
    if (!bit || bit === 'type') continue
    const cleaned = bit.replace(/^type\s+/, '')
    const asMatch = cleaned.match(
      /^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/,
    )
    if (asMatch) {
      out.push({ local: asMatch[2], imported: asMatch[1], specifier })
      continue
    }
    const id = cleaned.match(/^([A-Za-z_$][\w$]*)$/)
    if (id) out.push({ local: id[1], imported: id[1], specifier })
  }
}

function matchSpecifierToTargets(
  specifier: string,
  targets: string[],
): string | null {
  const norm = specifier.replace(/\\/g, '/')
  const noExt = norm.replace(/\.(tsx?|jsx?|mjs|cjs)$/, '')
  const base = noExt.split('/').filter(Boolean).pop() || noExt

  const scored = targets.map((t) => {
    const id = t.replace(/\\/g, '/')
    const idNoExt = id.replace(/\.(tsx?|jsx?|mjs|cjs)$/, '')
    let score = 0
    if (id === norm || idNoExt === noExt) score = 100
    else if (idNoExt.endsWith('/' + noExt.replace(/^\.\//, '')) || idNoExt.endsWith(noExt.replace(/^\.\.\//, '')))
      score = 80
    else if (idNoExt.endsWith('/' + base) || idNoExt === base) score = 60
    else if (id.includes(base)) score = 20
    return { id, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0] && scored[0].score >= 60 ? scored[0].id : null
}

/** 1-based line of a local or exported binding, or null. */
export function findSymbolLine(
  content: string,
  symbol: string,
  preferExport: boolean,
): number | null {
  const esc = escapeRegExp(symbol)
  const patterns = preferExport
    ? [
        new RegExp(
          `^export\\s+(?:async\\s+)?(?:function|class|const|let|var|type|interface|enum)\\s+${esc}\\b`,
          'm',
        ),
        new RegExp(`^export\\s+default\\s+(?:async\\s+)?function\\s+${esc}\\b`, 'm'),
        new RegExp(`^export\\s+\\{[^}]*\\b${esc}\\b`, 'm'),
        new RegExp(
          `^(?:async\\s+)?(?:function|class|const|let|var|type|interface|enum)\\s+${esc}\\b`,
          'm',
        ),
      ]
    : [
        new RegExp(
          `^(?:export\\s+)?(?:async\\s+)?(?:function|class|const|let|var|type|interface|enum)\\s+${esc}\\b`,
          'm',
        ),
        new RegExp(`^export\\s+default\\s+(?:async\\s+)?function\\s+${esc}\\b`, 'm'),
        new RegExp(`^export\\s+\\{[^}]*\\b${esc}\\b`, 'm'),
      ]

  for (const re of patterns) {
    const m = re.exec(content)
    if (m && m.index != null) {
      return content.slice(0, m.index).split(/\r?\n/).length
    }
  }

  if (preferExport) {
    // export default Something
    const def = new RegExp(`^export\\s+default\\s+${esc}\\b`, 'm').exec(content)
    if (def && def.index != null) {
      return content.slice(0, def.index).split(/\r?\n/).length
    }
  }
  return null
}

function findDefaultExportLine(content: string): number | null {
  const re = /^export\s+default\b/m
  const m = re.exec(content)
  if (!m || m.index == null) return null
  return content.slice(0, m.index).split(/\r?\n/).length
}

export async function fetchFileContent(path: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`)
    if (!res.ok) return null
    const body = (await res.json()) as { content?: string }
    return typeof body.content === 'string' ? body.content : null
  } catch {
    return null
  }
}

/**
 * Graph-assisted go-to-definition (not a full TS language service).
 */
export async function resolveDefinition(args: {
  path: string
  content: string
  line: number
  column: number
  importTargets: string[]
}): Promise<DefinitionHit | null> {
  const { path, content, line, column, importTargets } = args

  const lit = stringLiteralAt(content, line, column)
  if (lit && (lit.startsWith('.') || lit.startsWith('/') || !lit.includes(':'))) {
    const target = matchSpecifierToTargets(lit, importTargets)
    if (target) return { path: target, line: 1 }
  }

  const symbol = identifierAt(content, line, column)
  if (!symbol) return null

  const local = findSymbolLine(content, symbol, false)
  // Prefer import jump when symbol is imported (even if also local shadow — rare)
  const bindings = parseImportBindings(content)
  const binding = bindings.find((b) => b.local === symbol)

  if (binding) {
    const target =
      matchSpecifierToTargets(binding.specifier, importTargets) ??
      importTargets.find((t) => t.includes(binding.specifier.replace(/^\.\//, '')))
    if (target) {
      const remote = await fetchFileContent(target)
      if (remote != null) {
        if (binding.imported === 'default') {
          const lineNo =
            findDefaultExportLine(remote) ??
            findSymbolLine(remote, symbol, true) ??
            1
          return { path: target, line: lineNo }
        }
        if (binding.imported === '*') {
          return { path: target, line: 1 }
        }
        const lineNo =
          findSymbolLine(remote, binding.imported, true) ??
          findSymbolLine(remote, binding.imported, false) ??
          1
        return { path: target, line: lineNo }
      }
      return { path: target, line: 1 }
    }
  }

  if (local != null) {
    return { path, line: local }
  }

  // Fallback: search import targets for an export with this name
  for (const target of importTargets) {
    const remote = await fetchFileContent(target)
    if (remote == null) continue
    const lineNo = findSymbolLine(remote, symbol, true)
    if (lineNo != null) return { path: target, line: lineNo }
  }

  return null
}
