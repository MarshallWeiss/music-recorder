interface StatusLEDProps {
  active: boolean
  color: 'red' | 'green' | 'amber'
  pulse?: boolean
  size?: 'sm' | 'md'
}

const COLOR_MAP = {
  red:   { on: 'bg-red-500',    shadow: 'shadow-led-red' },
  green: { on: 'bg-green-500',  shadow: 'shadow-led-green' },
  amber: { on: 'bg-vu-amber',   shadow: 'shadow-led-amber' },
}

export default function StatusLED({ active, color, pulse, size = 'sm' }: StatusLEDProps) {
  const c = COLOR_MAP[color]
  const dim = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'

  return (
    <div
      className={`${dim} rounded-full transition-all duration-150 ${
        active
          ? `${c.on} ${c.shadow} ${pulse ? 'animate-led-pulse' : ''}`
          : 'bg-gray-700 shadow-inset-groove'
      }`}
    />
  )
}
