// Generates WAV audio files for the app sounds.
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, '..', 'public', 'sounds')

function buildWav(samples, sampleRate = 44100) {
  const dataLen = samples.length * 2
  const buf = Buffer.alloc(44 + dataLen)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataLen, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)        // PCM
  buf.writeUInt16LE(1, 22)        // mono
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(sampleRate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataLen, 40)
  samples.forEach((s, i) => buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(s))), 44 + i * 2))
  return buf
}

function sine(freq, dur, amp = 0.7, sr = 44100) {
  const n = Math.floor(sr * dur)
  return Array.from({ length: n }, (_, i) => {
    const t = i / sr
    const fadeIn  = Math.min(1, t / 0.01)
    const fadeOut = Math.min(1, (dur - t) / 0.05)
    return Math.sin(2 * Math.PI * freq * t) * fadeIn * fadeOut * amp * 32767
  })
}

function silence(dur, sr = 44100) {
  return new Array(Math.floor(sr * dur)).fill(0)
}

// new-order.wav — urgent double beep (880 Hz)
const newOrder = buildWav([
  ...sine(880, 0.12),
  ...silence(0.08),
  ...sine(880, 0.12),
])

// waiter-call.wav — soft chime (C5 = 523 Hz, longer)
const waiterCall = buildWav([
  ...sine(523, 0.08),
  ...silence(0.04),
  ...sine(659, 0.25, 0.5),
])

fs.writeFileSync(path.join(OUT_DIR, 'new-order.wav'), newOrder)
fs.writeFileSync(path.join(OUT_DIR, 'waiter-call.wav'), waiterCall)

console.log('Sounds generated:')
console.log('  new-order.wav  —', newOrder.length, 'bytes')
console.log('  waiter-call.wav —', waiterCall.length, 'bytes')
