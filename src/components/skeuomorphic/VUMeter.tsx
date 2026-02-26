import { useRef, useEffect } from 'react'

interface VUMeterProps {
  analyser: AnalyserNode | null
  label?: string
  width?: number
  height?: number
}

// Needle sweep: -40deg (left, silence) to +40deg (right, peak)
const MIN_ANGLE = -40
const MAX_ANGLE = 40

export default function VUMeter({ analyser, label = 'VU', width = 140, height = 90 }: VUMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const levelRef = useRef(0) // smoothed display level (0-1)
  const rafRef = useRef<number>(0)
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  // Keep analyser ref in sync — avoids restarting animation loop on prop change
  analyserRef.current = analyser

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // High DPI
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const draw = () => {
      // Read analyser data from ref (always current, no effect restart needed)
      const currentAnalyser = analyserRef.current
      let targetLevel = 0
      if (currentAnalyser) {
        if (!dataRef.current || dataRef.current.length !== currentAnalyser.frequencyBinCount) {
          dataRef.current = new Uint8Array(currentAnalyser.frequencyBinCount)
        }
        currentAnalyser.getByteTimeDomainData(dataRef.current)
        // Compute RMS
        let sum = 0
        for (let i = 0; i < dataRef.current.length; i++) {
          const v = (dataRef.current[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / dataRef.current.length)
        targetLevel = Math.min(1, rms * 3) // scale up for visual
      }

      // Smooth with exponential decay
      levelRef.current = levelRef.current * 0.85 + targetLevel * 0.15

      // Clear
      ctx.clearRect(0, 0, width, height)

      // Meter face background — warm cream/ivory like a real VU face
      const faceBg = ctx.createRadialGradient(width / 2, height * 0.5, 10, width / 2, height * 0.5, width * 0.65)
      faceBg.addColorStop(0, '#f4ead4')
      faceBg.addColorStop(0.6, '#e8dcc4')
      faceBg.addColorStop(1, '#d8ccb4')
      ctx.fillStyle = faceBg
      ctx.beginPath()
      ctx.roundRect(0, 0, width, height, 6)
      ctx.fill()

      // Vignette — darker edges
      const vignette = ctx.createRadialGradient(width / 2, height * 0.5, width * 0.25, width / 2, height * 0.5, width * 0.65)
      vignette.addColorStop(0, 'rgba(0,0,0,0)')
      vignette.addColorStop(1, 'rgba(20,15,5,0.12)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, width, height)

      // Glass highlight — top dome reflection
      const glass = ctx.createRadialGradient(width * 0.3, height * 0.12, 2, width * 0.35, height * 0.2, width * 0.45)
      glass.addColorStop(0, 'rgba(255, 255, 255, 0.15)')
      glass.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = glass
      ctx.fillRect(0, 0, width, height)

      // Scale arc
      const pivotX = width / 2
      const pivotY = height * 0.85
      const arcRadius = height * 0.55

      // Scale marks: labeled marks (with numbers) and minor ticks (no number)
      const scaleMarks: { db: number; label?: string }[] = [
        { db: -20, label: '20' },
        { db: -10, label: '10' },
        { db: -7 },
        { db: -5,  label: '5' },
        { db: -3,  label: '3' },
        { db: 0,   label: '0' },
        { db: 1 },
        { db: 2 },
        { db: 3,   label: '+3' },
      ]

      ctx.font = '7px Helvetica Neue, sans-serif'
      ctx.textAlign = 'center'

      // Helper: map dB to normalized 0-1 position on the arc
      const dbToNorm = (db: number) =>
        db <= 0
          ? (db + 20) / 20 * 0.7
          : 0.7 + (db / 3) * 0.3

      for (const mark of scaleMarks) {
        const normalized = dbToNorm(mark.db)
        const angle = MIN_ANGLE + normalized * (MAX_ANGLE - MIN_ANGLE)
        const rad = (angle - 90) * Math.PI / 180

        // Tick
        const isRedZone = mark.db >= 0
        const tickLen = mark.label ? 7 : 4
        const outerR = arcRadius
        const innerR = outerR - tickLen
        ctx.beginPath()
        ctx.moveTo(pivotX + innerR * Math.cos(rad), pivotY + innerR * Math.sin(rad))
        ctx.lineTo(pivotX + outerR * Math.cos(rad), pivotY + outerR * Math.sin(rad))
        ctx.strokeStyle = isRedZone ? '#c82020' : '#2a2218'
        ctx.lineWidth = mark.db === 0 ? 1.5 : 1
        ctx.stroke()

        // Number (only for labeled marks)
        if (mark.label) {
          const labelR = arcRadius - 14
          ctx.fillStyle = isRedZone ? '#c82020' : '#2a2218'
          ctx.fillText(mark.label, pivotX + labelR * Math.cos(rad), pivotY + labelR * Math.sin(rad) + 2)
        }
      }

      // Draw the continuous arc between -20 and +3 in two segments
      const arcStart = (MIN_ANGLE + dbToNorm(-20) * (MAX_ANGLE - MIN_ANGLE) - 90) * Math.PI / 180
      const arcZero = (MIN_ANGLE + dbToNorm(0) * (MAX_ANGLE - MIN_ANGLE) - 90) * Math.PI / 180
      const arcEnd = (MIN_ANGLE + dbToNorm(3) * (MAX_ANGLE - MIN_ANGLE) - 90) * Math.PI / 180

      ctx.beginPath()
      ctx.arc(pivotX, pivotY, arcRadius, arcStart, arcZero)
      ctx.strokeStyle = 'rgba(30,25,15,0.25)'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(pivotX, pivotY, arcRadius, arcZero, arcEnd)
      ctx.strokeStyle = 'rgba(200,32,32,0.4)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Needle — tapered, black
      const needleAngle = MIN_ANGLE + levelRef.current * (MAX_ANGLE - MIN_ANGLE)
      const needleRad = (needleAngle - 90) * Math.PI / 180
      const needleLen = arcRadius + 6

      // Draw tapered needle (thick at pivot, thin at tip)
      const tipX = pivotX + needleLen * Math.cos(needleRad)
      const tipY = pivotY + needleLen * Math.sin(needleRad)
      const perpX = Math.sin(needleRad)
      const perpY = -Math.cos(needleRad)
      const baseWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(pivotX + perpX * baseWidth, pivotY + perpY * baseWidth)
      ctx.lineTo(tipX, tipY)
      ctx.lineTo(pivotX - perpX * baseWidth, pivotY - perpY * baseWidth)
      ctx.closePath()
      ctx.fillStyle = '#1a1610'
      ctx.fill()

      // Needle pivot screw
      const pivotGrad = ctx.createRadialGradient(pivotX - 1, pivotY - 1, 0, pivotX, pivotY, 4)
      pivotGrad.addColorStop(0, '#4a4440')
      pivotGrad.addColorStop(0.5, '#2a2622')
      pivotGrad.addColorStop(1, '#1a1610')
      ctx.beginPath()
      ctx.arc(pivotX, pivotY, 4, 0, Math.PI * 2)
      ctx.fillStyle = pivotGrad
      ctx.fill()

      // VU label
      ctx.font = 'bold 11px Helvetica Neue, sans-serif'
      ctx.fillStyle = '#2a2218'
      ctx.textAlign = 'center'
      ctx.fillText('VU', width / 2, height * 0.52)

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [width, height])

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="rounded-lg p-1" style={{
        background: 'linear-gradient(180deg, #2a2218 0%, #3a3020 100%)',
        boxShadow: `
          inset 0 3px 10px rgba(0,0,0,0.6),
          inset 0 1px 3px rgba(0,0,0,0.4),
          inset 0 -1px 2px rgba(255,250,240,0.06),
          0 1px 0 rgba(255,250,240,0.08)
        `,
      }}>
        <canvas
          ref={canvasRef}
          style={{ width, height }}
          className="rounded"
        />
      </div>
      <span className="text-[9px] font-label uppercase tracking-wider text-engraved font-bold">
        {label}
      </span>
    </div>
  )
}
