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
      // Read analyser data
      let targetLevel = 0
      if (analyser) {
        if (!dataRef.current || dataRef.current.length !== analyser.frequencyBinCount) {
          dataRef.current = new Uint8Array(analyser.frequencyBinCount)
        }
        analyser.getByteTimeDomainData(dataRef.current)
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

      // Meter face background
      ctx.fillStyle = '#2a2218'
      ctx.beginPath()
      ctx.roundRect(0, 0, width, height, 4)
      ctx.fill()

      // Warm amber glow
      const glow = ctx.createRadialGradient(width / 2, height * 0.9, 10, width / 2, height * 0.9, width * 0.6)
      glow.addColorStop(0, 'rgba(245, 166, 35, 0.15)')
      glow.addColorStop(1, 'rgba(245, 166, 35, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, width, height)

      // Scale arc
      const pivotX = width / 2
      const pivotY = height * 0.85
      const arcRadius = height * 0.55

      // Draw scale marks and numbers
      const scaleMarks = [
        { db: -20, label: '20' },
        { db: -10, label: '10' },
        { db: -7,  label: '7' },
        { db: -5,  label: '5' },
        { db: -3,  label: '3' },
        { db: -1,  label: '1' },
        { db: 0,   label: '0' },
        { db: 1,   label: '+1' },
        { db: 2,   label: '+2' },
        { db: 3,   label: '+3' },
      ]

      ctx.font = '7px Helvetica Neue, sans-serif'
      ctx.textAlign = 'center'

      for (const mark of scaleMarks) {
        // Map dB to 0-1 range (nonlinear: -20=0, 0=0.7, +3=1)
        const normalized = mark.db <= 0
          ? (mark.db + 20) / 20 * 0.7
          : 0.7 + (mark.db / 3) * 0.3
        const angle = MIN_ANGLE + normalized * (MAX_ANGLE - MIN_ANGLE)
        const rad = (angle - 90) * Math.PI / 180

        // Tick
        const innerR = arcRadius - 6
        const outerR = arcRadius
        ctx.beginPath()
        ctx.moveTo(pivotX + innerR * Math.cos(rad), pivotY + innerR * Math.sin(rad))
        ctx.lineTo(pivotX + outerR * Math.cos(rad), pivotY + outerR * Math.sin(rad))
        ctx.strokeStyle = mark.db >= 0 ? '#e53e3e' : 'rgba(220,210,190,0.7)'
        ctx.lineWidth = mark.db === 0 ? 1.5 : 1
        ctx.stroke()

        // Number
        const labelR = arcRadius - 14
        ctx.fillStyle = mark.db >= 0 ? '#e53e3e' : 'rgba(220,210,190,0.6)'
        ctx.fillText(mark.label, pivotX + labelR * Math.cos(rad), pivotY + labelR * Math.sin(rad) + 2)
      }

      // Needle
      const needleAngle = MIN_ANGLE + levelRef.current * (MAX_ANGLE - MIN_ANGLE)
      const needleRad = (needleAngle - 90) * Math.PI / 180
      const needleLen = arcRadius + 4

      ctx.beginPath()
      ctx.moveTo(pivotX, pivotY)
      ctx.lineTo(pivotX + needleLen * Math.cos(needleRad), pivotY + needleLen * Math.sin(needleRad))
      ctx.strokeStyle = '#1a1610'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Needle pivot dot
      ctx.beginPath()
      ctx.arc(pivotX, pivotY, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#1a1610'
      ctx.fill()

      // VU label
      ctx.font = 'bold 10px Helvetica Neue, sans-serif'
      ctx.fillStyle = 'rgba(220,210,190,0.5)'
      ctx.textAlign = 'center'
      ctx.fillText(label, width / 2, height * 0.55)

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [analyser, width, height, label])

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="rounded shadow-vu-recess p-0.5">
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
