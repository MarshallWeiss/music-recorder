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
  sm: { outer: 32, knob: 26, tickLen: 3, labelSize: 'text-[8px]' },
  md: { outer: 48, knob: 38, tickLen: 4, labelSize: 'text-[9px]' },
  lg: { outer: 60, knob: 48, tickLen: 5, labelSize: 'text-[10px]' },
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
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="1"
      />
    )
  }

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

        {/* Knob body */}
        <div
          className={`absolute rounded-full cursor-grab active:cursor-grabbing ${
            size === 'sm' ? 'knob-body-dark shadow-knob-sm' : 'knob-body shadow-knob'
          }`}
          style={{
            width: s.knob,
            height: s.knob,
            top: (s.outer - s.knob) / 2,
            left: (s.outer - s.knob) / 2,
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Indicator line */}
          <div
            className="absolute left-1/2 rounded-full"
            style={{
              width: 2,
              height: s.knob * 0.35,
              top: s.knob * 0.12,
              marginLeft: -1,
              background: 'white',
              transformOrigin: `center ${s.knob * 0.38}px`,
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
