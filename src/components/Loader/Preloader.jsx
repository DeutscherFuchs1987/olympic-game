import { useEffect, useRef, useState } from 'react'

const RINGS = [
  { cx: 55, cy: 55, color: '#0081C8' },
  { cx: 105, cy: 55, color: '#4a4a4a' },
  { cx: 155, cy: 55, color: '#EE334E' },
  { cx: 80, cy: 98, color: '#FCB131' },
  { cx: 130, cy: 98, color: '#00A651' },
]

const R = 26
const CIRC = 2 * Math.PI * R

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export default function Preloader({ onComplete }) {
  const [progress, setProgress] = useState(0)
  const [hidden, setHidden] = useState(false)
  const done = useRef(false)

  useEffect(() => {
    let raf
    let last = performance.now()

    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now

      setProgress((p) => {
        if (p >= 100) return 100
        const speed = p < 70 ? 55 : p < 95 ? 22 : 9
        return clamp(p + speed * dt, 0, 100)
      })

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (progress < 100 || done.current) return
    done.current = true

    const hideTimer = setTimeout(() => setHidden(true), 450)
    const doneTimer = setTimeout(() => onComplete?.(), 1150)
    return () => {
      clearTimeout(hideTimer)
      clearTimeout(doneTimer)
    }
  }, [progress, onComplete])

  if (hidden) return null

  const filled = (progress / 100) * RINGS.length

  return (
    <div className={`preloader${progress >= 100 ? ' preloader--leaving' : ''}`}>
      <div className="preloader__inner">
        <svg className="preloader__rings" viewBox="0 0 210 135" aria-hidden="true">
          {RINGS.map((ring, i) => (
            <g key={i}>
              <circle
                cx={ring.cx}
                cy={ring.cy}
                r={R}
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.08"
                strokeWidth="5"
              />
              <circle
                cx={ring.cx}
                cy={ring.cy}
                r={R}
                fill="none"
                stroke={ring.color}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - clamp(filled - i, 0, 1))}
                transform={`rotate(-90 ${ring.cx} ${ring.cy})`}
              />
            </g>
          ))}
        </svg>

        <div className="preloader__title">OLYMPIC GAMES</div>
        <div className="preloader__subtitle">An interactive journey through history</div>

        <div className="preloader__bar">
          <span className="preloader__bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="preloader__percent">{Math.round(progress)}%</div>
      </div>
    </div>
  )
}
