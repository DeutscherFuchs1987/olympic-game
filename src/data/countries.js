// IOC/NOC 3-letter code -> Russian name + flag source.
// - `iso`  : flagcdn.com (current ISO 3166-1 countries)
// - `file` : Wikimedia Commons file (historical/defunct teams)
export const COUNTRIES = {
  AUS: { ru: 'Австралия', iso: 'au' },
  AUT: { ru: 'Австрия', iso: 'at' },
  BEL: { ru: 'Бельгия', iso: 'be' },
  BRA: { ru: 'Бразилия', iso: 'br' },
  BUL: { ru: 'Болгария', iso: 'bg' },
  CAN: { ru: 'Канада', iso: 'ca' },
  CHN: { ru: 'Китай', iso: 'cn' },
  CUB: { ru: 'Куба', iso: 'cu' },
  ESP: { ru: 'Испания', iso: 'es' },
  EUN: { ru: 'Объединённая команда', file: 'Olympic_flag.svg' },
  FIN: { ru: 'Финляндия', iso: 'fi' },
  FRA: { ru: 'Франция', iso: 'fr' },
  FRG: { ru: 'ФРГ', iso: 'de' },
  GBR: { ru: 'Великобритания', iso: 'gb' },
  GDR: { ru: 'ГДР', file: 'Flag_of_East_Germany.svg' },
  GER: { ru: 'Германия', iso: 'de' },
  GRE: { ru: 'Греция', iso: 'gr' },
  HUN: { ru: 'Венгрия', iso: 'hu' },
  ITA: { ru: 'Италия', iso: 'it' },
  JPN: { ru: 'Япония', iso: 'jp' },
  KOR: { ru: 'Южная Корея', iso: 'kr' },
  MEX: { ru: 'Мексика', iso: 'mx' },
  NED: { ru: 'Нидерланды', iso: 'nl' },
  NOR: { ru: 'Норвегия', iso: 'no' },
  ROC: { ru: 'ОКР', file: 'Russian_Olympic_Committee_flag.svg' },
  ROU: { ru: 'Румыния', iso: 'ro' },
  RUS: { ru: 'Россия', iso: 'ru' },
  SUI: { ru: 'Швейцария', iso: 'ch' },
  SWE: { ru: 'Швеция', iso: 'se' },
  URS: { ru: 'СССР', file: 'Flag_of_the_Soviet_Union.svg' },
  USA: { ru: 'США', iso: 'us' },
  YUG: { ru: 'Югославия', file: 'Flag_of_Yugoslavia.svg' },
}

// Olympic (IOC) codes do not always match ISO/ADM0 codes used by map data.
// Only the differences that matter for host countries are listed here.
const IOC_TO_ADM0 = {
  BUL: 'BGR',
  FRG: 'DEU', // West Germany -> modern Germany on a current map
  GER: 'DEU',
  GDR: 'DEU',
  GRE: 'GRC',
  NED: 'NLD',
  SUI: 'CHE',
  URS: 'RUS', // Moscow 1980 -> modern Russia
  EUN: 'RUS', // Unified Team 1992
  ROC: 'RUS',
  YUG: 'BIH', // Sarajevo 1984 -> Bosnia and Herzegovina
}

/** Map an IOC country code to the ADM0_A3 code used by Natural Earth. */
export function adm0ForIoc(code) {
  if (!code) return null
  return IOC_TO_ADM0[code] ?? code
}

export function countryName(code) {
  return COUNTRIES[code]?.ru ?? code ?? ''
}

export function flagSources(code) {
  const c = COUNTRIES[code]
  if (!c) return []

  const sources = []
  if (c.iso) {
    // jsDelivr is usually reachable where flagcdn is not. The PNG is a fallback.
    sources.push(`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${c.iso}.svg`)
    sources.push(`https://flagcdn.com/w80/${c.iso}.png`)
  }
  if (c.file) {
    sources.push('https://commons.wikimedia.org/wiki/Special:FilePath/' + c.file)
  }
  return sources
}

export function flagUrl(code) {
  return flagSources(code)[0] ?? null
}

export function flagSrcSet(code) {
  const c = COUNTRIES[code]
  if (!c?.iso) return undefined
  return `https://flagcdn.com/w40/${c.iso}.png 1x, https://flagcdn.com/w80/${c.iso}.png 2x`
}
