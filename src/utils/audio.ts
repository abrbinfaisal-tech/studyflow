// Web Audio API Synthesizer for study bell / timer completion chimes and relaxing ambient noise

class AudioService {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioNode | null = null;
  private isNoisePlaying = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Pleasant bell chime for Pomodoro complete
  playChime() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Play a harmonic 3-tone chime (E5, G#5, B5)
      const notes = [659.25, 830.61, 987.77];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);

        gain.gain.setValueAtTime(0, now + idx * 0.15);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 1.2);
      });
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }

  // Pleasant click sound on timer start/pause
  playTick() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      // ignore
    }
  }

  // Gentle pink noise / rain simulation for deep focus
  toggleAmbient(type: 'rain' | 'white' | 'off') {
    const ctx = this.initCtx();
    if (!ctx) return false;

    if (this.noiseNode) {
      try {
        (this.noiseNode as any).disconnect();
      } catch (e) {}
      this.noiseNode = null;
      this.isNoisePlaying = false;
    }

    if (type === 'off') {
      return false;
    }

    try {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'rain') {
          // Pink noise filter approximation
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
          b6 = white * 0.115926;
        } else {
          data[i] = white * 0.02;
        }
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const gain = ctx.createGain();
      gain.gain.value = 0.12;

      // Filter for soothing soft tones
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = type === 'rain' ? 800 : 1200;

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noiseSource.start(0);
      this.noiseNode = noiseSource;
      this.isNoisePlaying = true;
      return true;
    } catch (e) {
      console.warn('Ambient noise error:', e);
      return false;
    }
  }

  isAmbientPlaying() {
    return this.isNoisePlaying;
  }
}

export const sound = new AudioService();
