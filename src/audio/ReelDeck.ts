import { get, set, del } from 'idb-keyval'

/**
 * Tape engine for open-reel machines (first user: the Braun TG 60).
 *
 * Unlike the Porta Four's loop-based AudioEngine, this models a physical reel:
 * a fixed length of tape, a position on it, and a transport that plays, records
 * and winds. Audio is stored per unit of TAPE, not per second, so the same tape
 * played at half speed sounds an octave down, exactly as on the real machine.
 */

export type DeckSpeed = 0 | 9.5 | 19 // cm/s; 0 = mains off
export type TrackSelect = '1' | '2' | '1+2'
export type Transport = 'stopped' | 'playing' | 'recording' | 'rewinding' | 'forwarding'
export type EqStandard = 'nartb' | 'ccir'

const REFERENCE_SPEED = 19
/** Reel length in seconds at 19 cm/s (so twice that at 9.5). A real 18 cm reel runs far longer; this is what a browser can hold. */
export const REEL_SECONDS = 180
/** Winding runs this many times faster than playing at 19 cm/s. */
const WIND_FACTOR = 14
const STORAGE_KEY = 'braun-tg60-reel-v1'

export interface DeckSettings {
  speed: DeckSpeed
  eq: EqStandard
  /** 0 = freshly serviced, 1 = tired and worn. */
  condition: number
}

interface SavedReel {
  sampleRate: number
  usedEnd: number
  tracks: Float32Array[]
}

export interface AudioDevice {
  deviceId: string
  label: string
}

/** Peak speed deviation in percent for a serviced machine. Borrowed from the TG 1000 (DIN 45507): no TG 60 figure was found. */
function baseWobblePercent(speed: DeckSpeed) {
  return speed === 9.5 ? 0.09 : 0.05
}

function makeNoiseBuffer(ctx: BaseAudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
  return buffer
}

function makeSaturationCurve(drive: number) {
  const samples = 2048
  const curve = new Float32Array(samples)
  const norm = Math.tanh(drive)
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1
    curve[i] = Math.tanh(x * drive) / norm
  }
  return curve
}

interface TapeGraph {
  sources: AudioBufferSourceNode[]
  analysers: AnalyserNode[]
  stop: () => void
}

/**
 * Build the playback path: two half-track sources (track 1 left, track 2 right)
 * through the machine's character. Works on a live or an offline context, so
 * exports sound like what you heard.
 */
