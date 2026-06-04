import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function hexToHsl(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null
  let r = parseInt(result[1], 16) / 255
  let g = parseInt(result[2], 16) / 255
  let b = parseInt(result[3], 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

interface ThemeState {
  theme: 'light' | 'dark' | 'system'
  accentColor: string
  compactMode: boolean
  sidebarCollapsed: boolean
  language: string
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setAccentColor: (color: string) => void
  setCompactMode: (v: boolean) => void
  setSidebarCollapsed: (v: boolean) => void
  setLanguage: (lang: string) => void
  applyTheme: () => void
  applyAccent: (color: string) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      accentColor: 'indigo',
      compactMode: false,
      sidebarCollapsed: false,
      language: 'en',

      setTheme: (theme) => {
        set({ theme })
        get().applyTheme()
      },

      setAccentColor: (accentColor) => {
        set({ accentColor })
        get().applyAccent(accentColor)
      },

      setCompactMode: (compactMode) => set({ compactMode }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      setLanguage: (language) => {
        set({ language })
        // i18n.changeLanguage is called by the component that triggers this
      },

      applyTheme: () => {
        const { theme } = get()
        const root = document.documentElement
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (theme === 'dark' || (theme === 'system' && prefersDark)) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      },

      applyAccent: (color: string) => {
        const root = document.documentElement
        if (color.startsWith('#')) {
          const hsl = hexToHsl(color)
          if (hsl) {
            root.removeAttribute('data-accent')
            root.style.setProperty('--primary', hsl)
            root.style.setProperty('--accent', hsl)
            root.style.setProperty('--ring', hsl)
            root.style.setProperty('--color-brand', hsl)
          }
        } else {
          root.style.removeProperty('--primary')
          root.style.removeProperty('--accent')
          root.style.removeProperty('--ring')
          root.style.removeProperty('--color-brand')
          root.setAttribute('data-accent', color)
        }
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.applyTheme()
          state.applyAccent(state.accentColor)
        }
      },
    }
  )
)
