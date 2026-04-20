import { readAppSettings } from "./appSettings";

type SoundEffectName =
  | "ui.toggle-on"
  | "ui.toggle-off"
  | "ui.error"
  | "ui.denied"
  | "auth.login-success"
  | "opening.purchase-booster"
  | "opening.purchase-display"
  | "opening.start-booster"
  | "opening.start-display"
  | "opening.swipe"
  | "opening.new-card"
  | "opening.u1"
  | "opening.u2"
  | "opening.legend-bronze"
  | "opening.legend-silver"
  | "opening.legend-gold"
  | "opening.card-11"
  | "opening.ticket-gold-11"
  | "market.buy"
  | "market.sell"
  | "market.reward"
  | "pwa.installed";

type PlaySoundOptions = {
  force?: boolean;
};

type ToneOptions = {
  frequency: number;
  toFrequency?: number;
  start: number;
  duration: number;
  gain?: number;
  type?: OscillatorType;
  attack?: number;
  release?: number;
  detune?: number;
  pan?: number;
};

type NoiseOptions = {
  start: number;
  duration: number;
  gain?: number;
  attack?: number;
  release?: number;
  highpass?: number;
  lowpass?: number;
  pan?: number;
};

type OpeningRevealParams = {
  rarityKey: string;
  isSurprise11: boolean;
  isNew: boolean;
};

let audioContextRef: AudioContext | null = null;
let masterGainRef: GainNode | null = null;
let noiseBufferRef: AudioBuffer | null = null;
let unlockListenersInstalled = false;

function canUseSound(force = false) {
  if (typeof window === "undefined") return false;
  return force || readAppSettings().soundEffects;
}

function createStereoNode(ctx: AudioContext, pan = 0) {
  if ("createStereoPanner" in ctx) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    return panner;
  }
  return null;
}

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) return null;

  if (!audioContextRef) {
    audioContextRef = new AudioContextCtor();
    masterGainRef = audioContextRef.createGain();
    masterGainRef.gain.value = 0.82;
    masterGainRef.connect(audioContextRef.destination);
  }

  return audioContextRef;
}

function getMasterGain(ctx: AudioContext) {
  if (!masterGainRef) {
    masterGainRef = ctx.createGain();
    masterGainRef.gain.value = 0.82;
    masterGainRef.connect(ctx.destination);
  }

  return masterGainRef;
}

function getNoiseBuffer(ctx: AudioContext) {
  if (noiseBufferRef && noiseBufferRef.sampleRate === ctx.sampleRate) {
    return noiseBufferRef;
  }

  const length = Math.max(1, Math.floor(ctx.sampleRate * 1.5));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let i = 0; i < length; i += 1) {
    channel[i] = Math.random() * 2 - 1;
  }

  noiseBufferRef = buffer;
  return buffer;
}

function connectNodeToMaster(
  ctx: AudioContext,
  node: AudioNode,
  gainNode: GainNode,
  pan = 0,
) {
  const stereoNode = createStereoNode(ctx, pan);

  node.connect(gainNode);
  if (stereoNode) {
    gainNode.connect(stereoNode);
    stereoNode.connect(getMasterGain(ctx));
  } else {
    gainNode.connect(getMasterGain(ctx));
  }
}

function scheduleTone(ctx: AudioContext, options: ToneOptions) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const attack = options.attack ?? 0.006;
  const release = options.release ?? 0.06;
  const maxGain = options.gain ?? 0.08;
  const safeStart = options.start;
  const safeEnd = safeStart + Math.max(0.02, options.duration);

  osc.type = options.type ?? "triangle";
  osc.frequency.setValueAtTime(Math.max(1, options.frequency), safeStart);
  osc.detune.value = options.detune ?? 0;

  if (options.toFrequency && Number.isFinite(options.toFrequency)) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, options.toFrequency), safeEnd);
  }

  gainNode.gain.setValueAtTime(0.0001, safeStart);
  gainNode.gain.linearRampToValueAtTime(maxGain, safeStart + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, safeEnd + release);

  connectNodeToMaster(ctx, osc, gainNode, options.pan ?? 0);

  osc.start(safeStart);
  osc.stop(safeEnd + release + 0.04);
}

