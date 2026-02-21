import { useEffect, useRef, useCallback } from 'react'

export type Gesture = 'tap' | 'double-tap' | 'hold' | 'double-tap-hold'

interface UseGestureOptions {
  /** Called when a gesture is recognized */
  onGesture: (gesture: Gesture) => void
  /** Whether gesture detection is active */
  enabled: boolean
  /** Key to listen for (default: ' ' i.e. Space) */
  key?: string
}

const DOUBLE_TAP_WINDOW = 300 // ms — max gap between two taps
const HOLD_DURATION = 1500    // ms — how long to hold for hold gestures

/**
 * Detects tap, double-tap, hold, and double-tap+hold gestures on a key.
 * Filters out keyboard repeat events.
 */
export function useGesture({ onGesture, enabled, key = ' ' }: UseGestureOptions) {
  const stateRef = useRef<{
    isDown: boolean
    downTime: number
    tapCount: number       // taps so far in current gesture sequence
    tapTimer: ReturnType<typeof setTimeout> | null
    holdTimer: ReturnType<typeof setTimeout> | null
  }>({
    isDown: false,
    downTime: 0,
    tapCount: 0,
    tapTimer: null,
    holdTimer: null,
  })

  const onGestureRef = useRef(onGesture)
  onGestureRef.current = onGesture

  const clearTimers = useCallback(() => {
    const s = stateRef.current
    if (s.tapTimer) { clearTimeout(s.tapTimer); s.tapTimer = null }
    if (s.holdTimer) { clearTimeout(s.holdTimer); s.holdTimer = null }
  }, [])

  useEffect(() => {
    if (!enabled) {
      clearTimers()
      stateRef.current.tapCount = 0
      stateRef.current.isDown = false
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== key || e.repeat) return
      e.preventDefault()

      const s = stateRef.current
      if (s.isDown) return // shouldn't happen, but guard
      s.isDown = true
      s.downTime = Date.now()

      // Clear the "wait for second tap" timer since a new press arrived
      if (s.tapTimer) { clearTimeout(s.tapTimer); s.tapTimer = null }

      // Start hold timer
      s.holdTimer = setTimeout(() => {
        // Key is still held after HOLD_DURATION
        if (s.tapCount === 0) {
          // Single hold
          onGestureRef.current('hold')
        } else {
          // Had a prior tap + now holding = double-tap+hold
          onGestureRef.current('double-tap-hold')
        }
        s.tapCount = 0
        s.holdTimer = null
      }, HOLD_DURATION)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key !== key) return
      e.preventDefault()

      const s = stateRef.current
      if (!s.isDown) return
      s.isDown = false

      const duration = Date.now() - s.downTime

      // Cancel hold timer — released before hold threshold
      if (s.holdTimer) { clearTimeout(s.holdTimer); s.holdTimer = null }

      // If held long enough, gesture already fired in the hold timer
      if (duration >= HOLD_DURATION) {
        s.tapCount = 0
        return
      }

      // Short press — count as a tap
      s.tapCount++

      if (s.tapCount === 1) {
        // First tap — wait for possible second tap
        s.tapTimer = setTimeout(() => {
          // No second tap arrived — it's a single tap
          onGestureRef.current('tap')
          s.tapCount = 0
          s.tapTimer = null
        }, DOUBLE_TAP_WINDOW)
      } else if (s.tapCount >= 2) {
        // Second tap released quickly — double-tap
        onGestureRef.current('double-tap')
        s.tapCount = 0
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      clearTimers()
    }
  }, [enabled, key, clearTimers])
}
