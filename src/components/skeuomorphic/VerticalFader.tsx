import { useRef, useCallback } from 'react'

interface VerticalFaderProps {
  value: number    // 0-1 (bottom to top)
  onChange: (value: number) => void
  height?: number  // total fader height in px
}

const THUMB_HEIGHT = 24
const THUMB_WIDTH = 28
const SLOT_WIDTH = 6

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
      style={{ width: THUMB_WIDTH + 8, height }}
      onClick={handleSlotClick}
    >
      {/* Fader slot groove */}
      <div
        className="absolute fader-slot shadow-fader-slot rounded-sm"
        style={{
          width: SLOT_WIDTH,
          height: height - 8,
          top: 4,
          left: (THUMB_WIDTH + 8 - SLOT_WIDTH) / 2,
        }}
      />

      {/* Scale marks along the slot */}
      {[0, 0.25, 0.5, 0.75, 1].map((mark) => (
        <div
          key={mark}
          className="absolute"
          style={{
            width: 6,
            height: 1,
            background: 'rgba(0,0,0,0.25)',
            right: 0,
            bottom: 4 + THUMB_HEIGHT / 2 + mark * trackRange - 0.5,
          }}
        />
      ))}

      {/* Fader thumb */}
      <div
        className="absolute fader-thumb-texture shadow-fader-thumb rounded-sm cursor-grab active:cursor-grabbing"
        style={{
          width: THUMB_WIDTH,
          height: THUMB_HEIGHT,
          left: 4,
          bottom: thumbBottom,
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}
