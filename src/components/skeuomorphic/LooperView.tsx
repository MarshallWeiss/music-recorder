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
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Stomp button */}
      <StompButton looper={looper} onClick={onStompClick} />
    </div>
  )
}
