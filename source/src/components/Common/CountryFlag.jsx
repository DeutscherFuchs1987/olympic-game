import { useEffect, useMemo, useState } from 'react'
import { flagSources } from '../../data/countries.js'

/**
 * Online flag with a resilient source chain: jsDelivr flag-icons -> flagcdn ->
 * Wikimedia Commons. Falls back to the NOC code if every source fails.
 */
export default function CountryFlag({ code, className = 'country-flag' }) {
  const sources = useMemo(() => flagSources(code), [code])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [code])

  const src = sources[index]
  if (!src) {
    return <span className={`${className} ${className}--code`}>{code}</span>
  }

  return (
    <img
      className={className}
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setIndex((value) => value + 1)}
    />
  )
}
