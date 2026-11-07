let context: AudioContext | undefined;

function note(
  audioContext: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume: number,
) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function stopFeedbackVoice() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function speakPraise() {
  if (!("speechSynthesis" in window)) return;
  stopFeedbackVoice();
  const voice = new SpeechSynthesisUtterance("Great job!");
  voice.lang = "en-US";
  voice.rate = 1.1;
  voice.volume = 0.62;
  window.speechSynthesis.speak(voice);
}

export function speakWord(word: string, onEnded?: () => void) {
  if (!("speechSynthesis" in window)) return;
  stopFeedbackVoice();
  const voice = new SpeechSynthesisUtterance(word);
  voice.lang = "en-US";
  voice.rate = 0.9;
  voice.onend = () => onEnded?.();
  window.speechSynthesis.speak(voice);
}

export function playAnswerFeedback(correct: boolean, spokenPraise = true) {
  try {
    context ||= new AudioContext();
    const audioContext = context;
    void audioContext
      .resume()
      .then(() => {
        const start = audioContext.currentTime + 0.015;
        if (correct) {
          [523, 659, 784, 1047].forEach((frequency, i) =>
            note(audioContext, frequency, start + i * 0.105, 0.24, 0.075),
          );
        } else {
          [392, 330, 247].forEach((frequency, i) =>
            note(audioContext, frequency, start + i * 0.17, 0.24, 0.065),
          );
        }
      })
      .catch(() => {});
  } catch {
    // Spoken confirmation still works if Web Audio is unavailable.
  }
  if (correct && spokenPraise) speakPraise();
}

export function playCompletionFanfare() {
  try {
    context ||= new AudioContext();
    const audioContext = context;
    void audioContext
      .resume()
      .then(() => {
        const start = audioContext.currentTime + 0.02;
        const melody = [392, 523, 659, 784, 659, 1047];
        melody.forEach((frequency, i) => {
          const oscillator = audioContext.createOscillator();
          const filter = audioContext.createBiquadFilter();
          const gain = audioContext.createGain();
          const begins = start + [0, 0.15, 0.3, 0.48, 0.64, 0.82][i];
          const duration = i === melody.length - 1 ? 0.72 : 0.22;
          oscillator.type = "sawtooth";
          oscillator.frequency.setValueAtTime(frequency, begins);
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(1450, begins);
          gain.gain.setValueAtTime(0.0001, begins);
          gain.gain.exponentialRampToValueAtTime(0.045, begins + 0.035);
          gain.gain.exponentialRampToValueAtTime(0.0001, begins + duration);
          oscillator
            .connect(filter)
            .connect(gain)
            .connect(audioContext.destination);
          oscillator.start(begins);
          oscillator.stop(begins + duration + 0.02);
        });
      })
      .catch(() => {});
  } catch {
    // The completed result remains visible if audio is unavailable.
  }
}
