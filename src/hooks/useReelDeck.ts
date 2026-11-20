import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioDevice, DeckSpeed, EqStandard, REEL_SECONDS, ReelDeck, TrackSelect, Transport } from '../audio/ReelDeck'
import { encodeWav } from '../audio/wavEncoder'

// Reel geometry in millimetres, used to turn tape travel into reel rotation
const HUB_RADIUS = 30
const FULL_RADIUS = 80

/** Radius of the wound tape for a given share of the reel's tape (area grows linearly with length). */
export function packRadius(share: number) {
  const s = Math.max(0, Math.min(1, share))
  return Math.sqrt(HUB_RADIUS * HUB_RADIUS + s * (FULL_RADIUS * FULL_RADIUS - HUB_RADIUS * HUB_RADIUS))
}

export interface ReelDeckState {
  speed: DeckSpeed
  transport: Transport
  armed: boolean
  trackSelect: TrackSelect
  eq: EqStandard
  level: number
  condition: number
  /** 0 to 1 along the reel. */
  position: number
  positionSeconds: number
  counterOffset: number
  levels: [number, number]
  leftAngle: number
  rightAngle: number
  hasRecording: boolean
  devices: AudioDevice[]
  inputIndex: number
  error: string | null
  isExporting: boolean
}

function describeError(error: unknown) {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Microphone access is blocked. Allow it in your browser settings, then switch the recorder on again.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No microphone or audio interface was found. Connect one, then switch the recorder on again.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Your audio input is busy in another app. Close it there, then switch the recorder on again.'
  }
  return error instanceof Error && error.message ? error.message : 'The audio input could not be started.'
}

