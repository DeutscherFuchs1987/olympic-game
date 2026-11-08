import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { SEASON_COLOR, getEra, getMedals } from '../../data/olympics'
import { countryName } from '../../data/countries'
import CountryFlag from '../Common/CountryFlag.jsx'
import { cityRu } from '../../data/wikiTitles'
import { useWikiImage, useWikiGallery, useGamesInfo } from '../../hooks/useWikiImage.js'
import { isSensitiveGames, safeGamesMedia } from '../../data/contentPolicy.js'

const SEASON_RU = { summer: 'Летние', winter: 'Зимние' }

// Walk through candidate URLs, advancing to the next one on load error.
function useResilientImage(sources) {
  const key = sources ? sources.join('|') : ''
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    setIdx(0)
  }, [key])

  const src = sources && idx < sources.length ? sources[idx] : null
  return { src, failed: !!sources?.length && !src, onError: () => setIdx((i) => i + 1) }
}

function Photo({ sources, alt = '', className }) {
  const { src, onError } = useResilientImage(sources)
  if (!src) return null
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      draggable={false}
      onError={onError}
    />
  )
}

function Media({ sources, credit, loading, season, year, alt }) {
  const { src, failed, onError } = useResilientImage(sources)
  const hasImage = !!src && !failed

  return (
    <div className={`event-card__media${hasImage ? '' : ' event-card__media--empty'}`}>
      {hasImage && (
        <img
          className="event-card__photo"
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          draggable={false}
          onError={onError}
        />
      )}

      <div className="event-card__media-scrim" />

      <div className="event-card__media-head">
        <span className="event-card__season" style={{ color: SEASON_COLOR[season] }}>
          {SEASON_RU[season] ?? 'Летние'} Игры
        </span>
        <span className="event-card__media-year">{year}</span>
      </div>

      {hasImage && credit && (
        <a className="event-card__credit" href={credit.href} target="_blank" rel="noreferrer">
          {credit.label}
        </a>
      )}
      {!hasImage && loading && <span className="event-card__media-loading">загрузка фото…</span>}
    </div>
  )
}

function About({ loading, info }) {
  if (!loading && !info?.extract) return null

  return (
    <section className="event-card__about">
      <div className="event-card__section-title">История Игр</div>
      {loading ? (
        <div className="event-card__section-loading">загрузка…</div>
      ) : (
        <p className="about__text">{info.extract}</p>
      )}
    </section>
  )
}

