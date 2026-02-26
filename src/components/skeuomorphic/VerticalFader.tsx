import { useRef, useCallback } from 'react'

interface VerticalFaderProps {
  value: number    // 0-1 (bottom to top)
  onChange: (value: number) => void
  height?: number  // total fader height in px
}

const THUMB_HEIGHT = 28
const THUMB_WIDTH = 32
const SLOT_WIDTH = 8

export default function VerticalFader({ value, onChange, height = 140 }: VerticalFaderProps) {
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

      {/* Scale marks — both sides */}
      {[0, 0.25, 0.5, 0.75, 1].map((mark) => (
        <div key={mark}>
          {/* Right marks */}
          <div
            className="absolute"
            style={{
              width: mark === 0.75 ? 10 : 6,
              height: 1,
              background: mark === 0.75 ? 'rgba(20,15,5,0.5)' : 'rgba(20,15,5,0.3)',
              boxShadow: '0 1px 0 rgba(255,250,240,0.15)',
              right: 0,
              bottom: 4 + THUMB_HEIGHT / 2 + mark * trackRange - 0.5,
            }}
          />
          {/* Left marks */}
          <div
            className="absolute"
            style={{
              width: mark === 0.75 ? 10 : 6,
              height: 1,
              background: mark === 0.75 ? 'rgba(20,15,5,0.5)' : 'rgba(20,15,5,0.3)',
              boxShadow: '0 1px 0 rgba(255,250,240,0.15)',
              left: 0,
              bottom: 4 + THUMB_HEIGHT / 2 + mark * trackRange - 0.5,
            }}
          />
        </div>
      ))}

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
          top: 5,
          height: THUMB_HEIGHT - 10,
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
        {/* Center indicator line */}
        <div className="absolute left-1 right-1" style={{
          top: THUMB_HEIGHT / 2 - 0.5,
          height: 1,
          background: 'rgba(255,250,240,0.3)',
          boxShadow: '0 1px 0 rgba(20,15,5,0.2)',
        }} />
      </div>
    </div>
  )
}
