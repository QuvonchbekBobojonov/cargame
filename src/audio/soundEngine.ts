/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Realistic Supercar Engine & Sound Synthesizer via Web Audio API (Zero external files)

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Multi-cylinder engine simulation
  private oscSub: OscillatorNode | null = null;
  private oscLow: OscillatorNode | null = null;
  private oscMid: OscillatorNode | null = null;
  private oscHigh: OscillatorNode | null = null;
  private oscNoise: AudioBufferSourceNode | null = null;

  private engineShaper: WaveShaperNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineResonance: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Police / YPX Dual-Tone Siren
  private sirenOscA: OscillatorNode | null = null;
  private sirenOscB: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenLfo: OscillatorNode | null = null;
  private sirenLfoGain: GainNode | null = null;
  private isSirenPlaying: boolean = false;

  // Turbocharger spool & blow-off valve
  private turboOsc: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;

  // Tire skid / drift screech
  private skidFilter: BiquadFilterNode | null = null;
  private skidGain: GainNode | null = null;

  // Volume & state
  private isMuted: boolean = false;
  private isMusicMuted: boolean = false;
  private volume: number = 0.75;

  // Realistic Gearbox simulation
  private currentGear: number = 1;
  private currentRpm: number = 850; // 850 idle to 7800 RPM
  private lastGearShiftTime: number = 0;
  private lastHornAt: number = 0;
  private lastBoostAt: number = 0;

  // Synthwave rhythm loop
  private musicInterval: number | null = null;
  private bassIndex: number = 0;

  constructor() {
    // Context will initialize on first user gesture
  }

  public userGesture() {
    if (!this.ctx) {
      this.initContext();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private initContext() {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(18, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      this.initEngineAudio();
      this.initSirenAudio();
      this.initTurboAudio();
      this.initSkidAudio();
    } catch {
      // AudioContext unavailable or blocked
    }
  }

  private createMufflerCurve(): Float32Array<ArrayBuffer> {
    const samples = 256;
    const buffer = new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT);
    const curve = new Float32Array(buffer);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * 2.2);
    }
    return curve;
  }

  private initEngineAudio() {
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;

      // Sub-octave warm cabin bass
      this.oscSub = this.ctx.createOscillator();
      this.oscSub.type = 'sine';
      this.oscSub.frequency.setValueAtTime(28, now);

      // Primary cylinder firing pulse
      this.oscLow = this.ctx.createOscillator();
      this.oscLow.type = 'sawtooth';
      this.oscLow.frequency.setValueAtTime(56, now);

      // Mid intake growl
      this.oscMid = this.ctx.createOscillator();
      this.oscMid.type = 'triangle';
      this.oscMid.frequency.setValueAtTime(84, now);

      // Upper exhaust harmonic
      this.oscHigh = this.ctx.createOscillator();
      this.oscHigh.type = 'sawtooth';
      this.oscHigh.frequency.setValueAtTime(112, now);

      // Warm muffler wave-shaper saturation
      this.engineShaper = this.ctx.createWaveShaper();
      this.engineShaper.curve = this.createMufflerCurve();
      this.engineShaper.oversample = '2x';

      // Exhaust body resonance peak
      this.engineResonance = this.ctx.createBiquadFilter();
      this.engineResonance.type = 'peaking';
      this.engineResonance.frequency.setValueAtTime(160, now);
      this.engineResonance.Q.setValueAtTime(1.4, now);
      this.engineResonance.gain.setValueAtTime(4.5, now);

      // Exhaust lowpass muffler filter
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(190, now);
      this.engineFilter.Q.setValueAtTime(1.2, now);

      // Individual oscillator mix gains for authentic deep automotive tone
      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.55, now);
      const lowGain = this.ctx.createGain();
      lowGain.gain.setValueAtTime(0.32, now);
      const midGain = this.ctx.createGain();
      midGain.gain.setValueAtTime(0.28, now);
      const highGain = this.ctx.createGain();
      highGain.gain.setValueAtTime(0.12, now);

      // Start silent until game is running
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0, now);

      this.oscSub.connect(subGain);
      this.oscLow.connect(lowGain);
      this.oscMid.connect(midGain);
      this.oscHigh.connect(highGain);

      subGain.connect(this.engineShaper);
      lowGain.connect(this.engineShaper);
      midGain.connect(this.engineShaper);
      highGain.connect(this.engineShaper);

      this.engineShaper.connect(this.engineResonance);
      this.engineResonance.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.oscSub.start();
      this.oscLow.start();
      this.oscMid.start();
      this.oscHigh.start();
    } catch {
      // Ignore oscillator errors
    }
  }

  private initSirenAudio() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;

      this.sirenOscA = this.ctx.createOscillator();
      this.sirenOscA.type = 'sawtooth';
      this.sirenOscA.frequency.setValueAtTime(860, now);

      this.sirenOscB = this.ctx.createOscillator();
      this.sirenOscB.type = 'triangle';
      this.sirenOscB.frequency.setValueAtTime(865, now);

      const sirenFilter = this.ctx.createBiquadFilter();
      sirenFilter.type = 'lowpass';
      sirenFilter.frequency.setValueAtTime(2200, now);

      this.sirenLfo = this.ctx.createOscillator();
      this.sirenLfo.type = 'sine';
      this.sirenLfo.frequency.setValueAtTime(1.45, now); // Wail sweep rate

      this.sirenLfoGain = this.ctx.createGain();
      this.sirenLfoGain.gain.setValueAtTime(320, now);

      this.sirenLfo.connect(this.sirenLfoGain);
      this.sirenLfoGain.connect(this.sirenOscA.frequency);
      this.sirenLfoGain.connect(this.sirenOscB.frequency);

      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.setValueAtTime(0, now);

      this.sirenOscA.connect(sirenFilter);
      this.sirenOscB.connect(sirenFilter);
      sirenFilter.connect(this.sirenGain);
      this.sirenGain.connect(this.masterGain);

      this.sirenOscA.start();
      this.sirenOscB.start();
      this.sirenLfo.start();
    } catch {
      // Ignore
    }
  }

  public setSiren(active: boolean) {
    this.isSirenPlaying = active;
    if (!this.ctx || !this.sirenGain) return;
    const now = this.ctx.currentTime;
    const target = active && !this.isMuted ? 0.14 : 0;
    this.sirenGain.gain.setTargetAtTime(target, now, 0.06);
  }

  private initTurboAudio() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      this.turboOsc = this.ctx.createOscillator();
      this.turboOsc.type = 'sine';
      this.turboOsc.frequency.setValueAtTime(1200, now);

      this.turboGain = this.ctx.createGain();
      this.turboGain.gain.setValueAtTime(0, now);

      this.turboOsc.connect(this.turboGain);
      this.turboGain.connect(this.masterGain);
      this.turboOsc.start();
    } catch {
      // Ignore
    }
  }

  private initSkidAudio() {
    if (!this.ctx || !this.masterGain) return;
    try {
      // Continuous noise loop for tire screech
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.oscNoise = this.ctx.createBufferSource();
      this.oscNoise.buffer = buffer;
      this.oscNoise.loop = true;

      this.skidFilter = this.ctx.createBiquadFilter();
      this.skidFilter.type = 'bandpass';
      this.skidFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
      this.skidFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

      this.skidGain = this.ctx.createGain();
      this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.oscNoise.connect(this.skidFilter);
      this.skidFilter.connect(this.skidGain);
      this.skidGain.connect(this.masterGain);

      this.oscNoise.start();
    } catch {
      // Ignore
    }
  }

  public updateEngine(
    speedKmh: number,
    isBoosting: boolean,
    isDrifting: boolean = false,
    throttle: number = 0
  ) {
    if (!this.ctx || this.isMuted) {
      this.stopEngine();
      return;
    }

    const absSpeed = Math.abs(speedKmh);
    const maxKmh = 320;
    const speedRatio = Math.max(0, Math.min(1, absSpeed / maxKmh));

    // Calculate simulated 5-speed automatic transmission gear
    let gear = 1;
    let gearRatio = speedRatio;
    if (absSpeed < 2) {
      gear = 0; // Neutral / Idle
      gearRatio = 0;
    } else if (speedRatio < 0.16) {
      gear = 1;
      gearRatio = speedRatio / 0.16;
    } else if (speedRatio < 0.34) {
      gear = 2;
      gearRatio = (speedRatio - 0.16) / 0.18;
    } else if (speedRatio < 0.56) {
      gear = 3;
      gearRatio = (speedRatio - 0.34) / 0.22;
    } else if (speedRatio < 0.80) {
      gear = 4;
      gearRatio = (speedRatio - 0.56) / 0.24;
    } else {
      gear = 5;
      gearRatio = (speedRatio - 0.80) / 0.20;
    }

    if (gear > 0 && gear !== this.currentGear && this.ctx.currentTime - this.lastGearShiftTime > 0.38) {
      if (gear > this.currentGear && throttle > 0.1) {
        this.playGearShift();
      }
      this.currentGear = gear;
      this.lastGearShiftTime = this.ctx.currentTime;
    } else if (gear === 0) {
      this.currentGear = 1;
    }

    const isGas = throttle > 0.15;
    const isBrake = throttle < -0.15;

    // Realistic RPM curve: quiet 850 RPM at idle, surges under gas load!
    const targetRpm =
      absSpeed < 2 && !isGas
        ? 850
        : 1050 + gearRatio * 5600 + (isGas ? 950 : 0) + (isBoosting ? 750 : 0);
    this.currentRpm += (targetRpm - this.currentRpm) * 0.16;

    const now = this.ctx.currentTime;
    // 4-cylinder / V6 realistic firing frequency: (RPM / 60) * 2
    const firingFreq = Math.max(24, (this.currentRpm / 60) * 1.9);

    if (
      this.oscSub &&
      this.oscLow &&
      this.oscMid &&
      this.oscHigh &&
      this.engineFilter &&
      this.engineGain
    ) {
      this.oscSub.frequency.setTargetAtTime(firingFreq * 0.5, now, 0.04);
      this.oscLow.frequency.setTargetAtTime(firingFreq * 1.0, now, 0.04);
      this.oscMid.frequency.setTargetAtTime(firingFreq * 1.5, now, 0.04);
      this.oscHigh.frequency.setTargetAtTime(firingFreq * 2.0, now, 0.04);

      // Muffler exhaust opens cleanly under throttle, closes smoothly when coasting/braking
      const rpmNorm = Math.min(1, this.currentRpm / 8000);
      const cutoff =
        130 +
        rpmNorm * 820 +
        (isGas ? 340 : 0) +
        (isBoosting ? 550 : 0) -
        (isBrake ? 80 : 0);
      this.engineFilter.frequency.setTargetAtTime(Math.max(110, cutoff), now, 0.06);

      const loadGain =
        absSpeed < 2 && !isGas
          ? 0.045 // Subtle smooth idle purr
          : 0.07 + rpmNorm * 0.14 + (isGas ? 0.055 : 0) + (isBoosting ? 0.06 : 0);
      this.engineGain.gain.setTargetAtTime(loadGain, now, 0.05);
    }

    // Turbo spooling sound when boosting or high RPM gas
    if (this.turboOsc && this.turboGain) {
      if (isBoosting) {
        this.turboOsc.frequency.setTargetAtTime(2200 + speedRatio * 2000, now, 0.08);
        this.turboGain.gain.setTargetAtTime(0.075, now, 0.08);
      } else {
        this.turboGain.gain.setTargetAtTime(0, now, 0.12);
      }
    }

    // Tire drift / hard braking screech
    if (this.skidGain && this.skidFilter) {
      if ((isDrifting && absSpeed > 35) || (isBrake && absSpeed > 85)) {
        this.skidFilter.frequency.setTargetAtTime(950 + speedRatio * 750, now, 0.05);
        this.skidGain.gain.setTargetAtTime(0.11, now, 0.05);
        this.triggerHaptic(12);
      } else {
        this.skidGain.gain.setTargetAtTime(0, now, 0.08);
      }
    }

    // Re-sync siren volume if active
    if (this.sirenGain && this.isSirenPlaying) {
      this.sirenGain.gain.setTargetAtTime(0.14, now, 0.08);
    }
  }

  public getGear(): number {
    return this.currentGear;
  }

  public getRpm(): number {
    return Math.round(this.currentRpm);
  }

  private playGearShift() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Quick exhaust pop & turbo blow-off valve "pssh"
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(700, now + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.15);

    this.triggerHaptic(25);
  }

  public playCollectCrystal() {
    this.userGesture();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const notes = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.035);

      gain.gain.setValueAtTime(0.08, now + idx * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.035);
      osc.stop(now + idx * 0.035 + 0.2);
    });

    this.triggerHaptic(20);
  }

  public playBoost() {
    this.userGesture();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    if (now - this.lastBoostAt < 0.42) return;
    this.lastBoostAt = now;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(350, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.38);
    filter.Q.setValueAtTime(2.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.45);

    this.triggerHaptic(35);
  }

  public playJump() {
    this.userGesture();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.22);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.28);

    this.triggerHaptic(25);
  }

  public playHorn() {
    this.userGesture();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    if (now - this.lastHornAt < 0.35) return;
    this.lastHornAt = now;

    // Rich European/Supercar dual-tone horn (F4 + A4 harmony)
    const hornFrequencies = [349.23, 440.0];

    hornFrequencies.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.Q.setValueAtTime(1.5, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
      gain.gain.setValueAtTime(0.22, now + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 0.36);
    });

    this.triggerHaptic([45, 25, 45]);
  }

  public playCrash() {
    this.playAccident();
  }

  public playAccident() {
    this.userGesture();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.7;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.22));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.55);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.7);

    // Deep sub-bass metal impact boom
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130, now);
    subOsc.frequency.exponentialRampToValueAtTime(24, now + 0.45);

    subGain.gain.setValueAtTime(0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.start(now);
    subOsc.stop(now + 0.55);

    this.triggerHaptic([120, 80, 220]);
  }

  public playShieldPickup() {
    this.userGesture();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const chords = [392.0, 493.88, 587.33, 783.99];
    chords.forEach((f) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.42);
    });

    this.triggerHaptic([30, 20, 30]);
  }

  public playDoorToggle() {
    this.userGesture();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.09);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
    this.triggerHaptic(25);
  }

  public playEatOrRest() {
    this.userGesture();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.07);
      gain.gain.setValueAtTime(0.11, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.28);
    });
    this.triggerHaptic([20, 30, 40]);
  }

  public playGaiWhistle() {
    this.userGesture();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2650, now);
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(28, now);
    lfoGain.gain.setValueAtTime(140, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.setValueAtTime(0.14, now + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.36);
    lfo.stop(now + 0.36);
  }

  public startMusic() {
    this.userGesture();
    if (this.musicInterval !== null || this.isMusicMuted) return;

    // Upbeat racing synthwave arpeggio
    const bassNotes = [110, 110, 130.81, 146.83, 110, 164.81, 146.83, 123.47];

    this.musicInterval = window.setInterval(() => {
      if (!this.ctx || !this.masterGain || this.isMusicMuted || this.isMuted) return;

      const now = this.ctx.currentTime;
      const freq = bassNotes[this.bassIndex % bassNotes.length];
      this.bassIndex++;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.16);

      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.2);
    }, 170);
  }

  public stopEngine() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.engineGain) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.04);
    }
    if (this.turboGain) {
      this.turboGain.gain.setTargetAtTime(0, now, 0.04);
    }
    if (this.skidGain) {
      this.skidGain.gain.setTargetAtTime(0, now, 0.04);
    }
    if (this.sirenGain) {
      this.sirenGain.gain.setTargetAtTime(0, now, 0.04);
    }
  }

  public stopMusic() {
    if (this.musicInterval !== null) {
      window.clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopEngine();
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
  }

  public setMusicMuted(muted: boolean) {
    this.isMusicMuted = muted;
    if (muted && this.musicInterval !== null) {
      window.clearInterval(this.musicInterval);
      this.musicInterval = null;
    } else if (!muted && this.musicInterval === null) {
      this.startMusic();
    }
  }

  public triggerHaptic(pattern: number | number[]) {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore vibration errors
    }
  }

  public dispose() {
    this.stopEngine();
    this.stopMusic();
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {
        // Ignore
      }
      this.ctx = null;
    }
    this.masterGain = null;
    this.compressor = null;
    this.oscSub = null;
    this.oscLow = null;
    this.oscMid = null;
    this.oscHigh = null;
    this.oscNoise = null;
    this.engineShaper = null;
    this.engineResonance = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.sirenOscA = null;
    this.sirenOscB = null;
    this.sirenLfo = null;
    this.sirenLfoGain = null;
    this.sirenGain = null;
    this.turboOsc = null;
    this.turboGain = null;
    this.skidFilter = null;
    this.skidGain = null;
  }
}

export const soundEngine = new SoundEngine();
