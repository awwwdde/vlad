/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

export const HOME_TOTAL  = 7
export const ABOUT_TOTAL = 3

interface Ctx {
  current: number
  prev: number
  dir: 1 | -1
  going: boolean
  total: number
  goTo: (i: number) => void
}

const C = createContext<Ctx>({} as Ctx)

interface ProviderProps {
  children: ReactNode
  total: number
}

export function SectionProvider({ children, total }: ProviderProps) {
  const [current, setCurrent] = useState(0)
  const [prev, setPrev] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [going, setGoing] = useState(false)

  const LOCK_MS = 900

  const goTo = useCallback((i: number) => {
    if (going) return
    if (i < 0 || i >= total) return
    if (i === current) return

    setDir(i > current ? 1 : -1)
    setPrev(current)
    setCurrent(i)
    setGoing(true)
    setTimeout(() => setGoing(false), LOCK_MS)
  }, [current, going, total])

  return (
    <C.Provider value={{ current, prev, dir, going, goTo, total }}>
      {children}
    </C.Provider>
  )
}

export const useSectionCtx = () => useContext(C)
