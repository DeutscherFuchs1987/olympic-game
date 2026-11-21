import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { getMedals } from '../../data/olympics.js'
import { countryName } from '../../data/countries.js'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'
import CountryFlag from '../Common/CountryFlag.jsx'

const SEASON_LABEL = { summer: 'Летние', winter: 'Зимние', all: 'Все' }

function standingsUpTo(games, count) {
  const acc = new Map()
  for (let i = 0; i < count; i += 1) {
    for (const r of getMedals(games[i].id)) {
      let cur = acc.get(r.code)
      if (!cur) {
        cur = { code: r.code, name: r.name, gold: 0, silver: 0, bronze: 0, total: 0 }
        acc.set(r.code, cur)
      }
      cur.gold += r.gold
      cur.silver += r.silver
      cur.bronze += r.bronze
      cur.total += r.total
    }
  }
  return [...acc.values()].sort((a, b) => b.total - a.total || b.gold - a.gold)
}

function useMedalStandings(games, time) {
  const count = useMemo(() => {
    let n = 0
    for (const g of games) {
      if (g.year > time) break
      n += 1
    }
    return n
  }, [games, time])

  const rows = useMemo(
    () => standingsUpTo(games, count),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [games, count],
  )

  return {
    count,
    rows,
    year: count > 0 ? games[count - 1].year : Math.round(time),
  }
}

/**
 * Desktop medal race: a collapsible live standings panel.
 * On tablets/phones the panel is replaced by the MedalButton under the mascots
 * and a full-screen dialog, because a 300px sidebar does not fit the layout.
 */
export default function MedalRace({ games, time, season = 'all', modalOpen = false, onCloseModal }) {
  const [open, setOpen] = useState(true)
  const prevRanks = useRef(new Map())
  const dialogRef = useFocusTrap(modalOpen)
  const { count, rows, year } = useMedalStandings(games, time)

  // The panel has its own scroll area: show the full list, not just a top-8
  // slice, so the table can be explored without leaving the globe.
  const standings = rows
  const board = rows

  useEffect(() => {
    prevRanks.current = new Map(standings.map((country, index) => [country.code, index]))
  }, [standings])

  useEffect(() => {
    if (!modalOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseModal?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen, onCloseModal])

  const max = rows[0]?.total || 1

  return (
    <>
      <section className={`race${open ? ' race--open' : ''}`} aria-label="Медальная гонка">
        <button
          className="race__toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="race__title">
            Медальная гонка
            {season !== 'all' && (
              <span className="race__season"> · {SEASON_LABEL[season]}</span>
            )}
          </span>
          <span className="race__year">{year}</span>
        </button>

        <div className="race__panel">
          <ul className="race__list">
            <AnimatePresence initial={false} mode="popLayout">
              {standings.map((c, i) => {
                const gold = (c.gold / max) * 100
                const silver = (c.silver / max) * 100
                const bronze = (c.bronze / max) * 100
                const previous = prevRanks.current.get(c.code)
                const delta = previous == null ? 0 : previous - i

                return (
                  <motion.li
                    key={c.code}
                    layout="position"
                    className={`race-row${i === 0 ? ' race-row--lead' : ''}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{
                      layout: { duration: 0.62, ease: [0.22, 1, 0.36, 1] },
                      opacity: { duration: 0.3 },
                    }}
                  >
                    <div className="race-row__head">
                      <span className="race-rank">{i + 1}</span>
                      <CountryFlag code={c.code} className="race-flag" />
                      <span className="race-name" title={countryName(c.code)}>
                        {countryName(c.code)}
                      </span>
                      <span className="race-total">{c.total}</span>
                      <span
                        className={
                          'race-delta' +
                          (delta > 0 ? ' race-delta--up' : delta < 0 ? ' race-delta--down' : '')
                        }
                        aria-hidden="true"
                      >
                        {delta > 0 ? '▲' : delta < 0 ? '▼' : ''}
                      </span>
                    </div>
                    <div className="race-bar">
                      <span className="race-seg race-seg--gold" style={{ width: `${gold}%` }} />
                      <span className="race-seg race-seg--silver" style={{ width: `${silver}%` }} />
                      <span className="race-seg race-seg--bronze" style={{ width: `${bronze}%` }} />
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
          <div className="race__legend">
            <span><i className="race-dot race-dot--gold" />Золото</span>
            <span><i className="race-dot race-dot--silver" />Серебро</span>
            <span><i className="race-dot race-dot--bronze" />Бронза</span>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="medal-board"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onCloseModal}
          >
            <motion.div
              ref={dialogRef}
              className="medal-board__panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="medal-board-title"
              tabIndex={-1}
              initial={{ opacity: 0, y: 44 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 32 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="medal-board__handle" aria-hidden="true" />

              <header className="medal-board__header">
                <div className="medal-board__heading">
                  <span className="medal-board__eyebrow">Олимпийские игры</span>
                  <h2 id="medal-board-title" className="medal-board__title">Медальный зачёт</h2>
                  <div className="medal-board__meta">
                    {year} · {SEASON_LABEL[season]} · учтено Игр: {count}
                  </div>
                </div>
                <button
                  type="button"
                  className="medal-board__close"
                  onClick={onCloseModal}
                  aria-label="Закрыть медальный зачёт"
                >
                  ×
                </button>
              </header>

              <div className="medal-board__scroll">
                {board.length > 0 ? (
                  <>
                    <div className="medal-board__row medal-board__row--head">
                      <span className="medal-board__rank">№</span>
                      <span />
                      <span className="medal-board__name">Страна</span>
                      <span className="medal-board__count medal-board__count--gold" title="Золото">З</span>
                      <span className="medal-board__count medal-board__count--silver" title="Серебро">С</span>
                      <span className="medal-board__count medal-board__count--bronze" title="Бронза">Б</span>
                      <span className="medal-board__total">Всего</span>
                    </div>

                    <ol className="medal-board__list">
                      {board.map((c, i) => {
                        const totalWidth = Math.max(6, (c.total / max) * 100)
                        return (
                          <li
                            key={c.code}
                            className={`medal-board__row${i === 0 ? ' medal-board__row--lead' : ''}`}
                          >
                            <span className="medal-board__rank">{i + 1}</span>
                            <CountryFlag code={c.code} className="medal-board__flag" />
                            <span className="medal-board__name" title={countryName(c.code)}>
                              {countryName(c.code)}
                            </span>
                            <span className="medal-board__count medal-board__count--gold">{c.gold}</span>
                            <span className="medal-board__count medal-board__count--silver">{c.silver}</span>
                            <span className="medal-board__count medal-board__count--bronze">{c.bronze}</span>
                            <span className="medal-board__total">{c.total}</span>
                            <span className="medal-board__bar" aria-hidden="true">
                              <i style={{ width: `${totalWidth}%` }} />
                            </span>
                          </li>
                        )
                      })}
                    </ol>

                  </>
                ) : (
                  <div className="medal-board__empty">
                    На этой отметке медального зачёта ещё нет — подвиньте время вперёд.
                  </div>
                )}
              </div>

              <div className="medal-board__legend">
                <span><i className="race-dot race-dot--gold" />Золото</span>
                <span><i className="race-dot race-dot--silver" />Серебро</span>
                <span><i className="race-dot race-dot--bronze" />Бронза</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
