import { useCallback, useEffect, useRef, useState } from 'react'
import { DeckSpeed, TrackSelect } from '../../audio/ReelDeck'
import { packRadius, useReelDeck } from '../../hooks/useReelDeck'
import braunLogo from '../../assets/braun-logo.webp'
import '../../styles/braun.css'

/**
 * After the Braun TG 60 (Dieter Rams, 1965), seen from above with the hood off.
 * Drawn in millimetres: the faceplate is 420 x 280 mm, as on the machine.
 * Controls and their German lettering were read from museum photographs
 * (Pinakothek der Moderne, via Wikimedia Commons).
 */

type Language = 'de' | 'en'
type Finish = 'white' | 'graphite'

const TEXT: Record<Language, Record<string, string>> = {
  de: {
    mains: 'netz', track: 'spur', rewind: 'rücklauf', record: 'aufnahme', off: 'aus', stop: 'stop',
    start: 'start', forward: 'vorlauf', level: 'aussteuerung', input: 'eingang', mic: 'mikro', radio: 'radio', phono: 'phono',
    slow: '9,5',
  },
  en: {
    mains: 'power', track: 'track', rewind: 'rewind', record: 'record', off: 'off', stop: 'stop',
    start: 'start', forward: 'forward', level: 'record level', input: 'input', mic: 'mic', radio: 'radio', phono: 'phono',
    slow: '9.5',
  },
}

/** What each control does, shown as a tooltip and read by screen readers, whichever lettering is on the plate. */
const HELP = {
  mains: 'Power and tape speed: off, 9.5 or 19 cm/s',
  track: 'Which track records: 1 (left), 2 (right) or both',
  rewind: 'Rewind',
  record: 'Record: press, then press start',
  off: 'End recording, keep playing',
  stop: 'Stop',
  start: 'Start',
  forward: 'Fast forward',
  level: 'Record level',
  input: 'Audio input',
  eq: 'Playback equalisation standard',
  counter: 'Reset counter',
}

const LEFT = { x: 112, y: 89 }
const RIGHT = { x: 308, y: 89 }
const REEL_RADIUS = 88

function loadChoice<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const saved = localStorage.getItem(key)
    if (allowed.includes(saved as T)) return saved as T
  } catch { /* storage unavailable */ }
  return fallback
}

function saveChoice(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* storage unavailable */ }
}

function polar(cx: number, cy: number, radius: number, degrees: number) {
  const rad = (degrees - 90) * (Math.PI / 180)
  return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)] as const
}

/** One of the reel's three windows: a ring segment between two radii. */
function windowPath(inner: number, outer: number, centre: number, span: number) {
  const a0 = centre - span / 2
  const a1 = centre + span / 2
  const [x0, y0] = polar(0, 0, outer, a0)
  const [x1, y1] = polar(0, 0, outer, a1)
  const [x2, y2] = polar(0, 0, inner, a1)
  const [x3, y3] = polar(0, 0, inner, a0)
  return `M${x0},${y0} A${outer},${outer} 0 0 1 ${x1},${y1} L${x2},${y2} A${inner},${inner} 0 0 0 ${x3},${y3} Z`
}

const FLANGE_PATH = [
  `M${-REEL_RADIUS},0 A${REEL_RADIUS},${REEL_RADIUS} 0 1 0 ${REEL_RADIUS},0 A${REEL_RADIUS},${REEL_RADIUS} 0 1 0 ${-REEL_RADIUS},0 Z`,
  windowPath(33, 80, 0, 96),
  windowPath(33, 80, 120, 96),
  windowPath(33, 80, 240, 96),
].join(' ')

