interface TapeCounterProps {
  currentTime: number
  loopDuration: number
}

function CounterDigit({ digit }: { digit: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-sm"
      style={{
        width: 26,
        height: 34,
        background: '#0a0806',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <span className="font-mono text-lg text-hw-100 font-bold leading-none">
        {digit}
      </span>
    </div>
  )
}

export default function TapeCounter({ currentTime, loopDuration }: TapeCounterProps) {
  // Display as M:SS format
  const minutes = Math.floor(currentTime / 60)
  const seconds = Math.floor(currentTime % 60)
  const digits = `${minutes}${seconds.toString().padStart(2, '0')}`

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex gap-0.5 p-1.5 rounded shadow-inset-groove" style={{ background: '#1a1610' }}>
        {digits.split('').map((d, i) => (
          <CounterDigit key={i} digit={d} />
        ))}
      </div>
      <span className="text-[8px] font-label uppercase tracking-wider text-engraved font-bold">
        Counter
      </span>
    </div>
  )
}
