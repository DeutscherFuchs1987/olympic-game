// Content safety for historical photos. The 1936/1940/1944 editions are
// intentionally shown without external photos to avoid Nazi imagery.
export const SENSITIVE_GAMES_YEARS = new Set([1936, 1940, 1944])

export function isSensitiveGames(year) {
  return SENSITIVE_GAMES_YEARS.has(Number(year))
}

// Defence in depth for city/other images: never show files whose names or
// descriptions clearly reference Nazi/fascist or wartime atrocity imagery.
const SENSITIVE_IMAGE =
  /(hitler|nazi|nationalsozial|swastika|hakenkreuz|third[_ -]?reich|drittes[_ -]?reich|deutsches[_ -]?reich|goebbels|goering|göring|himmler|heydrich|eichmann|mussolini|fascis|nuremberg|nürnberg|reichsparteitag|wehrmacht|kriegsmarine|luftwaffe|holocaust|concentration[_ -]?camp|auschwitz|dachau|sachsenhausen|bergen-belsen|gestapo|pogrom|anschluss)/i

export function isSafeImage(...parts) {
  return !SENSITIVE_IMAGE.test(parts.filter(Boolean).join(' '))
}

// Safe modern photos used instead of 1930s propaganda imagery. These are
// current views of the Berlin Olympiastadion, not historical Nazi footage.
const BERLIN_STADIUM_PHOTOS = [
  {
    id: 'berlin-olympiastadion-1',
    thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Berlin_-_Olympiastadion4.jpg/960px-Berlin_-_Olympiastadion4.jpg',
    original: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Berlin_-_Olympiastadion4.jpg',
    link: 'https://commons.wikimedia.org/wiki/File:Berlin_-_Olympiastadion4.jpg',
  },
  {
    id: 'berlin-olympiastadion-2',
    thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Berlin_Jun_2012_026_%28Olympiastadion%29.JPG/960px-Berlin_Jun_2012_026_%28Olympiastadion%29.JPG',
    original: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Berlin_Jun_2012_026_%28Olympiastadion%29.JPG',
    link: 'https://commons.wikimedia.org/wiki/File:Berlin_Jun_2012_026_(Olympiastadion).JPG',
  },
]

export function safeGamesMedia(year) {
  if (Number(year) !== 1936) return null
  const photos = BERLIN_STADIUM_PHOTOS.map((photo) => ({
    id: photo.id,
    sources: [photo.thumb, photo.original],
    link: photo.link,
  }))
  return {
    hero: photos[0].sources,
    credit: {
      href: BERLIN_STADIUM_PHOTOS[0].link,
      label: 'Олимпийский стадион Берлина · Wikimedia Commons',
    },
    photos,
  }
}
