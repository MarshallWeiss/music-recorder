import { useEffect, useRef, useState } from 'react'
import { SKINS, SkinId } from '../../skins'

interface SessionMeta {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

interface ExportFormat {
  label: string
  mimeType: string
  ext: string
}

interface SessionDrawerProps {
  sessions: SessionMeta[]
  currentSessionId: string | null
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
  onSave: () => void
  exportFormats: ExportFormat[]
  onExport: (format: ExportFormat) => void
  isSaving: boolean
  isExporting: boolean
  hasRecordedTracks: boolean
  skin: SkinId
  onSetSkin: (skin: SkinId) => void
  machinePicker?: React.ReactNode
  children?: React.ReactNode
}

function MiniCassette({
  session,
  isCurrent,
  onLoad,
  onDelete,
}: {
  session: SessionMeta
  isCurrent: boolean
  onLoad: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`relative rounded p-2 cursor-pointer transition-all hover:brightness-110 ${
        isCurrent ? 'ring-1 ring-hw-400' : ''
      }`}
      style={{
        width: 150,
        height: 96,
        background: 'linear-gradient(180deg, #444038 0%, #3a3632 30%, #302c28 100%)',
        flexShrink: 0,
      }}
      onClick={onLoad}
    >
      {/* Mini reels */}
      <div className="flex justify-between px-4 mt-1">
        <div className="w-5 h-5 rounded-full" style={{ background: '#1a1816', border: '1px solid #555' }} />
        <div className="w-5 h-5 rounded-full" style={{ background: '#1a1816', border: '1px solid #555' }} />
      </div>

      {/* Label */}
      <div
        className="mx-1 mt-2 rounded-sm px-2 py-1"
        style={{ background: '#f0e8d0' }}
      >
        <div className="text-[10px] font-mono text-hw-800 truncate leading-tight">
          {session.name}
        </div>
        <div className="text-[10px] text-hw-500 leading-tight">
          {new Date(session.updatedAt).toLocaleDateString()}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (confirm('Delete this session?')) onDelete()
        }}
        className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[11px] leading-none text-hw-500 hover:text-red-400 hover:bg-black/30 transition-colors"
        title="Delete"
      >
        ×
      </button>

      {/* Current indicator */}
      {isCurrent && (
        <div className="absolute bottom-1 right-2 text-[10px] text-hw-400 uppercase tracking-wider font-bold">
          ▸
        </div>
      )}
    </div>
  )
}

export default function SessionDrawer({
  sessions,
  currentSessionId,
  onLoad,
  onDelete,
  onNew,
  onSave,
  exportFormats,
  onExport,
  isSaving,
  isExporting,
  hasRecordedTracks,
  skin,
  onSetSkin,
  machinePicker,
  children,
}: SessionDrawerProps) {
  const [open, setOpen] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close the drawer and export menu on outside click or Escape
  useEffect(() => {
    if (!open && !showExportMenu) return
    const close = () => {
      setOpen(false)
      setShowExportMenu(false)
    }
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, showExportMenu])

  return (
    <div className="relative" ref={rootRef}>
      {/* Trigger button */}
      <div className="session-bar flex items-center gap-2 px-3 py-1.5">
        <button
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={`px-3 py-1 rounded-sm text-[12px] font-label uppercase tracking-wider font-bold transition-all ${
            open ? 'shadow-button-down' : 'shadow-button-up'
          }`}
          style={{
            background: open
              ? 'linear-gradient(180deg, #a09888 0%, #908878 100%)'
              : 'linear-gradient(180deg, #c0b8a8 0%, #a8a090 100%)',
          }}
        >
          <span className="text-engraved">
            Tapes{sessions.length > 0 ? ` (${sessions.length})` : ''}
          </span>
        </button>

        {machinePicker}

        {/* Finish picker: swap the recorder's skin */}
        <div className="skin-picker" role="radiogroup" aria-label="Finish">
          <span className="text-engraved">Finish</span>
          {SKINS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={skin === option.id}
              aria-label={option.name}
              title={option.name}
              onClick={() => onSetSkin(option.id)}
              className={`skin-swatch ${skin === option.id ? 'is-selected' : ''}`}
              style={{ background: option.swatch }}
            />
          ))}
        </div>

        <div className="flex-1 flex justify-center min-w-0">{children}</div>

        {/* Action buttons */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-2.5 py-1 rounded-sm text-[12px] font-label uppercase tracking-wider font-bold shadow-button-up hover:brightness-110 transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(180deg, #c0b8a8 0%, #a8a090 100%)' }}
        >
          <span className="stable-label text-engraved">
            <span aria-hidden={isSaving} style={{ visibility: isSaving ? 'hidden' : 'visible' }}>Save</span>
            <span aria-hidden={!isSaving} style={{ visibility: isSaving ? 'visible' : 'hidden' }}>Saving...</span>
          </span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={isExporting || !hasRecordedTracks}
            className="px-2.5 py-1 rounded-sm text-[12px] font-label uppercase tracking-wider font-bold shadow-button-up hover:brightness-110 transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(180deg, #c0b8a8 0%, #a8a090 100%)' }}
          >
            <span className="stable-label text-engraved">
              <span aria-hidden={isExporting} style={{ visibility: isExporting ? 'hidden' : 'visible' }}>Export ▾</span>
              <span aria-hidden={!isExporting} style={{ visibility: isExporting ? 'visible' : 'hidden' }}>Exporting...</span>
            </span>
          </button>

          {showExportMenu && !isExporting && (
            <div
              className="absolute bottom-full mb-1 right-0 z-30 rounded shadow-lg py-1 min-w-[80px]"
              style={{ background: 'linear-gradient(180deg, #d8d0c0 0%, #c8c0b0 100%)' }}
            >
              {exportFormats.map((fmt) => (
                <button
                  key={fmt.ext}
                  onClick={() => {
                    setShowExportMenu(false)
                    onExport(fmt)
                  }}
                  className="w-full text-left px-3 py-1.5 text-[12px] font-label font-bold uppercase tracking-wider hover:bg-hw-300/50 transition-colors"
                  style={{ color: '#4a4438' }}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onNew}
          className="px-2.5 py-1 rounded-sm text-[12px] font-label uppercase tracking-wider font-bold shadow-button-up hover:brightness-110 transition-all"
          style={{ background: 'linear-gradient(180deg, #c0b8a8 0%, #a8a090 100%)' }}
        >
          <span className="text-engraved">New</span>
        </button>
      </div>

      {/* Drawer panel */}
      {open && (
        <div className="tape-drawer-panel">
          {sessions.length === 0 ? (
            <div className="text-[11px] text-hw-400 text-center py-5 font-label">
              No saved sessions. Record something and it will auto-save.
            </div>
          ) : (
            <div className="flex gap-2 pb-1">
              {sessions.map((s) => (
                <MiniCassette
                  key={s.id}
                  session={s}
                  isCurrent={s.id === currentSessionId}
                  onLoad={() => {
                    onLoad(s.id)
                    setOpen(false)
                  }}
                  onDelete={() => onDelete(s.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
