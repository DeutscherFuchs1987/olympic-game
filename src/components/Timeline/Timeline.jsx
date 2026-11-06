import { useCallback, useEffect, useRef } from 'react'
import { ERAS, SEASON_COLOR, getEra } from '../../data/olympics'
import { cityRu } from '../../data/wikiTitles'

export const MIN_YEAR = 1896
export const MAX_YEAR = 2028

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const yearToPct = (y) => clamp01((y - MIN_YEAR) / (MAX_YEAR - MIN_YEAR))

export default function Timeline({
  games,
  cancelledGames = [],
  time,
  activeId,
  playing = false,
  onChange,
  onCommit,
  onSelectGame,
  onTogglePlay,
}) {
  const trackRef = useRef()
  const dragging = useRef(false)

  const yearFromClientX = useCallback((clientX) => {
    const el = trackRef.current
    if (!el) return MIN_YEAR
    const r = el.getBoundingClientRect()
    return MIN_YEAR + clamp01((clientX - r.left) / r.width) * (MAX_YEAR - MIN_YEAR)
  }, [])

  useEffect(() => {
    const onMove = (e) => {
      if (dragging.current) onChange(yearFromClientX(e.clientX))
    }
    const onUp = (e) => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      onCommit?.(yearFromClientX(e.clientX))
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [onChange, onCommit, yearFromClientX])

  const startDrag = (e) => {
    dragging.current = true
    document.body.style.cursor = 'grabbing'
    onChange(yearFromClientX(e.clientX))
  }

  const pct = yearToPct(time) * 100
  const activeEra = getEra(time)

  return (
    <div className="timeline">
      <button
        className={`timeline__play${playing ? ' timeline__play--on' : ''}`}
        onClick={onTogglePlay}
        aria-label={playing ? 'Пауза' : 'Проиграть'}
      >
        {playing ? '❚❚' : '▶'}
      </button>

      <div className="timeline__body">
        <div className="timeline__track" ref={trackRef} onPointerDown={startDrag}>
          <span className="timeline__progress" style={{ width: `${pct}%` }} />

          {games.map((g) => (
            <button
              key={g.id}
              className={
                'timeline__mark' +
                (g.season === 'winter' ? ' timeline__mark--winter' : '') +
                (g.id === activeId ? ' timeline__mark--active' : '')
              }
              style={{ left: `${yearToPct(g.year) * 100}%`, '--mark': SEASON_COLOR[g.season] }}
              title={`${g.year} · ${cityRu(g.city)}`}
              onClick={(e) => {
                e.stopPropagation()
                onSelectGame?.(g)
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ))}

          {cancelledGames.map((g) => (
            <button
              key={g.id}
              className={
                'timeline__mark timeline__mark--cancelled' +
                (g.season === 'winter' ? ' timeline__mark--winter' : '') +
                (g.id === activeId ? ' timeline__mark--active' : '')
              }
              style={{ left: `${yearToPct(g.year) * 100}%` }}
              title={`${g.year} · ${cityRu(g.city)} — Игры не состоялись`}
              aria-label={`${g.year}, ${cityRu(g.city)} — Игры не состоялись`}
              onClick={(e) => {
                e.stopPropagation()
                onSelectGame?.(g)
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ))}

          <span className="timeline__playhead" style={{ left: `${pct}%` }}>
            <span className="timeline__year">{Math.round(time)}</span>
          </span>
        </div>

        <div className="timeline__eras">
          {ERAS.map((item) => {
            const left = yearToPct(item.from) * 100
            const right = yearToPct(item.to + 1) * 100
            return (
              <button
                key={item.id}
                type="button"
                className={
                  'timeline__era' +
                  (item.id === activeEra.id ? ' timeline__era--active' : '')
                }
                style={{
                  left: `${left}%`,
                  width: `${Math.max(0.6, right - left)}%`,
                  '--era-color': item.color,
                }}
                title={`${item.label} · ${item.from}—${item.to}`}
                aria-label={`${item.label}, ${item.from}—${item.to}`}
                onClick={() => onChange?.(item.from)}
              />
            )
          })}
        </div>

        <div className="timeline__scale">
          <span>1896</span>
          <span>1950</span>
          <span>2028</span>
        </div>
      </div>
    </div>
  )
}
