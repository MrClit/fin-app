interface SparklineProps {
  data: number[]
}

export function Sparkline({ data }: SparklineProps) {
  const points = data.length > 0 ? data : [0]
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const w = 300, h = 40, pad = 4

  const coords = points.map((v, i) => {
    const x = points.length > 1 ? (i / (points.length - 1)) * w : w / 2
    const y = h - pad - ((v - min) / range) * (h - 2 * pad)
    return [x, y] as [number, number]
  })

  const linePath = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`

  return (
    <svg
      width="100%"
      height="40"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <path
        d={linePath}
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
