import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Wifi, WifiOff, Search } from 'lucide-react'

export function Header() {
  const { t } = useTranslation()
  const location = useLocation()
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const pageKeys: Record<string, string> = {
    '/': 'dashboard',
    '/products': 'products',
    '/sales': 'sales',
    '/terminals': 'terminals',
    '/inventory': 'inventory',
    '/settings': 'settings',
  }

  const pageKey = pageKeys[location.pathname] || 'dashboard'
  const title = t(`pages.${pageKey}.title`)
  const description = t(`pages.${pageKey}.description`)

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-sm px-6">
      <motion.div
        key={`${location.pathname}-${t('nav.dashboard')}`}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' as const }}
        className="flex items-baseline gap-3"
      >
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        <span className="hidden sm:inline text-[13px] text-muted-foreground/60">{description}</span>
      </motion.div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
          <input
            type="text"
            placeholder={t('header.search')}
            className="h-8 w-52 rounded-lg border border-border/60 bg-muted/30 pl-8 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none transition-all focus:w-64 focus:border-foreground/20 focus:bg-background"
          />
        </div>

        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            isOnline
              ? 'bg-[hsl(var(--color-success)/0.08)] text-[hsl(var(--color-success))]'
              : 'bg-destructive/8 text-destructive'
          }`}
        >
          {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {isOnline ? t('header.online') : t('header.offline')}
        </div>
      </div>
    </header>
  )
}
