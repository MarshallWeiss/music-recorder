import { useRef, useCallback } from 'react'

interface VerticalFaderProps {
  value: number    // 0-1 (bottom to top)
  onChange: (value: number) => void
  height?: number  // total fader height in px
  color?: string   // track colour shown as an inlay on the cap
  label?: string
}

const THUMB_HEIGHT = 38
const THUMB_WIDTH = 42
const SLOT_WIDTH = 9

export default function VerticalFader({ value, onChange, height = 140, color, label }: VerticalFaderProps) {
  const slotRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null)
  const trackRange = height - THUMB_HEIGHT

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = { startY: e.clientY, startValue: value }

    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return
      const dy = dragRef.current.startY - me.clientY
      const newValue = Math.max(0, Math.min(1, dragRef.current.startValue + dy / trackRange))
      onChange(newValue)
    }

    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [value, onChange, trackRange])

  // Click on slot to jump
  const handleSlotClick = useCallback((e: React.MouseEvent) => {
    if (!slotRef.current) return
    const rect = slotRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const newValue = Math.max(0, Math.min(1, 1 - y / height))
    onChange(newValue)
  }, [onChange, height])

  const thumbBottom = value * trackRange

  return (
    <div
      ref={slotRef}
      className="relative cursor-pointer no-select"
      style={{ width: THUMB_WIDTH + 12, height }}
      onClick={handleSlotClick}
      role="slider"
      tabIndex={0}
      aria-label={label ?? 'Volume'}
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 0.1 : 0.02
        if (event.key === 'ArrowUp' || event.key === 'ArrowRight') { event.preventDefault(); onChange(Math.min(1, value + step)) }
        if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') { event.preventDefault(); onChange(Math.max(0, value - step)) }
      }}
    >
      {/* Fader slot groove */}
      <div
        className="absolute rounded-sm"
        style={{
          width: SLOT_WIDTH,
          height: height - 8,
          top: 4,
          left: (THUMB_WIDTH + 12 - SLOT_WIDTH) / 2,
          background: `
            linear-gradient(90deg,
              rgba(255,250,240,0.06) 0%,
              #141210 8%,
              #1e1a16 35%,
              #222018 50%,
              #1e1a16 65%,
              #141210 92%,
              rgba(255,250,240,0.06) 100%
            )
          `,
          boxShadow: `
            inset 0 3px 10px rgba(0,0,0,0.7),
            inset 0 -2px 4px rgba(0,0,0,0.3),
            inset 1px 0 3px rgba(0,0,0,0.4),
            inset -1px 0 3px rgba(0,0,0,0.4)
          `,
        }}
      />

      {/* Scale marks — both sides, unity gain at the top */}
      {[0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1].map((mark) => {
        const major = mark === 0 || mark === 0.5 || mark === 1
        const markStyle = {
          width: major ? 9 : 5,
          height: 1,
          background: 'var(--tick)',
          opacity: major ? 1 : 0.6,
          bottom: THUMB_HEIGHT / 2 + mark * trackRange - 0.5,
        }
        return (
          <div key={mark}>
            <div className="absolute" style={{ ...markStyle, right: 0 }} />
            <div className="absolute" style={{ ...markStyle, left: 0 }} />
          </div>
        )
      })}

      {/* Fader thumb — chrome-like */}
      <div
        className="absolute cursor-grab active:cursor-grabbing"
        style={{
          width: THUMB_WIDTH,
          height: THUMB_HEIGHT,
          left: 6,
          bottom: thumbBottom,
          borderRadius: 3,
          background: `
            linear-gradient(90deg,
              #686058 0%,
              #908880 8%,
              #b8b0a0 20%,
              #d0c8b8 35%,
              #dcd4c4 45%,
              #e0d8c8 50%,
              #dcd4c4 55%,
              #d0c8b8 65%,
              #b8b0a0 80%,
              #908880 92%,
              #686058 100%
            )
          `,
          boxShadow: `
            0 2px 4px rgba(20,15,5,0.6),
            0 4px 10px rgba(20,15,5,0.2),
            inset 0 1px 0 rgba(255,250,240,0.25),
            inset 0 -1px 0 rgba(20,15,5,0.15)
          `,
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Grip ridges */}
        <div className="absolute inset-x-1" style={{
          top: 4,
          height: THUMB_HEIGHT - 8,
          background: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(20,15,5,0.12) 2px,
              rgba(20,15,5,0.12) 3px
            )
          `,
        }} />
        {/* Track-colour inlay across the centre of the cap */}
        <div className="absolute left-0 right-0" style={{
          top: THUMB_HEIGHT / 2 - 2.5,
          height: 5,
          background: color ?? 'rgba(255,250,240,0.3)',
          boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.35), 0 1px 0 rgba(255,250,240,0.25)',
        }} />
      </div>
    </div>
  )
}
