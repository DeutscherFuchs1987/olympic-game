import * as THREE from 'three'
import rawGames from './olympics.json'
import rawMedals from './medals.json'

export const GAMES = rawGames
export const MEDALS = rawMedals

export const SEASON_COLOR = {
  summer: '#fcb131',
  winter: '#4aa3ff',
}

export const SEASON_LABEL = {
  summer: 'Summer',
  winter: 'Winter',
}

const DEG2RAD = Math.PI / 180

/**
 * Convert geographic coordinates to a position on a sphere.
 * Uses the common equirectangular mapping (lon 0 -> +X axis).
 */
export function latLonToVector3(lat, lon, radius = 1, target = new THREE.Vector3()) {
  const phi = (90 - lat) * DEG2RAD
  const theta = (lon + 180) * DEG2RAD
  const sinPhi = Math.sin(phi)
  return target.set(
    -radius * sinPhi * Math.cos(theta),
    radius * Math.cos(phi),
    radius * sinPhi * Math.sin(theta),
  )
}

/** Games that actually took place (excludes cancelled editions). */
export const HELD_GAMES = GAMES.filter((g) => !g.cancelled).sort(
  (a, b) => a.year - b.year || (a.season === 'winter' ? 1 : -1),
)

/** Editions that were cancelled (1916, 1940, 1944) — shown as ghost markers. */
export const CANCELLED_GAMES = GAMES.filter((g) => g.cancelled).sort(
  (a, b) => a.year - b.year || (a.season === 'winter' ? 1 : -1),
)

export function colorForSeason(season) {
  return SEASON_COLOR[season] ?? SEASON_COLOR.summer
}

export function getMedals(gameId) {
  return MEDALS[gameId] ?? []
}

export const ERAS = [
  {
    id: 'origin',
    from: 1896,
    to: 1912,
    label: 'Эпоха истоков',
    tagline: 'Рождение современной Олимпиады',
    medium: 'Сепия · 35 мм',
    color: '#fcb131',
  },
  {
    id: 'interwar',
    from: 1920,
    to: 1936,
    label: 'Между войнами',
    tagline: 'Хрупкий мир и большие надежды',
    medium: 'Ч/Б · Кинохроника',
    color: '#ee334e',
  },
  {
    id: 'postwar',
    from: 1948,
    to: 1968,
    label: 'Послевоенная эпоха',
    tagline: 'Возвращение на арену',
    medium: 'Кодахром · 1960-е',
    color: '#00a651',
  },
  {
    id: 'cold',
    from: 1972,
    to: 1988,
    label: 'Эпоха противостояния',
    tagline: 'Спорт как зеркало двух систем',
    medium: 'ТВ-эфир · Цвет',
    color: '#0081c8',
  },
  {
    id: 'modern',
    from: 1992,
    to: 2008,
    label: 'Новое время',
    tagline: 'Глобализация и большой спорт',
    medium: 'HD-трансляция',
    color: '#00b5cc',
  },
  {
    id: 'contemporary',
    from: 2012,
    to: 2028,
    label: 'Современные Игры',
    tagline: 'Цифровая эпоха и новые горизонты',
    medium: '4K · Digital',
    color: '#6a5cff',
  },
]

export function getEra(year) {
  const value = Number(year)
  if (!Number.isFinite(value)) return ERAS[0]

  let best = ERAS[0]
  let bestDistance = Infinity
  for (const era of ERAS) {
    const distance =
      value < era.from ? era.from - value : value > era.to ? value - era.to : 0
    if (distance < bestDistance) {
      bestDistance = distance
      best = era
    }
  }
  return best
}
