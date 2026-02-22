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

// How many consecutive frames a new note must be detected before switching display
const NOTE_HOLD_FRAMES = 4

/**
 * Hook that reads from the AudioEngine's tuner analyser and runs pitch detection.
 * Passive — reads from the analyser without affecting recording or playback.
 *
 * Uses note hysteresis to prevent flickering between adjacent semitones:
 * a new note must be detected for NOTE_HOLD_FRAMES consecutive frames
 * before the displayed note switches.
 */
export function useTuner(engine: AudioEngine | null, enabled: boolean = true): TunerState {
  const [noteInfo, setNoteInfo] = useState<NoteInfo | null>(null)
  const [rawFrequency, setRawFrequency] = useState<number | null>(null)
  const [smoothedCents, setSmoothedCents] = useState(0)
  const [isDetecting, setIsDetecting] = useState(false)

  const rafRef = useRef<number>(0)
  const smoothedCentsRef = useRef(0)
  const noDetectionCountRef = useRef(0)

  // Hysteresis state — stabilize note display
  const currentNoteRef = useRef<string | null>(null) // e.g. "A4"
  const candidateNoteRef = useRef<string | null>(null)
  const candidateCountRef = useRef(0)
  const candidateInfoRef = useRef<NoteInfo | null>(null)

  useEffect(() => {
    if (!enabled) {
      setIsDetecting(false)
      return
    }
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
          currentNoteRef.current = null
          candidateNoteRef.current = null
          candidateCountRef.current = 0
        }
        rafRef.current = requestAnimationFrame(detect)
        return
      }

      const frequency = detectPitch(buf, sampleRate)

      if (frequency !== null) {
        const info = frequencyToNote(frequency)
        setRawFrequency(frequency)
        setIsDetecting(true)
        noDetectionCountRef.current = 0

        // Smooth the cents display (always update, even before note switches)
        smoothedCentsRef.current = smoothedCentsRef.current * 0.7 + info.centsOff * 0.3
        setSmoothedCents(Math.round(smoothedCentsRef.current))

        // Note hysteresis: only switch displayed note after consistent detection
        if (info.note === currentNoteRef.current) {
          // Same note — just update cents/frequency, keep displaying
          setNoteInfo(info)
          candidateNoteRef.current = null
          candidateCountRef.current = 0
        } else if (info.note === candidateNoteRef.current) {
          // Same candidate — increment counter
          candidateCountRef.current++
          candidateInfoRef.current = info
          if (candidateCountRef.current >= NOTE_HOLD_FRAMES) {
            // Candidate confirmed — switch
            currentNoteRef.current = info.note
            setNoteInfo(info)
            candidateNoteRef.current = null
            candidateCountRef.current = 0
            // Reset cents smoothing to the new note to avoid jump
            smoothedCentsRef.current = info.centsOff
            setSmoothedCents(info.centsOff)
          }
        } else {
          // New candidate
          candidateNoteRef.current = info.note
          candidateCountRef.current = 1
          candidateInfoRef.current = info
        }

        // If no note displayed yet (first detection), show immediately
        if (currentNoteRef.current === null) {
          currentNoteRef.current = info.note
          setNoteInfo(info)
        }
      } else {
        noDetectionCountRef.current++
        if (noDetectionCountRef.current > 15) {
          setNoteInfo(null)
          setRawFrequency(null)
          setIsDetecting(false)
          smoothedCentsRef.current = 0
          setSmoothedCents(0)
          currentNoteRef.current = null
          candidateNoteRef.current = null
          candidateCountRef.current = 0
        }
      }

      rafRef.current = requestAnimationFrame(detect)
    }

    rafRef.current = requestAnimationFrame(detect)

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [engine, enabled])

  return { noteInfo, rawFrequency, smoothedCents, isDetecting }
}
