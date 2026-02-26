import { useState, useRef, useEffect } from 'react'

interface CassetteDeckProps {
  isPlaying: boolean
  isRecording: boolean
  sessionName: string
  onSetSessionName: (name: string) => void
  loopDuration: number
  currentTime: number
}

function TapeHub({ spinning, size }: { spinning: boolean; size: number }) {
  const r = size / 2
  // 6-tooth drive hub shape (like real cassette spindle holes)
  const toothCount = 6
  const outerR = size * 0.28
  const innerR = size * 0.18
  const hubPath = Array.from({ length: toothCount * 2 }, (_, i) => {
    const angle = (i * Math.PI) / toothCount - Math.PI / 2
    const radius = i % 2 === 0 ? outerR : innerR
    const x = r + radius * Math.cos(angle)
    const y = r + radius * Math.sin(angle)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ') + 'Z'

  return (
    <g className={spinning ? 'animate-reel-spin' : ''} style={{ transformOrigin: `${r}px ${r}px` }}>
      {/* Outer tape wound — visible concentric rings of magnetic tape */}
      <circle cx={r} cy={r} r={size * 0.48} fill="none" stroke="rgba(80,40,20,0.2)" strokeWidth={size * 0.015} />
      <circle cx={r} cy={r} r={size * 0.46} fill="none" stroke="rgba(60,30,15,0.25)" strokeWidth={size * 0.015} />
      <circle cx={r} cy={r} r={size * 0.44} fill="none" stroke="rgba(70,35,18,0.2)" strokeWidth={size * 0.015} />
      <circle cx={r} cy={r} r={size * 0.42} fill="none" stroke="rgba(55,28,12,0.25)" strokeWidth={size * 0.015} />
      <circle cx={r} cy={r} r={size * 0.40} fill="none" stroke="rgba(65,32,16,0.2)" strokeWidth={size * 0.015} />
      <circle cx={r} cy={r} r={size * 0.38} fill="none" stroke="rgba(50,25,10,0.25)" strokeWidth={size * 0.015} />
      <circle cx={r} cy={r} r={size * 0.36} fill="none" stroke="rgba(60,30,15,0.2)" strokeWidth={size * 0.015} />

      {/* Hub flange (off-white plastic, bigger) */}
      <circle cx={r} cy={r} r={size * 0.32} fill="url(#hubGradient)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />

      {/* Hub rim highlight */}
      <circle cx={r} cy={r} r={size * 0.31} fill="none" stroke="rgba(255,250,240,0.15)" strokeWidth="0.5" />

      {/* Spokes — 3 radial lines */}
      {[0, 60, 120].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const x1 = r + size * 0.10 * Math.cos(rad)
        const y1 = r + size * 0.10 * Math.sin(rad)
        const x2 = r + size * 0.30 * Math.cos(rad)
        const y2 = r + size * 0.30 * Math.sin(rad)
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,0,0,0.12)" strokeWidth="1.2" />
      })}

      {/* Drive spindle hole — larger */}
      <path d={hubPath} fill="#1a1610" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
    </g>
  )
}

