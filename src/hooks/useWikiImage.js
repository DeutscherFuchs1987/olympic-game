import { useEffect, useState } from 'react'
import { cityRu, gamesTitleRu, gamesTitleEn } from '../data/wikiTitles.js'
import { isSafeImage, isSensitiveGames } from '../data/contentPolicy.js'

const summaryCache = new Map()
const galleryCache = new Map()
const gamesCache = new Map()

const ENTITIES = {
  amp: '&',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
  '#8217': '’',
  '#8211': '–',
  '#8212': '—',
  '#160': ' ',
}

const decode = (s) =>
  String(s || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#?([0-9a-z]+);/gi, (m, code) =>
      ENTITIES[code] !== undefined ? ENTITIES[code] : ENTITIES['#' + code] ?? m,
    )

const stripHtml = (s) =>
  decode(String(s || '').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim()

// Some API responses use the thumb.wikimedia.org host; the canonical,
// widely-cached host that browsers load is upload.wikimedia.org.
const normalizeHost = (url) =>
  String(url || '').replace(/^https?:\/\/thumb\.wikimedia\.org\//, 'https://upload.wikimedia.org/')

// IMPORTANT: never rewrite the size segment (e.g. /640px-). Wikimedia only
// serves pre-generated thumbnail widths; arbitrary widths return HTTP 400.
const cleanUrl = (url) => (url ? normalizeHost(url.split('?')[0]) : '')

const widthOf = (u) => {
  const m = String(u).match(/\/(\d+)px-/)
  return m ? Number(m[1]) : 0
}

const unique = (urls) => [...new Set(urls.filter(Boolean))]

function extractFileName(url) {
  const base = cleanUrl(url).split('/').pop() || ''
  return decodeURIComponent(base.replace(/^\d+px-/, ''))
}

// Candidate URLs from a media-list srcset, largest first.
function srcsetSources(srcset) {
  if (!Array.isArray(srcset)) return []
  const urls = unique(srcset.map((e) => cleanUrl(e?.src)))
  return urls.sort((a, b) => widthOf(b) - widthOf(a))
}

const wikiTitle = (title) => encodeURIComponent(String(title).replace(/\s+/g, '_'))

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('http ' + res.status)
  return res.json()
}

async function loadSummary(ruTitle) {
  const json = await fetchJson(
    'https://ru.wikipedia.org/api/rest_v1/page/summary/' + wikiTitle(ruTitle) + '?redirect=true',
  )

  const thumb = cleanUrl(json.thumbnail?.source)
  const orig = cleanUrl(json.originalimage?.source)
  const page = json.content_urls?.desktop?.page || ''
  const context = `${json.description || ''} ${json.title || ''}`
  const safeThumb = thumb && isSafeImage(extractFileName(thumb), context) ? thumb : ''
  const safeOrig = orig && isSafeImage(extractFileName(orig), context) ? orig : ''

  // Order matters: fast CDN thumbnail first, then the full-resolution original.
  const sources = unique([safeThumb, safeOrig])

  if (!sources.length) return { src: null, sources: [], page, title: json.title }

  const image = {
    src: sources[0],
    sources,
    full: safeOrig || safeThumb,
    page,
    title: json.title,
    description: json.description || '',
  }

  const fileName = extractFileName(safeOrig || safeThumb)
  image.link = fileName
    ? 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(fileName)
    : page

  if (fileName) {
    try {
      const cj = await fetchJson(
        'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*' +
          '&prop=imageinfo&iiprop=extmetadata&titles=' +
          encodeURIComponent('File:' + fileName),
      )
      const first = Object.values(cj?.query?.pages || {}).find((p) => p && p.imageinfo)
      const meta = first?.imageinfo?.[0]?.extmetadata || {}
      image.author = stripHtml(meta.Artist?.value) || ''
      image.license = stripHtml(meta.LicenseShortName?.value) || ''
    } catch {
      /* attribution is best-effort */
    }
  }

  return image
}

const GALLERY_SKIP =
  /(flag|coat[_ ]?of[_ ]?arms|emblem|crest|logo|icon|seal|banner|wikimedia|commons|wikidata|wiktionary|_map|map[_ ]of|location|locator|satellite|diagram|chart|graph|signature|wappen|escudo|_cu|gdp|population|boycott|medal|stamp|postal|coin)/i

async function loadMediaList(lang, title) {
  const json = await fetchJson(
    `https://${lang}.wikipedia.org/api/rest_v1/page/media-list/` + wikiTitle(title),
  )
  const items = Array.isArray(json.items) ? json.items : []
  const photos = []

  for (const it of items) {
    if (it.type && it.type !== 'image') continue
    const name = it.title || ''
    if (!/\.(jpe?g|png|webp)$/i.test(name)) continue
    if (!isSafeImage(name, it.caption?.text)) continue
    if (GALLERY_SKIP.test(name.replace(/^File:/, '').replace(/^Файл:/, ''))) continue
    const sources = srcsetSources(it.srcset)
    if (!sources.length) continue
    photos.push({
      id: name,
      sources,
      src: sources[0],
      full: sources[0],
      link: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(name),
    })
    if (photos.length >= 10) break
  }
  return photos
}

// Real photos from the specific Games (English articles are much richer for
// modern editions); fall back to the host city only if the article has none.
async function loadGallery(key) {
  const [year, season, city] = key.split('|')
  if (isSensitiveGames(year)) return []
  let photos = await loadMediaList('en', gamesTitleEn(Number(year), season))
  if (photos.length === 0) photos = await loadMediaList('ru', cityRu(city))
  return photos
}

async function loadGamesInfo(key) {
  const [year, season] = key.split('|')
  const json = await fetchJson(
    'https://ru.wikipedia.org/api/rest_v1/page/summary/' +
      wikiTitle(gamesTitleRu(Number(year), season)) +
      '?redirect=true',
  )
  const thumb = cleanUrl(json.thumbnail?.source)
  const orig = cleanUrl(json.originalimage?.source)
  const safe = !isSensitiveGames(year)
  const context = `${json.description || ''} ${json.extract || ''}`
  const sources = safe
    ? unique([thumb, orig].filter((url) => url && isSafeImage(extractFileName(url), context)))
    : []

  return {
    extract: stripHtml(json.extract),
    description: json.description || '',
    page: json.content_urls?.desktop?.page || '',
    emblem: { sources },
  }
}

function useCached(cache, key, loader) {
  const [state, setState] = useState(() => ({
    loading: !!key && !cache.has(key),
    data: key ? cache.get(key) ?? null : null,
  }))

  useEffect(() => {
    if (!key) {
      setState({ loading: false, data: null })
      return
    }
    if (cache.has(key)) {
      setState({ loading: false, data: cache.get(key) })
      return
    }

    let cancelled = false
    setState({ loading: true, data: null })

    loader(key)
      .then((data) => {
        cache.set(key, data)
        if (!cancelled) setState({ loading: false, data })
      })
      .catch(() => {
        cache.set(key, null)
        if (!cancelled) setState({ loading: false, data: null })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}

export function useWikiImage(city) {
  const key = city ? cityRu(city) : null
  const { loading, data } = useCached(summaryCache, key, loadSummary)
  return { loading, image: data }
}

export function useWikiGallery(year, season, city) {
  const key = year && season && city ? `${year}|${season}|${city}` : null
  const { loading, data } = useCached(galleryCache, key, loadGallery)
  return { loading, photos: data ?? [] }
}

export function useGamesInfo(year, season) {
  const key = year && season ? `${year}|${season}` : null
  const { loading, data } = useCached(gamesCache, key, loadGamesInfo)
  return { loading, info: data }
}
