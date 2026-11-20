import { useEffect, useMemo, useRef } from 'react'
import SevenSegment from './SevenSegment'

export interface TapeLane {
  id: number
  name: string
  color: string
  buffer: AudioBuffer | null
  muted: boolean
  armed: boolean
  recording: boolean
}

interface TapeViewProps {
  currentTime: number
  loopDuration: number
  isRecording?: boolean
  onSeekTo?: (time: number) => void
  /** Track lanes. Omit (looper mode) to show a plain position rail instead. */
  lanes?: TapeLane[]
  recordingPreview?: { min: number; max: number }[]
}

const LANES_WIDTH = 296
const LANE_HEIGHT = 19
const LANE_GAP = 3
const LIVE_PREVIEW_BINS = 800 // the engine's live preview always spans 800 bins

function formatTime(time: number) {
  const safeTime = Number.isFinite(time) ? Math.max(0, time) : 0
  const minutes = Math.floor(safeTime / 60)
  const seconds = Math.floor(safeTime % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function getPeaks(buffer: AudioBuffer | null, bins: number): number[] {
  if (!buffer) return []
  const data = buffer.getChannelData(0)
  const samplesPerBin = Math.max(1, Math.floor(data.length / bins))
  return Array.from({ length: bins }, (_, bin) => {
    const start = bin * samplesPerBin
    const end = Math.min(data.length, start + samplesPerBin)
    let peak = 0
    for (let i = start; i < end; i += 1) peak = Math.max(peak, Math.abs(data[i]))
    return peak
  })
}

function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

export default function TapeView({
  currentTime,
  loopDuration,
  isRecording = false,
  onSeekTo,
  lanes,
  recordingPreview = [],
}: TapeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hasTape = loopDuration > 0
  const clampedTime = hasTape ? Math.min(currentTime, loopDuration) : 0
  // A first take has no tape length yet: let the counter run, keep the playhead parked
  const counterTime = hasTape ? clampedTime : isRecording ? currentTime : 0
  const progress = hasTape ? clampedTime / loopDuration : 0

  const buffers = lanes?.map(lane => lane.buffer) ?? []
  const peaks = useMemo(
    () => buffers.map(buffer => getPeaks(buffer, LANES_WIDTH)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buffers[0], buffers[1], buffers[2], buffers[3]],
  )

  const livePeaks = useMemo(() => {
    if (!recordingPreview.length) return []
    const binsPerPixel = LIVE_PREVIEW_BINS / LANES_WIDTH
    const count = Math.min(LANES_WIDTH, Math.ceil(recordingPreview.length / binsPerPixel))
    return Array.from({ length: count }, (_, index) => {
      const start = Math.floor(index * binsPerPixel)
      const end = Math.min(recordingPreview.length, Math.max(start + 1, Math.floor((index + 1) * binsPerPixel)))
      let peak = 0
      for (let i = start; i < end; i += 1) {
        peak = Math.max(peak, Math.abs(recordingPreview[i].min), Math.abs(recordingPreview[i].max))
      }
      return peak
    })
  }, [recordingPreview])

  const laneCount = lanes?.length ?? 0
  const height = laneCount * LANE_HEIGHT + Math.max(0, laneCount - 1) * LANE_GAP

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !lanes) return

    const dpr = Math.min(3, (window.devicePixelRatio || 1) * 1.5) // oversampled: the device is CSS-zoomed
    canvas.width = LANES_WIDTH * dpr
    canvas.height = height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, LANES_WIDTH, height)

    let liveHeadX: number | null = null

    lanes.forEach((lane, index) => {
      const top = index * (LANE_HEIGHT + LANE_GAP)
      const mid = top + LANE_HEIGHT / 2

      // Lane bed
      ctx.fillStyle = lane.recording ? 'rgba(224, 69, 60, 0.13)' : 'rgba(255, 248, 224, 0.035)'
      ctx.fillRect(0, top, LANES_WIDTH, LANE_HEIGHT)
      // Track colour key at the lane's left edge
      ctx.fillStyle = withAlpha(lane.color, lane.muted ? 0.3 : 0.95)
      ctx.fillRect(0, top, 2, LANE_HEIGHT)

      const lanePeaks = peaks[index] ?? []
      if (lane.recording && livePeaks.length > 0) {
        livePeaks.forEach((peak, x) => {
          const h = Math.max(1, peak * (LANE_HEIGHT - 3))
          ctx.fillStyle = peak >= 0.98 ? 'rgba(255, 214, 120, 1)' : 'rgba(236, 82, 70, 0.95)'
          ctx.fillRect(x + 3, mid - h / 2, 1, h)
        })
        liveHeadX = Math.min(LANES_WIDTH - 1, livePeaks.length + 3)
      } else if (lanePeaks.length > 0 && !lane.recording) {
        lanePeaks.forEach((peak, x) => {
          const h = Math.max(1, peak * (LANE_HEIGHT - 3))
          const played = x / lanePeaks.length <= progress
          ctx.fillStyle = lane.muted
            ? 'rgba(160, 150, 128, 0.32)'
            : withAlpha(lane.color, played ? 1 : 0.5)
          ctx.fillRect(x, mid - h / 2, 1, h)
        })
      } else {
        // Empty lane: a dashed baseline and its state
        ctx.strokeStyle = 'rgba(221, 204, 160, 0.16)'
        ctx.setLineDash([2, 4])
        ctx.beginPath()
        ctx.moveTo(8, mid + 0.5)
        ctx.lineTo(LANES_WIDTH, mid + 0.5)
        ctx.stroke()
        ctx.setLineDash([])
        const label = lane.recording ? 'RECORDING' : lane.armed ? 'READY' : ''
        if (label) {
          ctx.font = '600 10px "Barlow Condensed", "Helvetica Neue", sans-serif'
          ctx.textBaseline = 'middle'
          const w = ctx.measureText(label).width
          ctx.fillStyle = '#141615'
          ctx.fillRect(8, top + 2, w + 10, LANE_HEIGHT - 4)
          ctx.fillStyle = lane.recording ? 'rgba(255, 120, 108, 0.95)' : 'rgba(236, 110, 96, 0.8)'
          ctx.fillText(label, 13, mid + 0.5)
        }
      }
    })

    // One playhead across every lane
    const headX = liveHeadX ?? (hasTape ? progress * LANES_WIDTH : null)
    if (headX !== null) {
      const x = Math.max(0.5, Math.min(LANES_WIDTH - 0.5, headX))
      ctx.fillStyle = 'rgba(255, 236, 190, 0.18)'
      ctx.fillRect(x - 2, 0, 4, height)
      ctx.fillStyle = 'rgba(255, 236, 190, 0.96)'
      ctx.fillRect(x - 0.5, 0, 1, height)
    }
  }, [lanes, peaks, livePeaks, progress, hasTape, height])

  const seekInput = (
    <input
      className={lanes ? 'tape-lanes-seek' : 'tape-position-range'}
      type="range"
      min={0}
      max={loopDuration || 1}
      step={0.01}
      value={clampedTime}
      disabled={!hasTape || !onSeekTo}
      onChange={(event) => onSeekTo?.(Number(event.target.value))}
      aria-label="Tape position"
      aria-valuetext={`${formatTime(clampedTime)} of ${formatTime(loopDuration)}`}
      style={{ '--tape-progress': `${progress * 100}%` } as React.CSSProperties}
    />
  )

  return (
    <div className="tape-position-panel" aria-label="Tape position">
      <div className="tape-counter-readout" aria-live="off">
        <span className="tape-counter-label">COUNTER</span>
        <span className="tape-counter-time" aria-label={formatTime(counterTime)}>
          <SevenSegment value={formatTime(counterTime)} height={22} />
        </span>
      </div>

      <div className="tape-path-control">
        <div className="tape-path-labels" aria-hidden="true">
          <span>000</span>
          <span>{lanes ? 'TAPE' : 'POSITION'}</span>
          <span>{hasTape ? formatTime(loopDuration) : '--:--'}</span>
        </div>
        {lanes ? (
          <div className="tape-lanes" style={{ height: height + 10 }}>
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={lanes.map(lane => `${lane.name}: ${lane.recording ? 'recording' : lane.buffer ? (lane.muted ? 'muted' : 'recorded') : lane.armed ? 'armed' : 'empty'}`).join(', ')}
              style={{ width: '100%', height }}
            />
            {seekInput}
          </div>
        ) : (
          <div className="tape-path-rail">
            <span className="tape-path-reel tape-path-reel--left" aria-hidden="true" />
            {seekInput}
            <span className="tape-path-reel tape-path-reel--right" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  )
}
