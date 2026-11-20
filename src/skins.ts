/**
 * Recorder skins. The colours live in src/styles/index.css as token blocks on
 * `.recorder-shell[data-skin='…']`; this list drives the picker and storage.
 */
export const SKINS = [
  { id: 'classic', name: 'Classic cream', swatch: '#ddd0b8' },
  { id: 'petrol', name: 'Petrol', swatch: '#1d4a54' },
  { id: 'oxblood', name: 'Oxblood', swatch: '#5c1d1b' },
  { id: 'studio', name: 'Studio black', swatch: '#1f2023' },
] as const

export type SkinId = (typeof SKINS)[number]['id']

const STORAGE_KEY = 'porta-four-skin'
export const DEFAULT_SKIN: SkinId = 'petrol'

export function loadSkin(): SkinId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (SKINS.some(skin => skin.id === saved)) return saved as SkinId
  } catch { /* storage unavailable */ }
  return DEFAULT_SKIN
}

export function saveSkin(id: SkinId) {
  try { localStorage.setItem(STORAGE_KEY, id) } catch { /* storage unavailable */ }
}

/** One colour per track: fader cap, channel lamp and tape lane. */
export const TRACK_COLORS = ['#e9a83a', '#45b3a0', '#e8624a', '#7fa9e6'] as const
