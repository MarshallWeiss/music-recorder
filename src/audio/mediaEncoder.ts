/**
 * Encode an AudioBuffer to a compressed format using the browser's MediaRecorder API.
 * Returns a Blob in the requested format (WebM/Opus, OGG/Opus, M4A/AAC, etc).
 */

export interface ExportFormat {
  label: string
  mimeType: string
  ext: string
}

/** Detect which compressed audio formats the browser supports via MediaRecorder. */
export function getSupportedFormats(): ExportFormat[] {
  const candidates: ExportFormat[] = [
    { label: 'WebM', mimeType: 'audio/webm;codecs=opus', ext: 'webm' },
    { label: 'OGG', mimeType: 'audio/ogg;codecs=opus', ext: 'ogg' },
    { label: 'M4A', mimeType: 'audio/mp4', ext: 'm4a' },
  ]

  if (typeof MediaRecorder === 'undefined') return []

  return candidates.filter(f => MediaRecorder.isTypeSupported(f.mimeType))
}

/**
 * Encode an AudioBuffer to a compressed audio Blob via MediaRecorder.
 * Plays the buffer through an offline routing chain into a MediaStream,
 * records it in real-time, and resolves when complete.
 */
export function encodeCompressed(
  buffer: AudioBuffer,
  mimeType: string,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const ctx = new AudioContext({ sampleRate: buffer.sampleRate })
    const source = ctx.createBufferSource()
    source.buffer = buffer

    const dest = ctx.createMediaStreamDestination()
    source.connect(dest)

    const recorder = new MediaRecorder(dest.stream, { mimeType })
    const chunks: Blob[] = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    recorder.onstop = () => {
      ctx.close()
      resolve(new Blob(chunks, { type: mimeType }))
    }

    recorder.onerror = (e) => {
      ctx.close()
      reject(e)
    }

    recorder.start()
    source.start(0)

    // Stop recording when the buffer finishes playing
    source.onended = () => {
      // Small delay to ensure MediaRecorder captures trailing audio
      setTimeout(() => {
        recorder.stop()
        dest.stream.getTracks().forEach(t => t.stop())
      }, 100)
    }
  })
}
