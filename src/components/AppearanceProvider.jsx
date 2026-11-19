import { useState, useEffect } from 'react'
import { AppearanceContext } from '../shared/appearance'
import { normalizePreferences, DEFAULT_PREFERENCES } from '../shared/preferences'
import './Settings.css'

const STORAGE_KEY = 'calc-visualizer-preferences-v1'
export default function AppearanceProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try { return normalizePreferences(JSON.parse(localStorage.getItem(STORAGE_KEY))) } catch { return { ...DEFAULT_PREFERENCES } }
  })
  const [saveError, setSaveError] = useState(false)
  useEffect(() => {
    const root = document.documentElement.style
    const values = { '--app-bg': settings.appBackground, '--app-text': settings.appText, '--app-muted': settings.mutedText,
      '--app-border': settings.borderColor, '--app-accent': settings.accentColor, '--ui-size': `${settings.textSize}px` }
    for (let i = 1; i <= 6; i++) values[`--curve${i}`] = settings[`curve${i}`]
    for (const [key, value] of Object.entries(values)) root.setProperty(key, value)
  }, [settings])
  function apply(next) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setSaveError(false) } catch { setSaveError(true) }
    setSettings(next)
  }
  const update = patch => apply(normalizePreferences({ ...settings, ...patch }))
  const reset = () => apply({ ...DEFAULT_PREFERENCES })
  return <AppearanceContext.Provider value={{ settings, update, reset, saveError }}>{children}</AppearanceContext.Provider>
}
