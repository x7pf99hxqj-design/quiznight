// Lo-Fi Chillhop Loop – prozedural generiert mit Web Audio API.
// Kein lizenziertes Audio nötig: synthetisierte Drums (Kick/Snare/Hat),
// warmer Bass, weiche Rhodes-artige Akkorde, sparsame Melodie + Vinyl-Rauschen.
export class LobbyMusic {
  private ctx: AudioContext | null = null;
  private playing = false;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  start() {
    if (this.playing) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.22;
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this.makeNoiseBuffer();
      this.playing = true;
      this.loop();
    } catch {}
  }

  stop() {
    this.playing = false;
    if (this.timeout) clearTimeout(this.timeout);
    this.ctx?.close().catch(() => {});
    this.ctx = null; this.masterGain = null; this.noiseBuffer = null;
  }

  toggle() { this.playing ? this.stop() : this.start(); return !this.playing; }
  isPlaying() { return this.playing; }

  private makeNoiseBuffer(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // Weiche Rhodes-artige Akkordnote: zwei leicht verstimmte Dreieckwellen + sanfter Lowpass
  private chordNote(freq: number, start: number, dur: number, vol = 1) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    [0, 0.5].forEach(detune => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass"; filt.frequency.value = 1100; filt.Q.value = 0.3;
      osc.type = "triangle"; osc.frequency.value = freq; osc.detune.value = detune;
      osc.connect(filt); filt.connect(gain); gain.connect(this.masterGain!);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.055 * vol, start + 0.25);
      gain.gain.setValueAtTime(0.045 * vol, start + dur * 0.7);
      gain.gain.linearRampToValueAtTime(0, start + dur);
      osc.start(start); osc.stop(start + dur + 0.05);
    });
  }

  // Warmer gefilterter Bass
  private bassNote(freq: number, start: number, dur: number, vol = 1) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass"; filt.frequency.value = 350; filt.Q.value = 1.2;
    osc.type = "sawtooth"; osc.frequency.value = freq;
    osc.connect(filt); filt.connect(gain); gain.connect(this.masterGain);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.32 * vol, start + 0.02);
    gain.gain.setValueAtTime(0.26 * vol, start + dur * 0.6);
    gain.gain.linearRampToValueAtTime(0, start + dur);
    osc.start(start); osc.stop(start + dur + 0.05);
  }

  // Sparsame, weiche Lead-Melodie
  private leadNote(freq: number, start: number, dur: number, vol = 1) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass"; filt.frequency.value = 2200;
    osc.type = "sine"; osc.frequency.value = freq;
    osc.connect(filt); filt.connect(gain); gain.connect(this.masterGain);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.09 * vol, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.start(start); osc.stop(start + dur + 0.05);
  }

  // Kick: Sinus mit fallender Pitch + kurzer Click
  private kick(start: number) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, start);
    osc.frequency.exponentialRampToValueAtTime(45, start + 0.12);
    gain.gain.setValueAtTime(0.85, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + 0.22);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(start); osc.stop(start + 0.25);
  }

  // Snare: gefiltertes Rauschen, kurzer Knack
  private snare(start: number, vol = 1) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass"; filt.frequency.value = 1800; filt.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35 * vol, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + 0.16);
    src.connect(filt); filt.connect(gain); gain.connect(this.masterGain);
    src.start(start); src.stop(start + 0.18);
  }

  // Hi-Hat: sehr kurzes, hochpass-gefiltertes Rauschen
  private hihat(start: number, vol = 1, open = false) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = ctx.createBiquadFilter();
    filt.type = "highpass"; filt.frequency.value = 7000;
    const gain = ctx.createGain();
    const dur = open ? 0.09 : 0.035;
    gain.gain.setValueAtTime(0.12 * vol, start);
    gain.gain.exponentialRampToValueAtTime(0.005, start + dur);
    src.connect(filt); filt.connect(gain); gain.connect(this.masterGain);
    src.start(start); src.stop(start + dur + 0.02);
  }

  // Vinyl-Rauschen: sehr leises, konstantes gefiltertes Hintergrundrauschen für Lo-Fi-Vibe
  private vinylCrackle(start: number, dur: number) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass"; filt.frequency.value = 4000; filt.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.value = 0.012;
    src.connect(filt); filt.connect(gain); gain.connect(this.masterGain);
    src.start(start); src.stop(start + dur);
  }

  private loop() {
    if (!this.playing || !this.ctx) return;
    const t = this.ctx.currentTime + 0.05;
    const b = 0.62; // ~96 BPM Feel bei diesem Subdivision-Raster -> chillig

    // Akkordfolge: Fmaj7 → Dm7 → Gm7 → C7  (sanfte Lo-Fi-Jazz-Kadenz)
    const chords = [
      [174, 220, 261, 329], // Fmaj7
      [146, 174, 220, 261], // Dm7
      [196, 233, 293, 349], // Gm7
      [130, 164, 196, 233], // C7
    ];
    const bassRoots = [87, 73, 98, 65];

    const barLen = b * 4;
    chords.forEach((ch, i) => {
      const start = t + i * barLen;
      ch.forEach(f => this.chordNote(f, start, barLen * 0.95, 0.6));
      this.bassNote(bassRoots[i], start, barLen * 0.55, 1);
      this.bassNote(bassRoots[i] * 1.5, start + barLen * 0.6, barLen * 0.35, 0.7);
    });

    // Drum-Pattern pro Bar (4 Bars Loop) – leichtes Swing-Feel
    for (let bar = 0; bar < 4; bar++) {
      const barStart = t + bar * barLen;
      this.kick(barStart);
      this.kick(barStart + b * 2.5);
      this.snare(barStart + b * 1, 1);
      this.snare(barStart + b * 3, 0.85);
      for (let s = 0; s < 8; s++) {
        this.hihat(barStart + s * (b / 2), s % 4 === 2 ? 1.3 : 0.7, s % 4 === 0);
      }
    }

    // Sparsame Melodie – nur in Bar 2 und 4, lo-fi-typisch zurückhaltend
    const leadNotes = [392, 440, 349, 392];
    leadNotes.forEach((f, i) => this.leadNote(f, t + barLen * 1.5 + i * b * 0.9, b * 0.8, 0.5));
    const leadNotes2 = [330, 392, 440];
    leadNotes2.forEach((f, i) => this.leadNote(f, t + barLen * 3.4 + i * b * 1.1, b * 0.9, 0.45));

    this.vinylCrackle(t, barLen * 4);

    this.timeout = setTimeout(() => this.loop(), barLen * 4 * 1000 - 60);
  }
}

export const lobbyMusic = new LobbyMusic();
