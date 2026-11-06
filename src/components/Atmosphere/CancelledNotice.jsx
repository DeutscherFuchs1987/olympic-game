import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cityRu } from '../../data/wikiTitles.js'

/**
 * A short historical "cut" when the time cursor crosses a cancelled edition
 * (1916, 1940, 1944). The EventCard still works independently if the user
 * clicks a cancelled mark on the timeline.
 */
export default function CancelledNotice({ time, games, selected = null }) {
  const [notice, setNotice] = useState(null)
  const lastTime = useRef(time)
  const lastSelected = useRef(null)
  const timer = useRef(null)

  const show = (year) => {
    const sameYear = games.filter((g) => g.year === year)
    if (!sameYear.length) return
    const cities = [...new Set(sameYear.map((g) => cityRu(g.city)))]

    clearTimeout(timer.current)
    setNotice({
      year,
      cities,
      fact: sameYear[0]?.fact ?? '',
    })
    timer.current = setTimeout(() => setNotice(null), 4600)
  }

  useEffect(() => {
    const from = lastTime.current
    const to = time
    lastTime.current = time

    if (to <= from) return
    // A deliberate jump across decades is not a "crossing" — do not flash a
    // notice for every cancelled edition on the way to 2028.
    if (to - from > 3) return

    const crossed = games.filter((g) => g.year > from && g.year <= to)
    if (!crossed.length) return
    show(Math.max(...crossed.map((g) => g.year)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, games])

  useEffect(() => {
    if (!selected) {
      lastSelected.current = null
      return
    }
    if (!selected.cancelled) return
    if (lastSelected.current === selected.id) return
    lastSelected.current = selected.id
    show(selected.year)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          key={`${notice.year}-${notice.cities.join('-')}`}
          className="cancelled-notice"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          role="status"
        >
          <span className="cancelled-notice__icon" aria-hidden="true">✕</span>
          <div className="cancelled-notice__body">
            <div className="cancelled-notice__meta">
              {notice.year} · {notice.cities.join(' / ')}
            </div>
            <div className="cancelled-notice__title">Игры не состоялись</div>
            {notice.fact && <div className="cancelled-notice__fact">{notice.fact}</div>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
