import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { getEra, getMedals } from '../../data/olympics.js'
import { countryName } from '../../data/countries.js'
import { cityRu } from '../../data/wikiTitles.js'
import { useIsCompact } from '../../hooks/useMediaQuery.js'
import CountryFlag from '../Common/CountryFlag.jsx'

const SEASON_RU = { summer: 'Летние', winter: 'Зимние' }

/**
 * Compact "stop card" during autoplay. It holds the timeline at a host city,
 * gives a short digest, and lets the viewer either continue or open the full
 * history card (which also stops the autoplay).
 *
 * On phones it becomes a bottom sheet: the body scrolls, while the header and
 * the action buttons stay in place. This prevents a long fact from pushing the
 * card off-screen and keeps every stop card the same readable width.
 */
export default function GamesPreview({
  game,
  playing,
  dwellMs = 3400,
  onReadMore,
  onContinue,
  onAutoAdvance,
  onClose,
}) {
  const compact = useIsCompact()
  const [held, setHeld] = useState(false)
  const era = game ? getEra(game.year) : null
  const medals = game
    ? [...getMedals(game.id)].sort((a, b) => b.total - a.total).slice(0, 3)
    : []

  useEffect(() => {
    setHeld(false)
  }, [game?.id])

  // Phones need more time to read the fact, and a touch on the card should
  // hold it open instead of racing the auto-advance timer.
  const dwell = compact ? Math.max(dwellMs, 6000) : dwellMs

  return (
    <AnimatePresence mode="wait">
      {game && (
        <motion.aside
          key={game.id}
          className={`games-preview${playing ? '' : ' games-preview--paused'}${compact ? ' games-preview--sheet' : ''}${held ? ' games-preview--held' : ''}`}
          style={{ '--dwell': `${dwell}ms` }}
          onPointerDown={() => setHeld(true)}
          initial={compact ? { opacity: 0, y: 24 } : { opacity: 0, y: 18, filter: 'blur(6px)' }}
          animate={compact ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={compact ? { opacity: 0, y: 18 } : { opacity: 0, y: 12, filter: 'blur(6px)' }}
          transition={{ duration: compact ? 0.28 : 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="games-preview__head">
            <span className="games-preview__status">
              <i aria-hidden="true" /> Остановка в городе
            </span>
            <button
              type="button"
              className="games-preview__close"
              onClick={onClose}
              aria-label="Закрыть карточку остановки"
            >
              ×
            </button>
          </div>

          <div className="games-preview__scroll">
            <div className="games-preview__main">
              <div>
                <div className="games-preview__city">{cityRu(game.city)}</div>
                <div className="games-preview__meta">
                  {game.year} · {SEASON_RU[game.season] ?? 'Игры'} · {countryName(game.countryCode)}
                </div>
              </div>
              <div className="games-preview__year">{game.year}</div>
            </div>

            {era && (
              <div className="games-preview__era">{era.label} · {era.medium}</div>
            )}

            {game.fact && <p className="games-preview__fact">{game.fact}</p>}

            {medals.length > 0 && (
              <div className="games-preview__medals">
                {medals.map((medal, index) => (
                  <span key={medal.code} className="games-preview__medal">
                    <CountryFlag code={medal.code} className="games-preview__flag" />
                    <b>{countryName(medal.code)}</b>
                    <em>{medal.total}</em>
                    {index === 0 && <i className="games-preview__crown" aria-hidden="true">★</i>}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="games-preview__progress" aria-hidden="true">
            <span onAnimationEnd={onAutoAdvance} />
          </div>

          <div className="games-preview__actions">
            <button
              type="button"
              className="games-preview__action games-preview__action--primary"
              onClick={onReadMore}
            >
              Читать подробнее
            </button>
            <button
              type="button"
              className="games-preview__action"
              onClick={onContinue}
            >
              {playing ? 'Дальше' : 'Продолжить'}
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
