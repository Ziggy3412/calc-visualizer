export const COLOR_FIELDS = [
  ['appBackground', 'Panel background'], ['appText', 'Panel text'], ['mutedText', 'Secondary text'],
  ['borderColor', 'Panel borders'], ['accentColor', 'Active controls'],
  ['graphBackground', 'Graph background'], ['graphText', 'Graph labels'], ['gridColor', 'Grid lines'], ['axisColor', 'Axes'],
  ['curve1', 'Primary curve / area'], ['curve2', 'Comparison / derivative'], ['curve3', 'Centers / markers'],
  ['curve4', 'Fourth curve'], ['curve5', 'Fifth curve / highlights'], ['curve6', 'Sixth curve'],
  ['solidColor', '3D solid'], ['sliceColor', '3D slices'], ['wireColor', 'Wireframe'], ['regionColor', '3D base region'],
  ['keyLight', 'Main light'], ['fillLight', 'Fill light'], ['rimLight', 'Backlight'],
]
export const DEFAULT_PREFERENCES = {
  theme: 'light', density: 'comfortable', textSize: 14, panelWidth: 320, lineWidth: 3, lighting: 1, showGrid: true, showAxes: true,
  appBackground: '#ffffff', appText: '#333333', mutedText: '#777777', borderColor: '#dddddd', accentColor: '#2d70b3',
  graphBackground: '#ffffff', graphText: '#555555', gridColor: '#e8e8e8', axisColor: '#777777',
  curve1: '#2d70b3', curve2: '#dc2626', curve3: '#7c3aed', curve4: '#388c46', curve5: '#d97706', curve6: '#0891b2',
  solidColor: '#3b82f6', sliceColor: '#f59e0b', wireColor: '#ffffff', regionColor: '#16a34a',
  keyLight: '#fff1dd', fillLight: '#dbeafe', rimLight: '#e0f2fe',
}
export const DARK_COLORS = {
  appBackground: '#202124', appText: '#eeeeee', mutedText: '#aaaaaa', borderColor: '#424448', accentColor: '#76b2ea',
  graphBackground: '#181a1d', graphText: '#c4c7ca', gridColor: '#34373c', axisColor: '#7b8189',
}
export const THEMES = [
  { id: 'light', name: 'Paper', colors: { ...DEFAULT_PREFERENCES } },
  { id: 'dark', name: 'Graphite', colors: { ...DEFAULT_PREFERENCES, ...DARK_COLORS, curve1: '#83b8ed', curve2: '#f08080', curve3: '#bc9aee', curve4: '#87bc98', curve5: '#e8b86d', curve6: '#7ccbd0', solidColor: '#769cc6', sliceColor: '#e8b86d', regionColor: '#87bc98', wireColor: '#d6e0ec' } },
  { id: 'warm', name: 'Warm', colors: { ...DEFAULT_PREFERENCES, appBackground: '#faf6ee', appText: '#433b32', mutedText: '#847663', borderColor: '#ded5c5', accentColor: '#9c5934', graphBackground: '#fffcf5', graphText: '#675b49', gridColor: '#eee5d4', axisColor: '#958774', curve1: '#98613c', curve2: '#b34d46', curve3: '#826090', curve4: '#63804c', curve5: '#bc812c', curve6: '#397f85', solidColor: '#b77b4d', sliceColor: '#d4a145', regionColor: '#82925b', wireColor: '#fff3d9' } },
  { id: 'midnight', name: 'Midnight', colors: { ...DEFAULT_PREFERENCES, appBackground: '#182332', appText: '#e5edf5', mutedText: '#a2b3c8', borderColor: '#35465b', accentColor: '#71c8ce', graphBackground: '#101b29', graphText: '#b5c8dd', gridColor: '#27374b', axisColor: '#758ba5', curve1: '#71c8ce', curve2: '#f3919b', curve3: '#b4a2f2', curve4: '#8cd5ae', curve5: '#ecc17f', curve6: '#8bb8f0', solidColor: '#618ac4', sliceColor: '#e6b678', regionColor: '#69bda8', wireColor: '#c6e6f3' } },
]
export const COLOR_CHOICES = ['#2d70b3', '#dc2626', '#7c3aed', '#388c46', '#d97706', '#0891b2', '#e07099', '#81909c']
export function normalizePreferences(input) {
  const result = { ...DEFAULT_PREFERENCES }
  if (!input || typeof input !== 'object') return result
  for (const [key] of COLOR_FIELDS) if (typeof input[key] === 'string' && /^#[0-9a-f]{6}$/i.test(input[key])) result[key] = input[key]
  for (const [key, min, max] of [['textSize',12,18], ['panelWidth',280,520], ['lineWidth',1,6], ['lighting',0.25,2]]) {
    if (typeof input[key] === 'number' && Number.isFinite(input[key])) result[key] = Math.max(min, Math.min(max, input[key]))
  }
  for (const key of ['showGrid', 'showAxes']) if (typeof input[key] === 'boolean') result[key] = input[key]
  if (['light', 'dark', 'warm', 'midnight', 'custom'].includes(input.theme)) result.theme = input.theme
  if (['comfortable', 'compact'].includes(input.density)) result.density = input.density
  return result
}
