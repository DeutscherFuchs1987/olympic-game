import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

// UI-friendly update rate. The 3D torch/camera and the timeline playhead read
// `timeRef` every frame, so slowing React state updates here does not make the
// animation choppy.
const UI_INTERVAL = 80

/**
 * Time cursor for the 1896–2028 timeline.
 * `timeRef` updates continuously; the `time` state is throttled to keep React
 * from re-rendering the whole UI at 60 fps.
 *
 * Wheel input is eased towards a target instead of snapping by one notch:
 * a discrete wheel event used to move the torch and camera in visible steps.
 */
export function useScrollTimeline({ minYear, maxYear, initial = minYear }) {
  const [time, setTimeState] = useState(initial)
  const timeRef = useRef(initial)
  const targetRef = useRef(initial)
  const timer = useRef(null)

  const schedule = useCallback(() => {
    if (timer.current != null) return
    timer.current = setTimeout(() => {
      timer.current = null
      setTimeState(timeRef.current)
    }, UI_INTERVAL)
  }, [])

  const setTime = useCallback(
    (v) => {
      const c = clamp(typeof v === 'function' ? v(timeRef.current) : v, minYear, maxYear)
      if (gsap.isTweening(timeRef)) gsap.killTweensOf(timeRef)
      targetRef.current = c
      timeRef.current = c
      schedule()
      return c
    },
    [minYear, maxYear, schedule],
  )

  const onWheel = useCallback(
    (e) => {
      // Deliberately slow: one wheel notch is less than a year, so the
      // historical route grows gradually instead of jumping between eras.
      const next = clamp(
        targetRef.current + e.deltaY * 0.0055,
        minYear,
        maxYear,
      )
      targetRef.current = next

      if (Math.abs(next - timeRef.current) < 1e-4) return next

      if (gsap.isTweening(timeRef)) gsap.killTweensOf(timeRef)
      gsap.to(timeRef, {
        current: next,
        duration: 0.55,
        ease: 'power2.out',
        overwrite: true,
        onUpdate: schedule,
        onComplete: () => {
          targetRef.current = timeRef.current
          schedule()
        },
      })
      return next
    },
    [minYear, maxYear, schedule],
  )

  useEffect(() => () => {
    clearTimeout(timer.current)
    gsap.killTweensOf(timeRef)
  }, [])

  return { time, timeRef, setTime, onWheel }
}
