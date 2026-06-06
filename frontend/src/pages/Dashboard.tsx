import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ShoppingCart,
  Package,
  DollarSign,
  AlertTriangle,
  Clock,
  Loader2,
  CheckCircle2,
  Banknote,
  CreditCard,
  Smartphone,
  TrendingUp,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ── Animation variants ─────────────────────────────────────────────
const container = {
  animate: { transition: { staggerChildren: 0.06 } },
}

const item = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
}

// ── Types ───────────────────────────────────────────────────────────
interface SaleSummary {
  total_sales: number
  total_tax: number
  total_discount: number
  transaction_count: number
  date: string
  refund_total?: number
  refund_count?: number
  net_sales?: number
}

interface StockSummary {
  total_products: number
  low_stock: number
  out_of_stock: number
  total_value: number
  total_movements: number
}

interface SaleItem {
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

interface Sale {
  id: number
  receipt_number: string
  cashier_name: string
  total_amount: number | string
  discount_amount: number | string
  tax_amount: number | string
  payment_method: 'cash' | 'card' | 'mobile'
  status: 'completed' | 'refunded' | 'voided'
  created_at: string
  items: SaleItem[]
}

interface LowStockItem {
  id: number
  product_name?: string
  product?: { name: string }
  current_stock?: number
  quantity?: number
  low_stock_threshold?: number
  minimum_stock?: number
}

interface WeeklySale {
  date: string
  day: string
  total: number
  count: number
  tax: number
  discount: number
}

interface PaymentBreakdown {
  method: string
  total: number
  count: number
}

interface CategorySale {
  category: string
  total: number
}

interface HourlySale {
  hour: number
  total: number
  count: number
}

interface TopProduct {
  name: string
  total: number
  quantity: number
}

// ── Accent color hook ───────────────────────────────────────────────
function useAccentColor() {
  const [color, setColor] = useState('#6366f1')
  useEffect(() => {
    const update = () => {
      const style = getComputedStyle(document.documentElement)
      const hsl = style.getPropertyValue('--primary').trim()
      if (hsl) {
        const parts = hsl.split(/\s+/)
        if (parts.length === 3) {
          setColor(`hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`)
        }
      }
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-accent', 'style', 'class'],
    })
    return () => observer.disconnect()
  }, [])
  return color
}

function accentVariants(base: string) {
  // base is like "hsl(245, 58%, 51%)"
  const match = base.match(/hsl\(([^,]+),\s*([^,]+),\s*([^)]+)\)/)
  if (!match) return { light: base, lighter: base, dark: base }
  const h = match[1]
  const s = match[2]
  const lRaw = parseFloat(match[3])
  return {
    light: `hsl(${h}, ${s}, ${Math.min(lRaw + 15, 85)}%)`,
    lighter: `hsl(${h}, ${s}, ${Math.min(lRaw + 30, 90)}%)`,
    dark: `hsl(${h}, ${s}, ${Math.max(lRaw - 12, 20)}%)`,
  }
}

function pieColors(base: string, count: number): string[] {
  const match = base.match(/hsl\(([^,]+),\s*([^,]+),\s*([^)]+)\)/)
  if (!match) return Array(count).fill(base)
  const h = parseFloat(match[1])
  const s = match[2]
  const l = match[3]
  return Array.from({ length: count }, (_, i) => {
    const hue = (h + i * (360 / Math.max(count, 1))) % 360
    return `hsl(${hue}, ${s}, ${l})`
  })
}

