import { useCallback, useRef, useState } from 'react'

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

/**
 * Time cursor for the 1896–2028 timeline.
 * Scrolling (wheel) and programmatic updates move a single `time` value.
 */
export function useScrollTimeline({ minYear, maxYear, initial = minYear }) {
  const [time, setTimeState] = useState(initial)
  const timeRef = useRef(initial)

  const setTime = useCallback(
    (v) => {
      const c = clamp(typeof v === 'function' ? v(timeRef.current) : v, minYear, maxYear)
      timeRef.current = c
      setTimeState(c)
      return c
    },
    [minYear, maxYear],
  )

  const onWheel = useCallback(
    (e) => {
      // Deliberately slow: one wheel notch is less than a year, so the
      // historical route grows gradually instead of jumping between eras.
      setTime(timeRef.current + e.deltaY * 0.0055)
    },
    [setTime],
  )

  return { time, timeRef, setTime, onWheel }
}
