const shortcuts = [
  ['Space', 'Play / stop'],
  ['R', 'Record'],
  ['1–4', 'Arm track'],
]

export default function ShortcutLegend() {
  return (
    <div className="shortcut-legend" aria-label="Keyboard shortcuts">
      {shortcuts.map(([key, label]) => (
        <span key={key} className="shortcut-item">
          <kbd>{key}</kbd>
          <span>{label}</span>
        </span>
      ))}
    </div>
  )
}
