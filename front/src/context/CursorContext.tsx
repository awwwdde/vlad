/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export type CursorState = 'default' | 'pointer' | 'text' | 'view' | 'drag'

interface Ctx { state: CursorState; set: (s: CursorState) => void }
const C = createContext<Ctx>({ state: 'default', set: () => {} })

export function CursorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CursorState>('default')
  return <C.Provider value={{ state, set: setState }}>{children}</C.Provider>
}

export const useCursor = () => useContext(C)
