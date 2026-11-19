import { createContext, useContext } from 'react'
export const AppearanceContext = createContext(null)
export function useAppearance() {
  const context = useContext(AppearanceContext)
  if (!context) throw new Error('AppearanceProvider is required')
  return context
}
