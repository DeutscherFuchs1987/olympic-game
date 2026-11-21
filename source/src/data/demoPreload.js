import { GAMES } from './olympics.js'
import { MASCOTS } from './mascots.js'
import { loadCountryFeatures } from './countriesGeo.js'
import { preloadGamesMedia } from '../hooks/useWikiImage.js'

// The live demo jumps between 1896, 1924, 1940, 2024 and the map. Warming
// these exact cards removes the only visible network wait on stage.
const DEMO_GAME_IDS = [
  '2024-summer',
  '1940-summer',
  '1940-winter',
  '1924-summer',
  '1936-summer',
  '1980-summer',
  '2028-summer',
]

const DEMO_MASCOT_IDS = [
  '2024-summer',
  '2020-summer',
  '2018-winter',
  '2014-winter',
  '1980-summer',
  '2026-winter',
]

let started = false

export function preloadDemo() {
  if (started) return
  started = true

  // The Earth texture is the first thing the audience sees after the hand-off.
  if (typeof Image !== 'undefined') {
    const earth = new Image()
    earth.src = '/textures/earth-color.jpg'
  }

  loadCountryFeatures()

  const games = GAMES.filter((game) => DEMO_GAME_IDS.includes(game.id))
  for (const game of games) {
    preloadGamesMedia(game.year, game.season, game.city)
  }

  for (const id of DEMO_MASCOT_IDS) {
    const mascot = MASCOTS[id]
    if (!mascot || typeof Image === 'undefined') continue
    const image = new Image()
    image.src = mascot.thumb ?? mascot.full
  }
}
