// Segment order: a (top), b (top right), c (bottom right), d (bottom), e (bottom left), f (top left), g (middle)
const DIGITS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
  '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g',
}

const DIGIT_W = 14
const DIGIT_H = 24
const T = 2.6 // segment thickness

const SEGMENTS: Record<string, { x: number; y: number; w: number; h: number }> = {
  a: { x: T * 0.7, y: 0, w: DIGIT_W - T * 1.4, h: T },
  g: { x: T * 0.7, y: (DIGIT_H - T) / 2, w: DIGIT_W - T * 1.4, h: T },
  d: { x: T * 0.7, y: DIGIT_H - T, w: DIGIT_W - T * 1.4, h: T },
  f: { x: 0, y: T * 0.7, w: T, h: DIGIT_H / 2 - T * 1.05 },
  b: { x: DIGIT_W - T, y: T * 0.7, w: T, h: DIGIT_H / 2 - T * 1.05 },
  e: { x: 0, y: DIGIT_H / 2 + T * 0.35, w: T, h: DIGIT_H / 2 - T * 1.05 },
  c: { x: DIGIT_W - T, y: DIGIT_H / 2 + T * 0.35, w: T, h: DIGIT_H / 2 - T * 1.05 },
}

interface SevenSegmentProps {
  value: string // digits, '-' and ':' only
  height?: number
  color?: string
}

/** A lit segment display, drawn as SVG so it needs no display font. */
export default function SevenSegment({ value, height = 26, color = '#f3c66a' }: SevenSegmentProps) {
  const gap = 4
  let x = 0
  const cells = value.split('').map((char, index) => {
    const cellX = x
    x += (char === ':' ? 6 : DIGIT_W) + gap
    return { char, cellX, index }
  })
  const width = x - gap

  return (
    <svg
      width={(width / DIGIT_H) * height}
      height={height}
      viewBox={`-2 0 ${width + 4} ${DIGIT_H}`}
      aria-hidden="true"
      style={{ filter: `drop-shadow(0 0 3px ${color}66)`, overflow: 'visible' }}
    >
      <g transform="skewX(-5)">
        {cells.map(({ char, cellX, index }) =>
          char === ':' ? (
            <g key={index} fill={color}>
              <rect x={cellX + 1.7} y={DIGIT_H * 0.28} width={T} height={T} rx={0.6} />
              <rect x={cellX + 1.7} y={DIGIT_H * 0.64} width={T} height={T} rx={0.6} />
            </g>
          ) : (
            <g key={index} transform={`translate(${cellX} 0)`}>
              {Object.entries(SEGMENTS).map(([name, seg]) => (
                <rect
                  key={name}
                  x={seg.x}
                  y={seg.y}
                  width={seg.w}
                  height={seg.h}
                  rx={1}
                  fill={color}
                  opacity={(DIGITS[char] ?? '').includes(name) ? 1 : 0.07}
                />
              ))}
            </g>
          ),
        )}
      </g>
    </svg>
  )
}
