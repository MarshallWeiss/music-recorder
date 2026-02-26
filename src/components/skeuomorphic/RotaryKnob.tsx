import { useRef, useCallback } from 'react'

interface RotaryKnobProps {
  value: number         // normalized 0-1
  onChange: (value: number) => void
  label?: string
  size?: 'sm' | 'md' | 'lg'
  detent?: boolean      // center detent (snap to 0.5)
  ticks?: number        // number of tick marks around edge
}

const SIZE_MAP = {
  sm: { outer: 34, knob: 28, tickLen: 3, labelSize: 'text-[8px]' },
  md: { outer: 50, knob: 40, tickLen: 4, labelSize: 'text-[9px]' },
  lg: { outer: 64, knob: 52, tickLen: 5, labelSize: 'text-[10px]' },
}

// Map 0-1 to -135deg to +135deg (270-degree sweep)
const MIN_ANGLE = -135
const MAX_ANGLE = 135
const valueToAngle = (v: number) => MIN_ANGLE + v * (MAX_ANGLE - MIN_ANGLE)

export default function RotaryKnob({
  value,
  onChange,
  label,
  size = 'md',
  detent = false,
  ticks = 11,
}: RotaryKnobProps) {
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null)
  const s = SIZE_MAP[size]
  const angle = valueToAngle(value)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startValue: value }

    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return
      const dy = dragRef.current.startY - me.clientY // up = increase
      const sensitivity = 200
      let newValue = dragRef.current.startValue + dy / sensitivity
      newValue = Math.max(0, Math.min(1, newValue))

      // Center detent: snap to 0.5 within a small dead zone
      if (detent && Math.abs(newValue - 0.5) < 0.03) {
        newValue = 0.5
      }

      onChange(newValue)
    }

    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [value, onChange, detent])

  // Generate tick marks
  const tickMarks = []
  for (let i = 0; i < ticks; i++) {
    const tickValue = i / (ticks - 1)
    const tickAngle = valueToAngle(tickValue)
    const rad = (tickAngle - 90) * (Math.PI / 180)
    const outerR = s.outer / 2
    const innerR = outerR - s.tickLen
    const cx = s.outer / 2
    const cy = s.outer / 2
    tickMarks.push(
      <line
        key={i}
        x1={cx + innerR * Math.cos(rad)}
        y1={cy + innerR * Math.sin(rad)}
        x2={cx + outerR * Math.cos(rad)}
        y2={cy + outerR * Math.sin(rad)}
        stroke="rgba(20,15,5,0.45)"
        strokeWidth="1"
      />
    )
  }

  const isDark = size === 'sm'
  const knobR = s.knob / 2

  return (
    <div className="flex flex-col items-center gap-1 no-select">
      {/* Tick marks container */}
      <div className="relative" style={{ width: s.outer, height: s.outer }}>
        <svg
          className="absolute inset-0"
          width={s.outer}
          height={s.outer}
          viewBox={`0 0 ${s.outer} ${s.outer}`}
        >
          {tickMarks}
        </svg>

        {/* Knob body — 3D sphere with directional lighting */}
        <div
          className="absolute rounded-full cursor-grab active:cursor-grabbing"
          style={{
            width: s.knob,
            height: s.knob,
            top: (s.outer - s.knob) / 2,
            left: (s.outer - s.knob) / 2,
            background: isDark
              ? `
                radial-gradient(circle at 62% 68%, rgba(0,0,0,0.25), transparent 45%),
                radial-gradient(circle at 38% 32%, #787068, #585048 45%, #484038 70%, #383430 100%)
              `
              : `
                radial-gradient(circle at 62% 68%, rgba(20,15,5,0.25), transparent 45%),
                radial-gradient(circle at 38% 32%, #ccc4b4, #a8a090 40%, #888078 65%, #686058 100%)
              `,
            boxShadow: isDark
              ? `
                0 2px 5px rgba(20,15,5,0.5),
                0 5px 12px rgba(20,15,5,0.15),
                inset 0 1px 0 rgba(255,250,240,0.12),
                inset 0 -1px 0 rgba(20,15,5,0.2)
              `
              : `
                0 3px 8px rgba(20,15,5,0.5),
                0 6px 16px rgba(20,15,5,0.2),
                inset 0 1px 0 rgba(255,250,240,0.25),
                inset 0 -1px 0 rgba(20,15,5,0.2)
              `,
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Knurled edge ring */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: 1,
              border: isDark ? '1px solid rgba(255,250,240,0.04)' : '1px solid rgba(255,250,240,0.08)',
            }}
          />

          {/* Indicator line */}
          <div
            className="absolute left-1/2 rounded-full"
            style={{
              width: 2,
              height: s.knob * 0.35,
              top: s.knob * 0.1,
              marginLeft: -1,
              background: isDark ? 'rgba(255,250,240,0.7)' : 'rgba(255,250,240,0.9)',
              boxShadow: '0 0 3px rgba(20,15,5,0.5), 0 1px 2px rgba(20,15,5,0.4)',
              transformOrigin: `center ${knobR - s.knob * 0.1}px`,
              transform: `rotate(${angle}deg)`,
            }}
          />
        </div>
      </div>

      {/* Label */}
      {label && (
        <span className={`${s.labelSize} font-label uppercase tracking-wider text-engraved font-medium`}>
          {label}
        </span>
      )}
    </div>
  )
}
