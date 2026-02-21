import { UseLooperReturn } from '../../hooks/useLooper'
import StompButton from './StompButton'
import CassetteDeck from './CassetteDeck'

interface LooperViewProps {
  looper: UseLooperReturn
  sessionName: string
  onSetSessionName: (name: string) => void
  onStompClick: () => void
}

export default function LooperView({
  looper,
  sessionName,
  onSetSessionName,
  onStompClick,
}: LooperViewProps) {
  // Format time as M:SS
  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60)
    const secs = Math.floor(t % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col items-center gap-4 flex-1 justify-center py-4">
      {/* Cassette deck */}
      <CassetteDeck
        isPlaying={looper.state === 'playing' || looper.state === 'overdubbing'}
        isRecording={looper.state === 'recording' || looper.state === 'overdubbing'}
        sessionName={sessionName}
        onSetSessionName={onSetSessionName}
        loopDuration={looper.loopDuration}
        currentTime={looper.currentTime}
      />

      {/* Loop time display */}
      {looper.loopDuration > 0 && (
        <div className="text-[10px] font-mono" style={{ color: 'rgba(180,170,150,0.5)' }}>
          {formatTime(looper.currentTime)} / {formatTime(looper.loopDuration)}
        </div>
      )}

      {/* Stomp button */}
      <StompButton looper={looper} onClick={onStompClick} />
    </div>
  )
}
