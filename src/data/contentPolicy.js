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
