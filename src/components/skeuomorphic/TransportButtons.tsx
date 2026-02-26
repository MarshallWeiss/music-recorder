import StatusLED from './StatusLED'

interface TransportButtonsProps {
  isRecording: boolean
  isCountingIn: boolean
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
  width = 54,
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
  width?: number
}) {
  const isRecord = variant === 'record'

  return (
    <div className="flex flex-col items-center gap-1.5">
      {ledColor && (
        <StatusLED active={ledActive} color={ledColor} pulse={ledPulse} size="sm" />
      )}
      <button
        onClick={onClick}
        disabled={disabled}
        className={`relative flex items-center justify-center no-select transition-all ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{
          width,
          height: 44,
          borderRadius: 4,
          // 3D bevel: bright top edge, dark bottom edge
          background: isRecord
            ? active
              ? 'linear-gradient(180deg, #a82828 0%, #882020 8%, #701818 50%, #581010 92%, #480c0c 100%)'
              : 'linear-gradient(180deg, #c03030 0%, #982424 8%, #7a1c1c 50%, #601414 92%, #501010 100%)'
            : active
              ? 'linear-gradient(180deg, #5a5650 0%, #4e4a44 8%, #403c38 50%, #343030 92%, #2c2826 100%)'
              : 'linear-gradient(180deg, #8a857e 0%, #706b64 8%, #585450 50%, #464240 92%, #3a3836 100%)',
          boxShadow: active
            ? 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,250,240,0.05)'
            : `
              0 3px 0 rgba(20,15,5,0.5),
              0 4px 8px rgba(20,15,5,0.3),
              inset 0 1px 0 rgba(255,250,240,0.15),
              inset 0 -1px 0 rgba(0,0,0,0.2)
            `,
          transform: active ? 'translateY(2px)' : 'none',
        }}
        title={label}
      >
        {/* Top bevel highlight */}
        {!active && (
          <div className="absolute top-0 left-0 right-0 h-px rounded-t" style={{
            background: isRecord
              ? 'rgba(255,200,200,0.2)'
              : 'rgba(255,250,240,0.2)',
          }} />
        )}
        {children}
      </button>
      {label && (
        <span className="text-[8px] font-label uppercase tracking-wider text-engraved font-bold">
          {label}
        </span>
      )}
    </div>
  )
}

export default function TransportButtons({
  isRecording,
  isCountingIn,
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
  const recActive = isRecording || isCountingIn
  return (
    <div className="flex items-end gap-4 px-4 py-3">
      {/* REC */}
      <TransportButton
        onClick={recActive ? onStopRecording : onStartRecording}
        active={recActive}
        disabled={!hasArmedTrack}
        variant="record"
        label="Rec"
        width={62}
        ledColor={isCountingIn ? 'amber' : 'red'}
        ledActive={recActive}
        ledPulse={recActive}
      >
        <div className="w-4 h-4 rounded-full" style={{
          background: recActive
            ? 'radial-gradient(circle at 40% 35%, #ff6060, #cc3030 60%, #aa2020 100%)'
            : 'radial-gradient(circle at 40% 35%, #e05050, #b03030 60%, #882020 100%)',
          boxShadow: recActive ? '0 0 8px rgba(255,60,60,0.5)' : 'none',
        }} />
      </TransportButton>

      {/* REW */}
      <TransportButton
        onClick={() => onSeekTo(0)}
        disabled={loopDuration <= 0}
        label="Rew"
      >
        <svg width="16" height="12" viewBox="0 0 16 12" fill="rgba(255,250,240,0.8)">
          <polygon points="8,0 0,6 8,12" />
          <polygon points="16,0 8,6 16,12" />
        </svg>
      </TransportButton>

      {/* PLAY */}
      <TransportButton
        onClick={isPlaying ? onStop : onPlay}
        active={isPlaying}
        disabled={!hasRecordedTracks}
        label="Play"
        ledColor="green"
        ledActive={isPlaying}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="rgba(255,250,240,0.8)">
          <polygon points="3,0 14,7 3,14" />
        </svg>
      </TransportButton>

      {/* FF */}
      <TransportButton
        onClick={() => onSeekTo(loopDuration)}
        disabled={loopDuration <= 0}
        label="FF"
      >
        <svg width="16" height="12" viewBox="0 0 16 12" fill="rgba(255,250,240,0.8)">
          <polygon points="0,0 8,6 0,12" />
          <polygon points="8,0 16,6 8,12" />
        </svg>
      </TransportButton>

      {/* STOP */}
      <TransportButton
        onClick={recActive ? onStopRecording : onStop}
        disabled={!isPlaying && !recActive}
        label="Stop"
      >
        <div className="w-3.5 h-3.5 rounded-sm" style={{
          background: 'rgba(255,250,240,0.8)',
        }} />
      </TransportButton>
    </div>
  )
}
