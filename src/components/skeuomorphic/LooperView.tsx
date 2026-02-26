import { UseLooperReturn } from '../../hooks/useLooper'
import StompButton from './StompButton'

interface LooperViewProps {
  looper: UseLooperReturn
  onStompClick: () => void
}

export default function LooperView({
  looper,
  onStompClick,
}: LooperViewProps) {
  // Format time as M:SS
  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60)
    const secs = Math.floor(t % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col items-center gap-4 flex-1 justify-center">
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