function scheduleNoise(ctx: AudioContext, options: NoiseOptions) {
  const source = ctx.createBufferSource();
  const highpass = ctx.createBiquadFilter();
  const lowpass = ctx.createBiquadFilter();
  const gainNode = ctx.createGain();
  const attack = options.attack ?? 0.003;
  const release = options.release ?? 0.05;
  const maxGain = options.gain ?? 0.03;
  const safeStart = options.start;
  const safeEnd = safeStart + Math.max(0.02, options.duration);

  source.buffer = getNoiseBuffer(ctx);

  highpass.type = "highpass";
  highpass.frequency.value = options.highpass ?? 420;
  highpass.Q.value = 0.8;

  lowpass.type = "lowpass";
  lowpass.frequency.value = options.lowpass ?? 5200;
  lowpass.Q.value = 0.8;

  gainNode.gain.setValueAtTime(0.0001, safeStart);
  gainNode.gain.linearRampToValueAtTime(maxGain, safeStart + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, safeEnd + release);

  source.connect(highpass);
  highpass.connect(lowpass);
  connectNodeToMaster(ctx, lowpass, gainNode, options.pan ?? 0);

  source.start(safeStart);
  source.stop(safeEnd + release + 0.05);
}

function scheduleCardTap(ctx: AudioContext, start: number, pitch = 168, gain = 0.06, pan = 0) {
  scheduleTone(ctx, {
    start,
    duration: 0.05,
    frequency: pitch,
    toFrequency: pitch * 0.72,
    gain,
    type: "triangle",
    release: 0.08,
    pan,
  });
  scheduleNoise(ctx, {
    start,
    duration: 0.024,
    gain: gain * 0.32,
    highpass: 700,
    lowpass: 2400,
    pan,
  });
}

function schedulePaperSlide(ctx: AudioContext, start: number, duration = 0.1, gain = 0.024, pan = 0) {
  scheduleNoise(ctx, {
    start,
    duration,
    gain,
    highpass: 1100,
    lowpass: 3800,
    release: 0.035,
    pan,
  });
  scheduleTone(ctx, {
    start,
    duration: duration * 0.9,
    frequency: 260,
    toFrequency: 210,
    gain: gain * 0.34,
    type: "triangle",
    release: 0.03,
    pan,
  });
}

function scheduleFoilSparkle(ctx: AudioContext, start: number, gain = 0.036, pan = 0) {
  scheduleTone(ctx, {
    start,
    duration: 0.08,
    frequency: 1220,
    toFrequency: 1620,
    gain,
    type: "sine",
    release: 0.08,
    pan,
  });
  scheduleTone(ctx, {
    start: start + 0.04,
    duration: 0.1,
    frequency: 1480,
    toFrequency: 1980,
    gain: gain * 0.8,
    type: "triangle",
    release: 0.1,
    pan: -pan,
  });
}

function scheduleSealPulse(ctx: AudioContext, start: number, base = 220, gain = 0.07, pan = 0) {
  scheduleCardTap(ctx, start, base * 0.78, gain * 0.82, pan);
  scheduleTone(ctx, {
    start: start + 0.03,
    duration: 0.12,
    frequency: base,
    toFrequency: base * 1.25,
    gain,
    type: "triangle",
    release: 0.11,
    pan,
  });
}

function scheduleShimmerChord(ctx: AudioContext, start: number, root = 520, gain = 0.045) {
  scheduleTone(ctx, {
    start,
    duration: 0.16,
    frequency: root,
    toFrequency: root * 1.08,
    gain,
    type: "triangle",
    pan: -0.08,
  });
  scheduleTone(ctx, {
    start: start + 0.05,
    duration: 0.18,
    frequency: root * 1.26,
    toFrequency: root * 1.4,
    gain: gain * 0.88,
    type: "sine",
    pan: 0.08,
  });
  scheduleTone(ctx, {
    start: start + 0.1,
    duration: 0.22,
    frequency: root * 1.5,
    toFrequency: root * 1.7,
    gain: gain * 0.76,
    type: "triangle",
  });
}

