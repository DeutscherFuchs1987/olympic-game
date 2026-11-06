import { useMemo, useState } from 'react'
import { getMedals } from '../../data/olympics.js'
import { flagUrl, flagSrcSet, countryName } from '../../data/countries.js'

const TOP_N = 8

function Flag({ code }) {
  const [failed, setFailed] = useState(false)
  const src = flagUrl(code)

  if (!src || failed) {
    return <span className="race-flag race-flag--code">{code}</span>
  }

  return (
    <img
      className="race-flag"
      src={src}
      srcSet={flagSrcSet(code)}
      width={22}
      height={16}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}

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

export default function MedalRace({ games, time }) {
  const [open, setOpen] = useState(true)

  const count = useMemo(() => {
    let n = 0
    for (const g of games) {
      if (g.year > time) break
      n += 1
    }
    return n
  }, [games, time])

  const standings = useMemo(
    () => standingsUpTo(games, count).slice(0, TOP_N),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [games, count],
  )

  const max = standings[0]?.total || 1
  const year = count > 0 ? games[count - 1].year : Math.round(time)

  return (
    <section className={`race${open ? ' race--open' : ''}`}>
      <button
        className="race__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="race__title">Медальная гонка</span>
        <span className="race__year">{year}</span>
      </button>

      <div className="race__panel">
        <ul className="race__list">
          {standings.map((c, i) => {
            const gold = (c.gold / max) * 100
            const silver = (c.silver / max) * 100
            const bronze = (c.bronze / max) * 100
            return (
              <li key={c.code} className={`race-row${i === 0 ? ' race-row--lead' : ''}`}>
                <div className="race-row__head">
                  <span className="race-rank">{i + 1}</span>
                  <Flag code={c.code} />
                  <span className="race-name" title={countryName(c.code)}>
                    {countryName(c.code)}
                  </span>
                  <span className="race-total">{c.total}</span>
                </div>
                <div className="race-bar">
                  <span className="race-seg race-seg--gold" style={{ width: `${gold}%` }} />
                  <span className="race-seg race-seg--silver" style={{ width: `${silver}%` }} />
                  <span className="race-seg race-seg--bronze" style={{ width: `${bronze}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
        <div className="race__legend">
          <span><i className="race-dot race-dot--gold" />Золото</span>
          <span><i className="race-dot race-dot--silver" />Серебро</span>
          <span><i className="race-dot race-dot--bronze" />Бронза</span>
        </div>
      </div>
    </section>
  )
}
