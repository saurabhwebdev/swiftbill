import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Products } from '@/pages/Products'
import { Sales } from '@/pages/Sales'
import { Inventory } from '@/pages/Inventory'
import { Demand } from '@/pages/Demand'
import { SalesHistory } from '@/pages/SalesHistory'
import { SettingsPage } from '@/pages/Settings'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Terminals } from '@/pages/Terminals'
import { Toaster } from '@/components/ui/toaster'
import { useThemeStore } from '@/stores/themeStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

function App() {
  const applyTheme = useThemeStore((s) => s.applyTheme)
  const applyAccent = useThemeStore((s) => s.applyAccent)
  const accentColor = useThemeStore((s) => s.accentColor)

  useEffect(() => {
    applyTheme()
    applyAccent(accentColor)
  }, [applyTheme, applyAccent, accentColor])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [applyTheme])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/sales-history" element={<SalesHistory />} />
            <Route path="/terminals" element={<Terminals />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/demand" element={<Demand />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
