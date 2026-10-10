import { formatDuration, shortDay } from '../../lib/time'

type Day = { day: string; seconds: number }

const W = 360
const H = 170
const PAD_X = 8
const TOP = 16
const BOTTOM = 22

/** Bars for the last 30 days. Plain SVG, scales to its container. */
export function DailyChart({ data }: { data: Day[] }) {
  const max = Math.max(1800, ...data.map((d) => d.seconds))
  const slot = (W - PAD_X * 2) / Math.max(1, data.length)
  const barW = slot * 0.68
  const plotH = H - TOP - BOTTOM
  const total = data.reduce((sum, d) => sum + d.seconds, 0)

  const labelIdx = [0, Math.floor((data.length - 1) / 2), data.length - 1]

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Focus time per day for the last ${data.length} days, ${formatDuration(total)} in total`}
    >
      <text x={PAD_X} y={10} className="chart-label">
        {`scale: ${formatDuration(max)}`}
      </text>
      <line x1={PAD_X} x2={W - PAD_X} y1={TOP} y2={TOP} className="chart-grid" />
      <line x1={PAD_X} x2={W - PAD_X} y1={TOP + plotH} y2={TOP + plotH} className="chart-grid" />

      {data.map((d, i) => {
        const h = d.seconds > 0 ? Math.max(2, (d.seconds / max) * plotH) : 0
        const x = PAD_X + i * slot + (slot - barW) / 2
        const isToday = i === data.length - 1
        return (
          <g key={d.day}>
            <title>{`${shortDay(d.day)}: ${formatDuration(d.seconds)}`}</title>
            {d.seconds > 0 ? (
              <rect
                x={x}
                y={TOP + plotH - h}
                width={barW}
                height={h}
                rx={1.5}
                className={isToday ? 'chart-bar chart-bar--today' : 'chart-bar'}
              />
            ) : (
              <rect x={x} y={TOP + plotH - 1.5} width={barW} height={1.5} className="chart-zero" />
            )}
          </g>
        )
      })}

      {labelIdx.map((i, k) => (
        <text
          key={i}
          x={PAD_X + i * slot + slot / 2}
          y={H - 6}
          textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}
          className="chart-label"
        >
          {shortDay(data[i].day)}
        </text>
      ))}
    </svg>
  )
}
