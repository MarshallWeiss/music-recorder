import { useRef, useEffect } from 'react'
import { TunerState } from '../../hooks/useTuner'
import { Tuning, findClosestString } from '../../audio/tunings'

interface TunerDisplayProps {
  tuner: TunerState
  tuning: Tuning
  onTuningClick: () => void
  width?: number
  height?: number
}

// LED count and arc geometry
const NUM_LEDS = 13
const ARC_START = Math.PI * 0.82  // arc start angle (left)
const ARC_END = Math.PI * 0.18    // arc end angle (right)

function ledColor(index: number, center: number): string {
  // Center LEDs green, middle orange, edges red
  const dist = Math.abs(index - center)
  if (dist <= 1) return '#48bb78' // green
  if (dist <= 3) return '#f5a623' // amber/orange
  return '#e53e3e'                // red
}

export default function TunerDisplay({ tuner, tuning, onTuningClick, width = 120, height = 110 }: TunerDisplayProps) {
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
      const detecting = tuner.isDetecting
      const isInTune = detecting && Math.abs(tuner.smoothedCents) <= 5
      const hasStrings = tuning.strings.length > 0

      // --- LED Sweep Arc ---
      const arcCenterX = centerX
      const arcCenterY = height * 0.48
      const arcRadius = width * 0.38
      const ledRadius = 3
      const centerLed = Math.floor(NUM_LEDS / 2)

      // Map cents to active LED position (0 = leftmost, NUM_LEDS-1 = rightmost)
      const cents = displayCentsRef.current
      const activeLedFloat = centerLed + (cents / 50) * centerLed
      const activeLed = Math.round(Math.max(0, Math.min(NUM_LEDS - 1, activeLedFloat)))

      for (let i = 0; i < NUM_LEDS; i++) {
        // Position along arc
        const t = i / (NUM_LEDS - 1)
        const angle = ARC_START + t * (ARC_END - ARC_START)
        const x = arcCenterX + Math.cos(angle) * arcRadius
        const y = arcCenterY - Math.sin(angle) * arcRadius

        const isActive = detecting && i === activeLed
        const color = ledColor(i, centerLed)

        if (isActive) {
          // LED glow
          const ledGlow = ctx.createRadialGradient(x, y, 0, x, y, ledRadius * 4)
          ledGlow.addColorStop(0, color + '66')
          ledGlow.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = ledGlow
          ctx.fillRect(x - ledRadius * 4, y - ledRadius * 4, ledRadius * 8, ledRadius * 8)

          // Bright LED
          ctx.beginPath()
          ctx.arc(x, y, ledRadius, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        } else {
          // Dim LED
          ctx.beginPath()
          ctx.arc(x, y, ledRadius - 0.5, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(60, 50, 40, 0.6)'
          ctx.fill()
          // Subtle ring
          ctx.beginPath()
          ctx.arc(x, y, ledRadius - 0.5, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(80, 70, 55, 0.4)'
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }

      // --- Flat/Sharp labels at arc edges ---
      ctx.font = '9px "Helvetica Neue", sans-serif'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(220, 210, 190, 0.3)'
      const leftAngle = ARC_START
      const rightAngle = ARC_END
      const labelOffset = arcRadius + 10
      ctx.textAlign = 'center'
      ctx.fillText('\u266D', arcCenterX + Math.cos(leftAngle) * labelOffset, arcCenterY - Math.sin(leftAngle) * labelOffset)
      ctx.fillText('\u266F', arcCenterX + Math.cos(rightAngle) * labelOffset, arcCenterY - Math.sin(rightAngle) * labelOffset)

      // --- Target string indicator (non-chromatic tunings) ---
      const closestString = detecting && tuner.noteInfo && hasStrings
        ? findClosestString(tuner.noteInfo.note, tuner.rawFrequency ?? 0, tuning)
        : null

      // --- Note Name ---
      const noteName = detecting && tuner.noteInfo ? tuner.noteInfo.noteName : '--'
      const octave = detecting && tuner.noteInfo ? String(tuner.noteInfo.octave) : ''

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const noteY = height * 0.7
      ctx.font = 'bold 22px "Courier New", monospace'
      ctx.fillStyle = detecting
        ? (isInTune ? '#48bb78' : 'rgba(220, 210, 190, 0.9)')
        : 'rgba(220, 210, 190, 0.3)'
      ctx.fillText(noteName, centerX - 4, noteY)

      // Octave — smaller, offset right
      if (octave) {
        ctx.font = 'bold 22px "Courier New", monospace'
        const actualNoteWidth = ctx.measureText(noteName).width
        ctx.font = 'bold 11px "Courier New", monospace'
        ctx.fillStyle = 'rgba(220, 210, 190, 0.5)'
        ctx.textAlign = 'left'
        ctx.fillText(octave, centerX - 4 + actualNoteWidth / 2 + 2, noteY + 4)
        ctx.textAlign = 'center'
      }

      // --- Target string label ---
      if (closestString && detecting) {
        const stringNum = tuning.strings.length - closestString.stringIndex
        ctx.font = '8px "Courier New", monospace'
        ctx.fillStyle = isInTune ? 'rgba(72, 187, 120, 0.7)' : 'rgba(220, 210, 190, 0.4)'
        ctx.fillText(`str ${stringNum} · ${closestString.stringNote}`, centerX, noteY + 14)
      }

      // --- In-tune glow ---
      if (isInTune && detecting) {
        const tuneGlow = ctx.createRadialGradient(centerX, noteY - 10, 2, centerX, noteY - 10, 35)
        tuneGlow.addColorStop(0, 'rgba(72, 187, 120, 0.12)')
        tuneGlow.addColorStop(1, 'rgba(72, 187, 120, 0)')
        ctx.fillStyle = tuneGlow
        ctx.fillRect(0, 0, width, height)
      }

      // --- Frequency + cents readout ---
      ctx.textAlign = 'center'
      ctx.font = '8px "Courier New", monospace'
      ctx.fillStyle = detecting
        ? 'rgba(220, 210, 190, 0.45)'
        : 'rgba(220, 210, 190, 0.12)'

      const freqText = detecting && tuner.rawFrequency
        ? `${tuner.rawFrequency.toFixed(1)} Hz`
        : '--- Hz'

      const centsText = detecting && tuner.noteInfo
        ? `  ${tuner.smoothedCents > 0 ? '+' : ''}${tuner.smoothedCents}\u00A2`
        : ''

      ctx.fillText(freqText + centsText, centerX, height * 0.93)

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
      <button
        onClick={onTuningClick}
        className="text-[9px] font-label uppercase tracking-wider text-engraved font-bold hover:text-hw-600 transition-colors cursor-pointer no-select flex items-center gap-0.5"
        title={`Tuning: ${tuning.name} — click to change`}
      >
        {tuning.shortName}
        <svg width="6" height="4" viewBox="0 0 6 4" fill="currentColor" className="opacity-50">
          <path d="M0 0l3 4 3-4z" />
        </svg>
      </button>
    </div>
  )
}
