import type { CSSProperties, ReactNode } from 'react'

type RingProps = {
  /** 0 to 1: how much of the ring is filled. */
  progress?: number
  /** Draw the arc in once on load (respects reduced motion). */
  drawIn?: boolean
  className?: string
  children?: ReactNode
}

const SIZE = 200
const STROKE = 12
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** The timer ring. Size comes from the parent's CSS width; the SVG scales to fit. */
export function Ring({ progress = 0.72, drawIn = false, className, children }: RingProps) {
  const offset = CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress)))
  const arcStyle = {
    '--ring-circ': CIRCUMFERENCE,
    '--ring-offset': offset,
  } as CSSProperties

  return (
    <div className={['ring', className].filter(Boolean).join(' ')}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" focusable="false">
        <circle
          className="ring-track"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE}
        />
        <circle
          className={drawIn ? 'ring-arc ring-arc--draw' : 'ring-arc'}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          style={arcStyle}
        />
      </svg>
      {children ? <div className="ring-center">{children}</div> : null}
    </div>
  )
}
