import { useState, useRef, useEffect } from 'react'
import { Track } from '../../types'
import RotaryKnob from './RotaryKnob'
import VerticalFader from './VerticalFader'
import StatusLED from './StatusLED'

interface ChannelStripProps {
  track: Track
  onArmTrack: () => void
  onSetVolume: (volume: number) => void
  onSetPan: (pan: number) => void
  onToggleMute: () => void
  onToggleSolo: () => void
  onClearTrack: () => void
  onRenameTrack: (name: string) => void
}

export default function ChannelStrip({
  track,
  onArmTrack,
  onSetVolume,
  onSetPan,
  onToggleMute,
  onToggleSolo,
  onClearTrack,
  onRenameTrack,
}: ChannelStripProps) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  // Close context menu on outside click
  useEffect(() => {
    if (!showMenu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  const commitEdit = () => {
    if (editName.trim()) onRenameTrack(editName.trim())
    setEditing(false)
  }

  // Pan: map track.pan (-1 to 1) -> knob value (0 to 1)
  const panToKnob = (pan: number) => (pan + 1) / 2
  const knobToPan = (v: number) => v * 2 - 1

  return (
    <div
      className={`relative flex flex-col items-center gap-3 py-4 px-3 no-select ${
        track.isRecording ? 'bg-red-900/10' : ''
      }`}
      style={{ width: 90 }}
      onContextMenu={(e) => {
        e.preventDefault()
        setShowMenu(true)
      }}
    >
      {/* Pan knob */}
      <RotaryKnob
        value={panToKnob(track.pan)}
        onChange={(v) => onSetPan(knobToPan(v))}
        size="sm"
        detent
        ticks={7}
      />

      {/* Arm button */}
      <button
        onClick={onArmTrack}
        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
          track.isArmed
            ? 'shadow-button-down bg-red-900/40 border border-red-700/50'
            : 'shadow-button-up border border-hw-400/30 hover:border-hw-400/50'
        }`}
        style={{
          background: track.isArmed
            ? 'radial-gradient(circle, #5a2020 0%, #3a1010 100%)'
            : 'radial-gradient(circle at 38% 35%, #c0b8a8, #a09890 100%)',
        }}
        title="Arm for recording"
      >
        <StatusLED active={track.isArmed} color="red" pulse={track.isRecording} size="sm" />
      </button>

      {/* Mute button */}
      <button
        onClick={onToggleMute}
        className={`w-6 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold transition-all ${
          track.muted
            ? 'shadow-button-down bg-hw-600 text-red-400'
            : 'shadow-button-up text-hw-500'
        }`}
        style={{
          background: track.muted
            ? '#4a2a28'
            : 'linear-gradient(180deg, #c8c0b0 0%, #a8a090 100%)',
        }}
        title="Mute"
      >
        M
      </button>

      {/* Solo button */}
      <button
        onClick={onToggleSolo}
        className={`w-6 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold transition-all ${
          track.solo
            ? 'shadow-button-down text-yellow-400'
            : 'shadow-button-up text-hw-500'
        }`}
        style={{
          background: track.solo
            ? '#4a4020'
            : 'linear-gradient(180deg, #c8c0b0 0%, #a8a090 100%)',
        }}
        title="Solo"
      >
        S
      </button>

      {/* Vertical fader */}
      <div className="flex-1 flex items-center justify-center min-h-[120px]">
        <VerticalFader
          value={track.volume}
          onChange={onSetVolume}
          height={200}
        />
      </div>

      {/* Channel label */}
      {editing ? (
        <input
          ref={inputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-12 text-[9px] bg-hw-700 text-hw-100 rounded px-1 py-0.5 text-center outline-none border border-hw-500"
        />
      ) : (
        <span
          className="text-[11px] font-label font-bold text-engraved cursor-default"
          onDoubleClick={() => {
            setEditName(track.name)
            setEditing(true)
          }}
          title="Double-click to rename"
        >
          {track.id + 1}
        </span>
      )}

      {/* Context menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute top-8 right-0 z-20 bg-hw-100 border border-hw-400 rounded shadow-lg py-1 min-w-[100px]"
        >
          <button
            onClick={() => {
              setEditName(track.name)
              setEditing(true)
              setShowMenu(false)
            }}
            className="w-full text-left px-3 py-1.5 text-[10px] text-hw-800 hover:bg-hw-200 transition-colors"
          >
            Rename
          </button>
          {track.audioBuffer && (
            <button
              onClick={() => {
                onClearTrack()
                setShowMenu(false)
              }}
              className="w-full text-left px-3 py-1.5 text-[10px] text-red-700 hover:bg-hw-200 transition-colors"
            >
              Delete recording
            </button>
          )}
        </div>
      )}
    </div>
  )
}