function buildTapeGraph(
  ctx: BaseAudioContext,
  buffers: AudioBuffer[],
  options: DeckSettings & { offsetSeconds: number; silentTracks: boolean[] },
): TapeGraph {
  const { speed, eq, condition, offsetSeconds, silentTracks } = options
  const rate = speed / REFERENCE_SPEED
  const started: AudioScheduledSourceNode[] = []
  const nodes: AudioNode[] = []

  const bus = ctx.createGain()

  // Tape saturation: gentle, symmetric (odd harmonics), harder on a worn machine
  const shaper = ctx.createWaveShaper()
  shaper.curve = makeSaturationCurve(1.2 + condition * 1.6)
  shaper.oversample = '2x'

  // Head bump: a small low-frequency lift that moves up as the tape slows
  const bump = ctx.createBiquadFilter()
  bump.type = 'peaking'
  bump.frequency.value = speed === 9.5 ? 95 : 65
  bump.Q.value = 0.9
  bump.gain.value = 2

  // Treble limit set by tape speed, lower again with worn heads
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = (speed === 9.5 ? 12500 : 16000) * (1 - 0.5 * condition)
  lowpass.Q.value = 0.6

  // Playback equalisation standard: modelled as a slight treble tilt
  const tilt = ctx.createBiquadFilter()
  tilt.type = 'highshelf'
  tilt.frequency.value = 4000
  tilt.gain.value = eq === 'nartb' ? 1.5 : 0

  bus.connect(shaper)
  shaper.connect(bump)
  bump.connect(lowpass)
  lowpass.connect(tilt)
  tilt.connect(ctx.destination)
  nodes.push(bus, shaper, bump, lowpass, tilt)

  // Speed wobble, in cents, applied to every track together (they share one tape)
  const peakCents = 17.3 * baseWobblePercent(speed) * (1 + 9 * condition * condition)
  const wobble = ctx.createGain() // sums the modulators; fans out to each source's detune
  wobble.gain.value = 1
  nodes.push(wobble)

  const addOscillator = (hz: number, cents: number) => {
    const osc = ctx.createOscillator()
    osc.frequency.value = hz
    const depth = ctx.createGain()
    depth.gain.value = cents
    osc.connect(depth)
    depth.connect(wobble)
    osc.start()
    started.push(osc)
    nodes.push(depth)
  }
  // Wow at the reel's rotation rate (19 cm/s over a ~5 cm pack radius is about 0.6 Hz)
  addOscillator(0.6 * rate, peakCents * 0.55)
  // Flutter at the capstan's rotation rate and its second harmonic
  addOscillator(10 * rate, peakCents * 0.22)
  addOscillator(20 * rate, peakCents * 0.1)

  // Slow random drift so the wobble never repeats exactly
  const drift = ctx.createBufferSource()
  drift.buffer = makeNoiseBuffer(ctx, 7)
  drift.loop = true
  const driftFilter = ctx.createBiquadFilter()
  driftFilter.type = 'lowpass'
  driftFilter.frequency.value = 1.2
  const driftDepth = ctx.createGain()
  driftDepth.gain.value = peakCents * 0.45 * 130 // low-passed noise is tiny; scale it back up
  drift.connect(driftFilter)
  driftFilter.connect(driftDepth)
  driftDepth.connect(wobble)
  drift.start()
  started.push(drift)
  nodes.push(driftFilter, driftDepth)

  // Tape hiss: only while tape is moving past the head
  const hiss = ctx.createBufferSource()
  hiss.buffer = makeNoiseBuffer(ctx, 5)
  hiss.loop = true
  const hissFilter = ctx.createBiquadFilter()
  hissFilter.type = 'highpass'
  hissFilter.frequency.value = speed === 9.5 ? 500 : 900
  const hissGain = ctx.createGain()
  hissGain.gain.value = 0.0016 * (speed === 9.5 ? 1.4 : 1) * (1 + 6 * condition)
  hiss.connect(hissFilter)
  hissFilter.connect(hissGain)
  hissGain.connect(ctx.destination)
  hiss.start()
  started.push(hiss)
  nodes.push(hissFilter, hissGain)

  const sources: AudioBufferSourceNode[] = []
  const analysers: AnalyserNode[] = []
  buffers.forEach((buffer, index) => {
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = rate
    wobble.connect(source.detune)

    const gain = ctx.createGain()
    gain.gain.value = silentTracks[index] ? 0 : 1
    const pan = ctx.createStereoPanner()
    pan.pan.value = index === 0 ? -1 : 1 // half-track stereo: track 1 left, track 2 right
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256

    source.connect(gain)
    gain.connect(analyser)
    gain.connect(pan)
    pan.connect(bus)
    source.start(0, Math.max(0, offsetSeconds))

    sources.push(source)
    started.push(source)
    analysers.push(analyser)
    nodes.push(gain, pan, analyser)
  })

  return {
    sources,
    analysers,
    stop: () => {
      for (const node of started) {
        try { node.stop() } catch { /* already stopped */ }
      }
      for (const node of nodes) {
        try { node.disconnect() } catch { /* already disconnected */ }
      }
    },
  }
}

function rmsLevel(analyser: AnalyserNode | null, scratch: Uint8Array<ArrayBuffer>) {
  if (!analyser) return 0
  analyser.getByteTimeDomainData(scratch)
  let sum = 0
  for (let i = 0; i < scratch.length; i += 1) {
    const v = (scratch[i] - 128) / 128
    sum += v * v
  }
  return Math.min(1, Math.sqrt(sum / scratch.length) * 3)
}

export class ReelDeck {
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private inputGain: GainNode | null = null
  private inputAnalyser: AnalyserNode | null = null
  private scratch = new Uint8Array(new ArrayBuffer(128))

  private tapeBuffers: AudioBuffer[] = []
  private tapeLength = 0
  /** Furthest sample ever recorded; nothing beyond it needs saving or exporting. */
  private usedEnd = 0

  private position = 0 // in tape samples
  private transport: Transport = 'stopped'
  private settings: DeckSettings = { speed: 0, eq: 'nartb', condition: 0.25 }
  private trackSelect: TrackSelect = '1'
  private level = 5

