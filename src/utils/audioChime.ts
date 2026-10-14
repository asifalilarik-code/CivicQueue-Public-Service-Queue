/**
 * Web Audio API synthesizer for queuing chimes and announcements.
 * Generates an airport/hospital calling bell chime without external audio files.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a pleasant 3-tone harmonic civic chime (F#5 -> A5 -> C#6).
 */
export function playCallingChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [
      { freq: 739.99, start: 0.0, dur: 0.35 },  // F#5
      { freq: 880.00, start: 0.25, dur: 0.35 }, // A5
      { freq: 1108.73, start: 0.50, dur: 0.75 } // C#6
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.3, ctx.currentTime);
    masterGain.connect(ctx.destination);

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.start);

      // Envelope: gentle attack, decay
      noteGain.gain.setValueAtTime(0.001, ctx.currentTime + n.start);
      noteGain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + n.start + 0.04);
      noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.start + n.dur);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(ctx.currentTime + n.start);
      osc.stop(ctx.currentTime + n.start + n.dur + 0.05);
    });
  } catch (err) {
    console.warn('Web Audio chime could not play:', err);
  }
}

/**
 * Uses SpeechSynthesis (TTS) to announce token and counter if speech synthesis is supported.
 */
export function speakCallingAnnouncement(tokenNumber: string, counterName: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    // Format token e.g. "G-E-N 1 0 4" for crystal clear pronunciation
    const [prefix, num] = tokenNumber.split('-');
    const spelledToken = prefix ? `${prefix.split('').join(' ')} ${num}` : tokenNumber;

    const text = `Token ${spelledToken}. Please proceed to ${counterName}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.volume = 0.9;

    // Slight delay after chime
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 600);
  } catch (e) {
    // Speech synthesis error ignored
  }
}