function Reel({ id, cx, cy, angle, share }: { id: string; cx: number; cy: number; angle: number; share: number }) {
  const pack = packRadius(share)
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <clipPath id={`tg-pack-clip-${id}`}>
        <circle r={pack} />
      </clipPath>

      {/* Shadow the reel throws on the plate: it stands about a centimetre proud */}
      <circle r={REEL_RADIUS} className="tg-reel-shadow" />

      {/* Lower flange, seen through the windows beyond the tape */}
      <g transform={`rotate(${angle})`}>
        <path d={FLANGE_PATH} fillRule="evenodd" fill="#353735" />
      </g>

      {/* Wound tape: fine concentric layers with a fixed sheen, as glossy tape catches the light */}
      <circle r={pack} fill="url(#tg-pack)" />
      <circle r={pack} fill="url(#tg-rings)" opacity={0.55} />
      <g clipPath={`url(#tg-pack-clip-${id})`} filter="url(#tg-soft)" opacity={0.16}>
        <path d={`M0,0 L${-REEL_RADIUS},${-REEL_RADIUS * 0.55} L${-REEL_RADIUS * 0.55},${-REEL_RADIUS} Z`} fill="#fff" />
        <path d={`M0,0 L${REEL_RADIUS},${REEL_RADIUS * 0.55} L${REEL_RADIUS * 0.55},${REEL_RADIUS} Z`} fill="#fff" />
      </g>
      <circle r={pack} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={0.5} />
      <circle r={Math.max(0, pack - 0.5)} fill="none" stroke="rgba(255,220,190,0.14)" strokeWidth={0.3} />

      {/* The upper flange has thickness: its underside shows as a dark edge, always on the side away from the light */}
      <g transform={`translate(0.9 1.4) rotate(${angle})`}>
        <path d={FLANGE_PATH} fillRule="evenodd" fill="#232423" />
      </g>
      <g transform={`rotate(${angle})`}>
        <path d={FLANGE_PATH} fillRule="evenodd" className="tg-reel-flange" />
        {/* Threading slot */}
        <rect x={-0.7} y={-REEL_RADIUS + 3} width={1.4} height={52} fill="rgba(0,0,0,0.5)" transform="rotate(60)" />
        {/* Raised hub boss */}
        <circle r={21} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={0.5} />
        <circle r={20.5} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.4} />
        {/* Maker's label */}
        <g transform="translate(0 21)">
          <rect x={-8.5} y={-3.2} width={17} height={6.4} rx={0.6} fill="#e9e8e2" stroke="rgba(0,0,0,0.3)" strokeWidth={0.2} />
          <image href={braunLogo} x={-6.6} y={-2.8} width={13.2} height={5.6} preserveAspectRatio="xMidYMid meet" className="tg-logo" />
        </g>
      </g>

      {/* Light across the matte plastic: stays put while the reel turns */}
      <circle r={REEL_RADIUS} fill="url(#tg-reel-light)" style={{ mixBlendMode: 'soft-light' }} pointerEvents="none" />
      <circle r={REEL_RADIUS - 0.5} fill="none" stroke="url(#tg-rim)" strokeWidth={1} pointerEvents="none" />

      {/* Spindle with its three driving lugs */}
      <circle cx={0.5} cy={0.8} r={8} fill="rgba(0,0,0,0.4)" filter="url(#tg-soft)" />
      <g transform={`rotate(${angle})`}>
        <circle r={7} fill="url(#tg-chrome)" stroke="rgba(0,0,0,0.4)" strokeWidth={0.4} />
        {[0, 120, 240].map((lug) => (
          <rect key={lug} x={-1} y={-10} width={2} height={4.6} rx={0.6} fill="#a4a6a3" stroke="rgba(0,0,0,0.4)" strokeWidth={0.25} transform={`rotate(${lug})`} />
        ))}
        <circle r={2.4} fill="#5f615e" stroke="rgba(0,0,0,0.5)" strokeWidth={0.3} />
      </g>
      <ellipse cx={-2} cy={-2.4} rx={2.4} ry={1.4} fill="rgba(255,255,255,0.75)" transform="rotate(-35)" pointerEvents="none" />
    </g>
  )
}

interface LeverProps {
  x: number
  y: number
  labels: string[]
  index: number
  name: string
  help: string
  onChange: (index: number) => void
}

const LEVER_ANGLES = [-38, 0, 38]