function scheduleUiToggle(ctx: AudioContext, enabled: boolean) {
  const now = ctx.currentTime + 0.01;

  scheduleCardTap(ctx, now, enabled ? 214 : 170, enabled ? 0.042 : 0.036);
  scheduleTone(ctx, {
    start: now + 0.02,
    duration: 0.08,
    frequency: enabled ? 420 : 360,
    toFrequency: enabled ? 540 : 250,
    gain: enabled ? 0.04 : 0.03,
    type: "triangle",
  });
}

function scheduleUiError(ctx: AudioContext) {
  const now = ctx.currentTime + 0.01;

  scheduleCardTap(ctx, now, 132, 0.045);
  scheduleTone(ctx, {
    start: now + 0.01,
    duration: 0.12,
    frequency: 280,
    toFrequency: 170,
    gain: 0.05,
    type: "sawtooth",
    release: 0.12,
  });
  scheduleNoise(ctx, {
    start: now,
    duration: 0.06,
    gain: 0.012,
    highpass: 500,
    lowpass: 2200,
  });
}

function scheduleDenied(ctx: AudioContext) {
  const now = ctx.currentTime + 0.01;

  schedulePaperSlide(ctx, now, 0.05, 0.014);
  scheduleTone(ctx, {
    start: now + 0.01,
    duration: 0.08,
    frequency: 210,
    toFrequency: 140,
    gain: 0.03,
    type: "triangle",
  });
}

function scheduleLoginSuccess(ctx: AudioContext) {
  const now = ctx.currentTime + 0.01;

  scheduleSealPulse(ctx, now, 240, 0.06);
  scheduleShimmerChord(ctx, now + 0.08, 620, 0.04);
}

function scheduleOpeningPurchase(ctx: AudioContext, kind: "booster" | "display") {
  const now = ctx.currentTime + 0.01;

  scheduleCardTap(ctx, now, kind === "display" ? 150 : 172, kind === "display" ? 0.064 : 0.056);
  schedulePaperSlide(ctx, now + 0.02, kind === "display" ? 0.14 : 0.09, kind === "display" ? 0.028 : 0.022);
  scheduleSealPulse(ctx, now + 0.09, kind === "display" ? 230 : 280, kind === "display" ? 0.055 : 0.048);

  if (kind === "display") {
    schedulePaperSlide(ctx, now + 0.1, 0.16, 0.03, -0.1);
    scheduleTone(ctx, {
      start: now + 0.14,
      duration: 0.14,
      frequency: 300,
      toFrequency: 430,
      gain: 0.042,
      type: "triangle",
      pan: 0.08,
    });
  }
}

function scheduleOpeningStart(ctx: AudioContext, kind: "booster" | "display") {
  const now = ctx.currentTime + 0.01;

  scheduleNoise(ctx, {
    start: now,
    duration: kind === "display" ? 0.2 : 0.13,
    gain: kind === "display" ? 0.028 : 0.022,
    highpass: 1400,
    lowpass: 4200,
  });
  schedulePaperSlide(ctx, now + 0.02, kind === "display" ? 0.16 : 0.11, kind === "display" ? 0.032 : 0.024);
  scheduleTone(ctx, {
    start: now + 0.05,
    duration: kind === "display" ? 0.18 : 0.13,
    frequency: kind === "display" ? 170 : 220,
    toFrequency: kind === "display" ? 520 : 440,
    gain: kind === "display" ? 0.05 : 0.04,
    type: "sawtooth",
    release: 0.1,
  });
  scheduleFoilSparkle(ctx, now + (kind === "display" ? 0.18 : 0.12), kind === "display" ? 0.03 : 0.022);
}

function scheduleSwipe(ctx: AudioContext) {
  const now = ctx.currentTime + 0.01;

  schedulePaperSlide(ctx, now, 0.075, 0.026, 0.1);
  schedulePaperSlide(ctx, now + 0.018, 0.05, 0.018, -0.08);
  scheduleTone(ctx, {
    start: now + 0.01,
    duration: 0.045,
    frequency: 240,
    toFrequency: 190,
    gain: 0.014,
    type: "triangle",
  });
}

function scheduleNewCard(ctx: AudioContext) {
  const now = ctx.currentTime + 0.01;

  scheduleCardTap(ctx, now, 208, 0.038);
  scheduleFoilSparkle(ctx, now + 0.03, 0.032);
  scheduleTone(ctx, {
    start: now + 0.05,
    duration: 0.1,
    frequency: 720,
    toFrequency: 920,
    gain: 0.03,
    type: "triangle",
  });
}

