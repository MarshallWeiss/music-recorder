interface TapeCounterProps {
  currentTime: number
  loopDuration: number
  onSeekTo?: (time: number) => void
}

function formatTime(time: number) {
  const safeTime = Number.isFinite(time) ? Math.max(0, time) : 0
  const minutes = Math.floor(safeTime / 60)
  const seconds = Math.floor(safeTime % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export default function TapeCounter({ currentTime, loopDuration, onSeekTo }: TapeCounterProps) {
  const hasTape = loopDuration > 0
  const clampedTime = hasTape ? Math.min(currentTime, loopDuration) : 0
  const progress = hasTape ? (clampedTime / loopDuration) * 100 : 0

  return (
    <div className="tape-position-panel" aria-label="Tape position">
      <div className="tape-counter-readout" aria-live="off">
        <span className="tape-counter-label">COUNTER</span>
        <span className="tape-counter-time">{formatTime(clampedTime)}</span>
      </div>

      <div className="tape-path-control">
        <div className="tape-path-labels" aria-hidden="true">
          <span>000</span>
          <span>POSITION</span>
          <span>{formatTime(loopDuration)}</span>
        </div>
        <div className="tape-path-rail">
          <span className="tape-path-reel tape-path-reel--left" aria-hidden="true" />
          <input
            className="tape-position-range"
            type="range"
            min={0}
            max={loopDuration || 1}
            step={0.01}
            value={clampedTime}
            disabled={!hasTape || !onSeekTo}
            onChange={(event) => onSeekTo?.(Number(event.target.value))}
            aria-label="Tape position"
            aria-valuetext={`${formatTime(clampedTime)} of ${formatTime(loopDuration)}`}
            style={{ '--tape-progress': `${progress}%` } as React.CSSProperties}
          />
          <span className="tape-path-reel tape-path-reel--right" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
