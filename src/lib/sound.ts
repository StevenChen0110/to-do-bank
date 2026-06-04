let audioUnlocked = false;

/** Call from a user gesture (submit / button) before playing on iOS. */
export function unlockAudioFromGesture(): void {
  audioUnlocked = true;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  gain: number,
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** Short deposit "ding" — no external asset. */
export function playDepositChime(): void {
  if (!audioUnlocked) {
    return;
  }
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) {
      return;
    }
    const ctx = new Ctx();
    const t = ctx.currentTime;
    playTone(ctx, 880, t, 0.12, 0.18);
    playTone(ctx, 1320, t + 0.06, 0.1, 0.12);
    void ctx.close();
  } catch {
    // Autoplay policy or unsupported environment
  }
}