function scheduleRevealRarity(ctx: AudioContext, rarity: SoundEffectName) {
  const now = ctx.currentTime + 0.01;

  switch (rarity) {
    case "opening.u1":
      scheduleCardTap(ctx, now, 190, 0.045);
      schedulePaperSlide(ctx, now + 0.01, 0.06, 0.02);
      scheduleShimmerChord(ctx, now + 0.04, 760, 0.03);
      return;

    case "opening.u2":
      scheduleCardTap(ctx, now, 198, 0.05);
      schedulePaperSlide(ctx, now + 0.01, 0.07, 0.022);
      scheduleShimmerChord(ctx, now + 0.04, 680, 0.04);
      scheduleFoilSparkle(ctx, now + 0.12, 0.032);
      return;

    case "opening.legend-bronze":
      scheduleCardTap(ctx, now, 156, 0.06);
      scheduleTone(ctx, {
        start: now + 0.02,
        duration: 0.18,
        frequency: 220,
        toFrequency: 310,
        gain: 0.06,
        type: "triangle",
      });
      scheduleFoilSparkle(ctx, now + 0.1, 0.028);
      return;

    case "opening.legend-silver":
      scheduleCardTap(ctx, now, 168, 0.064);
      scheduleTone(ctx, {
        start: now + 0.02,
        duration: 0.16,
        frequency: 300,
        toFrequency: 470,
        gain: 0.055,
        type: "triangle",
      });
      scheduleShimmerChord(ctx, now + 0.06, 760, 0.036);
      return;

    case "opening.legend-gold":
      scheduleCardTap(ctx, now, 178, 0.07);
      scheduleTone(ctx, {
        start: now + 0.02,
        duration: 0.18,
        frequency: 280,
        toFrequency: 540,
        gain: 0.064,
        type: "sawtooth",
      });
      scheduleShimmerChord(ctx, now + 0.06, 820, 0.042);
      scheduleFoilSparkle(ctx, now + 0.12, 0.04);
      return;

    case "opening.card-11":
      schedulePaperSlide(ctx, now, 0.08, 0.026);
      scheduleTone(ctx, {
        start: now + 0.03,
        duration: 0.2,
        frequency: 240,
        toFrequency: 420,
        gain: 0.05,
        type: "triangle",
      });
      scheduleShimmerChord(ctx, now + 0.12, 640, 0.034);
      return;

    case "opening.ticket-gold-11":
      schedulePaperSlide(ctx, now, 0.09, 0.028);
      scheduleTone(ctx, {
        start: now + 0.02,
        duration: 0.24,
        frequency: 320,
        toFrequency: 620,
        gain: 0.058,
        type: "sawtooth",
      });
      scheduleShimmerChord(ctx, now + 0.08, 920, 0.046);
      scheduleFoilSparkle(ctx, now + 0.16, 0.05);
      return;

    default:
      return;
  }
}

function scheduleMarket(ctx: AudioContext, kind: "buy" | "sell" | "reward") {
  const now = ctx.currentTime + 0.01;

  if (kind === "buy") {
    scheduleCardTap(ctx, now, 176, 0.05);
    scheduleTone(ctx, {
      start: now + 0.03,
      duration: 0.08,
      frequency: 520,
      toFrequency: 720,
      gain: 0.038,
      type: "triangle",
    });
    return;
  }

  if (kind === "sell") {
    scheduleCardTap(ctx, now, 188, 0.046);
    scheduleTone(ctx, {
      start: now + 0.02,
      duration: 0.07,
      frequency: 640,
      toFrequency: 900,
      gain: 0.035,
      type: "triangle",
    });
    scheduleTone(ctx, {
      start: now + 0.09,
      duration: 0.06,
      frequency: 960,
      toFrequency: 1180,
      gain: 0.03,
      type: "sine",
    });
    return;
  }

  scheduleCardTap(ctx, now, 196, 0.05);
  scheduleShimmerChord(ctx, now + 0.04, 700, 0.032);
}

