let context: AudioContext | undefined;

function note(
  frequency: number,
  start: number,
  duration: number,
  volume: number,
) {
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function stopFeedbackVoice() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function playAnswerFeedback(correct: boolean) {
  try {
    context ||= new AudioContext();
    void context.resume();
    const start = context.currentTime + 0.015;
    if (correct) {
      [523, 659, 784, 1047].forEach((frequency, i) =>
        note(frequency, start + i * 0.105, 0.24, 0.075),
      );
    } else {
      [392, 330, 247].forEach((frequency, i) =>
        note(frequency, start + i * 0.17, 0.24, 0.065),
      );
    }
  } catch {
    // Spoken confirmation still works if Web Audio is unavailable.
  }
  if (correct && "speechSynthesis" in window) {
    stopFeedbackVoice();
    const voice = new SpeechSynthesisUtterance("Great job!");
    voice.lang = "en-US";
    voice.rate = 1.1;
    voice.volume = 0.62;
    window.speechSynthesis.speak(voice);
  }
}
