import * as Tone from 'tone'

const CHORDS = [
  ['C3', 'G3', 'E4'],
  ['A2', 'E3', 'C4'],
  ['F2', 'C3', 'A3'],
  ['G2', 'D3', 'B3'],
]

let ready = false
let starting = null
let master = null
let pad = null
let lead = null
let loop = null
let muted = false

// Era-specific ambience: the pad filter and a quiet noise bed turn the
// soundtrack into a gramophone hiss, TV static or clean digital air.
let padFilter = null
let noise = null
let noiseFilter = null
let currentEra = 'origin'

const ERA_AUDIO = {
  origin: { noise: -46, freq: 1000, type: 'lowpass', pad: 600 },
  interwar: { noise: -43, freq: 1300, type: 'bandpass', pad: 700 },
  postwar: { noise: -50, freq: 900, type: 'lowpass', pad: 860 },
  cold: { noise: -45, freq: 2200, type: 'highpass', pad: 1080 },
  modern: { noise: -58, freq: 3200, type: 'highpass', pad: 1320 },
  contemporary: { noise: -56, freq: 4600, type: 'highpass', pad: 1600 },
}

function applyMood() {
  if (!ready) return
  const mood = ERA_AUDIO[currentEra] ?? ERA_AUDIO.modern
  if (noise) noise.volume.rampTo(mood.noise, 1.6)
  if (noiseFilter) {
    noiseFilter.type = mood.type
    noiseFilter.frequency.rampTo(mood.freq, 1.6)
  }
  if (padFilter) padFilter.frequency.rampTo(mood.pad, 2.2)
}

export function setEraMood(eraId) {
  if (!eraId) return
  currentEra = eraId
  applyMood()
}

export function isReady() {
  return ready
}

export function isMuted() {
  return muted
}

export async function startAudio() {
  if (ready) return
  if (starting) return starting

  starting = (async () => {
    try {
      await Tone.start()

      master = new Tone.Gain(muted ? 0 : 1).toDestination()

      const reverb = new Tone.Reverb({ decay: 8, preDelay: 0.03, wet: 0.45 }).connect(master)
      const filter = new Tone.Filter({ frequency: 780, type: 'lowpass' }).connect(reverb)
      padFilter = filter

      pad = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 8,
        oscillator: { type: 'fatsine', count: 3, spread: 24 },
        envelope: { attack: 4.5, decay: 2, sustain: 0.7, release: 7 },
      }).connect(filter)
      pad.volume.value = -20

      lead = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.7, sustain: 0.04, release: 1.4 },
      }).connect(reverb)
      lead.volume.value = -15

      // Very quiet noise bed. The filter type/frequency follows the era.
      noiseFilter = new Tone.Filter({ frequency: 1000, type: 'lowpass', Q: 0.6 }).connect(master)
      noise = new Tone.Noise('white')
      noise.volume.value = -60
      noise.connect(noiseFilter)
      noise.start()

      let i = 0
      loop = new Tone.Loop((time) => {
        pad?.triggerAttackRelease(CHORDS[i % CHORDS.length], 7, time)
        i += 1
      }, 8).start(0)

      Tone.Transport.bpm.value = 52
      Tone.Transport.start()
      ready = true
      applyMood()
    } catch (err) {
      console.warn('Audio could not start:', err)
    } finally {
      starting = null
    }
  })()

  return starting
}

export function playHover() {
  if (!ready || muted || !lead) return
  lead.triggerAttackRelease('E5', '16n', Tone.now(), 0.25)
}

export function playSelect(season = 'summer') {
  if (!ready || muted || !lead) return
  const now = Tone.now()
  if (season === 'winter') {
    lead.triggerAttackRelease('D5', '16n', now, 0.5)
    lead.triggerAttackRelease('A5', '8n', now + 0.12, 0.45)
  } else {
    lead.triggerAttackRelease('E5', '16n', now, 0.5)
    lead.triggerAttackRelease('B5', '8n', now + 0.12, 0.45)
  }
}

export function playTick() {
  if (!ready || muted || !lead) return
  lead.triggerAttackRelease('G5', '32n', Tone.now(), 0.18)
}

export function setMuted(value) {
  muted = value
  if (master) master.gain.rampTo(value ? 0 : 1, 0.4)
}

export function toggleMuted() {
  setMuted(!muted)
  return muted
}
