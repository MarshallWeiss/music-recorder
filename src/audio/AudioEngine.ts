/**
 * Core audio engine for the 4-track recorder.
 * Manages AudioContext, mic input, recording (raw PCM), and playback.
 * No React dependency — wrapped by useAudioEngine hook.
 */

export interface AudioDevice {
  deviceId: string
  label: string
}

export class AudioEngine {
  private context: AudioContext | null = null
  private stream: MediaStream | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private inputGainNode: GainNode | null = null
  private scriptProcessor: ScriptProcessorNode | null = null
  private recordingChunks: Float32Array[] = []
  private recordingTotalSamples = 0
  private recordingPreview: { min: number; max: number }[] = []
  private isCurrentlyRecording = false
  private playbackSources: AudioBufferSourceNode[] = []
  private playbackGains: GainNode[] = []
  private playbackPans: StereoPannerNode[] = []
  private analysers: AnalyserNode[] = []
  private isCurrentlyPlaying = false
  private playStartTime = 0
  private playStartOffset = 0
  private loopDuration = 0
  private animFrameId: number | null = null
  private lastPlayTracks: { buffer: AudioBuffer; volume: number; pan: number; muted: boolean; solo: boolean; startOffset?: number }[] = []
  private lastPlayLoop = true

  // Metronome
  private metronomeBpm = 120
  private metronomeBeatsPerBar = 4
  private metronomeEnabled = false
  private metronomeIntervalId: ReturnType<typeof setTimeout> | null = null
  private metronomeNextBeatTime = 0
  private metronomeBeatIndex = 0
  private metronomeVolume = 0.5

  // Callbacks
  onPlaybackEnd: (() => void) | null = null
  onTimeUpdate: ((currentTime: number) => void) | null = null
  onBeat: ((beat: number, isDownbeat: boolean) => void) | null = null

