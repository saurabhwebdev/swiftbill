import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Loader2,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Trash2,
  Search,
  BarChart3,
  Clock,
  Mail,
  MailCheck,
  Users,
  Send,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import api from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { PaginationControls } from '@/components/ui/pagination-controls'
import type { DemandRequest, DemandInsights, Category } from '@/types'
import { cn } from '@/lib/utils'

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

// ── Accent color hook ──────────────────────────────────────────────
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


// ── Helpers ─────────────────────────────────────────────────────────
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

// ── Custom Chart Tooltip ───────────────────────────────────────────
interface TooltipPayload {
  name: string
  value: number
  payload: Record<string, unknown>
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
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
          <span className="font-medium">{entry.name}:</span> {entry.value}
        </p>
      ))}
    </div>
  )
}

// ── Demand Page ────────────────────────────────────────────────────
export function Demand() {
  const { toast } = useToast()
  const accent = useAccentColor()

  // Insights
  const [insights, setInsights] = useState<DemandInsights | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(true)

  // Request log
  const [requests, setRequests] = useState<DemandRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Add request dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    query: '', notes: '', category: '',
    customer_name: '', customer_phone: '', customer_email: '', notify_customer: false,
  })
  const [adding, setAdding] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  // Fetch insights
  const fetchInsights = useCallback(async () => {
    try {
      setInsightsLoading(true)
      const res = await api.get('demand/requests/insights/')
      setInsights(res.data)
    } catch {
      // silent fail
    } finally {
      setInsightsLoading(false)
    }
  }, [])

  // Fetch requests
  const fetchRequests = useCallback(async (pg = 1, status = 'all', search = '') => {
    try {
      setRequestsLoading(true)
      const params: Record<string, string | number> = { page: pg }
      if (status !== 'all') params.status = status
      if (search) params.search = search
      params.ordering = '-created_at'
      const res = await api.get('demand/requests/', { params })
      setRequests(res.data.results || [])
      setTotalCount(res.data.count || 0)
    } catch {
      toast({ title: 'Error', description: 'Failed to load requests.', variant: 'destructive' })
    } finally {
      setRequestsLoading(false)
    }
  }, [toast])

  // Fetch categories
  useEffect(() => {
    api.get('products/categories/')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data.results || []
        setCategories(data.filter((c: Category) => c.is_active))
      })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchInsights() }, [fetchInsights])
  useEffect(() => { fetchRequests(page, statusFilter, searchQuery) }, [fetchRequests, page, statusFilter, searchQuery])

  // Actions
  const handleAdd = async () => {
    if (!addForm.query.trim()) return
    setAdding(true)
    try {
      await api.post('demand/requests/', {
        query: addForm.query,
        notes: addForm.notes,
        category: addForm.category ? parseInt(addForm.category) : null,
        customer_name: addForm.customer_name || '',
        customer_phone: addForm.customer_phone || '',
        customer_email: addForm.customer_email || '',
        notify_customer: addForm.notify_customer,
      })
      toast({ title: 'Request logged', description: `"${addForm.query}" has been recorded.` })
      setAddOpen(false)
      setAddForm({
        query: '', notes: '', category: '',
        customer_name: '', customer_phone: '', customer_email: '', notify_customer: false,
      })
      fetchRequests(page, statusFilter, searchQuery)
      fetchInsights()
    } catch {
      toast({ title: 'Error', description: 'Failed to log request.', variant: 'destructive' })
    } finally {
      setAdding(false)
    }
  }

  const handleFulfill = async (id: number) => {
    try {
      await api.post(`demand/requests/${id}/fulfill/`)
      toast({ title: 'Fulfilled', description: 'Request marked as fulfilled.' })
      fetchRequests(page, statusFilter, searchQuery)
      fetchInsights()
    } catch {
      toast({ title: 'Error', description: 'Failed to fulfill request.', variant: 'destructive' })
    }
  }

  const handleDismiss = async (id: number) => {
    try {
      await api.post(`demand/requests/${id}/dismiss/`)
      toast({ title: 'Dismissed', description: 'Request dismissed.' })
      fetchRequests(page, statusFilter, searchQuery)
      fetchInsights()
    } catch {
      toast({ title: 'Error', description: 'Failed to dismiss request.', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`demand/requests/${id}/`)
      toast({ title: 'Deleted', description: 'Request removed.' })
      fetchRequests(page, statusFilter, searchQuery)
      fetchInsights()
    } catch {
      toast({ title: 'Error', description: 'Failed to delete request.', variant: 'destructive' })
    }
  }

  const handleNotify = async (id: number) => {
    try {
      await api.post(`demand/requests/${id}/notify/`)
      toast({ title: 'Notification sent', description: 'Customer has been notified.' })
      fetchRequests(page, statusFilter, searchQuery)
    } catch {
      toast({ title: 'Error', description: 'Failed to send notification.', variant: 'destructive' })
    }
  }

  const handleFulfillAll = async (queryNormalized: string) => {
    try {
      const res = await api.post('demand/requests/fulfill_all/', { query_normalized: queryNormalized })
      const data = res.data || {}
      toast({
        title: 'Fulfilled & Notified',
        description: `${data.fulfilled_count ?? 0} fulfilled, ${data.notified_count ?? 0} notified.`,
      })
      fetchRequests(page, statusFilter, searchQuery)
      fetchInsights()
    } catch {
      toast({ title: 'Error', description: 'Failed to fulfill requests.', variant: 'destructive' })
    }
  }

  // Customers waiting count
  const customersWaiting = requests.filter(r => r.notify_customer && r.status === 'new').length

  const statusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/10 border-0 text-[11px]">New</Badge>
      case 'fulfilled':
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-0 text-[11px]">Fulfilled</Badge>
      case 'dismissed':
        return <Badge className="bg-muted text-muted-foreground hover:bg-muted border-0 text-[11px]">Dismissed</Badge>
      default:
        return <Badge variant="secondary" className="text-[11px]">{status}</Badge>
    }
  }

  const statusTabs = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'fulfilled', label: 'Fulfilled' },
    { key: 'dismissed', label: 'Dismissed' },
  ]

  return (
    <motion.div
      variants={container}
      initial="initial"
      animate="animate"
      className="w-full"
    >
      {/* Header */}
      <motion.div variants={item} className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-[22px] font-bold text-foreground tracking-tight">
            Demand Insights
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Track what customers are asking for and identify trends
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white text-[13px] shrink-0">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log a Customer Request</DialogTitle>
              <DialogDescription>Record what a customer asked for that you couldn't provide.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label className="text-[13px]">What did the customer ask for?</Label>
                <Input
                  className="h-10"
                  placeholder="e.g. Almond Milk Latte, Gluten-free bread..."
                  value={addForm.query}
                  onChange={(e) => setAddForm((p) => ({ ...p, query: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">Category (optional)</Label>
                <Select value={addForm.category} onValueChange={(v) => setAddForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">Notes (optional)</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Any additional context..."
                  value={addForm.notes}
                  onChange={(e) => setAddForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <Separator />

              <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Customer Details (optional)</p>
              <div className="grid gap-2">
                <Label className="text-[13px]">Customer Name</Label>
                <Input
                  className="h-10"
                  placeholder="John Doe"
                  value={addForm.customer_name}
                  onChange={(e) => setAddForm((p) => ({ ...p, customer_name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[13px]">Phone</Label>
                  <Input
                    className="h-10"
                    placeholder="+91 98765 43210"
                    value={addForm.customer_phone}
                    onChange={(e) => setAddForm((p) => ({ ...p, customer_phone: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[13px]">Email</Label>
                  <Input
                    type="email"
                    className="h-10"
                    placeholder="customer@email.com"
                    value={addForm.customer_email}
                    onChange={(e) => setAddForm((p) => ({ ...p, customer_email: e.target.value }))}
                  />
                </div>
              </div>
              {addForm.customer_email.trim() && (
                <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">Notify when available</p>
                    <p className="text-[11px] text-muted-foreground">Email customer when this product arrives</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddForm((p) => ({ ...p, notify_customer: !p.notify_customer }))}
                    className={cn('relative h-6 w-11 rounded-full transition-colors shrink-0', addForm.notify_customer ? 'bg-[hsl(var(--primary))]' : 'bg-muted')}
                  >
                    <span className={cn('absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', addForm.notify_customer && 'translate-x-5')} />
                  </button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={adding || !addForm.query.trim()} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white">
                {adding && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Log Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={item} className="grid grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Total Requests',
            value: insights?.total ?? 0,
            icon: BarChart3,
            color: 'text-[hsl(var(--primary))]',
            bg: 'bg-[hsl(var(--primary)/0.1)]',
          },
          {
            label: 'New / Pending',
            value: insights?.new_count ?? 0,
            icon: Clock,
            color: 'text-blue-600',
            bg: 'bg-blue-500/10',
          },
          {
            label: 'Fulfilled',
            value: insights?.fulfilled_count ?? 0,
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bg: 'bg-emerald-500/10',
          },
          {
            label: 'Customers Waiting',
            value: customersWaiting,
            icon: Users,
            color: 'text-amber-600',
            bg: 'bg-amber-500/10',
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/60 shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', stat.bg)}>
                  <stat.icon className={cn('h-5 w-5', stat.color)} />
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-[24px] font-bold text-foreground tabular-nums leading-tight">
                    {insightsLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr,380px] gap-6">
        {/* Left — Charts */}
        <div className="space-y-6">
          {/* Top Requested Items */}
          <motion.div variants={item}>
            <Card className="border-border/60 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-[14px] font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Top Requested Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
                  </div>
                ) : !insights?.top_items?.length ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <BarChart3 className="h-8 w-8 text-muted-foreground/30 mb-3" />
                    <p className="text-[13px] text-muted-foreground">No request data yet</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={Math.max(180, insights.top_items.length * 44)}>
                      <BarChart
                        data={insights.top_items.slice(0, 10)}
                        layout="vertical"
                        margin={{ top: 4, right: 40, left: 0, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="query"
                          width={140}
                          tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar
                          dataKey="count"
                          name="Requests"
                          fill={accent}
                          radius={[0, 4, 4, 0]}
                          barSize={24}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    {/* Fulfill All & Notify buttons */}
                    <div className="mt-4 space-y-1.5">
                      {insights.top_items.filter(ti => ti.new_count > 0).map((ti) => (
                        <div key={ti.query_normalized} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[12px] font-medium text-foreground truncate">{ti.query}</span>
                            <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/10 border-0 text-[10px] shrink-0">
                              {ti.new_count} new
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7 gap-1.5 shrink-0"
                            onClick={() => handleFulfillAll(ti.query_normalized)}
                          >
                            <Send className="h-3 w-3" /> Fulfill All & Notify
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Request Trend */}
          <motion.div variants={item}>
            <Card className="border-border/60 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-[14px] font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Request Trend (Last 14 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
                  </div>
                ) : !insights?.trend?.length ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <TrendingUp className="h-8 w-8 text-muted-foreground/30 mb-3" />
                    <p className="text-[13px] text-muted-foreground">No trend data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={insights.trend} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                      <defs>
                        <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={accent} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(d: string) => {
                          const dt = new Date(d)
                          return `${dt.getMonth() + 1}/${dt.getDate()}`
                        }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Requests"
                        stroke={accent}
                        strokeWidth={2}
                        fill="url(#demandGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right — Request Log */}
        <motion.div variants={item}>
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] font-semibold">Request Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Status tabs */}
              <div className="border-b border-border/40 px-4 flex gap-1">
                {statusTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => { setStatusFilter(tab.key); setPage(1) }}
                    className={cn(
                      'px-3 py-2 text-[12px] font-medium border-b-2 transition-colors -mb-[1px]',
                      statusFilter === tab.key
                        ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="px-4 py-2.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                    placeholder="Search requests..."
                    className="h-8 w-full rounded-md border border-border/60 bg-background pl-8 pr-3 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-foreground/20"
                  />
                </div>
              </div>

              {/* Request list */}
              <div className="divide-y divide-border/30 max-h-[520px] overflow-y-auto">
                {requestsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                  </div>
                ) : requests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <TrendingUp className="h-8 w-8 text-muted-foreground/30 mb-3" />
                    <p className="text-[13px] text-muted-foreground">No requests found</p>
                  </div>
                ) : (
                  requests.map((req) => (
                    <div key={req.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{req.query}</p>
                        {req.customer_name && (
                          <p className="text-[11px] text-muted-foreground/70 truncate">{req.customer_name}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {statusBadge(req.status)}
                          {req.notify_customer && !req.notified_at && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-blue-600">
                              <Mail className="h-3 w-3" />
                            </span>
                          )}
                          {req.notified_at && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-0 text-[10px] gap-1">
                              <MailCheck className="h-3 w-3" /> Notified
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            {req.logged_by_name || 'System'}
                          </span>
                          <span className="text-[11px] text-muted-foreground/60">
                            {relativeTime(req.created_at)}
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/50 hover:bg-muted/60 hover:text-foreground transition-colors shrink-0">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-[13px] gap-2" onClick={() => handleFulfill(req.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Fulfill
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-[13px] gap-2" onClick={() => handleDismiss(req.id)}>
                            <XCircle className="h-3.5 w-3.5" /> Dismiss
                          </DropdownMenuItem>
                          {req.customer_email && !req.notified_at && (
                            <DropdownMenuItem className="text-[13px] gap-2" onClick={() => handleNotify(req.id)}>
                              <Send className="h-3.5 w-3.5" /> Send Notification
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-[13px] gap-2 text-destructive focus:text-destructive" onClick={() => handleDelete(req.id)}>
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              <PaginationControls
                page={page}
                totalPages={Math.ceil(totalCount / pageSize)}
                totalItems={totalCount}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
