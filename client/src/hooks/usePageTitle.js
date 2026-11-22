import { useEffect } from 'react'

// Each route sets its own document title, which is what search results show.
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title
  }, [title])
}