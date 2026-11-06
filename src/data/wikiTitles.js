// Russian Wikipedia titles for the host cities (English dataset name -> ru title).
export const CITY_RU = {
  Athens: 'Афины',
  Paris: 'Париж',
  'St. Louis': 'Сент-Луис',
  London: 'Лондон',
  Stockholm: 'Стокгольм',
  Berlin: 'Берлин',
  Antwerp: 'Антверпен',
  Amsterdam: 'Амстердам',
  'Los Angeles': 'Лос-Анджелес',
  Tokyo: 'Токио',
  Helsinki: 'Хельсинки',
  Melbourne: 'Мельбурн',
  Rome: 'Рим',
  'Mexico City': 'Мехико',
  Munich: 'Мюнхен',
  Montreal: 'Монреаль',
  Moscow: 'Москва',
  Seoul: 'Сеул',
  Barcelona: 'Барселона',
  Atlanta: 'Атланта',
  Sydney: 'Сидней',
  Beijing: 'Пекин',
  'Rio de Janeiro': 'Рио-де-Жанейро',
  Chamonix: 'Шамони',
  'St. Moritz': 'Санкт-Мориц',
  'Lake Placid': 'Лейк-Плэсид',
  'Garmisch-Partenkirchen': 'Гармиш-Партенкирхен',
  Oslo: 'Осло',
  "Cortina d'Ampezzo": 'Кортина-д’Ампеццо',
  'Squaw Valley': 'Скво-Вэлли',
  Innsbruck: 'Инсбрук',
  Grenoble: 'Гренобль',
  Sapporo: 'Саппоро',
  Sarajevo: 'Сараево',
  Calgary: 'Калгари',
  Albertville: 'Альбервиль',
  Lillehammer: 'Лиллехаммер',
  Nagano: 'Нагано',
  'Salt Lake City': 'Солт-Лейк-Сити',
  Turin: 'Турин',
  Vancouver: 'Ванкувер',
  Sochi: 'Сочи',
  Pyeongchang: 'Пхёнчхан',
  'Milano-Cortina': 'Милан — Кортина-д’Ампеццо',
}

export function cityRu(city) {
  return CITY_RU[city] ?? city
}

// Russian Wikipedia article: "Летние Олимпийские игры 2024".
export function gamesTitleRu(year, season) {
  return `${season === 'winter' ? 'Зимние' : 'Летние'} Олимпийские игры ${year}`
}

// English Wikipedia article: "2024_Summer_Olympics" (richer competition photos).
export function gamesTitleEn(year, season) {
  return `${year}_${season === 'winter' ? 'Winter' : 'Summer'}_Olympics`
}
