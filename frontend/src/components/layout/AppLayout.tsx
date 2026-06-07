import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ShortcutHelp } from '@/components/ui/shortcut-help'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const compactMode = useThemeStore((state) => state.compactMode)
  const location = useLocation()
  const navigate = useNavigate()

  useHotkeys({
    'alt+1': () => navigate('/'),
    'alt+2': () => navigate('/products'),
    'alt+3': () => navigate('/sales'),
    'alt+4': () => navigate('/terminals'),
    'alt+5': () => navigate('/inventory'),
    'alt+6': () => navigate('/demand'),
    'alt+7': () => navigate('/sales-history'),
    'alt+8': () => navigate('/settings'),
    'alt+s': () => {
      const el = document.querySelector<HTMLInputElement>('input[type="text"][placeholder*="earch"], input[type="text"][placeholder*="can"]')
      el?.focus()
    },
  }, [navigate])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{
                duration: 0.3,
                ease: 'easeOut' as const,
              }}
              className={cn(
                compactMode ? 'p-4 lg:p-5' : 'p-6 lg:p-8'
              )}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <ShortcutHelp />
    </div>
  )
}