export default function CassetteDeck({
  isPlaying,
  isRecording,
  sessionName,
  onSetSessionName,
  loopDuration,
  currentTime,
}: CassetteDeckProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const spinning = isPlaying || isRecording

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  // Cassette dimensions
  const W = 420
  const H = 270
  const hubSize = 82
  const windowTop = 18
  const windowH = 126
  const windowSide = 32
  const labelTop = windowTop + windowH + 8
  const labelH = H - labelTop - 32

  return (
    <div className="flex flex-col items-center w-full" style={{ maxWidth: W + 40 }}>
      {/* Cassette well — recessed area in the deck */}
      <div
        className="shadow-cassette-well rounded-lg p-4 w-full"
        style={{
          background: 'linear-gradient(180deg, #222018 0%, #1a1610 40%, #141210 100%)',
        }}
      >
        {/* Cassette shell */}
        <div
          className="relative rounded-lg overflow-hidden"
          style={{
            width: W,
            height: H,
            margin: '0 auto',
          }}
        >
          {/* Shell background — dark charcoal plastic */}
          <div
            className="absolute inset-0 rounded-lg"
            style={{
              background: `
                radial-gradient(ellipse at 30% 20%, rgba(255,250,240,0.04), transparent 50%),
                linear-gradient(180deg, #504a44 0%, #444038 15%, #3c3832 40%, #343028 60%, #302c26 80%, #282420 100%)
              `,
            }}
          />

          {/* Mold lines — subtle horizontal ridges */}
          <div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              background: `
                repeating-linear-gradient(
                  180deg,
                  transparent,
                  transparent 3px,
                  rgba(255,250,240,0.008) 3px,
                  rgba(255,250,240,0.008) 4px
                )
              `,
            }}
          />

          {/* Top edge highlight */}
          <div className="absolute top-0 left-0 right-0 h-px rounded-t-lg" style={{ background: 'rgba(255,250,240,0.12)' }} />

          {/* Gloss reflection — top half */}
          <div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, rgba(255,250,240,0.07) 0%, rgba(255,250,240,0.02) 25%, transparent 45%)',
            }}
          />

          {/* === TAPE WINDOW === */}
          <div
            className="absolute"
            style={{
              top: windowTop,
              left: windowSide,
              right: windowSide,
              height: windowH,
              borderRadius: 6,
              background: `
                radial-gradient(ellipse at 50% 80%, rgba(40,20,5,0.2), transparent 60%),
                linear-gradient(180deg, #181614 0%, #201c18 30%, #242018 60%, #1c1814 100%)
              `,
              boxShadow: `
                inset 0 3px 10px rgba(0,0,0,0.8),
                inset 0 -2px 6px rgba(0,0,0,0.4),
                inset 2px 0 6px rgba(0,0,0,0.3),
                inset -2px 0 6px rgba(0,0,0,0.3),
                0 1px 0 rgba(255,250,240,0.06)
              `,
            }}
          >
            {/* SVG for reels and tape */}
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${W - windowSide * 2} ${windowH}`}
              style={{ position: 'absolute', inset: 0 }}
            >
              <defs>
                {/* Hub gradient — off-white plastic */}
                <radialGradient id="hubGradient" cx="50%" cy="40%">
                  <stop offset="0%" stopColor="#e8e0d0" />
                  <stop offset="50%" stopColor="#d8d0c0" />
                  <stop offset="100%" stopColor="#c8c0b0" />
                </radialGradient>

                {/* Tape ribbon gradient */}
                <linearGradient id="tapeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3a1c10" />
                  <stop offset="50%" stopColor="#2c1408" />
                  <stop offset="100%" stopColor="#3a1c10" />
                </linearGradient>
              </defs>

              {/* Tape path — brown magnetic tape connecting reels */}
              {(() => {
                const svgW = W - windowSide * 2
                const leftHubCx = svgW * 0.22
                const rightHubCx = svgW * 0.78
                const cy = windowH / 2
                const tapeR = hubSize * 0.50
                // Guide posts near each hub
                const leftPostX = leftHubCx + hubSize * 0.55
                const rightPostX = rightHubCx - hubSize * 0.55
                return (
                  <>
                    {/* Top tape run */}
                    <rect
                      x={leftPostX}
                      y={cy - tapeR}
                      width={rightPostX - leftPostX}
                      height={3}
                      fill="url(#tapeGradient)"
                      rx="0.5"
                    />
                    {/* Bottom tape run */}
                    <rect
                      x={leftPostX}
                      y={cy + tapeR - 3}
                      width={rightPostX - leftPostX}
                      height={3}
                      fill="url(#tapeGradient)"
                      rx="0.5"
                    />
                    {/* Guide posts — chrome pins */}
                    {[leftPostX, rightPostX].map((x, i) => (
                      <g key={i}>
                        <circle cx={x} cy={cy - tapeR + 1} r={3} fill="#a0988a" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
                        <circle cx={x} cy={cy - tapeR + 1} r={1.5} fill="rgba(255,250,240,0.3)" />
                        <circle cx={x} cy={cy + tapeR - 1} r={3} fill="#a0988a" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
                        <circle cx={x} cy={cy + tapeR - 1} r={1.5} fill="rgba(255,250,240,0.3)" />
                      </g>
                    ))}
                  </>
                )
              })()}

              {/* Left hub */}
              <g transform={`translate(${(W - windowSide * 2) * 0.22 - hubSize / 2}, ${windowH / 2 - hubSize / 2})`}>
                <TapeHub spinning={spinning} size={hubSize} />
              </g>

              {/* Right hub */}
              <g transform={`translate(${(W - windowSide * 2) * 0.78 - hubSize / 2}, ${windowH / 2 - hubSize / 2})`}>
                <TapeHub spinning={spinning} size={hubSize} />
              </g>
            </svg>

            {/* Window glass reflection */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                borderRadius: 6,
                background: `
                  linear-gradient(165deg, rgba(255,250,240,0.06) 0%, transparent 30%),
                  radial-gradient(ellipse at 25% 15%, rgba(255,250,240,0.04), transparent 40%)
                `,
              }}
            />
          </div>

          {/* === CASSETTE LABEL === */}
          <div
            className="absolute cursor-pointer hover:brightness-105 transition-all"
            style={{
              top: labelTop,
              left: 40,
              right: 40,
              height: labelH,
              borderRadius: 3,
              background: `
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 11px,
                  rgba(180,160,120,0.15) 11px,
                  rgba(180,160,120,0.15) 12px
                ),
                linear-gradient(180deg, #f4ecd4 0%, #eee4c8 30%, #e6dcc0 70%, #ddd2b6 100%)
              `,
              boxShadow: `
                inset 0 1px 2px rgba(20,15,5,0.08),
                0 1px 0 rgba(255,250,240,0.1),
                0 -1px 0 rgba(0,0,0,0.05)
              `,
            }}
            onClick={() => {
              setEditValue(sessionName)
              setEditing(true)
            }}
            title="Click to rename session"
          >
            {/* Side label marker */}
            <div
              className="absolute top-1.5 right-2.5 rounded-sm flex items-center justify-center text-[7px] font-bold"
              style={{
                width: 16,
                height: 16,
                background: 'linear-gradient(180deg, #d42020 0%, #b01818 100%)',
                color: 'white',
                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}
            >
              A
            </div>

            {/* Manufacturer mark */}
            <div
              className="absolute top-1.5 left-3 text-[6px] uppercase tracking-[0.15em] font-bold"
              style={{ color: 'rgba(140,120,80,0.4)' }}
            >
              Type I · Normal
            </div>

            {/* Session name */}
            <div className="flex items-center justify-center h-full">
              {editing ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => {
                    if (editValue.trim()) onSetSessionName(editValue.trim())
                    setEditing(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editValue.trim()) onSetSessionName(editValue.trim())
                      setEditing(false)
                    }
                    if (e.key === 'Escape') setEditing(false)
                  }}
                  className="w-full text-center text-sm font-mono bg-transparent outline-none border-b border-hw-400 mx-6"
                  style={{ color: '#3a2a18' }}
                />
              ) : (
                <span className="text-sm font-mono truncate px-6" style={{ color: '#4a3a28' }}>
                  {sessionName}
                </span>
              )}
            </div>

            {/* Time indicator line */}
            <div
              className="absolute bottom-1.5 left-3 right-3 flex items-center gap-2"
            >
              <span className="text-[7px] font-mono" style={{ color: 'rgba(100,80,50,0.5)' }}>
                C-60
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(140,120,80,0.2)' }} />
            </div>
          </div>

          {/* === CORNER SCREWS (5 total: 4 corners + 1 center bottom) === */}
          {[
            { x: 12, y: 12 },
            { x: W - 12, y: 12 },
            { x: 12, y: H - 12 },
            { x: W - 12, y: H - 12 },
            { x: W / 2, y: H - 10 },
          ].map((pos, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 8,
                height: 8,
                left: pos.x - 4,
                top: pos.y - 4,
                background: `
                  radial-gradient(circle at 40% 35%, #686460, #4a4640 40%, #2a2622 80%, #1a1816 100%)
                `,
                boxShadow: `
                  inset 0 1px 2px rgba(0,0,0,0.6),
                  0 0.5px 0 rgba(255,250,240,0.08)
                `,
              }}
            >
              {/* Phillips head cross */}
              <div className="absolute" style={{
                width: 4, height: 0.5, top: 3.75, left: 2,
                background: 'rgba(0,0,0,0.5)',
              }} />
              <div className="absolute" style={{
                width: 0.5, height: 4, top: 2, left: 3.75,
                background: 'rgba(0,0,0,0.5)',
              }} />
            </div>
          ))}

          {/* === HEAD ACCESS SLOTS (bottom edge) === */}
          <div className="absolute flex items-center justify-center gap-3" style={{
            bottom: 0, left: W * 0.3, right: W * 0.3, height: 10,
          }}>
            {/* Pinch roller opening */}
            <div style={{
              width: 14, height: 8, borderRadius: '3px 3px 0 0',
              background: '#0e0c08',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)',
            }} />
            {/* Head opening */}
            <div style={{
              width: 30, height: 8, borderRadius: '3px 3px 0 0',
              background: '#0e0c08',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)',
            }} />
            {/* Pinch roller opening */}
            <div style={{
              width: 14, height: 8, borderRadius: '3px 3px 0 0',
              background: '#0e0c08',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)',
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}
