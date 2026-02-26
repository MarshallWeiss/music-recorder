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
      {/* Recorded indicator LED */}
      <StatusLED active={!!track.audioBuffer} color="green" size="sm" />

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
        className="rounded-full flex items-center justify-center transition-all"
        style={{
          width: 24,
          height: 24,
          background: track.isArmed
            ? 'radial-gradient(circle at 45% 40%, #8a2020, #6a1414 50%, #4a0e0e 100%)'
            : 'radial-gradient(circle at 38% 35%, #c0b8a8, #a09890 55%, #807870 100%)',
          boxShadow: track.isArmed
            ? 'inset 0 2px 4px rgba(0,0,0,0.5), 0 0 8px rgba(220,40,40,0.3)'
            : '0 2px 5px rgba(20,15,5,0.4), inset 0 1px 0 rgba(255,250,240,0.2)',
        }}
        title="Arm for recording"
      >
        <StatusLED active={track.isArmed} color="red" pulse={track.isRecording} size="sm" />
      </button>

      {/* Mute button */}
      <button
        onClick={onToggleMute}
        className="flex items-center justify-center text-[8px] font-bold transition-all"
        style={{
          width: 28,
          height: 18,
          borderRadius: 3,
          background: track.muted
            ? 'linear-gradient(180deg, #6a3230 0%, #5a2a28 30%, #4a1e1c 100%)'
            : 'linear-gradient(180deg, #d0c8b8 0%, #b8b0a0 30%, #a09890 100%)',
          color: track.muted ? '#ff6666' : 'rgba(60,50,40,0.5)',
          boxShadow: track.muted
            ? 'inset 0 2px 3px rgba(0,0,0,0.4)'
            : '0 2px 3px rgba(20,15,5,0.3), inset 0 1px 0 rgba(255,250,240,0.2), inset 0 -1px 0 rgba(20,15,5,0.1)',
          transform: track.muted ? 'translateY(1px)' : 'none',
        }}
        title="Mute"
      >
        M
      </button>

      {/* Solo button */}
      <button
        onClick={onToggleSolo}
        className="flex items-center justify-center text-[8px] font-bold transition-all"
        style={{
          width: 28,
          height: 18,
          borderRadius: 3,
          background: track.solo
            ? 'linear-gradient(180deg, #6a5a28 0%, #5a4a20 30%, #4a3a18 100%)'
            : 'linear-gradient(180deg, #d0c8b8 0%, #b8b0a0 30%, #a09890 100%)',
          color: track.solo ? '#ffd644' : 'rgba(60,50,40,0.5)',
          boxShadow: track.solo
            ? 'inset 0 2px 3px rgba(0,0,0,0.4)'
            : '0 2px 3px rgba(20,15,5,0.3), inset 0 1px 0 rgba(255,250,240,0.2), inset 0 -1px 0 rgba(20,15,5,0.1)',
          transform: track.solo ? 'translateY(1px)' : 'none',
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

      {/* Channel label + delete */}
      <div className="flex flex-col items-center gap-1">
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

        {/* Delete recording button */}
        {track.audioBuffer && (
          <button
            onClick={onClearTrack}
            className="w-5 h-5 rounded-full flex items-center justify-center shadow-button-up hover:brightness-110 transition-all"
            style={{
              background: 'radial-gradient(circle at 42% 38%, #c0b0a0, #a09080 50%, #807060 100%)',
            }}
            title="Delete recording"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l4 4M6 2l-4 4" />
            </svg>
          </button>
        )}
      </div>

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
