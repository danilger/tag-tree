/** Path-family glow: family key, palette, hull geometry. */

export type GlowPoint = { x: number; y: number }

const HUE_OFFSET = 28
const SAT_MAX = 0.72
const SAT_MIN = 0.28
const LIGHT = 0.55

/**
 * First path segment after skipping leading `src` segments.
 */
export function pathFamily(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/').filter(Boolean)
  let i = 0
  while (i < parts.length && parts[i] === 'src') i += 1
  if (i >= parts.length) return '_root'
  return parts[i]!
}

/** Segment count after skipped `src` (file included); at least 1. */
export function pathDepth(path: string): number {
  const parts = path.replace(/\\/g, '/').split('/').filter(Boolean)
  let i = 0
  while (i < parts.length && parts[i] === 'src') i += 1
  return Math.max(1, parts.length - i)
}

/** Sorted unique families → spaced hues (degrees). */
export function buildFamilyHueMap(families: string[]): Record<string, number> {
  const sorted = [...new Set(families)].sort((a, b) => a.localeCompare(b))
  const n = Math.max(sorted.length, 1)
  const out: Record<string, number> = {}
  sorted.forEach((family, i) => {
    out[family] = (i / n) * 360 + HUE_OFFSET
  })
  return out
}

export function depthSaturation(depth: number, maxDepth: number): number {
  if (maxDepth <= 1) return SAT_MAX
  const t = Math.min(1, Math.max(0, (depth - 1) / (maxDepth - 1)))
  return SAT_MAX - t * (SAT_MAX - SAT_MIN)
}

export function familyFill(
  hue: number,
  sat: number,
  alpha = 0.32,
): string {
  const h = ((hue % 360) + 360) % 360
  return `hsla(${h.toFixed(1)}, ${Math.round(sat * 100)}%, ${Math.round(LIGHT * 100)}%, ${alpha})`
}

function cross(o: GlowPoint, a: GlowPoint, b: GlowPoint): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

/** Monotone-chain convex hull. */
export function convexHull(points: GlowPoint[]): GlowPoint[] {
  if (points.length <= 1) return points.slice()
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const lower: GlowPoint[] = []
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0
    ) {
      lower.pop()
    }
    lower.push(p)
  }
  const upper: GlowPoint[] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0
    ) {
      upper.pop()
    }
    upper.push(p)
  }
  upper.pop()
  lower.pop()
  return lower.concat(upper)
}

/** Push hull vertices outward from centroid by `pad`. */
export function inflateHull(hull: GlowPoint[], pad: number): GlowPoint[] {
  if (hull.length === 0) return []
  if (hull.length === 1) {
    const p = hull[0]!
    const r = pad
    const k = 0.7071
    return [
      { x: p.x + r, y: p.y },
      { x: p.x + r * k, y: p.y + r * k },
      { x: p.x, y: p.y + r },
      { x: p.x - r * k, y: p.y + r * k },
      { x: p.x - r, y: p.y },
      { x: p.x - r * k, y: p.y - r * k },
      { x: p.x, y: p.y - r },
      { x: p.x + r * k, y: p.y - r * k },
    ]
  }
  let cx = 0
  let cy = 0
  for (const p of hull) {
    cx += p.x
    cy += p.y
  }
  cx /= hull.length
  cy /= hull.length
  return hull.map((p) => {
    const dx = p.x - cx
    const dy = p.y - cy
    const len = Math.hypot(dx, dy) || 1
    return { x: p.x + (dx / len) * pad, y: p.y + (dy / len) * pad }
  })
}

/** Cluster points by pairwise distance (union-find). */
export function clusterByDistance(
  points: GlowPoint[],
  maxDist: number,
): GlowPoint[][] {
  const n = points.length
  if (n === 0) return []
  const parent = Array.from({ length: n }, (_, i) => i)
  function find(a: number): number {
    let x = a
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!
      x = parent[x]!
    }
    return x
  }
  function unite(a: number, b: number) {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[rb] = ra
  }
  const maxD2 = maxDist * maxDist
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = points[i]!
      const b = points[j]!
      const dx = a.x - b.x
      const dy = a.y - b.y
      if (dx * dx + dy * dy <= maxD2) unite(i, j)
    }
  }
  const groups = new Map<number, GlowPoint[]>()
  for (let i = 0; i < n; i++) {
    const r = find(i)
    const list = groups.get(r)
    if (list) list.push(points[i]!)
    else groups.set(r, [points[i]!])
  }
  return [...groups.values()]
}

export type GlowBlob = {
  key: string
  family: string
  fill: string
  points: GlowPoint[]
  pulse: boolean
}

export type GlowAura = {
  key: string
  cx: number
  cy: number
  r: number
  fill: string
  pulse: boolean
}

export type GlowNodeInput = {
  id: string
  path: string
  x: number
  y: number
  dimmed: boolean
}

/**
 * Build soft hull blobs + per-node auras for participating (non-dimmed) nodes.
 */
export function buildGlowVisuals(
  nodes: GlowNodeInput[],
  activeId: string | null,
  inflatePad: number,
  clusterDist: number,
): { blobs: GlowBlob[]; auras: GlowAura[] } {
  const participants = nodes.filter((n) => !n.dimmed)
  if (participants.length === 0) return { blobs: [], auras: [] }

  const families = participants.map((n) => pathFamily(n.path))
  const hues = buildFamilyHueMap(families)

  const maxDepthByFamily = new Map<string, number>()
  for (const n of participants) {
    const f = pathFamily(n.path)
    const d = pathDepth(n.path)
    maxDepthByFamily.set(f, Math.max(maxDepthByFamily.get(f) ?? 1, d))
  }

  const activeParticipant = activeId
    ? participants.find((n) => n.id === activeId)
    : undefined
  const effectivePulse = activeParticipant
    ? pathFamily(activeParticipant.path)
    : null

  const byFamily = new Map<string, GlowNodeInput[]>()
  for (const n of participants) {
    const f = pathFamily(n.path)
    const list = byFamily.get(f)
    if (list) list.push(n)
    else byFamily.set(f, [n])
  }

  const blobs: GlowBlob[] = []
  const auras: GlowAura[] = []
  for (const [family, members] of byFamily) {
    const hue = hues[family] ?? HUE_OFFSET
    const maxD = maxDepthByFamily.get(family) ?? 1
    const midDepth = Math.ceil(maxD / 2)
    const satHull = depthSaturation(midDepth, maxD)
    const fillHull = familyFill(hue, satHull, 0.26)
    const centers: GlowPoint[] = members.map((m) => ({ x: m.x, y: m.y }))
    const clusters = clusterByDistance(centers, clusterDist)
    const pulse = effectivePulse != null && family === effectivePulse
    clusters.forEach((cluster, idx) => {
      const hull = inflateHull(convexHull(cluster), inflatePad)
      if (hull.length === 0) return
      blobs.push({
        key: `${family}-${idx}`,
        family,
        fill: fillHull,
        points: hull,
        pulse,
      })
    })
    for (const m of members) {
      const sat = depthSaturation(pathDepth(m.path), maxD)
      auras.push({
        key: `aura-${m.id}`,
        cx: m.x,
        cy: m.y,
        r: inflatePad,
        fill: familyFill(hue, sat, 0.38),
        pulse,
      })
    }
  }
  return { blobs, auras }
}