function schedulePwaInstalled(ctx: AudioContext) {
  const now = ctx.currentTime + 0.01;

  scheduleSealPulse(ctx, now, 260, 0.06);
  scheduleShimmerChord(ctx, now + 0.08, 760, 0.04);
  scheduleFoilSparkle(ctx, now + 0.16, 0.04);
}

function scheduleSoundEffect(ctx: AudioContext, effect: SoundEffectName) {
  switch (effect) {
    case "ui.toggle-on":
      scheduleUiToggle(ctx, true);
      return;
    case "ui.toggle-off":
      scheduleUiToggle(ctx, false);
      return;
    case "ui.error":
      scheduleUiError(ctx);
      return;
    case "ui.denied":
      scheduleDenied(ctx);
      return;
    case "auth.login-success":
      scheduleLoginSuccess(ctx);
      return;
    case "opening.purchase-booster":
      scheduleOpeningPurchase(ctx, "booster");
      return;
    case "opening.purchase-display":
      scheduleOpeningPurchase(ctx, "display");
      return;
    case "opening.start-booster":
      scheduleOpeningStart(ctx, "booster");
      return;
    case "opening.start-display":
      scheduleOpeningStart(ctx, "display");
      return;
    case "opening.swipe":
      scheduleSwipe(ctx);
      return;
    case "opening.new-card":
      scheduleNewCard(ctx);
      return;
    case "opening.u1":
    case "opening.u2":
    case "opening.legend-bronze":
    case "opening.legend-silver":
    case "opening.legend-gold":
    case "opening.card-11":
    case "opening.ticket-gold-11":
      scheduleRevealRarity(ctx, effect);
      return;
    case "market.buy":
      scheduleMarket(ctx, "buy");
      return;
    case "market.sell":
      scheduleMarket(ctx, "sell");
      return;
    case "market.reward":
      scheduleMarket(ctx, "reward");
      return;
    case "pwa.installed":
      schedulePwaInstalled(ctx);
      return;
    default:
      return;
  }
}

export async function primeSound(force = false) {
  if (!canUseSound(force)) return false;

  const ctx = getAudioContext();
  if (!ctx) return false;

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }

  return ctx.state === "running";
}

export function installGlobalSoundUnlock() {
  if (typeof window === "undefined" || unlockListenersInstalled) return;

  unlockListenersInstalled = true;

  const eventNames: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchend"];

  const onFirstGesture = () => {
    void primeSound(true);
    for (const eventName of eventNames) {
      window.removeEventListener(eventName, onFirstGesture);
    }
  };

  for (const eventName of eventNames) {
    window.addEventListener(eventName, onFirstGesture, { once: true, passive: true });
  }
}

export function playSoundEffect(effect: SoundEffectName, options?: PlaySoundOptions) {
  const force = options?.force ?? false;
  if (!canUseSound(force)) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const schedule = () => scheduleSoundEffect(ctx, effect);

  if (ctx.state === "suspended") {
    void ctx.resume().then(schedule).catch(() => {});
    return;
  }

  schedule();
}

export function playSettingToggleSound(enabled: boolean, options?: PlaySoundOptions) {
  playSoundEffect(enabled ? "ui.toggle-on" : "ui.toggle-off", options);
}

export function playUiErrorSound(options?: PlaySoundOptions) {
  playSoundEffect("ui.error", options);
}

export function playActionDeniedSound(options?: PlaySoundOptions) {
  playSoundEffect("ui.denied", options);
}

export function playOpeningRevealSound(params: OpeningRevealParams) {
  if (params.isSurprise11) {
    if (params.rarityKey === "gold-ticket" || params.rarityKey === "gold-ticket-winner") {
      playSoundEffect("opening.ticket-gold-11");
    } else {
      playSoundEffect("opening.card-11");
    }
  } else {
    switch (params.rarityKey) {
      case "u1":
        playSoundEffect("opening.u1");
        break;
      case "u2":
        playSoundEffect("opening.u2");
        break;
      case "leg-bronze":
        playSoundEffect("opening.legend-bronze");
        break;
      case "leg-silver":
        playSoundEffect("opening.legend-silver");
        break;
      case "leg-gold":
        playSoundEffect("opening.legend-gold");
        break;
      default:
        break;
    }
  }

  if (params.isNew) {
    playSoundEffect("opening.new-card");
  }
}
