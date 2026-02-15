import { useState, useRef, useEffect } from 'react'

interface CassetteDeckProps {
  isPlaying: boolean
  isRecording: boolean
  sessionName: string
  onSetSessionName: (name: string) => void
  loopDuration: number
  currentTime: number
}

function TapeReel({ spinning, side }: { spinning: boolean; side: 'left' | 'right' }) {
  const size = 64
  const center = size / 2
  return (
    <div
      className={`relative rounded-full border-2 border-gray-700/60 ${
        spinning ? 'animate-reel-spin' : ''
      }`}
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(circle, #2a2622 0%, #1a1816 60%, #0a0806 100%)',
      }}
    >
      {/* Hub hole */}
      <div
        className="absolute rounded-full"
        style={{
          width: 16,
          height: 16,
          top: center - 8,
          left: center - 8,
          background: '#0a0806',
          border: '1px solid #333',
        }}
      />
      {/* Spokes */}
      {[0, 60, 120].map((deg) => (
        <div
          key={deg}
          className="absolute"
          style={{
            width: 1.5,
            height: size * 0.625,
            top: size * 0.1875,
            left: center - 0.75,
            background: 'rgba(80,70,60,0.5)',
            transform: `rotate(${deg}deg)`,
            transformOrigin: 'center center',
          }}
        />
      ))}
    </div>
  )
}

export default function CassetteDeck({
  isPlaying,
  isRecording,
  sessionName,
  onSetSessionName,
  loopDuration,
  currentTime,
}: CassetteDeckProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const spinning = isPlaying || isRecording

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  return (
    <div className="flex flex-col items-center w-full" style={{ maxWidth: 480 }}>
      {/* Cassette well */}
      <div
        className="shadow-cassette-well rounded-md p-5 w-full"
        style={{
          background: 'linear-gradient(180deg, #282420 0%, #1a1816 100%)',
        }}
      >
        {/* Cassette shell */}
        <div className="texture-cassette rounded-md p-4 relative" style={{ height: 250 }}>
          {/* Top edge detail */}
          <div className="absolute top-0 left-0 right-0 h-px bg-white/5 rounded-t-md" />

          {/* Tape window (dark area showing tape between reels) */}
          <div
            className="absolute rounded-sm shadow-inset-groove"
            style={{
              top: 16,
              left: 28,
              right: 28,
              height: 100,
              background: 'linear-gradient(180deg, #1a1610 0%, #0e0c08 100%)',
            }}
          >
            {/* Reels */}
            <div className="flex items-center justify-between px-8 py-4">
              <TapeReel spinning={spinning} side="left" />
              <TapeReel spinning={spinning} side="right" />
            </div>

            {/* Tape path (connecting reels) */}
            <div
              className="absolute"
              style={{
                top: 12,
                left: 40,
                right: 40,
                height: 2,
                background: '#2c1810',
              }}
            />
          </div>

          {/* Cassette label */}
          <div
            className="absolute rounded-sm flex items-center justify-center cursor-pointer hover:brightness-105 transition-all"
            style={{
              bottom: 24,
              left: 36,
              right: 36,
              height: 60,
              background: 'linear-gradient(180deg, #f5edd5 0%, #e8dcc0 100%)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
            }}
            onClick={() => {
              setEditValue(sessionName)
              setEditing(true)
            }}
            title="Click to rename session"
          >
            {/* Side label marker */}
            <div
              className="absolute top-1 right-2 w-4 h-4 rounded-sm flex items-center justify-center text-[7px] font-bold"
              style={{
                background: '#c22',
                color: 'white',
              }}
            >
              A
            </div>

            {editing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => {
                  if (editValue.trim()) onSetSessionName(editValue.trim())
                  setEditing(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (editValue.trim()) onSetSessionName(editValue.trim())
                    setEditing(false)
                  }
                  if (e.key === 'Escape') setEditing(false)
                }}
                className="w-full text-center text-[11px] font-mono bg-transparent text-hw-800 outline-none border-b border-hw-400 mx-4"
              />
            ) : (
              <span className="text-[11px] font-mono text-hw-700 truncate px-4">
                {sessionName}
              </span>
            )}
          </div>

          {/* Screw holes */}
          {['left', 'right'].map((side) => (
            <div
              key={side}
              className="absolute rounded-full"
              style={{
                width: 6,
                height: 6,
                [side]: 10,
                top: 80,
                background: 'radial-gradient(circle, #555 0%, #333 100%)',
                boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.5)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
