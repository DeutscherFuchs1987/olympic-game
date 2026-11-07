import { useCallback, useEffect, useRef, useState } from 'react'

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

// UI-friendly update rate. The 3D torch/camera read `timeRef` every frame, so
// slowing React state updates here does not make the animation choppy.
const UI_INTERVAL = 80

/**
 * Time cursor for the 1896–2028 timeline.
 * `timeRef` updates immediately for the WebGL scene; the `time` state is
 * throttled to keep React from re-rendering the whole UI at 60 fps.
 */
export function useScrollTimeline({ minYear, maxYear, initial = minYear }) {
  const [time, setTimeState] = useState(initial)
  const timeRef = useRef(initial)
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
      setTime(timeRef.current + e.deltaY * 0.0055)
    },
    [setTime],
  )

  useEffect(() => () => clearTimeout(timer.current), [])

  return { time, timeRef, setTime, onWheel }
}
