import {
  useCallback,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import type { ChangeReview } from './types'

type Geom = { x: number; y: number; w: number; h: number }

const DEFAULT_W = 340
const DEFAULT_H = 320
const MIN_W = 220
const MIN_H = 160

function defaultGeom(): Geom {
  const margin = 12
  const top = 56
  return {
    x: Math.max(margin, window.innerWidth - DEFAULT_W - margin),
    y: top,
    w: DEFAULT_W,
    h: DEFAULT_H,
  }
}

type ReviewGuidePanelProps = {
  open: boolean
  review: ChangeReview
  onClose: () => void
  onPath: (path: string) => void
}

/**
 * Floating, draggable, resizable review guide for the selected change set.
 */
export function ReviewGuidePanel({
  open,
  review,
  onClose,
  onPath,
}: ReviewGuidePanelProps) {
  const titleId = useId()
  const [geom, setGeom] = useState<Geom>(() => defaultGeom())
  const geomRef = useRef(geom)
  geomRef.current = geom
  const dragRef = useRef<{
    mode: 'move' | 'resize'
    startX: number
    startY: number
    orig: Geom
  } | null>(null)

  const onPointerMove = useCallback((event: PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (drag.mode === 'move') {
      const next = {
        ...drag.orig,
        x: Math.min(
          window.innerWidth - 48,
          Math.max(0, drag.orig.x + dx),
        ),
        y: Math.min(
          window.innerHeight - 48,
          Math.max(0, drag.orig.y + dy),
        ),
      }
      geomRef.current = next
      setGeom(next)
      return
    }
    const next = {
      ...drag.orig,
      w: Math.min(
        window.innerWidth - drag.orig.x - 8,
        Math.max(MIN_W, drag.orig.w + dx),
      ),
      h: Math.min(
        window.innerHeight - drag.orig.y - 8,
        Math.max(MIN_H, drag.orig.h + dy),
      ),
    }
    geomRef.current = next
    setGeom(next)
  }, [])

  const onPointerUp = useCallback(() => {
    dragRef.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }, [onPointerMove])

  function startDrag(mode: 'move' | 'resize', event: ReactPointerEvent) {
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      orig: { ...geomRef.current },
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  if (!open) return null

  return (
    <div
      className="review-guide-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      style={{
        left: geom.x,
        top: geom.y,
        width: geom.w,
        height: geom.h,
      }}
    >
      <header
        className="review-guide-header"
        onPointerDown={(event) => startDrag('move', event)}
      >
        <h2 id={titleId}>Review</h2>
        <button
          type="button"
          className="review-guide-close"
          title="Close review guide (Shift+R)"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
        >
          Close
        </button>
      </header>
      <div className="review-guide-body">
        <p className="review-guide-goal">{review.goal}</p>
        <ol className="review-guide-order" aria-label="Recommended review order">
          {review.order.map((path, index) => (
            <li key={`${path}-${index}`}>
              <button
                type="button"
                className="review-guide-path"
                title={`Focus and open ${path} in split view`}
                onClick={() => onPath(path)}
              >
                {path}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div
        className="review-guide-resize"
        aria-hidden
        onPointerDown={(event) => startDrag('resize', event)}
      />
    </div>
  )
}
