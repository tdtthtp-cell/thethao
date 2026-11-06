/**
 * Web Audio API Sound Synthesizer for Sports Events
 * Generates referee whistles, score chimes, and notifications client-side.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Realistic referee whistle sound (frequency modulation + dual oscillators)
 */
export function playRefereeWhistle() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(2600, now);
    osc1.frequency.exponentialRampToValueAtTime(2900, now + 0.08);
    osc1.frequency.exponentialRampToValueAtTime(2700, now + 0.35);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2850, now);
    osc2.frequency.exponentialRampToValueAtTime(3100, now + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(2950, now + 0.35);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gainNode.gain.setValueAtTime(0.3, now + 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.46);
    osc2.stop(now + 0.46);
  } catch (e) {
    console.debug('Audio play failed:', e);
  }
}

/**
 * Upbeat score / goal notification chime
 */
export function playScoreChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.001, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.35);
    });
  } catch (e) {
    console.debug('Score audio failed:', e);
  }
}

/**
 * Victory fanfare
 */
export function playVictoryFanfare() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const chords = [
      { time: 0, freqs: [523.25, 659.25, 783.99] },
      { time: 0.2, freqs: [587.33, 739.99, 880.00] },
      { time: 0.4, freqs: [659.25, 783.99, 1046.50] },
      { time: 0.7, freqs: [783.99, 987.77, 1318.51] },
    ];

    chords.forEach((c) => {
      c.freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + c.time);

        gain.gain.setValueAtTime(0.001, now + c.time);
        gain.gain.linearRampToValueAtTime(0.12, now + c.time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + c.time + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + c.time);
        osc.stop(now + c.time + 0.45);
      });
    });
  } catch (e) {
    console.debug('Victory audio failed:', e);
  }
}

/**
 * Subtle notification chime
 */
export function playNotificationTone() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.1); // D6

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  } catch (e) {
    console.debug('Notify tone failed:', e);
  }
}
