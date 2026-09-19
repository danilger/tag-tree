import type { languages as MonacoLanguages } from 'monaco-editor'

import {
  fetchFileContent,
  identifierAt,
  resolveDefinition,
} from './goToDefinition'

type Monaco = typeof import('monaco-editor')

/**
 * Graph-assisted JSDoc hover (definition site, including other files).
 * Registers once per page load for typescript + javascript.
 */
export function ensureJsdocHoverProviders(monaco: Monaco): void {
  if (providersRegistered) return
  providersRegistered = true

  const provider: MonacoLanguages.HoverProvider = {
    provideHover(model, position) {
      const ctx = hoverContext
      if (!ctx) return null
      return jsdocHoverFromDefinition({
        path: ctx.path,
        content: model.getValue(),
        line: position.lineNumber,
        column: position.column,
        importTargets: ctx.importTargets,
      }).then((hit) => {
        if (!hit) return null
        return {
          range: new monaco.Range(
            position.lineNumber,
            hit.wordStartColumn,
            position.lineNumber,
            hit.wordEndColumn,
          ),
          contents: [{ value: hit.markdown }],
        }
      })
    },
  }

  monaco.languages.registerHoverProvider('typescript', provider)
  monaco.languages.registerHoverProvider('javascript', provider)
}

/** Current open file identity for the global hover providers. */
export function setJsdocHoverContext(ctx: JsdocHoverContext | null): void {
  hoverContext = ctx
}

/**
 * Resolve definition (same as gd), then return JSDoc above that line.
 * Falls back to local declaration JSDoc if resolve fails.
 */
export async function jsdocHoverFromDefinition(args: {
  path: string
  content: string
  line: number
  column: number
  importTargets: string[]
}): Promise<JsdocHoverHit | null> {
  const { content, line, column } = args
  const symbol = identifierAt(content, line, column)
  if (!symbol) return null

  const lines = content.split(/\r?\n/)
  const lineText = lines[line - 1]
  if (!lineText) return null
  const span = identifierSpanOnLine(lineText, column)
  if (!span) return null

  const def = await resolveDefinition(args)
  if (def) {
    const defContent =
      def.path === args.path
        ? content
        : await fetchFileContent(def.path)
    if (defContent != null) {
      const jsdoc = jsdocAboveLine(defContent.split(/\r?\n/), def.line)
      if (jsdoc) {
        return {
          markdown: jsdoc,
          wordStartColumn: span.start,
          wordEndColumn: span.end,
        }
      }
    }
  }

  return jsdocHoverAtLocal(content, line, column)
}

/**
 * If the cursor is on a declaration name with a JSDoc block immediately
 * above it, return hover markdown and the identifier column span (1-based).
 */
export function jsdocHoverAt(
  content: string,
  lineNumber: number,
  column: number,
): JsdocHoverHit | null {
  return jsdocHoverAtLocal(content, lineNumber, column)
}

/** Extract and normalize a JSDoc block immediately above a 1-based declaration line. */
export function jsdocAboveLine(
  lines: string[],
  declarationLine1Based: number,
): string | null {
  let i = declarationLine1Based - 2
  while (i >= 0) {
    const t = lines[i]!.trim()
    if (t === '' || t.startsWith('//')) {
      i--
      continue
    }
    break
  }
  if (i < 0) return null

  const endTrim = lines[i]!.trim()
  const single = endTrim.match(/^\/\*\*([\s\S]*?)\*\/\s*$/)
  if (single) {
    return normalizeJsdocLines([lines[i]!])
  }

  if (!/\*\/\s*$/.test(endTrim)) return null

  const block: string[] = []
  let j = i
  while (j >= 0) {
    block.unshift(lines[j]!)
    const t = lines[j]!.trim()
    if (t.startsWith('/**')) {
      return normalizeJsdocLines(block)
    }
    if (t.startsWith('/*') && !t.startsWith('/**')) {
      return null
    }
    j--
  }
  return null
}

/** True when the source line looks like a declaration of the given symbol. */
export function isDeclarationLine(line: string, symbol: string): boolean {
  const t = line.trim()
  const esc = escapeRegExp(symbol)
  const patterns = [
    new RegExp(
      `^(?:export\\s+)?(?:default\\s+)?(?:async\\s+)?function\\s+${esc}\\b`,
    ),
    new RegExp(
      `^(?:export\\s+)?(?:default\\s+)?(?:abstract\\s+)?class\\s+${esc}\\b`,
    ),
    new RegExp(`^(?:export\\s+)?(?:const|let|var)\\s+${esc}\\b`),
    new RegExp(`^(?:export\\s+)?(?:type|interface|enum)\\s+${esc}\\b`),
    new RegExp(
      `^(?:(?:public|private|protected|static|readonly|abstract|override|async|get|set)\\s+)*${esc}\\s*[(<]`,
    ),
  ]
  return patterns.some((re) => re.test(t))
}

// TYPES

export type JsdocHoverContext = {
  path: string
  importTargets: string[]
}

type JsdocHoverHit = {
  markdown: string
  wordStartColumn: number
  wordEndColumn: number
}

// HELPERS

let providersRegistered = false
let hoverContext: JsdocHoverContext | null = null

function jsdocHoverAtLocal(
  content: string,
  lineNumber: number,
  column: number,
): JsdocHoverHit | null {
  const symbol = identifierAt(content, lineNumber, column)
  if (!symbol) return null

  const lines = content.split(/\r?\n/)
  const line = lines[lineNumber - 1]
  if (!line || !isDeclarationLine(line, symbol)) return null

  const span = identifierSpanOnLine(line, column)
  if (!span) return null

  const jsdoc = jsdocAboveLine(lines, lineNumber)
  if (!jsdoc) return null

  return {
    markdown: jsdoc,
    wordStartColumn: span.start,
    wordEndColumn: span.end,
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function identifierSpanOnLine(
  line: string,
  column: number,
): { start: number; end: number } | null {
  const idx = Math.max(0, column - 1)
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
    while (end < line.length && /[\w$]/.test(line[end]!)) end++
  } else {
    return null
  }
  return { start: start + 1, end: end + 1 }
}

function normalizeJsdocLines(rawLines: string[]): string | null {
  const body: string[] = []
  for (const raw of rawLines) {
    let line = raw.trimEnd()
    const trimmed = line.trim()
    if (trimmed.startsWith('/**')) {
      line = trimmed.replace(/^\/\*\*\s?/, '')
      if (line.endsWith('*/')) {
        line = line.slice(0, -2).trimEnd()
      }
    } else if (trimmed === '*/' || trimmed.endsWith('*/')) {
      line = trimmed.replace(/\*\/\s*$/, '').replace(/^\*\s?/, '')
    } else if (trimmed.startsWith('*')) {
      line = trimmed.replace(/^\*\s?/, '')
    } else {
      line = trimmed
    }
    body.push(line)
  }
  while (body.length && body[0] === '') body.shift()
  while (body.length && body[body.length - 1] === '') body.pop()
  const text = body.join('\n').trim()
  return text || null
}
