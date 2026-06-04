import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  TrendingUp,
  History,
  Settings,
  LogOut,
  Monitor,
  Zap,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'

export function Sidebar() {
  const { t } = useTranslation()
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const collapsed = useThemeStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useThemeStore((s) => s.setSidebarCollapsed)

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/products', label: t('nav.products'), icon: Package },
    { to: '/sales', label: t('nav.sales'), icon: ShoppingCart },
    { to: '/sales-history', label: 'History', icon: History },
    { to: '/terminals', label: t('nav.terminals'), icon: Monitor },
    { to: '/inventory', label: t('nav.inventory'), icon: Warehouse },
    { to: '/demand', label: 'Demand', icon: TrendingUp },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ]

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name}`
    : user?.username || 'User'

  const initials = user?.first_name
    ? `${user.first_name[0]}${user.last_name?.[0] || ''}`
    : user?.username?.[0]?.toUpperCase() || 'U'

  return (
    <motion.aside
      className={cn(
        'flex h-screen flex-col border-r border-border/60 bg-[hsl(var(--color-surface-raised))] transition-[width] duration-200',
        collapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      <div className={cn('flex items-center py-5', collapsed ? 'justify-center px-2' : 'gap-2.5 px-5')}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary))]">
          <Zap className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-display text-[17px] font-bold tracking-tight text-foreground">
            SwiftBill
          </span>
        )}
      </div>

      <nav className="flex-1 px-2 py-2">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname === item.to || location.pathname.startsWith(item.to + '/')

            return (
              <NavLink key={item.to} to={item.to} className="relative block" title={collapsed ? item.label : undefined}>
                <motion.div
                  className={cn(
                    'flex items-center rounded-lg text-[13px] font-medium transition-colors duration-150',
                    collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2',
                    isActive
                      ? 'bg-[hsl(var(--primary))] text-white'
                      : 'text-muted-foreground hover:bg-[hsl(var(--primary)/0.06)] hover:text-foreground'
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  <item.icon className={cn(collapsed ? 'h-5 w-5' : 'h-[18px] w-[18px]', isActive ? 'text-white/80' : '')} strokeWidth={isActive ? 2 : 1.75} />
                  {!collapsed && item.label}
                </motion.div>
              </NavLink>
            )
          })}
        </div>
      </nav>

      <div className="px-2 pb-1">
        <motion.button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className={cn(
            'flex w-full items-center rounded-lg py-2 text-muted-foreground/50 hover:bg-foreground/[0.04] hover:text-muted-foreground transition-colors',
            collapsed ? 'justify-center px-0' : 'gap-3 px-3'
          )}
          whileTap={{ scale: 0.95 }}
          title={collapsed ? t('sidebar.collapse') : t('sidebar.collapse')}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && <span className="text-[12px]">{t('sidebar.collapse')}</span>}
        </motion.button>
      </div>

      <div className="border-t border-border/60 px-2 py-3">
        <div className={cn('flex items-center rounded-lg', collapsed ? 'justify-center px-0 py-1' : 'gap-3 px-2 py-2')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[11px] font-bold text-white">
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate leading-tight">{displayName}</p>
                <p className="text-[11px] text-muted-foreground capitalize leading-tight mt-0.5">{user?.role || 'cashier'}</p>
              </div>
              <motion.button
                onClick={logout}
                className="rounded-md p-1.5 text-muted-foreground/60 hover:bg-foreground/[0.05] hover:text-foreground transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={t('sidebar.signOut')}
              >
                <LogOut className="h-4 w-4" />
              </motion.button>
            </>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
