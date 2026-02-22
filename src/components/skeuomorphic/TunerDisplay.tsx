import { useRef, useEffect } from 'react'
import { TunerState } from '../../hooks/useTuner'
import { Tuning, findClosestString } from '../../audio/tunings'

interface TunerDisplayProps {
  tuner: TunerState
  tuning: Tuning
  onCycleTuning: () => void
  onClose?: () => void
  width?: number
  height?: number
}

export default function TunerDisplay({ tuner, tuning, onCycleTuning, onClose, width = 120, height = 110 }: TunerDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const displayCentsRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const draw = () => {
      const targetCents = tuner.isDetecting ? tuner.smoothedCents : 0
      displayCentsRef.current = displayCentsRef.current * 0.8 + targetCents * 0.2

      ctx.clearRect(0, 0, width, height)

      // --- Background ---
      ctx.fillStyle = '#2a2218'
      ctx.beginPath()
      ctx.roundRect(0, 0, width, height, 4)
      ctx.fill()

      // Subtle warm glow
      const glow = ctx.createRadialGradient(width / 2, height * 0.4, 5, width / 2, height * 0.4, width * 0.5)
      glow.addColorStop(0, 'rgba(245, 166, 35, 0.08)')
      glow.addColorStop(1, 'rgba(245, 166, 35, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, width, height)

      const centerX = width / 2
      const isInTune = tuner.isDetecting && Math.abs(tuner.smoothedCents) <= 5
      const detecting = tuner.isDetecting
      const hasStrings = tuning.strings.length > 0

      // --- Target string indicator (non-chromatic tunings) ---
      const closestString = detecting && tuner.noteInfo && hasStrings
        ? findClosestString(tuner.noteInfo.note, tuner.rawFrequency ?? 0, tuning)
        : null

      // --- Note Name ---
      const noteName = detecting && tuner.noteInfo ? tuner.noteInfo.noteName : '--'
      const octave = detecting && tuner.noteInfo ? String(tuner.noteInfo.octave) : ''

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Note name — large
      const noteY = hasStrings ? height * 0.24 : height * 0.28
      ctx.font = 'bold 28px "Courier New", monospace'
      ctx.fillStyle = detecting
        ? (isInTune ? '#48bb78' : 'rgba(220, 210, 190, 0.9)')
        : 'rgba(220, 210, 190, 0.3)'
      ctx.fillText(noteName, centerX - 4, noteY)

      // Octave — smaller, offset right
      if (octave) {
        ctx.font = 'bold 28px "Courier New", monospace'
        const actualNoteWidth = ctx.measureText(noteName).width
        ctx.font = 'bold 14px "Courier New", monospace'
        ctx.fillStyle = 'rgba(220, 210, 190, 0.5)'
        ctx.textAlign = 'left'
        ctx.fillText(octave, centerX - 4 + actualNoteWidth / 2 + 2, noteY + 6)
        ctx.textAlign = 'center'
      }

      // --- Target string label (e.g. "→ E2" or "str 6") ---
      if (closestString && detecting) {
        const stringNum = tuning.strings.length - closestString.stringIndex // 6=low E, 1=high E
        ctx.font = '9px "Courier New", monospace'
        ctx.fillStyle = isInTune ? 'rgba(72, 187, 120, 0.7)' : 'rgba(220, 210, 190, 0.4)'
        ctx.fillText(`str ${stringNum} · ${closestString.stringNote}`, centerX, noteY + 18)
      }

      // --- In-tune glow ---
      if (isInTune && detecting) {
        const tuneGlow = ctx.createRadialGradient(centerX, noteY, 2, centerX, noteY, 30)
        tuneGlow.addColorStop(0, 'rgba(72, 187, 120, 0.15)')
        tuneGlow.addColorStop(1, 'rgba(72, 187, 120, 0)')
        ctx.fillStyle = tuneGlow
        ctx.fillRect(0, 0, width, height)
      }

      // --- Cents Meter Bar ---
      const meterY = hasStrings ? height * 0.6 : height * 0.55
      const meterWidth = width - 24
      const meterLeft = 12
      const meterHeight = 6

      // Track background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.beginPath()
      ctx.roundRect(meterLeft, meterY - meterHeight / 2, meterWidth, meterHeight, 3)
      ctx.fill()

      // Center tick mark
      ctx.fillStyle = 'rgba(220, 210, 190, 0.4)'
      ctx.fillRect(centerX - 0.5, meterY - meterHeight / 2 - 2, 1, meterHeight + 4)

      // Quarter tick marks
      for (const frac of [0.25, 0.75]) {
        const x = meterLeft + frac * meterWidth
        ctx.fillStyle = 'rgba(220, 210, 190, 0.15)'
        ctx.fillRect(x - 0.5, meterY - meterHeight / 2 - 1, 1, meterHeight + 2)
      }

      // Indicator dot
      if (detecting) {
        const centsNorm = displayCentsRef.current / 50
        const clampedNorm = Math.max(-1, Math.min(1, centsNorm))
        const indicatorX = centerX + clampedNorm * (meterWidth / 2 - 4)

        const absCents = Math.abs(displayCentsRef.current)
        let dotColor: string
        if (absCents <= 5) {
          dotColor = '#48bb78'
        } else if (absCents <= 20) {
          dotColor = '#f5a623'
        } else {
          dotColor = '#e53e3e'
        }

        // Dot glow
        const dotGlow = ctx.createRadialGradient(indicatorX, meterY, 0, indicatorX, meterY, 8)
        dotGlow.addColorStop(0, dotColor + '4d')
        dotGlow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = dotGlow
        ctx.fillRect(indicatorX - 8, meterY - 8, 16, 16)

        // Dot
        ctx.beginPath()
        ctx.arc(indicatorX, meterY, 3, 0, Math.PI * 2)
        ctx.fillStyle = dotColor
        ctx.fill()
      }

      // --- Flat/Sharp labels ---
      ctx.font = '8px "Helvetica Neue", sans-serif'
      ctx.fillStyle = 'rgba(220, 210, 190, 0.3)'
      ctx.textAlign = 'left'
      ctx.fillText('\u266D', meterLeft, meterY + meterHeight / 2 + 10)
      ctx.textAlign = 'right'
      ctx.fillText('\u266F', meterLeft + meterWidth, meterY + meterHeight / 2 + 10)

      // --- Frequency readout ---
      ctx.textAlign = 'center'
      ctx.font = '9px "Courier New", monospace'
      ctx.fillStyle = detecting
        ? 'rgba(220, 210, 190, 0.5)'
        : 'rgba(220, 210, 190, 0.15)'

      const freqText = detecting && tuner.rawFrequency
        ? `${tuner.rawFrequency.toFixed(1)} Hz`
        : '--- Hz'
      ctx.fillText(freqText, centerX, height * 0.82)

      // --- Cents readout ---
      ctx.font = '8px "Courier New", monospace'
      ctx.fillStyle = detecting
        ? 'rgba(220, 210, 190, 0.4)'
        : 'rgba(220, 210, 190, 0.1)'

      const centsText = detecting && tuner.noteInfo
        ? `${tuner.smoothedCents > 0 ? '+' : ''}${tuner.smoothedCents}\u00A2`
        : ''
      ctx.fillText(centsText, centerX, height * 0.93)

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [tuner, tuning, width, height])

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="rounded shadow-vu-recess p-0.5">
        <canvas
          ref={canvasRef}
          style={{ width, height }}
          className="rounded"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onCycleTuning}
          className="text-[9px] font-label uppercase tracking-wider text-engraved font-bold hover:text-hw-600 transition-colors cursor-pointer no-select"
          title={`Tuning: ${tuning.name} — click to change`}
        >
          Tuner · {tuning.shortName}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="text-engraved hover:text-hw-600 transition-colors cursor-pointer no-select"
            title="Hide tuner"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1l6 6M7 1l-6 6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