// ── Helpers ─────────────────────────────────────────────────────────
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHr < 24) return `${diffHr} hr ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString()
}

const paymentIcons = {
  cash: Banknote,
  card: CreditCard,
  mobile: Smartphone,
} as const

// ── Custom Tooltip ──────────────────────────────────────────────────
interface TooltipPayload {
  name: string
  value: number
  payload: Record<string, unknown>
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
  formatter?: (value: number, name: string, entry: TooltipPayload) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      {label && (
        <p className="text-[11px] font-medium text-muted-foreground mb-1">
          {label}
        </p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="text-[12px] text-foreground">
          <span className="font-medium">{entry.name}:</span>{' '}
          {formatter
            ? formatter(entry.value, entry.name, entry)
            : entry.value}
        </p>
      ))}
    </div>
  )
}

// ── Dashboard ───────────────────────────────────────────────────────
export function Dashboard() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const accent = useAccentColor()
  const variants = accentVariants(accent)

  const hour = new Date().getHours()
  const greeting =
    hour < 12
      ? t('pages.dashboard.greeting_morning')
      : hour < 18
        ? t('pages.dashboard.greeting_afternoon')
        : t('pages.dashboard.greeting_evening')

  const displayName = user?.first_name || user?.username || 'there'

  // ── Data state ──────────────────────────────────────────────────
  const [saleSummary, setSaleSummary] = useState<SaleSummary | null>(null)
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null)
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [weeklySales, setWeeklySales] = useState<WeeklySale[]>([])
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>([])
  const [categorySales, setCategorySales] = useState<CategorySale[]>([])
  const [hourlySales, setHourlySales] = useState<HourlySale[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])

  // ── Loading state ───────────────────────────────────────────────
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingSales, setLoadingSales] = useState(true)
  const [loadingLowStock, setLoadingLowStock] = useState(true)
  const [loadingCharts, setLoadingCharts] = useState(true)

  const safeFetch = useCallback(
    async <T,>(url: string, params?: Record<string, unknown>): Promise<T | null> => {
      try {
        const res = await api.get(url, params ? { params } : undefined)
        return res.data as T
      } catch {
        return null
      }
    },
    [],
  )

  useEffect(() => {
    // Stats
    Promise.all([
      safeFetch<SaleSummary>('sales/sales/today_summary/'),
      safeFetch<StockSummary>('inventory/stocks/summary/'),
    ]).then(([sales, stock]) => {
      if (sales) setSaleSummary(sales)
      if (stock) setStockSummary(stock)
      setLoadingStats(false)
    })

    // Recent sales
    safeFetch<{ count: number; results: Sale[] } | Sale[]>('sales/sales/', {
      ordering: '-created_at',
      page_size: 10,
    }).then((data) => {
      if (data) {
        setRecentSales(Array.isArray(data) ? data : data.results ?? [])
      }
      setLoadingSales(false)
    })

    // Low stock
    safeFetch<{ count: number; results: LowStockItem[] } | LowStockItem[]>(
      'inventory/stocks/',
      { low_stock: true },
    ).then((data) => {
      if (data) {
        setLowStockItems(Array.isArray(data) ? data : data.results ?? [])
      }
      setLoadingLowStock(false)
    })

    // Chart data
    Promise.all([
      safeFetch<WeeklySale[]>('sales/sales/weekly_sales/'),
      safeFetch<PaymentBreakdown[]>('sales/sales/payment_breakdown/'),
      safeFetch<CategorySale[]>('sales/sales/category_sales/'),
      safeFetch<HourlySale[]>('sales/sales/hourly_sales/'),
      safeFetch<TopProduct[]>('sales/sales/top_products/'),
    ]).then(([weekly, payment, category, hourly, top]) => {
      if (weekly) setWeeklySales(weekly)
      if (payment) setPaymentBreakdown(payment)
      if (category) setCategorySales(category)
      if (hourly) setHourlySales(hourly)
      if (top) setTopProducts(top)
      setLoadingCharts(false)
    })
  }, [safeFetch])

  // ── Stat cards ────────────────────────────────────────────────────
  const netSales = saleSummary?.net_sales != null
    ? Number(saleSummary.net_sales)
    : Number(saleSummary?.total_sales ?? 0) - Number(saleSummary?.refund_total ?? 0)
  const refundTotal = Number(saleSummary?.refund_total ?? 0)
  const refundCount = Number(saleSummary?.refund_count ?? 0)
  const grossSales = Number(saleSummary?.total_sales ?? 0)

  const stats = [
    {
      label: t('pages.dashboard.todaysSales'),
      value: loadingStats
        ? null
        : formatCurrency(netSales),
      subtext: loadingStats || refundTotal === 0
        ? null
        : `Gross ${formatCurrency(grossSales)}`,
      icon: DollarSign,
      accent: false,
    },
    {
      label: t('pages.dashboard.transactions'),
      value: loadingStats ? null : String(saleSummary?.transaction_count ?? 0),
      subtext: null as string | null,
      icon: ShoppingCart,
      accent: false,
    },
    {
      label: t('pages.dashboard.products'),
      value: loadingStats ? null : String(stockSummary?.total_products ?? 0),
      subtext: null as string | null,
      icon: Package,
      accent: false,
    },
    {
      label: t('pages.dashboard.taxCollected') || 'Tax Collected',
      value: loadingStats
        ? null
        : formatCurrency(Number(saleSummary?.total_tax ?? 0)),
      subtext: null as string | null,
      icon: TrendingUp,
      accent: false,
    },
    ...(refundTotal > 0 || refundCount > 0
      ? [
          {
            label: 'Refunds',
            value: loadingStats ? null : formatCurrency(refundTotal),
            subtext: loadingStats ? null : `${refundCount} refund${refundCount !== 1 ? 's' : ''}`,
            icon: AlertTriangle,
            accent: true,
          },
        ]
      : []),
  ]

  // Computed totals
  const paymentTotal = paymentBreakdown.reduce((s, p) => s + p.total, 0)

  // Axis tick style
  const axisTickStyle = {
    fontSize: 11,
    fill: 'var(--muted-foreground, #888)',
  }

  // Chart loading placeholder
  const ChartLoading = () => (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <motion.div
      variants={container}
      initial="initial"
      animate="animate"
      className="w-full space-y-8"
    >
      {/* Greeting */}
      <motion.div variants={item}>
        <h1 className="font-display text-[26px] font-bold text-foreground tracking-tight">
          {greeting}, {displayName}
        </h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          {t('pages.dashboard.subtitle')}
        </p>
      </motion.div>

      {/* ── Row 1: Stats Grid ──────────────────────────────────────── */}
      <div className={`grid gap-4 sm:grid-cols-2 ${stats.length > 4 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={item}
            className={`group rounded-xl border bg-card p-5 transition-colors ${
              stat.accent
                ? 'border-amber-400/60 hover:border-amber-400'
                : 'border-border/60 hover:border-foreground/10'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  stat.accent
                    ? 'bg-amber-100 dark:bg-amber-900/30'
                    : 'bg-muted/60'
                }`}
              >
                <stat.icon
                  className={`h-[18px] w-[18px] ${
                    stat.accent
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-muted-foreground'
                  }`}
                />
              </div>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">
              {stat.value === null ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                stat.value
              )}
            </p>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {stat.label}
            </p>
            {stat.subtext && (
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                {stat.subtext}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {/* ── Row 2: Weekly Sales + Payment Breakdown ────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Weekly Sales Area Chart */}
        <motion.div variants={item}>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Weekly Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCharts ? (
                <ChartLoading />
              ) : weeklySales.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-[13px] text-muted-foreground">
                  No weekly data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart
                    data={weeklySales}
                    margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="accentGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={accent}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor={accent}
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      strokeOpacity={0.1}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      tick={axisTickStyle}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={axisTickStyle}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(value, name, entry) => {
                            if (name === 'Total')
                              return `${formatCurrency(value)} (${entry.payload.count} txns)`
                            return String(value)
                          }}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Total"
                      stroke={accent}
                      strokeWidth={2.5}
                      fill="url(#accentGradient)"
                      dot={{ r: 3, fill: accent, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: accent, strokeWidth: 2, stroke: 'var(--card)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Methods Donut */}
        <motion.div variants={item}>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold">
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCharts ? (
                <ChartLoading />
              ) : paymentBreakdown.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-[13px] text-muted-foreground">
                  No payment data
                </div>
              ) : (
                <div className="relative">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={paymentBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="total"
                        nameKey="method"
                        stroke="none"
                      >
                        {paymentBreakdown.map((_, i) => {
                          const shades = [accent, variants.light, variants.lighter]
                          return (
                            <Cell
                              key={i}
                              fill={shades[i % shades.length]}
                            />
                          )
                        })}
                      </Pie>
                      <Tooltip
                        content={
                          <ChartTooltip
                            formatter={(value) => formatCurrency(value)}
                          />
                        }
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: string) => (
                          <span className="text-[11px] text-muted-foreground capitalize">
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center text */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 28 }}>
                    <div className="text-center">
                      <p className="text-[11px] text-muted-foreground">Total</p>
                      <p className="text-[15px] font-bold text-foreground">
                        {formatCurrency(paymentTotal)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Row 3: Top Products + Category Sales ───────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products Horizontal Bar */}
        <motion.div variants={item}>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold">
                Top Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCharts ? (
                <ChartLoading />
              ) : topProducts.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-[13px] text-muted-foreground">
                  No product data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={topProducts.slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      strokeOpacity={0.1}
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={axisTickStyle}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={axisTickStyle}
                      axisLine={false}
                      tickLine={false}
                      width={100}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(value, _name, entry) =>
                            `${formatCurrency(value)} (${entry.payload.quantity} sold)`
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="total"
                      name="Sales"
                      fill={accent}
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Sales Donut */}
        <motion.div variants={item}>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold">
                Sales by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCharts ? (
                <ChartLoading />
              ) : categorySales.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-[13px] text-muted-foreground">
                  No category data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={categorySales}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="total"
                      nameKey="category"
                      stroke="none"
                    >
                      {categorySales.map((_, i) => (
                        <Cell
                          key={i}
                          fill={pieColors(accent, categorySales.length)[i]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(value) => formatCurrency(value)}
                        />
                      }
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => (
                        <span className="text-[11px] text-muted-foreground">
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Row 4: Recent Sales + Low Stock ────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Recent Sales Table */}
        <motion.div
          variants={item}
          className="rounded-xl border border-border/60 bg-card"
        >
          <div className="border-b border-border/60 px-6 py-4">
            <h3 className="text-[15px] font-semibold text-foreground">
              {t('pages.dashboard.recentActivity')}
            </h3>
          </div>

          {loadingSales ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 mb-4">
                <Clock className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-[14px] font-medium text-foreground/70 mb-1">
                {t('pages.dashboard.noActivity')}
              </p>
              <p className="text-[13px] text-muted-foreground text-center max-w-sm">
                {t('pages.dashboard.noActivityDesc')}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[13px]">Receipt #</TableHead>
                  <TableHead className="text-[13px]">Time</TableHead>
                  <TableHead className="text-[13px] text-center">
                    Items
                  </TableHead>
                  <TableHead className="text-[13px]">Payment</TableHead>
                  <TableHead className="text-[13px] text-right">
                    Total
                  </TableHead>
                  <TableHead className="text-[13px] text-center">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.slice(0, 8).map((sale) => {
                  const PayIcon =
                    paymentIcons[sale.payment_method] ?? Banknote
                  return (
                    <TableRow key={sale.id}>
                      <TableCell className="text-[13px] font-medium font-mono">
                        {sale.receipt_number}
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">
                        {relativeTime(sale.created_at)}
                      </TableCell>
                      <TableCell className="text-[13px] text-center">
                        {sale.items?.length ?? 0}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="gap-1 text-[11px] font-medium capitalize"
                        >
                          <PayIcon className="h-3 w-3" />
                          {sale.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[13px] text-right font-medium">
                        {formatCurrency(Number(sale.total_amount))}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            sale.status === 'completed'
                              ? 'default'
                              : sale.status === 'refunded'
                                ? 'outline'
                                : 'destructive'
                          }
                          className="text-[11px]"
                        >
                          {sale.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </motion.div>

        {/* Low Stock Alerts */}
        <motion.div
          variants={item}
          className="rounded-xl border border-border/60 bg-card h-fit"
        >
          <div className="border-b border-border/60 px-6 py-4">
            <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Low Stock Alerts
            </h3>
          </div>

          {loadingLowStock ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-[13px] font-medium text-emerald-700 dark:text-emerald-400">
                All stock levels healthy
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {lowStockItems.map((stockItem) => {
                const name =
                  stockItem.product_name ??
                  stockItem.product?.name ??
                  `Product #${stockItem.id}`
                const qty =
                  stockItem.current_stock ?? stockItem.quantity ?? 0
                const threshold =
                  stockItem.low_stock_threshold ??
                  stockItem.minimum_stock ??
                  0
                const critical = qty === 0

                return (
                  <div
                    key={stockItem.id}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Threshold: {threshold}
                      </p>
                    </div>
                    <span
                      className={`text-[13px] font-bold ml-3 ${
                        critical
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {qty}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Row 5: Hourly Sales ────────────────────────────────────── */}
      <motion.div variants={item}>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold">
              Hourly Sales Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCharts ? (
              <ChartLoading />
            ) : hourlySales.length === 0 ? (
              <div className="flex items-center justify-center h-[160px] text-[13px] text-muted-foreground">
                No hourly data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart
                  data={hourlySales}
                  margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="hourlyGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={accent}
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="100%"
                        stopColor={accent}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    strokeOpacity={0.1}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="hour"
                    tick={axisTickStyle}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(h: number) =>
                      `${String(h).padStart(2, '0')}:00`
                    }
                    interval={2}
                  />
                  <YAxis
                    tick={axisTickStyle}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(value, _name, entry) =>
                          `${formatCurrency(value)} (${entry.payload.count} txns)`
                        }
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Sales"
                    stroke={accent}
                    strokeWidth={2}
                    fill="url(#hourlyGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: accent, strokeWidth: 2, stroke: 'var(--card)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
