import { useEffect, useMemo, useRef } from 'react'

interface TrackWaveformProps {
  buffer: AudioBuffer | null
  currentTime: number
  duration: number
  muted: boolean
  armed: boolean
  recording: boolean
  recordingPreview: { min: number; max: number }[]
}

const WIDTH = 72
const HEIGHT = 38
const BINS = 72
const LIVE_PREVIEW_BINS = 800

function getPeaks(buffer: AudioBuffer | null): number[] {
  if (!buffer) return []

  const data = buffer.getChannelData(0)
  const samplesPerBin = Math.max(1, Math.floor(data.length / BINS))

  return Array.from({ length: BINS }, (_, bin) => {
    const start = bin * samplesPerBin
    const end = Math.min(data.length, start + samplesPerBin)
    let peak = 0
    for (let i = start; i < end; i += 1) peak = Math.max(peak, Math.abs(data[i]))
    return peak
  })
}

export default function TrackWaveform({
  buffer,
  currentTime,
  duration,
  muted,
  armed,
  recording,
  recordingPreview,
}: TrackWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const peaks = useMemo(() => getPeaks(buffer), [buffer])
  const livePeaks = useMemo(() => {
    if (!recordingPreview.length) return []
    const binsPerPixel = Math.ceil(LIVE_PREVIEW_BINS / BINS)
    return Array.from({ length: Math.min(BINS, Math.ceil(recordingPreview.length / binsPerPixel)) }, (_, index) => {
      const start = index * binsPerPixel
      const end = Math.min(recordingPreview.length, start + binsPerPixel)
      let peak = 0
      for (let i = start; i < end; i += 1) {
        peak = Math.max(peak, Math.abs(recordingPreview[i].min), Math.abs(recordingPreview[i].max))
      }
      return peak
    })
  }, [recordingPreview])
  const isClipping = recording && livePeaks.some(peak => peak >= 0.98)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = WIDTH * dpr
    canvas.height = HEIGHT * dpr
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, WIDTH, HEIGHT)

    const background = context.createLinearGradient(0, 0, 0, HEIGHT)
    background.addColorStop(0, '#191c1d')
    background.addColorStop(0.55, '#252524')
    background.addColorStop(1, '#121414')
    context.fillStyle = background
    context.fillRect(0, 0, WIDTH, HEIGHT)

    context.strokeStyle = 'rgba(221, 204, 160, 0.08)'
    context.lineWidth = 1
    for (let x = 8.5; x < WIDTH; x += 9) {
      context.beginPath()
      context.moveTo(x, 0)
      context.lineTo(x, HEIGHT)
      context.stroke()
    }

    context.strokeStyle = 'rgba(221, 204, 160, 0.14)'
    context.beginPath()
    context.moveTo(0, HEIGHT / 2 + 0.5)
    context.lineTo(WIDTH, HEIGHT / 2 + 0.5)
    context.stroke()

    if (recording && livePeaks.length > 0) {
      livePeaks.forEach((peak, index) => {
        const x = index + 0.5
        const height = Math.max(1, peak * (HEIGHT - 7))
        context.strokeStyle = peak >= 0.98
          ? 'rgba(255, 196, 112, 0.98)'
          : 'rgba(224, 69, 60, 0.92)'
        context.beginPath()
        context.moveTo(x, (HEIGHT - height) / 2)
        context.lineTo(x, (HEIGHT + height) / 2)
        context.stroke()
      })

      const headX = Math.min(WIDTH - 1, (livePeaks.length / BINS) * WIDTH)
      context.strokeStyle = 'rgba(255, 229, 182, 0.92)'
      context.beginPath()
      context.moveTo(headX, 2)
      context.lineTo(headX, HEIGHT - 2)
      context.stroke()
    } else if (peaks.length > 0 && !recording) {
      const progress = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0
      peaks.forEach((peak, index) => {
        const x = index + 0.5
        const height = Math.max(1, peak * (HEIGHT - 8))
        const played = index / peaks.length <= progress
        context.strokeStyle = muted
          ? 'rgba(148, 136, 112, 0.38)'
          : played
            ? 'rgba(245, 166, 35, 0.92)'
            : 'rgba(112, 164, 184, 0.68)'
        context.beginPath()
        context.moveTo(x, (HEIGHT - height) / 2)
        context.lineTo(x, (HEIGHT + height) / 2)
        context.stroke()
      })

      if (progress > 0 && progress < 1) {
        const x = progress * WIDTH
        context.strokeStyle = 'rgba(255, 232, 174, 0.9)'
        context.beginPath()
        context.moveTo(x, 2)
        context.lineTo(x, HEIGHT - 2)
        context.stroke()
      }
    } else {
      context.fillStyle = recording
        ? 'rgba(255, 110, 100, 0.9)'
        : armed
          ? 'rgba(214, 88, 76, 0.62)'
          : 'rgba(196, 184, 154, 0.32)'
      context.font = 'bold 7px Helvetica Neue, sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(recording ? 'RECORDING' : armed ? 'READY' : 'EMPTY', WIDTH / 2, HEIGHT / 2)
    }

    const gloss = context.createLinearGradient(0, 0, 0, HEIGHT)
    gloss.addColorStop(0, 'rgba(255,255,255,0.09)')
    gloss.addColorStop(0.42, 'rgba(255,255,255,0)')
    context.fillStyle = gloss
    context.fillRect(0, 0, WIDTH, HEIGHT)
  }, [armed, currentTime, duration, livePeaks, muted, peaks, recording])

  const state = recording
    ? isClipping ? 'Recording now, input clipping' : 'Recording now'
    : buffer
      ? `${muted ? 'Muted recording' : 'Recorded audio'}, ${Math.round(duration)} seconds`
      : armed
        ? 'Armed and ready to record'
        : 'Empty track'

  return (
    <div
      className={`track-waveform rounded-sm overflow-hidden ${isClipping ? 'is-clipping' : ''}`}
      aria-label={state}
      role="img"
    >
      <canvas ref={canvasRef} style={{ width: WIDTH, height: HEIGHT }} />
    </div>
  )
}
