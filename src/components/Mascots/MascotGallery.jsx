import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { HELD_GAMES, SEASON_COLOR } from '../../data/olympics.js'
import { MASCOTS, mascotWikiUrl } from '../../data/mascots.js'
import { cityRu } from '../../data/wikiTitles.js'

const SEASON_RU = { summer: 'Летние', winter: 'Зимние' }
const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'summer', label: 'Летние' },
  { id: 'winter', label: 'Зимние' },
]

function MascotImage({ sources, alt, className }) {
  const key = sources.join('|')
  const [idx, setIdx] = useState(0)

  useEffect(() => setIdx(0), [key])

  const src = sources[idx] ?? null
  if (!src) return <span className={`${className} mascots__img--missing`} aria-hidden="true" />

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setIdx((i) => i + 1)}
    />
  )
}

export default function MascotGallery({ open, onClose, onOpenGame }) {
  const [filter, setFilter] = useState('all')
  const [detail, setDetail] = useState(null)

  const items = useMemo(
    () => HELD_GAMES.filter((g) => MASCOTS[g.id]).map((g) => ({ game: g, info: MASCOTS[g.id] })),
    [],
  )
  const list = useMemo(
    () => items.filter(({ game }) => filter === 'all' || game.season === filter),
    [items, filter],
  )

  useEffect(() => {
    if (!open) {
      setDetail(null)
      setFilter('all')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (detail != null) setDetail(null)
        else onClose?.()
      } else if (detail != null && e.key === 'ArrowRight') {
        setDetail((i) => (i + 1) % list.length)
      } else if (detail != null && e.key === 'ArrowLeft') {
        setDetail((i) => (i - 1 + list.length) % list.length)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, detail, list.length, onClose])

  const current = detail != null ? list[detail] : null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="mascots"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div className="mascots__header">
            <div>
              <div className="mascots__title">Талисманы</div>
              <div className="mascots__subtitle">
                Олимпийские игры · {items.length} персонажей
              </div>
            </div>
            <button className="mascots__close" onClick={onClose} aria-label="Закрыть">×</button>
          </div>

          <div className="mascots__filters">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={`mascots__filter${filter === f.id ? ' mascots__filter--on' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mascots__grid">
            {list.map(({ game, info }, i) => (
              <motion.button
                key={game.id}
                type="button"
                className="mascots__card"
                onClick={() => setDetail(i)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i, 14) * 0.03 }}
              >
                <span className="mascots__card-media">
                  <MascotImage
                    className="mascots__card-img"
                    sources={[info.thumb, info.full]}
                    alt={`${info.name} — ${game.year}`}
                  />
                  <span
                    className="mascots__card-year"
                    style={{ background: SEASON_COLOR[game.season] }}
                  >
                    {game.year}
                  </span>
                </span>
                <span className="mascots__card-body">
                  <span className="mascots__card-name">{info.name}</span>
                  <span className="mascots__card-type">{info.type}</span>
                  <span className="mascots__card-city">{cityRu(game.city)}</span>
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {open && current && (
          <motion.div
            className="mascots__detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDetail(null)}
          >
            <button className="mascots__detail-close" onClick={() => setDetail(null)} aria-label="Закрыть">×</button>

            {list.length > 1 && (
              <>
                <button
                  className="mascots__nav mascots__nav--prev"
                  onClick={(e) => { e.stopPropagation(); setDetail((i) => (i - 1 + list.length) % list.length) }}
                  aria-label="Предыдущий талисман"
                >‹</button>
                <button
                  className="mascots__nav mascots__nav--next"
                  onClick={(e) => { e.stopPropagation(); setDetail((i) => (i + 1) % list.length) }}
                  aria-label="Следующий талисман"
                >›</button>
              </>
            )}

            <figure className="mascots__figure" onClick={(e) => e.stopPropagation()}>
              <div className="mascots__detail-media">
                <MascotImage
                  className="mascots__detail-img"
                  sources={[current.info.full, current.info.thumb]}
                  alt={current.info.name}
                />
              </div>

              <figcaption className="mascots__detail-body">
                <span
                  className="mascots__detail-season"
                  style={{ color: SEASON_COLOR[current.game.season] }}
                >
                  {SEASON_RU[current.game.season]} Игры · {current.game.year}
                </span>
                <h3 className="mascots__detail-name">{current.info.name}</h3>
                <div className="mascots__detail-type">{current.info.type}</div>
                <div className="mascots__detail-city">{cityRu(current.game.city)}</div>

                <div className="mascots__detail-actions">
                  <button
                    className="mascots__action mascots__action--primary"
                    onClick={() => { onOpenGame?.(current.game); onClose?.() }}
                  >
                    Открыть Игры
                  </button>
                  <a
                    className="mascots__action"
                    href={mascotWikiUrl(current.info)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Википедия →
                  </a>
                </div>

                <div className="mascots__detail-counter">
                  {detail + 1} / {list.length}
                </div>
              </figcaption>
            </figure>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  )
}
