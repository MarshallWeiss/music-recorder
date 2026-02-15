interface WoodPanelProps {
  side: 'left' | 'right'
}

export default function WoodPanel({ side }: WoodPanelProps) {
  return (
    <div
      className={`texture-wood flex-shrink-0 ${
        side === 'left' ? 'rounded-l-lg' : 'rounded-r-lg'
      }`}
      style={{
        width: 40,
        boxShadow: side === 'left'
          ? 'inset -2px 0 4px rgba(0,0,0,0.3)'
          : 'inset 2px 0 4px rgba(0,0,0,0.3)',
      }}
    />
  )
}
