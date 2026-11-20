import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ERAS } from '../../data/olympics.js'

const CHAPTER_HOLD = 2600
const CHAPTER_DELAY = 320

/**
 * Period-specific "medium" layered over the globe: film grain, scanlines,
 * sepia / B&W grading and a short chapter card when the timeline enters a
 * new era. Everything is pure CSS + one SVG noise texture, so it works offline.
 */
export default function EraAtmosphere({ era, onChapterChange }) {
  const [chapter, setChapter] = useState(null)
  const [flashKey, setFlashKey] = useState(0)
  const previousEra = useRef(era?.id ?? null)
  const showTimer = useRef(null)
  const hideTimer = useRef(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!era?.id || era.id === previousEra.current) return undefined
    previousEra.current = era.id

    clearTimeout(showTimer.current)
    clearTimeout(hideTimer.current)

    // Do not flash a card for every intermediate era while the user scrubs.
    showTimer.current = setTimeout(() => {
      setChapter(era)
      setFlashKey((n) => n + 1)
      onChapterChange?.(true)
      hideTimer.current = setTimeout(() => {
        setChapter(null)
        onChapterChange?.(false)
      }, CHAPTER_HOLD)
    }, CHAPTER_DELAY)

    return () => {
      clearTimeout(showTimer.current)
      clearTimeout(hideTimer.current)
    }
  }, [era, onChapterChange])

  useEffect(() => () => {
    clearTimeout(showTimer.current)
    clearTimeout(hideTimer.current)
    onChapterChange?.(false)
  }, [onChapterChange])

  const index = Math.max(0, ERAS.findIndex((e) => e.id === era?.id)) + 1
  const total = String(ERAS.length).padStart(2, '0')

  return (
    <>
      <div className={`atmosphere atmosphere--${era?.id ?? 'origin'}`} aria-hidden="true">
        <div className="atmosphere__tint" />
        <div className="atmosphere__grain" />
        <div className="atmosphere__dust" />
        <div className="atmosphere__leak" />
        <div className="atmosphere__scratches" />
        <div className="atmosphere__scanlines" />
        <div className="atmosphere__sweep" />
        <div className="atmosphere__grid" />
        <div className="atmosphere__frame" />
        <div className="atmosphere__vignette" />
        {flashKey > 0 && <div key={flashKey} className="atmosphere__flash" />}
      </div>

      <AnimatePresence>
        {chapter && (
          <motion.div
            key={chapter.id}
            className="era-chapter"
            style={{ '--era-color': chapter.color }}
            initial={reduceMotion ? { opacity: 0, x: '-50%' } : { opacity: 0, x: '-50%', y: 18, filter: 'blur(8px)' }}
            animate={reduceMotion ? { opacity: 1, x: '-50%' } : { opacity: 1, x: '-50%', y: 0, filter: 'blur(0px)' }}
            exit={reduceMotion ? { opacity: 0, x: '-50%' } : { opacity: 0, x: '-50%', y: -12, filter: 'blur(8px)' }}
            transition={{ duration: reduceMotion ? 0.2 : 0.48, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="era-chapter__meta">
              <span>{String(index).padStart(2, '0')} / {total}</span>
              <span className="era-chapter__medium">{chapter.medium}</span>
            </div>
            <h2 className="era-chapter__title">{chapter.label}</h2>
            <p className="era-chapter__tagline">{chapter.tagline}</p>
            <span className="era-chapter__rule" />
            <span className="era-chapter__years">{chapter.from} — {chapter.to}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
