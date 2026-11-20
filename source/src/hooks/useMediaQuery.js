import { useEffect, useState } from 'react'

/**
 * Reactive `matchMedia` hook. Used to pick stable mobile animations and
 * layout variants without relying on CSS-only tricks (Motion writes inline
 * transforms, which CSS media queries cannot override).
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

export function useIsCompact() {
  return useMediaQuery('(max-width: 720px)')
}