function Gallery({ loading, photos, onOpen }) {
  if (!loading && photos.length === 0) return null

  return (
    <section className="event-card__gallery">
      <div className="event-card__section-title">
        Фотографии{photos.length > 0 ? ` · ${photos.length}` : ''}
      </div>
      {loading ? (
        <div className="event-card__section-loading">загрузка фотографий…</div>
      ) : (
        <div className="gallery__strip">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className="gallery__thumb"
              onClick={() => onOpen(i)}
              aria-label="Открыть фото"
            >
              <Photo className="gallery__thumb-img" sources={p.sources} />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function Lightbox({ photos, index, onClose, onNav }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') onNav(1)
      else if (e.key === 'ArrowLeft') onNav(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNav])

  const photo = photos[index]
  if (!photo) return null

  return (
    <motion.div
      className="lightbox"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <button className="lightbox__close" onClick={onClose} aria-label="Закрыть">×</button>

      {photos.length > 1 && (
        <>
          <button
            className="lightbox__nav lightbox__nav--prev"
            onClick={(e) => { e.stopPropagation(); onNav(-1) }}
            aria-label="Предыдущее фото"
          >‹</button>
          <button
            className="lightbox__nav lightbox__nav--next"
            onClick={(e) => { e.stopPropagation(); onNav(1) }}
            aria-label="Следующее фото"
          >›</button>
        </>
      )}

      <figure className="lightbox__figure" onClick={(e) => e.stopPropagation()}>
        <Photo className="lightbox__img" sources={photo.sources} />
        <figcaption className="lightbox__caption">
          <span className="lightbox__counter">{index + 1} / {photos.length}</span>
          <a className="lightbox__link" href={photo.link} target="_blank" rel="noreferrer">
            Wikimedia Commons →
          </a>
        </figcaption>
      </figure>
    </motion.div>
  )
}

export default function EventCard({ event, onClose, historyGames = [], onNavigate }) {
  const era = event ? getEra(event.year) : null
  const sensitive = event ? isSensitiveGames(event.year) : false
  const safeMedia = sensitive ? safeGamesMedia(event?.year) : null
  const medals = event ? getMedals(event.id) : []
  const gameIndex = event ? historyGames.findIndex((game) => game.id === event.id) : -1
  const previousGame = gameIndex > 0 ? historyGames[gameIndex - 1] : null
  const nextGame = gameIndex >= 0 && gameIndex < historyGames.length - 1 ? historyGames[gameIndex + 1] : null
  const sameCityGames = event
    ? historyGames.filter((game) => game.id !== event.id && game.city === event.city)
    : []

  const city = useWikiImage(sensitive ? null : event?.city)
  const games = useGamesInfo(event?.year, event?.season)
  const gallery = useWikiGallery(
    sensitive ? null : event?.year,
    sensitive ? null : event?.season,
    sensitive ? null : event?.city,
  )

  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    setLightbox(null)
  }, [event?.id])

  useEffect(() => {
    if (!event) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape' || lightbox != null) return
      // The mascot gallery has its own Escape handler and sits above the card.
      if (document.querySelector('.mascots, .mascots__detail')) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [event, lightbox, onClose])

  const displayPhotos = sensitive ? (safeMedia?.photos ?? []) : gallery.photos
  const heroPhoto = displayPhotos[0] ?? null
  const heroSources = sensitive
    ? (safeMedia?.hero ?? [])
    : [
        ...(heroPhoto?.sources ?? []),
        ...(games.info?.emblem?.sources ?? []),
        ...(city.image?.sources ?? []),
      ]
  const heroLoading = !sensitive
    && (gallery.loading || games.loading || city.loading)
    && heroSources.length === 0
  const heroCredit = sensitive
    ? (safeMedia?.credit ?? null)
    : heroPhoto
      ? { href: heroPhoto.link, label: 'Фото · Wikimedia Commons' }
      : games.info?.page
        ? { href: games.info.page, label: 'Изображение · Википедия' }
        : city.image?.link || city.image?.page
          ? {
              href: city.image.link || city.image.page,
              label: [city.image.author, city.image.license].filter(Boolean).join(' · ') || 'Wikimedia Commons',
            }
          : null

  const nav = (dir) =>
    setLightbox((i) =>
      i == null || displayPhotos.length === 0
        ? i
        : (i + dir + displayPhotos.length) % displayPhotos.length,
    )

  return (
    <>
      <AnimatePresence>
        {event && (
          <motion.aside
            key={event.id}
            className={`event-card era-${era.id}`}
            initial={{ opacity: 0, x: 48, y: '-50%' }}
            animate={{ opacity: 1, x: 0, y: '-50%' }}
            exit={{ opacity: 0, x: 48, y: '-50%' }}
            transition={{ type: 'spring', stiffness: 210, damping: 26 }}
          >
            <button className="event-card__close" onClick={onClose} aria-label="Закрыть">
              ×
            </button>

            <Media
              sources={heroSources}
              credit={heroCredit}
              loading={heroLoading}
              season={event.season}
              year={event.year}
              alt={`${cityRu(event.city)} — ${event.year}`}
            />

            <div className="event-card__body">
              <div className="event-card__city">{cityRu(event.city)}</div>
              <div className="event-card__country-row">
                {event.countryCode && (
                  <CountryFlag code={event.countryCode} className="event-card__flag" />
                )}
                <span className="event-card__country">
                  {countryName(event.countryCode) || event.country}
                  {event.countryCode ? ` · ${event.countryCode}` : ''}
                </span>
              </div>

              <div className="event-card__era">{era.label}</div>
              {era.tagline && <p className="event-card__era-tagline">{era.tagline}</p>}

              {event.mascot && (
                <div className="event-card__row">
                  <span className="event-card__row-label">Талисман</span>
                  <span className="event-card__row-value">{event.mascot}</span>
                </div>
              )}

              {event.fact && (
                <>
                  <div className="event-card__section-title event-card__fact-title">Факт</div>
                  <p className="event-card__fact">{event.fact}</p>
                </>
              )}

              {event.cancelled && (
                <div className="event-card__cancelled">Эта Игра не состоялась.</div>
              )}

              {sameCityGames.length > 0 && (
                <section className="event-card__same-city">
                  <div className="event-card__section-title">Игры в этом городе</div>
                  <div className="event-card__chips">
                    {sameCityGames.map((game) => (
                      <button
                        key={game.id}
                        type="button"
                        className={
                          'event-card__chip' +
                          (game.cancelled ? ' event-card__chip--cancelled' : '')
                        }
                        onClick={() => onNavigate?.(game)}
                      >
                        {game.year} · {game.cancelled
                          ? 'не состоялись'
                          : game.season === 'winter' ? 'зимние' : 'летние'}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <div className="event-card__medals">
                <div className="event-card__section-title">Медальный зачёт · топ-5</div>
                {medals.length > 0 ? (
                  <>
                    <div className="medal-row medal-row--head">
                      <span className="medal-rank">№</span>
                      <span className="medal-name">Страна</span>
                      <i className="medal-dot medal-dot--gold" />
                      <i className="medal-dot medal-dot--silver" />
                      <i className="medal-dot medal-dot--bronze" />
                    </div>
                    {medals.map((m, i) => (
                      <div className="medal-row" key={m.code}>
                        <span className="medal-rank">{i + 1}</span>
                        <span className="medal-name" title={countryName(m.code)}>{countryName(m.code)}</span>
                        <span className="medal-count medal-count--gold">{m.gold}</span>
                        <span className="medal-count medal-count--silver">{m.silver}</span>
                        <span className="medal-count medal-count--bronze">{m.bronze}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="medal-none">Данные медалей пока недоступны.</div>
                )}
              </div>

              <About loading={games.loading} info={games.info} />

              <Gallery
                loading={sensitive ? false : gallery.loading}
                photos={displayPhotos}
                onOpen={setLightbox}
              />

              {(previousGame || nextGame) && (
                <div className="event-card__nav">
                  <button
                    type="button"
                    className="event-card__nav-btn"
                    disabled={!previousGame}
                    onClick={() => previousGame && onNavigate?.(previousGame)}
                  >
                    ← {previousGame ? `${previousGame.year}` : '—'}
                  </button>
                  <span className="event-card__nav-label">другие Игры</span>
                  <button
                    type="button"
                    className="event-card__nav-btn"
                    disabled={!nextGame}
                    onClick={() => nextGame && onNavigate?.(nextGame)}
                  >
                    {nextGame ? `${nextGame.year}` : '—'} →
                  </button>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {event && lightbox != null && (
          <Lightbox
            photos={displayPhotos}
            index={lightbox}
            onClose={() => setLightbox(null)}
            onNav={nav}
          />
        )}
      </AnimatePresence>
    </>
  )
}