export function useReelDeck() {
  const deckRef = useRef<ReelDeck | null>(null)
  if (!deckRef.current) deckRef.current = new ReelDeck()
  const deck = deckRef.current

  const [state, setState] = useState<ReelDeckState>({
    speed: 0,
    transport: 'stopped',
    armed: false,
    trackSelect: '1',
    eq: 'nartb',
    level: 5,
    condition: 0.25,
    position: 0,
    positionSeconds: 0,
    counterOffset: 0,
    levels: [0, 0],
    leftAngle: 0,
    rightAngle: 0,
    hasRecording: false,
    devices: [],
    inputIndex: 0,
    error: null,
    isExporting: false,
  })
  const stateRef = useRef(state)
  stateRef.current = state

  // One animation loop reads the deck and turns the reels
  useEffect(() => {
    let frame = 0
    let lastPosition = deck.getPositionFraction()
    let leftAngle = 0
    let rightAngle = 0
    const smoothed: [number, number] = [0, 0]

    const loop = () => {
      deck.tick()
      const position = deck.getPositionFraction()
      // Each reel turns by (tape travel) / (its current pack radius)
      const travel = (position - lastPosition) * REEL_SECONDS * 190 // mm of tape (190 mm/s at 19 cm/s)
      lastPosition = position
      if (travel !== 0) {
        leftAngle -= (travel / packRadius(1 - position)) * (180 / Math.PI)
        rightAngle -= (travel / packRadius(position)) * (180 / Math.PI)
      }
      const levels = deck.getLevels()
      smoothed[0] = smoothed[0] * 0.8 + levels[0] * 0.2
      smoothed[1] = smoothed[1] * 0.8 + levels[1] * 0.2

      const transport = deck.getTransport()
      setState((prev) => {
        const idle = transport === 'stopped' && prev.transport === 'stopped'
          && Math.abs(prev.levels[0] - smoothed[0]) < 0.004 && Math.abs(prev.levels[1] - smoothed[1]) < 0.004
        if (idle) return prev
        return {
          ...prev,
          transport,
          // A take that ends (by key or by running out of tape) releases the record key
          armed: prev.transport === 'recording' && transport !== 'recording' ? false : prev.armed,
          position,
          positionSeconds: deck.getPositionSeconds(),
          levels: [smoothed[0], smoothed[1]],
          leftAngle,
          rightAngle,
          hasRecording: deck.hasRecording(),
        }
      })
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [deck])

  useEffect(() => () => deck.destroy(), [deck])

  /** The mains lever: 0 is off; 9.5 and 19 switch on at that tape speed. */
  const setSpeed = useCallback(async (speed: DeckSpeed) => {
    if (speed === 0) {
      deck.powerOff()
      setState(prev => ({ ...prev, speed: 0, armed: false, transport: 'stopped', levels: [0, 0] }))
      return
    }
    try {
      if (deck.isPowered()) {
        deck.setSpeed(speed)
      } else {
        const current = stateRef.current
        await deck.powerOn(speed, current.devices[current.inputIndex]?.deviceId)
      }
      const devices = await deck.listDevices()
      setState(prev => ({ ...prev, speed, devices, error: null, hasRecording: deck.hasRecording() }))
    } catch (error) {
      deck.powerOff()
      setState(prev => ({ ...prev, speed: 0, error: describeError(error) }))
    }
  }, [deck])

  const setTrackSelect = useCallback((trackSelect: TrackSelect) => {
    deck.setTrackSelect(trackSelect)
    setState(prev => ({ ...prev, trackSelect: deck.getTrackSelect() }))
  }, [deck])

  const setEq = useCallback((eq: EqStandard) => {
    deck.setEq(eq)
    setState(prev => ({ ...prev, eq }))
  }, [deck])

  const setLevel = useCallback((level: number) => {
    deck.setLevel(level)
    setState(prev => ({ ...prev, level: deck.getLevel() }))
  }, [deck])

  const setCondition = useCallback((condition: number) => {
    deck.setCondition(condition)
    setState(prev => ({ ...prev, condition }))
  }, [deck])

  /** The input lever has three positions; each selects the audio input in that slot, if there is one. */
  const setInputIndex = useCallback(async (inputIndex: number) => {
    setState(prev => ({ ...prev, inputIndex }))
    const device = stateRef.current.devices[inputIndex]
    if (!device || !deck.isPowered()) return
    try {
      await deck.openInput(device.deviceId)
      setState(prev => ({ ...prev, error: null }))
    } catch (error) {
      setState(prev => ({ ...prev, error: describeError(error) }))
    }
  }, [deck])

  // ---- the six keys

  const pressRecord = useCallback(() => {
    if (!deck.isPowered() || deck.getTransport() === 'recording') return
    setState(prev => ({ ...prev, armed: !prev.armed }))
  }, [deck])

  const pressStart = useCallback(() => {
    if (!deck.isPowered()) return
    if (deck.getTransport() !== 'stopped') deck.stop()
    if (stateRef.current.armed) deck.record()
    else deck.play()
  }, [deck])

  const pressStop = useCallback(() => {
    deck.stop()
    setState(prev => ({ ...prev, armed: false }))
  }, [deck])

  /** "aus": ends a recording but lets the tape keep playing. */
  const pressOff = useCallback(() => {
    if (deck.getTransport() === 'recording') {
      deck.stop()
      deck.play()
    }
    setState(prev => ({ ...prev, armed: false }))
  }, [deck])

  const pressRewind = useCallback(() => {
    deck.rewind()
    setState(prev => ({ ...prev, armed: false }))
  }, [deck])

  const pressForward = useCallback(() => {
    deck.fastForward()
    setState(prev => ({ ...prev, armed: false }))
  }, [deck])

  const resetCounter = useCallback(() => {
    setState(prev => ({ ...prev, counterOffset: deck.getPositionSeconds() }))
  }, [deck])

  const newReel = useCallback(async () => {
    await deck.newReel()
    setState(prev => ({ ...prev, armed: false, position: 0, positionSeconds: 0, counterOffset: 0, hasRecording: false, leftAngle: 0, rightAngle: 0 }))
  }, [deck])

  const exportWav = useCallback(async () => {
    setState(prev => ({ ...prev, isExporting: true }))
    try {
      const mix = await deck.renderMix()
      if (!mix) return
      const url = URL.createObjectURL(encodeWav(mix))
      const link = document.createElement('a')
      link.href = url
      link.download = 'braun-tg60-tape.wav'
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally {
      setState(prev => ({ ...prev, isExporting: false }))
    }
  }, [deck])

  return {
    state,
    setSpeed,
    setTrackSelect,
    setEq,
    setLevel,
    setCondition,
    setInputIndex,
    pressRecord,
    pressStart,
    pressStop,
    pressOff,
    pressRewind,
    pressForward,
    resetCounter,
    newReel,
    exportWav,
  }
}
