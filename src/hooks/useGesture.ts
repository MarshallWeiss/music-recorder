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
 *
 * Like a real Ditto pedal: primary action fires immediately on press.
 * - First press → 'tap' fires instantly (no delay)
 * - Second press within 300ms → 'double-tap' fires instantly
 * - Key held 1.5s → 'hold' fires (first press) or 'double-tap-hold' (second press held)
 */
export function useGesture({ onGesture, enabled, key = ' ' }: UseGestureOptions) {
  const stateRef = useRef<{
    isDown: boolean
    downTime: number
    hadRecentTap: boolean  // true if a tap completed recently (within double-tap window)
    tapTimer: ReturnType<typeof setTimeout> | null
    holdTimer: ReturnType<typeof setTimeout> | null
  }>({
    isDown: false,
    downTime: 0,
    hadRecentTap: false,
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
      stateRef.current.hadRecentTap = false
      stateRef.current.isDown = false
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== key || e.repeat) return
      e.preventDefault()

      const s = stateRef.current
      if (s.isDown) return
      s.isDown = true
      s.downTime = Date.now()

      if (s.hadRecentTap) {
        // Second press within double-tap window — fire double-tap immediately
        if (s.tapTimer) { clearTimeout(s.tapTimer); s.tapTimer = null }
        s.hadRecentTap = false
        onGestureRef.current('double-tap')

        // Start hold timer for double-tap+hold (key stays held)
        s.holdTimer = setTimeout(() => {
          onGestureRef.current('double-tap-hold')
          s.holdTimer = null
        }, HOLD_DURATION)
      } else {
        // First press — fire tap immediately
        onGestureRef.current('tap')

        // Start hold timer
        s.holdTimer = setTimeout(() => {
          onGestureRef.current('hold')
          s.holdTimer = null
        }, HOLD_DURATION)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key !== key) return
      e.preventDefault()

      const s = stateRef.current
      if (!s.isDown) return
      s.isDown = false

      const duration = Date.now() - s.downTime

      // Cancel hold timer
      if (s.holdTimer) { clearTimeout(s.holdTimer); s.holdTimer = null }

      // If held long enough, hold/double-tap-hold already fired — don't track as tap
      if (duration >= HOLD_DURATION) {
        s.hadRecentTap = false
        return
      }

      // Short press released — start window for potential second tap
      s.hadRecentTap = true
      s.tapTimer = setTimeout(() => {
        s.hadRecentTap = false
        s.tapTimer = null
      }, DOUBLE_TAP_WINDOW)
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