  async init(): Promise<AudioContext> {
    if (!this.context) {
      this.context = new AudioContext({ sampleRate: 44100 })
    }
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }
    return this.context
  }

  getContext(): AudioContext | null {
    return this.context
  }

  getSampleRate(): number {
    return this.context?.sampleRate ?? 44100
  }

  async enumerateDevices(): Promise<AudioDevice[]> {
    // Need to request mic first to get labeled devices
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      tempStream.getTracks().forEach(t => t.stop())
    } catch {
      // Permission denied — return empty
      return []
    }

    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
      .filter(d => d.kind === 'audioinput')
      .map(d => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${d.deviceId.slice(0, 6)}`,
      }))
  }

  async selectDevice(deviceId: string): Promise<void> {
    // Stop existing stream
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop())
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect()
    }

    await this.init()

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: deviceId },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 44100,
      },
    })

    this.sourceNode = this.context!.createMediaStreamSource(this.stream)

    // Create input gain node for controlling recording level
    this.inputGainNode = this.context!.createGain()
    this.inputGainNode.gain.value = 1.0
    this.sourceNode.connect(this.inputGainNode)
  }

  /**
   * Start recording raw PCM audio.
   * If monitorBuffers are provided, they'll play during recording (overdub).
   * playOffset: start monitors and time tracking from this position in the loop.
   */
  startRecording(
    monitorBuffers?: { buffer: AudioBuffer; volume: number; pan: number; muted: boolean; startOffset?: number }[],
    loopDuration?: number,
    playOffset?: number,
  ): void {
    if (!this.context || !this.sourceNode) {
      throw new Error('AudioEngine not initialized or no device selected')
    }
    if (this.isCurrentlyRecording) return

    this.isCurrentlyRecording = true
    this.recordingChunks = []
    this.recordingTotalSamples = 0
    this.recordingPreview = []
    this.loopDuration = loopDuration ?? 0

    // ScriptProcessorNode captures raw PCM
    // Buffer size 4096 is a good balance of latency vs CPU
    this.scriptProcessor = this.context.createScriptProcessor(4096, 1, 1)

    const maxSamples = loopDuration
      ? Math.ceil(loopDuration * this.context.sampleRate)
      : Infinity

    // Preview: fixed 800 bins. Each bin covers samplesPerBin samples.
    const PREVIEW_BINS = 800
    const expectedSamples = maxSamples !== Infinity ? maxSamples : this.context.sampleRate * 60 // assume 60s max for free recording
    const samplesPerBin = Math.max(1, Math.floor(expectedSamples / PREVIEW_BINS))

    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.isCurrentlyRecording) return
      const input = e.inputBuffer.getChannelData(0)
      const chunk = new Float32Array(input)

      if (this.recordingTotalSamples + chunk.length >= maxSamples && maxSamples !== Infinity) {
        const remaining = maxSamples - this.recordingTotalSamples
        if (remaining > 0) {
          const trimmed = chunk.slice(0, remaining)
          this.recordingChunks.push(trimmed)
          this.updatePreview(trimmed, samplesPerBin)
          this.recordingTotalSamples += remaining
        }
        // Signal auto-stop without clearing chunks — hook will call stopRecording() to get the buffer
        this.isCurrentlyRecording = false
        return
      }

      this.recordingChunks.push(chunk)
      this.updatePreview(chunk, samplesPerBin)
      this.recordingTotalSamples += chunk.length
    }

    this.inputGainNode!.connect(this.scriptProcessor)
    this.scriptProcessor.connect(this.context.destination) // Required for processing to work

    // Start monitor playback (overdub: hear existing tracks while recording)
    const offset = playOffset ?? 0
    if (monitorBuffers && monitorBuffers.length > 0) {
      this.startMonitorPlayback(monitorBuffers, offset)
    }

    // Start time tracking from the current position
    this.playStartOffset = offset
    this.playStartTime = this.context.currentTime
    this.startTimeTracking()
  }

  /**
   * Stop recording and return the captured audio as an AudioBuffer.
   */
  stopRecording(): AudioBuffer | null {
    if (!this.context) return null

    this.isCurrentlyRecording = false

    // Disconnect recording pipeline
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect()
      this.scriptProcessor = null
    }

    // Stop monitor playback
    this.stopAllPlayback()

    if (this.recordingChunks.length === 0) return null

    // Concatenate chunks into a single AudioBuffer
    const totalLength = this.recordingChunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const buffer = this.context.createBuffer(1, totalLength, this.context.sampleRate)
    const channelData = buffer.getChannelData(0)

    let offset = 0
    for (const chunk of this.recordingChunks) {
      channelData.set(chunk, offset)
      offset += chunk.length
    }

    this.recordingChunks = []
    return buffer
  }

  /**
   * Play multiple track buffers simultaneously with mixing.
   * @param offset Start playback from this time (seconds) into the buffer.
   */
  playAll(
    tracks: { buffer: AudioBuffer; volume: number; pan: number; muted: boolean; solo: boolean; startOffset?: number }[],
    loop: boolean = true,
    offset: number = 0,
  ): void {
    if (!this.context) return
    this.stopAllPlayback()

    // Store for re-seeking
    this.lastPlayTracks = tracks
    this.lastPlayLoop = loop

    const hasSolo = tracks.some(t => t.solo)
    this.isCurrentlyPlaying = true
    this.playStartOffset = offset
    this.playStartTime = this.context.currentTime

    for (const track of tracks) {
      if (!track.buffer) continue
      const shouldPlay = hasSolo ? track.solo : !track.muted

      const source = this.context.createBufferSource()
      source.buffer = track.buffer
      source.loop = loop

      const gain = this.context.createGain()
      gain.gain.value = shouldPlay ? track.volume : 0

      const pan = this.context.createStereoPanner()
      pan.pan.value = track.pan

      const analyser = this.context.createAnalyser()
      analyser.fftSize = 256

      source.connect(gain)
      gain.connect(pan)
      pan.connect(analyser)
      analyser.connect(this.context.destination)

      // Account for per-track offset
      const trackOffset = track.startOffset ?? 0
      const bufferPos = ((offset - trackOffset) % track.buffer.duration + track.buffer.duration) % track.buffer.duration
      source.start(0, bufferPos)

      this.playbackSources.push(source)
      this.playbackGains.push(gain)
      this.playbackPans.push(pan)
      this.analysers.push(analyser)
    }

    this.startTimeTracking()
  }

  /**
   * Seek to a specific time position. If playing, restarts playback from the new position.
   * Returns the new time for UI state updates.
   */
  seekTo(time: number): number {
    if (!this.context) return 0
    const clampedTime = this.loopDuration > 0
      ? Math.max(0, Math.min(time, this.loopDuration))
      : Math.max(0, time)

    if (this.isCurrentlyPlaying && this.lastPlayTracks.length > 0) {
      // Restart playback from the new offset
      this.playAll(this.lastPlayTracks, this.lastPlayLoop, clampedTime)
    } else {
      // Not playing — just update the stored offset so getCurrentTime reflects it
      this.playStartOffset = clampedTime
      this.playStartTime = this.context.currentTime
    }

    return clampedTime
  }

  /**
   * Stop all playback.
   */
  stopAllPlayback(): void {
    this.isCurrentlyPlaying = false
    for (const source of this.playbackSources) {
      try { source.stop() } catch { /* already stopped */ }
    }
    this.playbackSources = []
    this.playbackGains = []
    this.playbackPans = []
    this.analysers = []
    this.stopTimeTracking()
  }

  /**
   * Update volume for a playing track.
   */
  setTrackVolume(index: number, volume: number): void {
    if (this.playbackGains[index]) {
      this.playbackGains[index].gain.setTargetAtTime(volume, this.context!.currentTime, 0.01)
    }
  }

  /**
   * Update pan for a playing track.
   */
  setTrackPan(index: number, pan: number): void {
    if (this.playbackPans[index]) {
      this.playbackPans[index].pan.setTargetAtTime(pan, this.context!.currentTime, 0.01)
    }
  }

  /**
   * Set input gain (recording level). 1.0 = unity, 2.0 = +6dB, etc.
   */
  setInputGain(gain: number): void {
    if (this.inputGainNode) {
      this.inputGainNode.gain.value = gain
    }
  }

  getInputGain(): number {
    return this.inputGainNode?.gain.value ?? 1.0
  }

  // --- Metronome ---

  setBpm(bpm: number): void {
    this.metronomeBpm = Math.max(30, Math.min(300, bpm))
  }

  getBpm(): number {
    return this.metronomeBpm
  }

  setBeatsPerBar(beats: number): void {
    this.metronomeBeatsPerBar = beats
  }

  getBeatsPerBar(): number {
    return this.metronomeBeatsPerBar
  }

  setMetronomeVolume(volume: number): void {
    this.metronomeVolume = volume
  }

  /**
   * Get the loop duration for a given number of bars at current tempo.
   */
  getBarDuration(): number {
    return (60 / this.metronomeBpm) * this.metronomeBeatsPerBar
  }

  getBarsForDuration(duration: number): number {
    return duration / this.getBarDuration()
  }

  /**
   * Start the metronome. Uses Web Audio scheduling for sample-accurate timing.
   */
  startMetronome(): void {
    if (!this.context || this.metronomeEnabled) return
    this.metronomeEnabled = true
    this.metronomeBeatIndex = 0
    this.metronomeNextBeatTime = this.context.currentTime

    // Use a lookahead scheduler: check every 25ms, schedule 100ms ahead
    const scheduleAhead = 0.1
    const checkInterval = 25

    this.metronomeIntervalId = setInterval(() => {
      if (!this.context || !this.metronomeEnabled) return
      const secondsPerBeat = 60 / this.metronomeBpm

      while (this.metronomeNextBeatTime < this.context.currentTime + scheduleAhead) {
        this.scheduleClick(this.metronomeNextBeatTime, this.metronomeBeatIndex % this.metronomeBeatsPerBar === 0)

        // Fire beat callback
        if (this.onBeat) {
          const beat = this.metronomeBeatIndex % this.metronomeBeatsPerBar
          this.onBeat(beat, beat === 0)
        }

        this.metronomeBeatIndex++
        this.metronomeNextBeatTime += secondsPerBeat
      }
    }, checkInterval)
  }

  stopMetronome(): void {
    this.metronomeEnabled = false
    if (this.metronomeIntervalId !== null) {
      clearInterval(this.metronomeIntervalId)
      this.metronomeIntervalId = null
    }
  }

  isMetronomeRunning(): boolean {
    return this.metronomeEnabled
  }

  /**
   * Get the live recording waveform preview (array of min/max per bin).
   */
  getRecordingPreview(): { min: number; max: number }[] {
    return this.recordingPreview
  }

  /**
   * Get analyser node for a track (for VU meters).
   */
  getAnalyser(index: number): AnalyserNode | null {
    return this.analysers[index] ?? null
  }

  /**
   * Get current playback position within the loop (0 to loopDuration).
   */
  getCurrentTime(): number {
    if (!this.context) return 0
    if (!this.isCurrentlyPlaying && !this.isCurrentlyRecording) {
      // Return the stored seek position when stopped
      return this.playStartOffset
    }
    const elapsed = this.context.currentTime - this.playStartTime + this.playStartOffset
    if (this.loopDuration > 0) {
      return elapsed % this.loopDuration
    }
    return elapsed
  }

  isRecording(): boolean {
    return this.isCurrentlyRecording
  }

  isPlaying(): boolean {
    return this.isCurrentlyPlaying
  }

  /**
   * Create an AudioBuffer from serialized channel data.
   */
  createBufferFromData(channelData: number[][], sampleRate: number): AudioBuffer {
    const ctx = this.context ?? new AudioContext({ sampleRate })
    const buffer = ctx.createBuffer(
      channelData.length,
      channelData[0].length,
      sampleRate,
    )
    for (let ch = 0; ch < channelData.length; ch++) {
      buffer.getChannelData(ch).set(new Float32Array(channelData[ch]))
    }
    return buffer
  }

  /**
   * Serialize an AudioBuffer to plain arrays for storage.
   */
  serializeBuffer(buffer: AudioBuffer): number[][] {
    const data: number[][] = []
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      data.push(Array.from(buffer.getChannelData(ch)))
    }
    return data
  }

  destroy(): void {
    this.stopAllPlayback()
    this.stopMetronome()
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop())
    }
    if (this.context) {
      this.context.close()
    }
  }

  // --- Private ---

  private scheduleClick(time: number, isDownbeat: boolean): void {
    if (!this.context) return

    // Higher pitch for downbeat (1000Hz), lower for other beats (800Hz)
    const freq = isDownbeat ? 1000 : 800
    const duration = 0.03

    const osc = this.context.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq

    const gain = this.context.createGain()
    gain.gain.setValueAtTime(this.metronomeVolume, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration)

    osc.connect(gain)
    gain.connect(this.context.destination)

    osc.start(time)
    osc.stop(time + duration)
  }

  private updatePreview(chunk: Float32Array, samplesPerBin: number): void {
    // Get or create the current (last) bin
    let bin = this.recordingPreview.length > 0
      ? this.recordingPreview[this.recordingPreview.length - 1]
      : null

    // Figure out how many samples the current bin has already consumed
    const totalBeforeChunk = this.recordingTotalSamples - chunk.length
    let binStartSample = this.recordingPreview.length > 0
      ? (this.recordingPreview.length - 1) * samplesPerBin
      : 0
    let posInChunk = 0

    while (posInChunk < chunk.length) {
      const globalSample = totalBeforeChunk + posInChunk
      const binIndex = Math.floor(globalSample / samplesPerBin)

      // Ensure we have a bin for this index
      while (this.recordingPreview.length <= binIndex) {
        this.recordingPreview.push({ min: 0, max: 0 })
      }
      bin = this.recordingPreview[binIndex]

      // How many samples until the next bin boundary?
      const nextBinStart = (binIndex + 1) * samplesPerBin
      const samplesUntilNextBin = nextBinStart - globalSample
      const samplesAvailable = chunk.length - posInChunk
      const count = Math.min(samplesUntilNextBin, samplesAvailable)

      // Scan this segment for min/max
      const end = posInChunk + count
      for (let i = posInChunk; i < end; i++) {
        const v = chunk[i]
        if (v < bin.min) bin.min = v
        if (v > bin.max) bin.max = v
      }

      posInChunk = end
    }
  }

  private startMonitorPlayback(
    buffers: { buffer: AudioBuffer; volume: number; pan: number; muted: boolean; startOffset?: number }[],
    playOffset: number = 0,
  ): void {
    if (!this.context) return

    for (const track of buffers) {
      if (!track.buffer || track.muted) continue

      const source = this.context.createBufferSource()
      source.buffer = track.buffer
      source.loop = true

      const gain = this.context.createGain()
      gain.gain.value = track.volume

      const pan = this.context.createStereoPanner()
      pan.pan.value = track.pan

      source.connect(gain)
      gain.connect(pan)
      pan.connect(this.context.destination)

      // Start from the correct position, accounting for track's own offset
      const trackOffset = track.startOffset ?? 0
      const bufferPos = ((playOffset - trackOffset) % track.buffer.duration + track.buffer.duration) % track.buffer.duration
      source.start(0, bufferPos)

      this.playbackSources.push(source)
      this.playbackGains.push(gain)
      this.playbackPans.push(pan)
    }
  }

  private startTimeTracking(): void {
    this.stopTimeTracking()
    const tick = () => {
      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.getCurrentTime())
      }
      this.animFrameId = requestAnimationFrame(tick)
    }
    this.animFrameId = requestAnimationFrame(tick)
  }

  private stopTimeTracking(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
  }
}
