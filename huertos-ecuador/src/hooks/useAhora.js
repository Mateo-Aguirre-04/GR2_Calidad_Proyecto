import { useEffect, useState } from 'react'

export function useAhora(intervaloMs = 60_000) {
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs])

  return ahora
}