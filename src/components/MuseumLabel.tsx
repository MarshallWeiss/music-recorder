import { useEffect, useRef } from 'react'
import museum from '../data/museum.json'
import { MachineId } from '../machines'
import '../styles/museum.css'

interface Recording {
  artist: string
  title: string
  year: number
  note: string
}

interface MuseumEntry {
  name: string
  byline: string
  facts: string[][]
  about: string[]
  significance: string
  recordingsHeading: string
  recordings: Recording[]
  recordingsNote: string
  reproduction: string
  sources: { label: string; url: string }[]
}

interface MuseumLabelProps {
  machine: MachineId
  open: boolean
  onClose: () => void
}

/**
 * The wall label beside the exhibit: what the machine is and why it matters.
 * All of its text lives in src/data/museum.json.
 */
export default function MuseumLabel({ machine, open, onClose }: MuseumLabelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const entry = (museum as Record<string, MuseumEntry>)[machine]

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  if (!entry) return null

  return (
    <dialog
      ref={dialogRef}
      className="museum-label"
      aria-labelledby="museum-label-title"
      onClose={onClose}
      // Keys pressed while reading must not reach the recorder's shortcuts (Space, R)
      onKeyDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <article>
        <header>
          <h2 id="museum-label-title">{entry.name}</h2>
          <p className="museum-byline">{entry.byline}</p>
          <button type="button" className="museum-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <dl className="museum-facts">
          {entry.facts.map(([term, value]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        {entry.about.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}

        <h3>Why it matters</h3>
        <p>{entry.significance}</p>

        <h3>{entry.recordingsHeading}</h3>
        {entry.recordings.length > 0 && (
          <ul className="museum-recordings">
            {entry.recordings.map((recording) => (
              <li key={`${recording.artist}-${recording.title}`}>
                <span className="museum-recording-title">
                  {recording.artist}, <cite>{recording.title}</cite> ({recording.year})
                </span>
                {recording.note && <span className="museum-recording-note">{recording.note}</span>}
              </li>
            ))}
          </ul>
        )}
        {entry.recordingsNote && <p>{entry.recordingsNote}</p>}

        {entry.reproduction && <p className="museum-small">{entry.reproduction}</p>}

        <p className="museum-small">
          Sources:{' '}
          {entry.sources.map((source, index) => (
            <span key={source.url}>
              {index > 0 && ', '}
              <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
            </span>
          ))}
        </p>
      </article>
    </dialog>
  )
}
