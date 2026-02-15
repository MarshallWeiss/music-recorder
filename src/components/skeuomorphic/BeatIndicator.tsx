import StatusLED from './StatusLED'

interface BeatIndicatorProps {
  currentBeat: number   // -1 = off, 0-3 = active beat
  metronomeOn: boolean
}

export default function BeatIndicator({ currentBeat, metronomeOn }: BeatIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 4 }, (_, i) => (
        <StatusLED
          key={i}
          active={metronomeOn && currentBeat === i}
          color={i === 0 ? 'amber' : 'green'}
          size="sm"
        />
      ))}
    </div>
  )
}
