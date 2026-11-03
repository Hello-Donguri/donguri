import { Mp3Encoder } from "@breezystack/lamejs";

// Cleaning up a pronunciation recording in the browser, before it's
// uploaded (see RecordDeckAudio): the microphone is opened with the
// browser's own noise suppression, and then this takes the raw samples and
// cuts the low rumble, quietens the background between words, trims the
// silence off both ends (leaving a little breathing room), fades the ends
// so they don't click, evens out the volume, and encodes a small mono MP3
// that plays everywhere.

// The microphone settings to ask for: the browser's noise suppression and
// echo cancellation on, one channel. Its automatic gain is off — it pumps
// the background up between words — since the volume is evened out here.
export const MICROPHONE_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: false,
};

// An AudioWorklet that hands the raw samples to the page in batches, so a
// recording can include the moment just before Space went down (see
// PRE_ROLL_SECONDS in RecordDeckAudio) — MediaRecorder starts too late
// and clips the first sound. Loaded from a Blob URL, so it needs no file of
// its own.
const CAPTURE_WORKLET = `
class Capture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(2048);
    this.filled = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) {
      for (let i = 0; i < channel.length; i++) {
        this.buffer[this.filled++] = channel[i];
        if (this.filled === this.buffer.length) {
          this.port.postMessage(this.buffer);
          this.buffer = new Float32Array(2048);
          this.filled = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor("capture", Capture);
`;

export function captureWorkletUrl() {
  return URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: "application/javascript" }));
}

// A second-order high-pass filter (RBJ cookbook) at `cutoff` Hz — takes out
// desk thumps, traffic and air-conditioning rumble below the voice.
function highPass(samples: Float32Array, sampleRate: number, cutoff: number) {
  const w = (2 * Math.PI * cutoff) / sampleRate;
  const alpha = Math.sin(w) / (2 * Math.SQRT1_2);
  const cos = Math.cos(w);
  const a0 = 1 + alpha;
  const b0 = (1 + cos) / 2 / a0;
  const b1 = -(1 + cos) / a0;
  const b2 = (1 + cos) / 2 / a0;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;
  const out = new Float32Array(samples.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    out[i] = y;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }
  return out;
}

const FRAME_SECONDS = 0.01;

function frameLevels(samples: Float32Array, frame: number) {
  const levels = new Float32Array(Math.ceil(samples.length / frame));
  for (let f = 0; f < levels.length; f++) {
    let sum = 0;
    const end = Math.min(samples.length, (f + 1) * frame);
    for (let i = f * frame; i < end; i++) sum += samples[i] * samples[i];
    levels[f] = Math.sqrt(sum / Math.max(1, end - f * frame));
  }
  return levels;
}

// How loud the background is: the level of the quietest tenth of the
// recording, which is almost always the gaps rather than the voice.
function noiseFloor(levels: Float32Array) {
  const sorted = [...levels].sort((a, b) => a - b);
  return Math.max(sorted[Math.floor(sorted.length * 0.1)] ?? 0, 1e-5);
}

export type ProcessedRecording = { mp3: Blob; seconds: number };

// Cleans and encodes a recording (see the top of this file). Null when
// there's no voice in it at all — nothing rises clearly above the
// background.
export function processRecording(raw: Float32Array, sampleRate: number): ProcessedRecording | null {
  const filtered = highPass(raw, sampleRate, 80);
  const frame = Math.round(sampleRate * FRAME_SECONDS);
  const levels = frameLevels(filtered, frame);
  if (levels.length === 0) return null;
  const floor = noiseFloor(levels);
  const peakLevel = Math.max(...levels);

  // Voice is whatever rises well above the background (and isn't far
  // below the loudest part).
  const threshold = Math.max(floor * 4, peakLevel * 0.06);
  if (peakLevel < floor * 4) return null;
  let first = levels.findIndex((level) => level >= threshold);
  let last = levels.length - 1 - [...levels].reverse().findIndex((level) => level >= threshold);
  if (first < 0) return null;

  // A little room either side, so the start of a soft consonant and the
  // tail of the last sound survive.
  first = Math.max(0, first - Math.round(0.12 / FRAME_SECONDS));
  last = Math.min(levels.length - 1, last + Math.round(0.22 / FRAME_SECONDS));

  // A gentle noise gate: frames that are only background are turned down,
  // smoothly (fast to open, slower to close), rather than cut to silence.
  const gate = new Float32Array(levels.length);
  let gain = 0;
  for (let f = 0; f < levels.length; f++) {
    const open = levels[f] >= floor * 2.5 ? 1 : 0.15;
    gain += (open - gain) * (open > gain ? 0.6 : 0.12);
    gate[f] = gain;
  }

  const start = first * frame;
  const end = Math.min(filtered.length, (last + 1) * frame);
  const out = new Float32Array(end - start);
  for (let i = 0; i < out.length; i++) {
    const position = start + i;
    const f = position / frame;
    const f0 = Math.min(Math.floor(f), gate.length - 1);
    const f1 = Math.min(f0 + 1, gate.length - 1);
    const g = gate[f0] + (gate[f1] - gate[f0]) * (f - f0);
    out[i] = filtered[position] * g;
  }

  // Short fades, so neither end clicks.
  const fadeIn = Math.min(out.length, Math.round(sampleRate * 0.01));
  const fadeOut = Math.min(out.length, Math.round(sampleRate * 0.03));
  for (let i = 0; i < fadeIn; i++) out[i] *= i / fadeIn;
  for (let i = 0; i < fadeOut; i++) out[out.length - 1 - i] *= i / fadeOut;

  // Evened out: the loudest point brought to just under full scale, but
  // never boosted more than 20×, which would only raise the background.
  let peak = 0;
  for (const sample of out) peak = Math.max(peak, Math.abs(sample));
  const boost = peak > 0 ? Math.min(0.89 / peak, 20) : 1;

  const pcm = new Int16Array(out.length);
  for (let i = 0; i < out.length; i++) {
    pcm[i] = Math.max(-32768, Math.min(32767, Math.round(out[i] * boost * 32767)));
  }

  return { mp3: encodeMp3(pcm, sampleRate), seconds: out.length / sampleRate };
}

// The rates an MP3 can be (the MPEG-1, -2 and -2.5 ones); a microphone at
// anything else (some run at 96kHz) is brought down to 48kHz first.
const MP3_RATES = [48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000];

function resample(pcm: Int16Array, from: number, to: number) {
  const out = new Int16Array(Math.floor((pcm.length * to) / from));
  for (let i = 0; i < out.length; i++) {
    const position = (i * from) / to;
    const i0 = Math.floor(position);
    const i1 = Math.min(i0 + 1, pcm.length - 1);
    out[i] = Math.round(pcm[i0] + (pcm[i1] - pcm[i0]) * (position - i0));
  }
  return out;
}

// Mono MP3 at 64kbps — plenty for a voice, and a few KB per word.
function encodeMp3(samples: Int16Array, sampleRate: number) {
  const rate = MP3_RATES.includes(sampleRate) ? sampleRate : 48000;
  const pcm = rate === sampleRate ? samples : resample(samples, sampleRate, rate);
  const encoder = new Mp3Encoder(1, rate, 64);
  const chunks: Uint8Array[] = [];
  const block = 1152;
  for (let i = 0; i < pcm.length; i += block) {
    const encoded = encoder.encodeBuffer(pcm.subarray(i, i + block));
    if (encoded.length) chunks.push(encoded);
  }
  const rest = encoder.flush();
  if (rest.length) chunks.push(rest);
  return new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
}
