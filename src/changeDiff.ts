import type { ChangeHunk, ChangeNote } from './types'

/**
 * Build "original" file text by replacing each hunk's current line range
 * with `prev_row`. Hunks without `prev_row` are skipped. Apply from bottom
 * to top so line indices stay valid.
 */
export function buildOriginalContent(
  current: string,
  hunks: ChangeHunk[],
): string | null {
  const withPrev = hunks
    .filter((h) => typeof h.prev_row === 'string')
    .slice()
    .sort((a, b) => b.from - a.from)

  if (withPrev.length === 0) return null

  // Split keeping line endings roughly: use \n and rejoin with \n
  const endsWithNewline = current.endsWith('\n')
  const lines = current.split('\n')
  // If file ends with \n, split leaves a trailing empty string — drop it for
  // 1-based line indexing that matches editor line numbers.
  if (endsWithNewline && lines[lines.length - 1] === '') {
    lines.pop()
  }

  for (const hunk of withPrev) {
    const fromIdx = Math.max(0, hunk.from - 1)
    const toIdx = Math.min(lines.length, hunk.to)
    const deleteCount = Math.max(0, toIdx - fromIdx)
    const replacement = hunk.prev_row!.replace(/\r\n/g, '\n').split('\n')
    if (
      hunk.prev_row!.endsWith('\n') &&
      replacement.length > 0 &&
      replacement[replacement.length - 1] === ''
    ) {
      replacement.pop()
    }
    lines.splice(fromIdx, deleteCount, ...replacement)
  }

  return endsWithNewline ? `${lines.join('\n')}\n` : lines.join('\n')
}

export function hunksForPath(
  hunks: ChangeHunk[] | undefined,
  nodeId: string,
): ChangeHunk[] {
  if (!hunks?.length) return []
  const norm = nodeId.trim().replace(/\\/g, '/')
  return hunks.filter((h) => h.path === norm)
}

export function commentsForHunks(hunks: ChangeHunk[]): string {
  return hunks
    .map((h) => h.comment?.trim())
    .filter((c): c is string => Boolean(c))
    .join('\n\n---\n\n')
}

/** Collect valid line notes from path-scoped hunks (stable order). */
export function notesForHunks(hunks: ChangeHunk[]): ChangeNote[] {
  const out: ChangeNote[] = []
  for (const h of hunks) {
    if (!h.notes?.length) continue
    for (const n of h.notes) {
      const line = Math.floor(Number(n.line))
      const text = typeof n.text === 'string' ? n.text.trim() : ''
      if (!Number.isInteger(line) || line < 1 || !text) continue
      out.push({ line, text })
    }
  }
  return out
}

function splitContentLines(text: string): string[] {
  const endsWithNewline = text.endsWith('\n')
  const lines = text.split('\n')
  if (endsWithNewline && lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines
}

function coalesceLineNumbers(lines: number[]): Array<{ from: number; to: number }> {
  if (lines.length === 0) return []
  const sorted = [...new Set(lines)].sort((a, b) => a - b)
  const ranges: Array<{ from: number; to: number }> = []
  let from = sorted[0]
  let to = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i]
    if (n === to + 1) {
      to = n
    } else {
      ranges.push({ from, to })
      from = n
      to = n
    }
  }
  ranges.push({ from, to })
  return ranges
}

/**
 * 1-based inclusive ranges in `modified` that are inserts/changes vs `original`
 * (Myers line diff). Prefer this over JSON `rows` when original is known — git
 * whole-file exports mark every line in `rows`.
 */
export function modifiedHighlightRanges(
  original: string,
  modified: string,
): Array<{ from: number; to: number }> {
  const a = splitContentLines(original)
  const b = splitContentLines(modified)
  if (b.length === 0) return []
  if (a.length === 0) {
    return [{ from: 1, to: b.length }]
  }

  const n = a.length
  const m = b.length
  const max = n + m
  const v = new Map<number, number>([[1, 0]])
  const trace: Array<Map<number, number>> = []

  for (let d = 0; d <= max; d++) {
    trace.push(new Map(v))
    for (let k = -d; k <= d; k += 2) {
      let x: number
      if (k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1))) {
        x = v.get(k + 1) ?? 0
      } else {
        x = (v.get(k - 1) ?? 0) + 1
      }
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) {
        x++
        y++
      }
      v.set(k, x)
      if (x >= n && y >= m) {
        const changed: number[] = []
        let bx = n
        let by = m
        for (let td = trace.length - 1; td >= 0; td--) {
          const tv = trace[td]
          const kk = bx - by
          let prevK: number
          if (
            kk === -td ||
            (kk !== td && (tv.get(kk - 1) ?? -1) < (tv.get(kk + 1) ?? -1))
          ) {
            prevK = kk + 1
          } else {
            prevK = kk - 1
          }
          const prevX = tv.get(prevK) ?? 0
          const prevY = prevX - prevK

          while (bx > prevX && by > prevY) {
            bx--
            by--
          }

          if (td === 0) break

          if (bx === prevX) {
            // Insert into b at 0-based index prevY → 1-based line prevY+1
            changed.push(prevY + 1)
          }
          // else: delete from a — no modified-side highlight
          bx = prevX
          by = prevY
        }
        return coalesceLineNumbers(changed)
      }
    }
  }
  return []
}

/** Ranges from change hunks (fallback when original is unknown). */
export function hunkHighlightRanges(
  hunks: ChangeHunk[],
): Array<{ from: number; to: number }> {
  return hunks
    .filter((h) => h.from >= 1 && h.to >= h.from)
    .map((h) => ({ from: h.from, to: h.to }))
}
