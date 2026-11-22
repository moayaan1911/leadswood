import { useEffect, useRef } from 'react'

// Shared behaviour for both slide-over panels: Escape closes, and Tab is
// trapped inside so focus cannot wander onto the page behind the overlay.
export function usePanelKeys(onClose) {
  const ref = useRef(null)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const nodes = ref.current?.querySelectorAll('button, input, select, a[href]')
      if (!nodes?.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return ref
}