/** The TG 60's cast teardrop lever switches: three positions, pointed end towards the scale. */
function Lever({ x, y, labels, index, name, help, onChange }: LeverProps) {
  const step = (delta: number) => onChange(Math.max(0, Math.min(labels.length - 1, index + delta)))
  return (
    <g
      transform={`translate(${x} ${y})`}
      className="tg-control"
      role="slider"
      tabIndex={0}
      aria-label={`${name}: ${help}`}
      aria-valuemin={0}
      aria-valuemax={labels.length - 1}
      aria-valuenow={index}
      aria-valuetext={labels[index]}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); step(-1) }
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); step(1) }
      }}
    >
      <title>{help}</title>
      {/* Scale arc and position labels: each label is its own click target */}
      <path d="M-15.5,-19.5 A25,25 0 0 1 15.5,-19.5" fill="none" stroke="#4a4a47" strokeWidth={0.35} />
      {labels.map((label, i) => {
        const [lx, ly] = polar(0, 0, 29, LEVER_ANGLES[i])
        return (
          <g key={label} onClick={() => onChange(i)}>
            <rect x={lx - 8} y={ly - 5} width={16} height={8} fill="transparent" />
            <text x={lx} y={ly} textAnchor="middle" className={`tg-scale ${i === index ? 'is-current' : ''}`}>{label}</text>
          </g>
        )
      })}
      <g onClick={() => onChange((index + 1) % labels.length)}>
        <ellipse cx={1.6} cy={3} rx={9} ry={8} fill="rgba(0,0,0,0.22)" filter="url(#tg-soft)" />
        <g transform={`rotate(${LEVER_ANGLES[index]})`} className="tg-lever">
          <path d="M0,-19 C3.2,-19 4.2,-13 6.6,-6 C9,1 6.5,8.5 0,8.5 C-6.5,8.5 -9,1 -6.6,-6 C-4.2,-13 -3.2,-19 0,-19 Z" fill="url(#tg-cast)" stroke="rgba(0,0,0,0.3)" strokeWidth={0.35} />
          <path d="M-1.2,-17.5 C-3,-12 -5,-5 -5.4,0" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={0.7} strokeLinecap="round" />
        </g>
      </g>
      <text y={22.5} textAnchor="middle" className="tg-label">{name}</text>
    </g>
  )
}

interface KeyProps {
  x: number
  label: string
  help: string
  lit?: boolean
  dot?: boolean
  onPress: () => void
}

const KEY_Y = 229
const KEY_SIZE = 20

/** A light-touch relay key: a slightly domed translucent square. */
function Key({ x, label, help, lit = false, dot = false, onPress }: KeyProps) {
  return (
    <g
      className={`tg-control tg-key ${lit ? 'is-lit' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${help}`}
      aria-pressed={lit}
      onClick={onPress}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onPress() }
      }}
    >
      <title>{help}</title>
      <rect x={x + 0.5} y={KEY_Y + 0.9} width={KEY_SIZE} height={KEY_SIZE} rx={2.4} fill="rgba(0,0,0,0.5)" />
      <rect x={x} y={KEY_Y} width={KEY_SIZE} height={KEY_SIZE} rx={2.4} className="tg-key-cap" />
      {lit && <rect x={x + 1.5} y={KEY_Y + 1.5} width={KEY_SIZE - 3} height={KEY_SIZE - 3} rx={5} className="tg-key-glow" />}
      <rect x={x + 2.2} y={KEY_Y + 2.2} width={KEY_SIZE - 4.4} height={KEY_SIZE - 4.4} rx={7} fill="url(#tg-dome)" />
      <rect x={x + 0.3} y={KEY_Y + 0.3} width={KEY_SIZE - 0.6} height={KEY_SIZE - 0.6} rx={2.2} fill="none" stroke="url(#tg-bevel)" strokeWidth={0.5} />
      {dot && <circle cx={x + KEY_SIZE / 2} cy={KEY_Y + KEY_SIZE / 2} r={2.1} className="tg-record-dot" />}
    </g>
  )
}

interface BraunTG60Props {
  machinePicker: React.ReactNode
}

