interface WoodPanelProps {
  side: 'left' | 'right'
}

export default function WoodPanel({ side }: WoodPanelProps) {
  return (
    <div
      className={`texture-wood flex-shrink-0 ${
        side === 'left' ? 'rounded-l-xl' : 'rounded-r-xl'
      }`}
      style={{
        width: 56,
        boxShadow: side === 'left'
          ? `
            inset -4px 0 12px rgba(20,15,5,0.45),
            inset -1px 0 3px rgba(20,15,5,0.3),
            inset 2px 0 6px rgba(255,250,240,0.04)
          `
          : `
            inset 4px 0 12px rgba(20,15,5,0.45),
            inset 1px 0 3px rgba(20,15,5,0.3),
            inset -2px 0 6px rgba(255,250,240,0.04)
          `,
      }}
    />
  )
}
