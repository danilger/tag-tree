import { useId, useMemo } from 'react'
import { ViewportPortal, type Node } from '@xyflow/react'
import { buildGlowVisuals, type GlowNodeInput } from './pathFamilyGlow'

const NODE_W = 240
const NODE_H = 80
/** Inflate hull / aura radius ~ node height (design). */
const INFLATE_PAD = NODE_H
/** Split family into separate blots when centers are farther than this. */
const CLUSTER_DIST = 420

type PathGlowOverlayProps = {
  enabled: boolean
  nodes: Node[]
  activeId: string | null
}

/**
 * Soft path-family hulls + depth auras in flow coordinates (under nodes).
 */
export function PathGlowOverlay({
  enabled,
  nodes,
  activeId,
}: PathGlowOverlayProps) {
  const blurId = useId().replace(/:/g, '')

  const { blobs, auras } = useMemo(() => {
    if (!enabled) return { blobs: [], auras: [] }
    const inputs: GlowNodeInput[] = []
    for (const n of nodes) {
      const data = n.data as { path?: string; dimmed?: boolean }
      const path = typeof data.path === 'string' ? data.path : n.id
      const dimmed = data.dimmed === true
      inputs.push({
        id: n.id,
        path,
        x: n.position.x + NODE_W / 2,
        y: n.position.y + NODE_H / 2,
        dimmed,
      })
    }
    return buildGlowVisuals(inputs, activeId, INFLATE_PAD, CLUSTER_DIST)
  }, [enabled, nodes, activeId])

  if (!enabled || (blobs.length === 0 && auras.length === 0)) return null

  return (
    <ViewportPortal>
      <svg
        className="path-glow-svg"
        aria-hidden
        style={{
          position: 'absolute',
          overflow: 'visible',
          left: 0,
          top: 0,
          width: 1,
          height: 1,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <defs>
          <filter
            id={`path-glow-blur-${blurId}`}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="16" />
          </filter>
        </defs>
        {blobs.map((blob) => {
          const d =
            blob.points.length === 0
              ? ''
              : `M ${blob.points.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`
          return (
            <path
              key={blob.key}
              className={
                blob.pulse ? 'path-glow-blot path-glow-pulse' : 'path-glow-blot'
              }
              d={d}
              fill={blob.fill}
              filter={`url(#path-glow-blur-${blurId})`}
            />
          )
        })}
        {auras.map((aura) => (
          <circle
            key={aura.key}
            className={
              aura.pulse ? 'path-glow-aura path-glow-pulse' : 'path-glow-aura'
            }
            cx={aura.cx}
            cy={aura.cy}
            r={aura.r}
            fill={aura.fill}
            filter={`url(#path-glow-blur-${blurId})`}
          />
        ))}
      </svg>
    </ViewportPortal>
  )
}
