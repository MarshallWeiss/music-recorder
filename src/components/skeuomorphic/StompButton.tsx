import { UseLooperReturn } from '../../hooks/useLooper'

interface StompButtonProps {
  looper: UseLooperReturn
  onClick: () => void
}

const LED_COLORS = {
  off: { ring: 'rgba(60, 55, 50, 0.8)', glow: 'none' },
  red: { ring: '#e53e3e', glow: '0 0 12px 4px rgba(229, 62, 62, 0.5)' },
  green: { ring: '#48bb78', glow: '0 0 12px 4px rgba(72, 187, 120, 0.5)' },
  'green-flash': { ring: '#48bb78', glow: '0 0 12px 4px rgba(72, 187, 120, 0.3)' },
  'red-pulse': { ring: '#e53e3e', glow: '0 0 12px 4px rgba(229, 62, 62, 0.4)' },
}

const STATE_LABELS: Record<string, string> = {
  empty: 'READY',
  recording: 'REC',
  playing: 'PLAY',
  overdubbing: 'OVERDUB',
  stopped: 'STOPPED',
}

export default function StompButton({ looper, onClick }: StompButtonProps) {
  const led = LED_COLORS[looper.ledColor]
  const isFlashing = looper.ledColor === 'green-flash'
  const isRecording = looper.state === 'recording' || looper.state === 'overdubbing'

  return (
    <div className="flex flex-col items-center gap-3">
      {/* State label */}
      <div className="text-[11px] font-mono font-bold tracking-wider uppercase"
        style={{ color: looper.state === 'empty' ? 'rgba(180,170,150,0.4)' : 'rgba(220,210,190,0.8)' }}
      >
        {STATE_LABELS[looper.state]}
        {looper.layerCount > 0 && (
          <span className="ml-2 text-[9px]" style={{ color: 'rgba(180,170,150,0.5)' }}>
            {looper.layerCount} {looper.layerCount === 1 ? 'layer' : 'layers'}
          </span>
        )}
      </div>

      {/* Stomp button */}
      <button
        onClick={onClick}
        className="relative rounded-full cursor-pointer transition-transform active:translate-y-0.5 active:scale-[0.98] no-select"
        style={{
          width: 100,
          height: 100,
          background: 'radial-gradient(circle at 40% 35%, #686058, #484038 50%, #383430 100%)',
          boxShadow: `
            0 4px 12px rgba(0,0,0,0.5),
            0 1px 4px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.08),
            inset 0 -2px 4px rgba(0,0,0,0.3)
          `,
        }}
      >
        {/* LED ring */}
        <div
          className={`absolute inset-2 rounded-full border-2 transition-all ${
            isFlashing ? 'animate-led-pulse' : ''
          }`}
          style={{
            borderColor: led.ring,
            boxShadow: led.glow,
          }}
        />

        {/* Center dot texture */}
        <div
          className="absolute rounded-full"
          style={{
            top: '30%', left: '30%', right: '30%', bottom: '30%',
            background: 'radial-gradient(circle at 40% 35%, #585048, #383430 100%)',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
          }}
        />

        {/* Recording pulse overlay */}
        {isRecording && (
          <div
            className="absolute inset-2 rounded-full animate-led-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(229,62,62,0.1) 0%, transparent 70%)',
            }}
          />
        )}
      </button>

      {/* Undo indicator */}
      {looper.canUndo && looper.state === 'playing' && (
        <div className="text-[8px] font-mono tracking-wider"
          style={{ color: 'rgba(180,170,150,0.5)' }}
        >
          HOLD: {looper.undoIsRedo ? 'REDO' : 'UNDO'}
        </div>
      )}

      {/* Keyboard hint */}
      <div className="flex items-center gap-1.5">
        <div className="px-2 py-0.5 rounded-sm text-[9px] font-mono font-bold"
          style={{
            background: 'rgba(0,0,0,0.2)',
            color: 'rgba(180,170,150,0.5)',
            border: '1px solid rgba(180,170,150,0.15)',
          }}
        >
          SPACE
        </div>
      </div>
    </div>
  )
}
