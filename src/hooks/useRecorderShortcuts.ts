import { useEffect, useRef } from 'react'

interface RecorderShortcutsOptions {
  enabled: boolean
  isPlaying: boolean
  isRecording: boolean
  isCountingIn: boolean
  hasRecordedTracks: boolean
  onPlay: () => void
  onStop: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onArmTrack: (trackId: number) => void
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.matches('button, a, input, textarea, select, [contenteditable="true"]')
}

export function useRecorderShortcuts(options: RecorderShortcutsOptions) {
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const current = optionsRef.current
      if (!current.enabled || event.repeat || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return

      if (event.code === 'Space') {
        event.preventDefault()
        if (current.isRecording || current.isCountingIn) current.onStopRecording()
        else if (current.isPlaying) current.onStop()
        else if (current.hasRecordedTracks) current.onPlay()
        return
      }

      if (event.code === 'KeyR') {
        event.preventDefault()
        if (current.isRecording || current.isCountingIn) current.onStopRecording()
        else current.onStartRecording()
        return
      }

      if (!current.isRecording && !current.isCountingIn && /^Digit[1-4]$/.test(event.code)) {
        event.preventDefault()
        current.onArmTrack(Number(event.code.slice(-1)) - 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
