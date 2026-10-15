// Browser audio has no reliable access to a phone's hardware silent switch.
// Playback is opt-in, initiated by a gesture, and never runs in a hidden tab.
let context: AudioContext | undefined;
export function playFeedback(enabled: boolean, success = false) {
  if (!enabled || typeof window === 'undefined' || document.hidden || !window.AudioContext) return;
  try {
    context ??= new AudioContext();
    void context.resume().then(() => {
      if (document.hidden) return;
      const oscillator = context!.createOscillator();
      const volume = context!.createGain();
      const now = context!.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(success ? 660 : 440, now);
      oscillator.frequency.exponentialRampToValueAtTime(success ? 990 : 550, now + .09);
      volume.gain.setValueAtTime(0, now);
      volume.gain.linearRampToValueAtTime(.035, now + .01);
      volume.gain.exponentialRampToValueAtTime(.001, now + .16);
      oscillator.connect(volume); volume.connect(context!.destination);
      oscillator.start(now); oscillator.stop(now + .18);
    }).catch(() => {});
  } catch { /* Audio must never block booking. */ }
}