export default function BraunTG60({ machinePicker }: BraunTG60Props) {
  const deck = useReelDeck()
  const { state } = deck
  const [language, setLanguage] = useState<Language>(() => loadChoice('braun-language', ['de', 'en'] as const, 'de'))
  const [finish, setFinish] = useState<Finish>(() => loadChoice('braun-finish', ['white', 'graphite'] as const, 'white'))
  const t = TEXT[language]

  const powered = state.speed !== 0
  const running = state.transport === 'playing' || state.transport === 'recording'

  // Space starts and stops, R sets the record key, as on the Porta Four
  const actions = useRef(deck)
  actions.current = deck
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) return
      if (event.key === ' ') {
        event.preventDefault()
        if (actions.current.state.transport === 'stopped') actions.current.pressStart()
        else actions.current.pressStop()
      }
      if (event.key.toLowerCase() === 'r') actions.current.pressRecord()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Record level knob: drag up and down, or use the arrow keys
  const dragRef = useRef<{ startY: number; startLevel: number } | null>(null)
  const onKnobPointerDown = useCallback((event: React.PointerEvent) => {
    event.preventDefault()
    dragRef.current = { startY: event.clientY, startLevel: state.level }
    const onMove = (move: PointerEvent) => {
      if (!dragRef.current) return
      deck.setLevel(dragRef.current.startLevel + (dragRef.current.startY - move.clientY) / 14)
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [deck, state.level])

  const speedIndex = state.speed === 9.5 ? 0 : state.speed === 0 ? 1 : 2
  const speeds: DeckSpeed[] = [9.5, 0, 19]
  const trackIndex = state.trackSelect === '1' ? 0 : state.trackSelect === '2' ? 1 : 2
  const trackOptions: TrackSelect[] = ['1', '2', '1+2']

  // Mechanical counter: turns with the tape, three digits, wraps like the real thing
  const counterValue = (((state.positionSeconds - state.counterOffset) * 3.2) % 1000 + 1000) % 1000
  const digits = [Math.floor(counterValue / 100) % 10, Math.floor(counterValue / 10) % 10, counterValue % 10]

  const leftPack = packRadius(1 - state.position)
  const rightPack = packRadius(state.position)
  const knobAngle = -140 + (state.level / 10) * 280

  return (
    <div className={`braun-room braun-room--${finish}`}>
      <div className="braun-stage">
        <svg className="braun-device" viewBox="-12 -12 444 304" role="group" aria-label="Braun TG 60 tape recorder">
          <defs>
            <linearGradient id="tg-plate" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#dcdcd7" />
              <stop offset="0.5" stopColor="#d0d0cb" />
              <stop offset="1" stopColor="#c4c4bf" />
            </linearGradient>
            <linearGradient id="tg-cast" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#e4e4e0" />
              <stop offset="0.55" stopColor="#b9bab6" />
              <stop offset="1" stopColor="#8f908c" />
            </linearGradient>
            <radialGradient id="tg-chrome" cx="0.35" cy="0.3" r="0.9">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.45" stopColor="#c8c9c6" />
              <stop offset="1" stopColor="#77797a" />
            </radialGradient>
            <radialGradient id="tg-dome" cx="0.4" cy="0.3" r="0.8">
              <stop offset="0" stopColor="rgba(255,255,255,0.85)" />
              <stop offset="0.6" stopColor="rgba(255,255,255,0.12)" />
              <stop offset="1" stopColor="rgba(0,0,0,0.06)" />
            </radialGradient>
            <radialGradient id="tg-pack" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0.3" stopColor="#3c2418" />
              <stop offset="0.8" stopColor="#5a3826" />
              <stop offset="1" stopColor="#6b4530" />
            </radialGradient>
            <radialGradient id="tg-knob" cx="0.38" cy="0.32" r="0.8">
              <stop offset="0" stopColor="#8a8b88" />
              <stop offset="0.6" stopColor="#4c4d4b" />
              <stop offset="1" stopColor="#2f302e" />
            </radialGradient>
            <radialGradient id="tg-rings" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1.3" spreadMethod="repeat">
              <stop offset="0" stopColor="#2a160c" />
              <stop offset="0.5" stopColor="#6a4430" />
              <stop offset="1" stopColor="#2a160c" />
            </radialGradient>
            <linearGradient id="tg-reel-light" x1="0.15" y1="0.1" x2="0.85" y2="0.9">
              <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="0.45" stopColor="#808080" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="tg-rim" x1="0.15" y1="0.1" x2="0.85" y2="0.9">
              <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.55" />
            </linearGradient>
            <radialGradient id="tg-plate-light" cx="0.3" cy="0.15" r="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.16" />
            </radialGradient>
            <linearGradient id="tg-bevel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.1" />
              <stop offset="1" stopColor="#000" stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id="tg-brushed" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#b8b9b5" />
              <stop offset="0.18" stopColor="#e2e2de" />
              <stop offset="0.4" stopColor="#c6c7c3" />
              <stop offset="0.62" stopColor="#dededa" />
              <stop offset="0.85" stopColor="#bcbdb9" />
              <stop offset="1" stopColor="#a6a7a3" />
            </linearGradient>
            <linearGradient id="tg-keycap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fbfaf5" />
              <stop offset="0.6" stopColor="#eceae2" />
              <stop offset="1" stopColor="#d6d4cb" />
            </linearGradient>
            <linearGradient id="tg-cylinder" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#000" stopOpacity="0.5" />
              <stop offset="0.25" stopColor="#000" stopOpacity="0.05" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.18" />
              <stop offset="0.8" stopColor="#000" stopOpacity="0.08" />
              <stop offset="1" stopColor="#000" stopOpacity="0.55" />
            </linearGradient>
            {/* Fine grain of the aluminium-coloured paint */}
            <filter id="tg-grain" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7" />
              <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.45  0 0 0 0 0.43  0 0 0 0.5 -0.12" />
            </filter>
            <filter id="tg-soft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.6" />
            </filter>
            <filter id="tg-glow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
          </defs>

          {/* Sheet-steel base, then the aluminium-coloured top plate */}
          <rect x={-5} y={-5} width={430} height={290} rx={2.5} className="tg-base" />
          <rect x={-5} y={-5} width={430} height={290} rx={2.5} fill="none" stroke="url(#tg-bevel)" strokeWidth={0.5} opacity={0.6} />
          <rect x={0.6} y={1} width={420} height={280} rx={1.2} fill="rgba(0,0,0,0.35)" filter="url(#tg-soft)" />
          <rect x={0} y={0} width={420} height={280} rx={1.2} fill="url(#tg-plate)" />
          <rect x={0} y={0} width={420} height={280} rx={1.2} filter="url(#tg-grain)" opacity={0.55} />
          <rect x={0} y={0} width={420} height={280} rx={1.2} fill="url(#tg-plate-light)" />
          <rect x={0.25} y={0.25} width={419.5} height={279.5} rx={1.1} fill="none" stroke="url(#tg-bevel)" strokeWidth={0.5} />
          {[[8, 8], [210, 6], [412, 8], [8, 272], [210, 274], [412, 272], [6, 150], [414, 150]].map(([sx, sy]) => (
            <g key={`${sx}-${sy}`} transform={`translate(${sx} ${sy})`}>
              <circle r={2.2} fill="rgba(0,0,0,0.22)" />
              <circle r={1.7} fill="url(#tg-chrome)" stroke="rgba(0,0,0,0.5)" strokeWidth={0.25} />
              <path d="M-1.1,0 H1.1 M0,-1.1 V1.1" stroke="rgba(0,0,0,0.6)" strokeWidth={0.35} transform={`rotate(${(sx * 7 + sy * 3) % 90})`} />
            </g>
          ))}

          {/* Equalisation switch between the reels */}
          <g
            className="tg-control"
            role="switch"
            tabIndex={0}
            aria-checked={state.eq === 'ccir'}
            aria-label={`nartb / ccir: ${HELP.eq}`}
            onClick={() => deck.setEq(state.eq === 'nartb' ? 'ccir' : 'nartb')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); deck.setEq(state.eq === 'nartb' ? 'ccir' : 'nartb') }
            }}
          >
            <title>{HELP.eq}</title>
            <rect x={200} y={140} width={20} height={9} rx={1} fill="#2f302e" />
            <rect x={state.eq === 'nartb' ? 201.2 : 209.8} y={141.2} width={9} height={6.6} rx={0.8} fill="#565754" stroke="rgba(255,255,255,0.18)" strokeWidth={0.3} />
            <text x={197} y={146.2} textAnchor="end" className={`tg-scale ${state.eq === 'nartb' ? 'is-current' : ''}`}>nartb</text>
            <text x={223} y={146.2} className={`tg-scale ${state.eq === 'ccir' ? 'is-current' : ''}`}>ccir</text>
          </g>

          {/* Tape path: off the left reel, past the heads, onto the right reel */}
          <path
            d={`M${LEFT.x + leftPack * 0.42},${LEFT.y + leftPack * 0.907} L122,199 L298,199 L${RIGHT.x - rightPack * 0.42},${RIGHT.y + rightPack * 0.907}`}
            fill="none"
            stroke="#4a2c1c"
            strokeWidth={0.9}
          />

          {/* Outline of the head and roller recess */}
          <rect x={116} y={182} width={188} height={36} rx={5} fill="none" stroke="#3d3d3a" strokeWidth={0.4} />

          {/* Head carrier plate with its twelve adjustment screws */}
          <path d="M130,166 L290,166 L299,178 L296,196 L124,196 L121,178 Z" fill="rgba(0,0,0,0.45)" filter="url(#tg-soft)" transform="translate(1.2 2)" />
          <path d="M130,166 L290,166 L299,178 L296,196 L124,196 L121,178 Z" fill="url(#tg-brushed)" stroke="rgba(0,0,0,0.45)" strokeWidth={0.4} />
          <path d="M130,166 L290,166 L299,178 L296,196 L124,196 L121,178 Z" filter="url(#tg-grain)" opacity={0.5} />
          <path d="M130.5,166.6 L289.5,166.6" stroke="rgba(255,255,255,0.8)" strokeWidth={0.5} />
          <path d="M124.5,195.5 L295.5,195.5" stroke="rgba(0,0,0,0.3)" strokeWidth={0.5} />
          {[146, 170, 196, 224, 250, 274].flatMap((sx, i) => [[sx, 172 + (i % 2)], [sx - 6, 188 - (i % 2)]]).map(([sx, sy]) => (
            <g key={`${sx}-${sy}`} transform={`translate(${sx} ${sy})`}>
              <circle r={1.3} fill="#5c5d5a" stroke="rgba(255,255,255,0.45)" strokeWidth={0.2} />
              <path d="M-0.9,0 H0.9" stroke="rgba(0,0,0,0.7)" strokeWidth={0.3} transform={`rotate(${(sx * 5) % 180})`} />
            </g>
          ))}
          <circle cx={129.2} cy={185.6} r={8} fill="rgba(0,0,0,0.4)" filter="url(#tg-soft)" />
          <circle cx={293.2} cy={185.6} r={8} fill="rgba(0,0,0,0.4)" filter="url(#tg-soft)" />
          <circle cx={128} cy={184} r={7.5} fill="url(#tg-chrome)" stroke="rgba(0,0,0,0.35)" strokeWidth={0.4} />
          <circle cx={292} cy={184} r={7.5} fill="url(#tg-chrome)" stroke="rgba(0,0,0,0.35)" strokeWidth={0.4} />
          {/* Tape guides */}
          <circle cx={122} cy={199} r={1.8} fill="url(#tg-chrome)" stroke="rgba(0,0,0,0.4)" strokeWidth={0.3} />
          <circle cx={298} cy={199} r={1.8} fill="url(#tg-chrome)" stroke="rgba(0,0,0,0.4)" strokeWidth={0.3} />

          {/* Pressure-roller arm: swings the rubber roller onto the tape when it runs */}
          <g className="tg-roller-arm" transform={`rotate(${running ? -3.2 : 0} 140 209)`}>
            <path d="M134,204 L250,203.5 L262,207 L262,212 L250,214.5 L134,214 Q130,209 134,204 Z" fill="rgba(0,0,0,0.4)" filter="url(#tg-soft)" transform="translate(1 1.8)" />
            <path d="M134,204 L250,203.5 L262,207 L262,212 L250,214.5 L134,214 Q130,209 134,204 Z" fill="url(#tg-cast)" stroke="rgba(0,0,0,0.45)" strokeWidth={0.4} />
            <path d="M135,204.6 L250,204.1" stroke="rgba(255,255,255,0.7)" strokeWidth={0.4} />
            <circle cx={263} cy={211} r={8.4} fill="rgba(0,0,0,0.4)" filter="url(#tg-soft)" />
            <circle cx={140} cy={209} r={2.6} fill="#3a3b39" />
            <circle cx={262} cy={209.5} r={8} fill="#2b2523" stroke="rgba(0,0,0,0.6)" strokeWidth={0.4} />
            <circle cx={262} cy={209.5} r={7.2} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
            <circle cx={262} cy={209.5} r={3} fill="url(#tg-chrome)" stroke="rgba(0,0,0,0.5)" strokeWidth={0.3} />
          </g>

          <Reel id="left" cx={LEFT.x} cy={LEFT.y} angle={state.leftAngle} share={1 - state.position} />
          <Reel id="right" cx={RIGHT.x} cy={RIGHT.y} angle={state.rightAngle} share={state.position} />

          {/* Level indicators: a half-cylinder drum with one scale per track */}
          <g aria-label={`Level, track 1 ${Math.round(state.levels[0] * 100)} percent, track 2 ${Math.round(state.levels[1] * 100)} percent`} role="img">
            <rect x={27} y={178} width={30} height={30} rx={2} fill="#2c2d2b" />
            <rect x={29} y={180} width={26} height={26} rx={1} fill="url(#tg-cast)" />
            <rect x={29} y={180} width={26} height={26} rx={1} fill="rgba(255,255,255,0.18)" />
            {[0, 1].map((track) => {
              const sx = 33 + track * 12
              const level = powered ? state.levels[track] : 0
              return (
                <g key={track}>
                  <rect x={sx} y={182} width={6} height={22} fill="#efeee8" stroke="rgba(0,0,0,0.3)" strokeWidth={0.25} />
                  <rect x={sx} y={182} width={6} height={5} fill="#c8402c" opacity={0.85} />
                  {[187, 191, 195, 199].map((ty) => (
                    <path key={ty} d={`M${sx},${ty} H${sx + 6}`} stroke="rgba(0,0,0,0.45)" strokeWidth={0.25} />
                  ))}
                  <rect x={sx - 0.6} y={203 - level * 21} width={7.2} height={1.3} fill="#1d1d1c" />
                </g>
              )
            })}
            <rect x={29} y={180} width={26} height={26} rx={1} fill="url(#tg-cylinder)" pointerEvents="none" />
            <path d="M30,181 H54 V188 Q42,191 30,188 Z" fill="rgba(255,255,255,0.16)" pointerEvents="none" />
            <rect x={27} y={178} width={30} height={30} rx={2} fill="none" stroke="url(#tg-bevel)" strokeWidth={0.5} opacity={0.5} />
            <text x={32} y={176.4} className="tg-tiny">1</text>
            <text x={50.5} y={176.4} className="tg-tiny">2</text>
          </g>
          {/* Pilot lamp */}
          <circle cx={42} cy={214} r={4.5} fill="#ff7a3d" opacity={powered ? 0.55 : 0} filter="url(#tg-glow)" />
          <circle cx={42} cy={214} r={2.1} className={`tg-lamp ${powered ? 'is-on' : ''}`} />

          {/* Three-digit counter and its reset key */}
          <g>
            <rect x={370} y={176} width={24} height={10} rx={1} fill="#1f201f" />
            {digits.map((digit, i) => (
              <g key={i}>
                <rect x={371.4 + i * 7.3} y={177.2} width={6.6} height={7.6} rx={0.5} fill="#ecebe5" />
                <text x={374.7 + i * 7.3} y={183.4} textAnchor="middle" className="tg-counter">{Math.floor(digit)}</text>
              </g>
            ))}
            <rect x={371.4} y={177.2} width={21.2} height={7.6} fill="url(#tg-cylinder)" opacity={0.8} pointerEvents="none" />
            <g
              className="tg-control tg-key"
              role="button"
              tabIndex={0}
              aria-label={HELP.counter}
              onClick={deck.resetCounter}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); deck.resetCounter() }
              }}
            >
              <title>{HELP.counter}</title>
              <rect x={398} y={175.5} width={11} height={11} rx={1.4} className="tg-key-cap" />
            </g>
          </g>

          {/* The control row */}
          <Lever
            x={44}
            y={246}
            labels={[t.slow, '0', '19']}
            index={speedIndex}
            name={t.mains}
            help={HELP.mains}
            onChange={(i) => { void deck.setSpeed(speeds[i]) }}
          />
          <Lever
            x={98}
            y={246}
            labels={['1', '2', '1+2']}
            index={trackIndex}
            name={t.track}
            help={HELP.track}
            onChange={(i) => deck.setTrackSelect(trackOptions[i])}
          />

          <rect x={137.4} y={227.4} width={87.2} height={23.2} rx={3} fill="#3a3b39" />
          <Key x={139} label={t.rewind} help={HELP.rewind} lit={state.transport === 'rewinding'} onPress={deck.pressRewind} />
          <Key x={160.4} label={t.record} help={HELP.record} lit={state.armed || state.transport === 'recording'} dot onPress={deck.pressRecord} />
          <Key x={181.8} label={t.off} help={HELP.off} onPress={deck.pressOff} />
          <Key x={203.2} label={t.stop} help={HELP.stop} onPress={deck.pressStop} />
          <text x={149} y={260.5} textAnchor="middle" className="tg-label">◂◂ {t.rewind}</text>
          <text x={170.4} y={260.5} textAnchor="middle" className="tg-label">{t.record}</text>
          <text x={191.8} y={260.5} textAnchor="middle" className="tg-label">{t.off}</text>
          <text x={213.2} y={260.5} textAnchor="middle" className="tg-label">{t.stop}</text>

          <rect x={244.4} y={227.4} width={44.4} height={23.2} rx={3} fill="#3a3b39" />
          <Key x={246} label={t.start} help={HELP.start} lit={running} onPress={deck.pressStart} />
          <Key x={267.4} label={t.forward} help={HELP.forward} lit={state.transport === 'forwarding'} onPress={deck.pressForward} />
          <text x={256} y={260.5} textAnchor="middle" className="tg-label">{t.start}</text>
          <text x={277.4} y={260.5} textAnchor="middle" className="tg-label">{t.forward} ▸▸</text>

          {/* Record level */}
          <g
            transform="translate(336 241)"
            className="tg-control"
            role="slider"
            tabIndex={0}
            aria-label={`${t.level}: ${HELP.level}`}
            aria-valuemin={0}
            aria-valuemax={10}
            aria-valuenow={Math.round(state.level * 10) / 10}
            onPointerDown={onKnobPointerDown}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp' || event.key === 'ArrowRight') { event.preventDefault(); deck.setLevel(state.level + 0.5) }
              if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') { event.preventDefault(); deck.setLevel(state.level - 0.5) }
            }}
          >
            <title>{HELP.level}</title>
            {Array.from({ length: 11 }, (_, n) => {
              const [nx, ny] = polar(0, 0, 17.5, -140 + n * 28)
              return <text key={n} x={nx} y={ny + 1.2} textAnchor="middle" className="tg-scale">{n}</text>
            })}
            <circle cx={1.4} cy={2.2} r={11} fill="rgba(0,0,0,0.25)" filter="url(#tg-soft)" />
            <circle r={10.5} fill="url(#tg-knob)" stroke="rgba(0,0,0,0.6)" strokeWidth={0.4} />
            <circle r={9.6} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1.4} strokeDasharray="0.5 0.75" />
            <circle r={7.6} fill="url(#tg-brushed)" stroke="rgba(0,0,0,0.5)" strokeWidth={0.3} />
            <circle r={7.6} fill="url(#tg-reel-light)" opacity={0.5} />
            <g transform={`rotate(${knobAngle})`}>
              <path d="M-1.5,-9.5 L1.5,-9.5 L2.4,-14.5 L-2.4,-14.5 Z" fill="#b9bab6" stroke="rgba(0,0,0,0.4)" strokeWidth={0.3} />
            </g>
            <text y={27.5} textAnchor="middle" className="tg-label">{t.level}</text>
          </g>

          <Lever
            x={388}
            y={246}
            labels={[t.mic, t.radio, t.phono]}
            index={state.inputIndex}
            name={t.input}
            help={state.devices[state.inputIndex] ? `${HELP.input}: ${state.devices[state.inputIndex].label}` : HELP.input}
            onChange={(i) => { void deck.setInputIndex(i) }}
          />
        </svg>
      </div>

      {/* Everything that is not on the machine lives outside it */}
      <div className="machine-bar">
        {machinePicker}

        <div className="machine-bar-group" role="group" aria-label="Lettering">
          <span>Lettering</span>
          <div className="machine-bar-segments">
            {(['de', 'en'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={language === option}
                onClick={() => { setLanguage(option); saveChoice('braun-language', option) }}
              >
                {option === 'de' ? 'Original' : 'English'}
              </button>
            ))}
          </div>
        </div>

        <div className="machine-bar-group" role="group" aria-label="Base colour">
          <span>Base</span>
          <div className="machine-bar-segments">
            {(['white', 'graphite'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={finish === option}
                onClick={() => { setFinish(option); saveChoice('braun-finish', option) }}
              >
                {option === 'white' ? 'White' : 'Graphite'}
              </button>
            ))}
          </div>
        </div>

        <label className="machine-bar-group">
          <span>Condition</span>
          <span className="machine-bar-range">
            <small>Serviced</small>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={state.condition}
              onChange={(event) => deck.setCondition(Number(event.target.value))}
            />
            <small>Worn</small>
          </span>
        </label>

        <p className="machine-bar-status" role="status">
          {state.error ?? (powered ? '' : `Switch on with the ${t.mains} lever: ${t.slow} or 19.`)}
        </p>

        <button
          type="button"
          className="machine-bar-button"
          onClick={() => {
            if (!state.hasRecording || confirm('Thread a blank tape? Everything on this reel will be erased.')) void deck.newReel()
          }}
          disabled={!powered}
        >
          New tape
        </button>
        <button
          type="button"
          className="machine-bar-button"
          onClick={() => { void deck.exportWav() }}
          disabled={!powered || !state.hasRecording || state.isExporting}
        >
          <span className="stable-label">
            <span style={{ visibility: state.isExporting ? 'hidden' : 'visible' }}>Export WAV</span>
            <span style={{ visibility: state.isExporting ? 'visible' : 'hidden' }}>Exporting...</span>
          </span>
        </button>
      </div>
    </div>
  )
}
