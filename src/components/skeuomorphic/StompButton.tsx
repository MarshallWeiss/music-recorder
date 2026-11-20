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

const TAP_HINT: Record<string, string> = {
  empty: 'Record',
  recording: 'Close loop and play',
  playing: 'Overdub',
  overdubbing: 'Finish overdub',
  stopped: 'Play',
}

export default function StompButton({ looper, onClick }: StompButtonProps) {
  const led = LED_COLORS[looper.ledColor]
  const isFlashing = looper.ledColor === 'green-flash'
  const isRecording = looper.state === 'recording' || looper.state === 'overdubbing'

  return (
    <div className="flex flex-col items-center gap-5">
      {/* State readout */}
      <div className="looper-readout" role="status" aria-live="polite">
        <span
          className={`looper-readout-lamp ${isFlashing ? 'animate-led-pulse' : ''}`}
          style={looper.ledColor === 'off' ? undefined : { background: led.ring, boxShadow: led.glow }}
          aria-hidden="true"
        />
        <span>{STATE_LABELS[looper.state]}</span>
        {looper.layerCount > 0 && (
          <span className="looper-readout-layers">
            {looper.layerCount} {looper.layerCount === 1 ? 'layer' : 'layers'}
          </span>
        )}
      </div>

      {/* Stomp button */}
      <button
        onClick={(event) => {
          if (event.detail !== 0) onClick()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onClick()
          }
        }}
        className="looper-stomp-button relative rounded-full cursor-pointer transition-transform active:translate-y-0.5 active:scale-[0.98] no-select"
        aria-label={`Looper: ${STATE_LABELS[looper.state]}`}
        title="Looper footswitch"
        style={{
          width: 136,
          height: 136,
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

      {/* Gesture legend: the footswitch is the Space bar */}
      <div className="looper-gestures" aria-label="Looper gestures (Space bar or footswitch)">
        <kbd>Tap</kbd><span>{TAP_HINT[looper.state]}</span>
        <kbd>Double-tap</kbd><span>Stop</span>
        <kbd>Hold</kbd><span>{looper.undoIsRedo ? 'Redo last layer' : 'Undo last layer'}</span>
        <kbd>Double-tap + hold</kbd><span>Clear loop</span>
      </div>
    </div>
  )
}