  private graph: TapeGraph | null = null
  private runStartTime = 0 // context time (or performance time while winding) at which the run began
  private runStartPosition = 0

  private processor: ScriptProcessorNode | null = null
  private chunks: Float32Array[] = []
  private capturedSamples = 0
  private recordTracks: number[] = []
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  // ---- power and input

  isPowered() {
    return this.settings.speed !== 0 && !!this.ctx
  }

  async listDevices(): Promise<AudioDevice[]> {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
      .filter(d => d.kind === 'audioinput')
      .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Input ${i + 1}` }))
  }

  /** Switch the mains on at a speed. Must be called from a user gesture the first time. */
  async powerOn(speed: Exclude<DeckSpeed, 0>, deviceId?: string) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser cannot access audio inputs.')
    }
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') await this.ctx.resume()

    if (!this.stream) await this.openInput(deviceId)

    if (this.tapeBuffers.length === 0) {
      this.tapeLength = Math.floor(REEL_SECONDS * this.ctx.sampleRate)
      this.tapeBuffers = [0, 1].map(() => this.ctx!.createBuffer(1, this.tapeLength, this.ctx!.sampleRate))
      await this.loadReel()
    }
    this.settings.speed = speed
  }

  async openInput(deviceId?: string) {
    if (!this.ctx) return
    this.stream?.getTracks().forEach(t => t.stop())
    this.sourceNode?.disconnect()

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
    this.sourceNode = this.ctx.createMediaStreamSource(this.stream)
    if (!this.inputGain) {
      this.inputGain = this.ctx.createGain()
      this.inputAnalyser = this.ctx.createAnalyser()
      this.inputAnalyser.fftSize = 256
      this.inputGain.connect(this.inputAnalyser)
    }
    this.sourceNode.connect(this.inputGain)
    this.applyLevel()
  }

  powerOff() {
    this.stop()
    this.settings.speed = 0
    this.stream?.getTracks().forEach(t => t.stop())
    this.sourceNode?.disconnect()
    this.stream = null
    this.sourceNode = null
    void this.ctx?.suspend()
  }

  destroy() {
    this.stop()
    this.stream?.getTracks().forEach(t => t.stop())
    if (this.saveTimer) clearTimeout(this.saveTimer)
    void this.ctx?.close()
    this.ctx = null
  }

  // ---- settings

  getSettings(): DeckSettings {
    return { ...this.settings }
  }

  /** Change speed while powered. A moving tape carries on at the new speed; a recording is ended first. */
  setSpeed(speed: Exclude<DeckSpeed, 0>) {
    if (this.settings.speed === speed) return
    const wasPlaying = this.transport === 'playing'
    if (this.transport === 'recording' || wasPlaying) this.stop()
    this.settings.speed = speed
    if (wasPlaying) this.play()
  }

  setEq(eq: EqStandard) {
    this.settings.eq = eq
    this.restartIfPlaying()
  }

  setCondition(condition: number) {
    this.settings.condition = Math.max(0, Math.min(1, condition))
    this.restartIfPlaying()
  }

  setTrackSelect(select: TrackSelect) {
    if (this.transport === 'recording') return
    this.trackSelect = select
  }

  getTrackSelect() {
    return this.trackSelect
  }

  /** Record level, 0 to 10 as engraved around the knob. 5 is roughly unity for a typical microphone. */
  setLevel(level: number) {
    this.level = Math.max(0, Math.min(10, level))
    this.applyLevel()
  }

  getLevel() {
    return this.level
  }

  private applyLevel() {
    if (this.inputGain) this.inputGain.gain.value = Math.pow(this.level / 5, 2) * 3
  }

  private restartIfPlaying() {
    if (this.transport !== 'playing') return
    this.stop()
    this.play()
  }

  // ---- transport

  getTransport() {
    return this.transport
  }

  private get rate() {
    return this.settings.speed / REFERENCE_SPEED
  }

  /** Current position in tape samples, derived from the running clock. */
  getPosition() {
    if (!this.ctx) return this.position
    if (this.transport === 'playing' || this.transport === 'recording') {
      const elapsed = this.ctx.currentTime - this.runStartTime
      return Math.min(this.tapeLength, this.runStartPosition + elapsed * this.rate * this.ctx.sampleRate)
    }
    if (this.transport === 'rewinding' || this.transport === 'forwarding') {
      const elapsed = (performance.now() - this.runStartTime) / 1000
      const direction = this.transport === 'rewinding' ? -1 : 1
      const moved = direction * elapsed * WIND_FACTOR * this.ctx.sampleRate
      return Math.max(0, Math.min(this.tapeLength, this.runStartPosition + moved))
    }
    return this.position
  }

  /** 0 at the start of the reel, 1 at the end. */
  getPositionFraction() {
    return this.tapeLength > 0 ? this.getPosition() / this.tapeLength : 0
  }

  getPositionSeconds() {
    return this.ctx ? this.getPosition() / this.ctx.sampleRate : 0
  }

  hasRecording() {
    return this.usedEnd > 0
  }

  play() {
    if (!this.ctx || !this.isPowered() || this.transport !== 'stopped') return
    if (this.position >= this.tapeLength - 1) return
    this.startGraph([false, false])
    this.transport = 'playing'
  }

  /** Start recording on the selected track(s). The other track plays so you can overdub against it. */
  record() {
    if (!this.ctx || !this.inputGain || !this.isPowered() || this.transport !== 'stopped') return
    if (this.position >= this.tapeLength - 1) return

    this.recordTracks = this.trackSelect === '1' ? [0] : this.trackSelect === '2' ? [1] : [0, 1]
    this.chunks = []
    this.capturedSamples = 0

    this.processor = this.ctx.createScriptProcessor(4096, 1, 1)
    this.processor.onaudioprocess = (event) => {
      if (this.transport !== 'recording') return
      const chunk = new Float32Array(event.inputBuffer.getChannelData(0))
      this.chunks.push(chunk)
      this.capturedSamples += chunk.length
    }
    this.inputGain.connect(this.processor)
    this.processor.connect(this.ctx.destination) // required for the node to run; it outputs silence

    this.startGraph([this.recordTracks.includes(0), this.recordTracks.includes(1)])
    this.transport = 'recording'
  }

  rewind() {
    this.startWinding('rewinding')
  }

  fastForward() {
    this.startWinding('forwarding')
  }

  private startWinding(direction: 'rewinding' | 'forwarding') {
    if (!this.isPowered()) return
    if (this.transport !== 'stopped') this.stop()
    this.runStartTime = performance.now()
    this.runStartPosition = this.position
    this.transport = direction
  }

  private startGraph(silentTracks: boolean[]) {
    if (!this.ctx) return
    this.graph = buildTapeGraph(this.ctx, this.tapeBuffers, {
      ...this.settings,
      offsetSeconds: this.position / this.ctx.sampleRate,
      silentTracks,
    })
    this.runStartTime = this.ctx.currentTime
    this.runStartPosition = this.position
  }

  stop() {
    if (this.transport === 'stopped') return
    const endPosition = this.getPosition()
    const wasRecording = this.transport === 'recording'
    const startPosition = this.runStartPosition
    const rate = this.rate

    this.graph?.stop()
    this.graph = null
    this.transport = 'stopped'
    this.position = endPosition

    if (wasRecording) this.commitRecording(startPosition, rate)
  }

  /** Called every frame by the UI: ends a run when the tape runs out. Returns true if it stopped something. */
  tick() {
    if (this.transport === 'stopped') return false
    const position = this.getPosition()
    const atEnd = position >= this.tapeLength - 1
    const atStart = position <= 0
    if ((this.transport === 'rewinding' && atStart) || (this.transport !== 'rewinding' && atEnd)) {
      this.stop()
      return true
    }
    return false
  }

  private commitRecording(startPosition: number, rate: number) {
    if (!this.ctx) return
    if (this.processor) {
      this.processor.disconnect()
      this.processor.onaudioprocess = null
      this.inputGain?.disconnect(this.processor)
      this.processor = null
    }
    if (this.chunks.length === 0) return

    const captured = new Float32Array(this.capturedSamples)
    let offset = 0
    for (const chunk of this.chunks) {
      captured.set(chunk, offset)
      offset += chunk.length
    }
    this.chunks = []

    // Input arrives late by the OS pipeline plus one processor block: drop that much from the front
    const latency = Math.round(((this.ctx.baseLatency ?? 0) + 4096 / this.ctx.sampleRate) * this.ctx.sampleRate)
    const audio = latency < captured.length ? captured.subarray(latency) : captured

    // Lay the take onto tape. At 9.5 cm/s one second of sound covers half the tape,
    // so two input samples share one tape sample (which also halves the bandwidth, as on the machine).
    const start = Math.floor(startPosition)
    const tapeSamples = Math.min(Math.floor(audio.length * rate), this.tapeLength - start)
    if (tapeSamples <= 0) return

    const written = new Float32Array(tapeSamples)
    const step = 1 / rate
    for (let i = 0; i < tapeSamples; i += 1) {
      const from = Math.floor(i * step)
      const to = Math.min(audio.length, Math.floor((i + 1) * step))
      let sum = 0
      for (let j = from; j < to; j += 1) sum += audio[j]
      written[i] = to > from ? sum / (to - from) : audio[Math.min(audio.length - 1, from)]
    }
    for (const track of this.recordTracks) {
      this.tapeBuffers[track].getChannelData(0).set(written, start)
    }
    this.usedEnd = Math.max(this.usedEnd, start + tapeSamples)
    this.scheduleSave()
  }

  // ---- metering

  /** Levels for the two indicators, 0 to 1. Shows the input on tracks set to record, playback otherwise. */
  getLevels(): [number, number] {
    if (!this.isPowered()) return [0, 0]
    const input = rmsLevel(this.inputAnalyser, this.scratch)
    const selected = [this.trackSelect !== '2', this.trackSelect !== '1']
    const moving = this.transport === 'playing' || this.transport === 'recording'
    return [0, 1].map((track) => {
      const showsInput = this.transport === 'recording'
        ? this.recordTracks.includes(track)
        : this.transport === 'stopped' && selected[track]
      if (showsInput) return input
      if (moving && this.graph) return rmsLevel(this.graph.analysers[track], this.scratch)
      return 0
    }) as [number, number]
  }

  // ---- the reel: erase, save, load, export

  /** Thread a blank tape: everything on the current reel is lost. */
  async newReel() {
    this.stop()
    for (const buffer of this.tapeBuffers) buffer.getChannelData(0).fill(0)
    this.usedEnd = 0
    this.position = 0
    await del(STORAGE_KEY)
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => { void this.saveReel() }, 600)
  }

  private async saveReel() {
    if (!this.ctx || this.usedEnd === 0) return
    const reel: SavedReel = {
      sampleRate: this.ctx.sampleRate,
      usedEnd: this.usedEnd,
      tracks: this.tapeBuffers.map(buffer => buffer.getChannelData(0).slice(0, this.usedEnd)),
    }
    try { await set(STORAGE_KEY, reel) } catch { /* storage full or unavailable: the reel stays in memory */ }
  }

  private async loadReel() {
    if (!this.ctx) return
    try {
      const reel = await get<SavedReel>(STORAGE_KEY)
      if (!reel || reel.sampleRate !== this.ctx.sampleRate) return
      reel.tracks.forEach((data, index) => {
        this.tapeBuffers[index]?.getChannelData(0).set(data.subarray(0, this.tapeLength))
      })
      this.usedEnd = Math.min(reel.usedEnd, this.tapeLength)
    } catch { /* nothing saved */ }
  }

  /** Render the recorded part of the reel, at the current speed and with the machine's sound, to a stereo buffer. */
  async renderMix(): Promise<AudioBuffer | null> {
    if (!this.ctx || this.usedEnd === 0 || this.settings.speed === 0) return null
    const sampleRate = this.ctx.sampleRate
    const frames = Math.ceil(this.usedEnd / this.rate)
    const offline = new OfflineAudioContext(2, frames, sampleRate)
    const buffers = this.tapeBuffers.map((buffer) => {
      const copy = offline.createBuffer(1, this.usedEnd, sampleRate)
      copy.getChannelData(0).set(buffer.getChannelData(0).subarray(0, this.usedEnd))
      return copy
    })
    buildTapeGraph(offline, buffers, { ...this.settings, offsetSeconds: 0, silentTracks: [false, false] })
    return offline.startRendering()
  }
}
