import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Moves focus into a dialog, keeps Tab inside it and restores the previous
 * focus when the dialog closes. Escape handling stays with each component so
 * nested layers (card -> mascots -> detail) can decide what to close.
 */
export function useFocusTrap(active) {
  const ref = useRef(null)
  const restoreRef = useRef(null)

  useEffect(() => {
    if (!active) return undefined

    const node = ref.current
    if (!node) return undefined

    restoreRef.current = document.activeElement

    const focusable = () => [...node.querySelectorAll(FOCUSABLE)]
      .filter((element) => element.getClientRects().length > 0)

    const first = focusable()[0]
    ;(first ?? node).focus?.({ preventScroll: true })

    const onKeyDown = (event) => {
      if (event.key !== 'Tab') return

      const items = focusable()
      if (items.length === 0) {
        event.preventDefault()
        node.focus?.({ preventScroll: true })
        return
      }

      const firstItem = items[0]
      const lastItem = items[items.length - 1]

      if (event.shiftKey && (document.activeElement === firstItem || document.activeElement === node)) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      const previous = restoreRef.current
      previous?.focus?.({ preventScroll: true })
    }
  }, [active])

  return ref
}
