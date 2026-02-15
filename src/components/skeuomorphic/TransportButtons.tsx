import StatusLED from './StatusLED'

interface TransportButtonsProps {
  isRecording: boolean
  isPlaying: boolean
  hasArmedTrack: boolean
  hasRecordedTracks: boolean
  loopDuration: number
  onStartRecording: () => void
  onStopRecording: () => void
  onPlay: () => void
  onStop: () => void
  onSeekTo: (time: number) => void
}

function TransportButton({
  children,
  onClick,
  active = false,
  disabled = false,
  variant = 'default',
  label,
  ledColor,
  ledActive = false,
  ledPulse = false,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  variant?: 'default' | 'record'
  label?: string
  ledColor?: 'red' | 'green' | 'amber'
  ledActive?: boolean
  ledPulse?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {ledColor && (
        <StatusLED active={ledActive} color={ledColor} pulse={ledPulse} size="sm" />
      )}
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center justify-center rounded-sm transition-all no-select ${
          active ? 'shadow-button-down translate-y-px' : 'shadow-button-up hover:brightness-110'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        style={{
          width: variant === 'record' ? 58 : 48,
          height: 38,
          background: variant === 'record'
            ? active
              ? 'linear-gradient(180deg, #8a2020 0%, #6a1818 100%)'
              : 'linear-gradient(180deg, #7a2828 0%, #5a1818 100%)'
            : active
              ? 'linear-gradient(180deg, #555 0%, #444 100%)'
              : 'linear-gradient(180deg, #666 0%, #4a4a4a 100%)',
        }}
        title={label}
      >
        {children}
      </button>
      {label && (
        <span className="text-[7px] font-label uppercase tracking-wider text-engraved font-bold">
          {label}
        </span>
      )}
    </div>
  )
}

export default function TransportButtons({
  isRecording,
  isPlaying,
  hasArmedTrack,
  hasRecordedTracks,
  loopDuration,
  onStartRecording,
  onStopRecording,
  onPlay,
  onStop,
  onSeekTo,
}: TransportButtonsProps) {
  return (
    <div className="flex items-end gap-3 px-4 py-3">
      {/* REC */}
      <TransportButton
        onClick={isRecording ? onStopRecording : onStartRecording}
        active={isRecording}
        disabled={!hasArmedTrack}
        variant="record"
        label="REC"
        ledColor="red"
        ledActive={isRecording}
        ledPulse={isRecording}
      >
        <div className="w-3 h-3 rounded-full bg-red-400" />
      </TransportButton>

      {/* REW */}
      <TransportButton
        onClick={() => onSeekTo(0)}
        disabled={loopDuration <= 0}
        label="REW"
      >
        <svg width="14" height="10" viewBox="0 0 14 10" fill="white">
          <polygon points="7,0 0,5 7,10" />
          <polygon points="14,0 7,5 14,10" />
        </svg>
      </TransportButton>

      {/* PLAY */}
      <TransportButton
        onClick={isPlaying ? onStop : onPlay}
        active={isPlaying}
        disabled={!hasRecordedTracks}
        label="PLAY"
        ledColor="green"
        ledActive={isPlaying}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
          <polygon points="2,0 12,6 2,12" />
        </svg>
      </TransportButton>

      {/* FF */}
      <TransportButton
        onClick={() => onSeekTo(loopDuration)}
        disabled={loopDuration <= 0}
        label="FF"
      >
        <svg width="14" height="10" viewBox="0 0 14 10" fill="white">
          <polygon points="0,0 7,5 0,10" />
          <polygon points="7,0 14,5 7,10" />
        </svg>
      </TransportButton>

      {/* STOP */}
      <TransportButton
        onClick={onStop}
        disabled={!isPlaying && !isRecording}
        label="STOP"
      >
        <div className="w-3 h-3 bg-white rounded-sm" />
      </TransportButton>
    </div>
  )
}
