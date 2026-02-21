import { useState, useRef, useEffect } from 'react'
import { AudioEngine } from '../audio/AudioEngine'
import { detectPitch, frequencyToNote, NoteInfo } from '../audio/pitchDetection'

export interface TunerState {
  /** Detected note info, or null if no pitch detected */
  noteInfo: NoteInfo | null
  /** Raw detected frequency in Hz, or null */
  rawFrequency: number | null
  /** Smoothed cents deviation for display (-50 to +50) */
  smoothedCents: number
  /** Whether pitch is currently being detected */
  isDetecting: boolean
}

/**
 * Hook that reads from the AudioEngine's tuner analyser and runs pitch detection.
 * Passive — reads from the analyser without affecting recording or playback.
 */
export function useTuner(engine: AudioEngine | null): TunerState {
  const [noteInfo, setNoteInfo] = useState<NoteInfo | null>(null)
  const [rawFrequency, setRawFrequency] = useState<number | null>(null)
  const [smoothedCents, setSmoothedCents] = useState(0)
  const [isDetecting, setIsDetecting] = useState(false)

  const rafRef = useRef<number>(0)
  const smoothedCentsRef = useRef(0)
  const noDetectionCountRef = useRef(0)

  useEffect(() => {
    const analyser = engine?.getTunerAnalyser()
    if (!analyser) {
      setIsDetecting(false)
      return
    }

    const sampleRate = engine!.getSampleRate()
    const buf = new Float32Array(analyser.fftSize / 2)

    const detect = () => {
      analyser.getFloatTimeDomainData(buf)

      // Check if there's actually signal (avoid detecting silence)
      let maxAmp = 0
      for (let i = 0; i < buf.length; i++) {
        const abs = Math.abs(buf[i])
        if (abs > maxAmp) maxAmp = abs
      }

      if (maxAmp < 0.01) {
        // Too quiet — no input
        noDetectionCountRef.current++
        if (noDetectionCountRef.current > 15) { // ~250ms at 60fps
          setNoteInfo(null)
          setRawFrequency(null)
          setIsDetecting(false)
          smoothedCentsRef.current = 0
          setSmoothedCents(0)
        }
        rafRef.current = requestAnimationFrame(detect)
        return
      }

      const frequency = detectPitch(buf, sampleRate)

      if (frequency !== null) {
        const info = frequencyToNote(frequency)
        setNoteInfo(info)
        setRawFrequency(frequency)
        setIsDetecting(true)
        noDetectionCountRef.current = 0

        // Smooth the cents display
        smoothedCentsRef.current = smoothedCentsRef.current * 0.7 + info.centsOff * 0.3
        setSmoothedCents(Math.round(smoothedCentsRef.current))
      } else {
        noDetectionCountRef.current++
        if (noDetectionCountRef.current > 15) {
          setNoteInfo(null)
          setRawFrequency(null)
          setIsDetecting(false)
          smoothedCentsRef.current = 0
          setSmoothedCents(0)
        }
      }

      rafRef.current = requestAnimationFrame(detect)
    }

    rafRef.current = requestAnimationFrame(detect)

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [engine])

  return { noteInfo, rawFrequency, smoothedCents, isDetecting }
}
