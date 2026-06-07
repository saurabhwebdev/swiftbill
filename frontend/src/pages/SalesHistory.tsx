import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Loader2,
  Receipt,
  Banknote,
  CreditCard,
  Smartphone,
  MoreHorizontal,
  Eye,
  Ban,
  Printer,
  RotateCcw,
  DollarSign,
  Hash,
  ReceiptText,
  TrendingDown,
} from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import api from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { PrintableReceipt } from '@/components/receipt/PrintableReceipt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { SortableHeader } from '@/components/ui/sortable-header'
import type { Store, Refund } from '@/types'

const PAGE_SIZE = 20

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

interface SaleItemData {
  product_name: string
  quantity: number
  unit_price: string
  discount: string
  tax_amount: string
  gst_rate: string
  subtotal: string
}

interface SaleData {
  id: number
  receipt_number: string
  store: number
  terminal: number | null
  cashier: number | null
  cashier_name: string
  total_amount: string
  discount_amount: string
  discount_type?: 'flat' | 'percent'
  discount_reason?: string
  tax_amount: string
  payment_method: 'cash' | 'card' | 'mobile'
  status: 'completed' | 'refunded' | 'voided'
  notes: string
  created_at: string
  items: SaleItemData[]
  refunds?: Refund[]
}

interface TodaySummary {
  total_sales: number
  total_tax: number
  total_discount: number
  transaction_count: number
  date: string
}

type StatusFilter = '' | 'completed' | 'voided' | 'refunded'
type PaymentFilter = '' | 'cash' | 'card' | 'mobile'

export function SalesHistory() {
  const { toast } = useToast()

  const [store, setStore] = useState<Store | null>(null)
  const [sales, setSales] = useState<SaleData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [ordering, setOrdering] = useState('-created_at')

  // Filters
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('')

  // Summary
  const [summary, setSummary] = useState<TodaySummary | null>(null)

  // Detail dialog
  const [selectedSale, setSelectedSale] = useState<SaleData | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Void confirm
  const [voidTarget, setVoidTarget] = useState<SaleData | null>(null)
  const [voiding, setVoiding] = useState(false)

  // Refund dialog
  const [refundTarget, setRefundTarget] = useState<SaleData | null>(null)
  const [refundQuantities, setRefundQuantities] = useState<Record<number, number>>({})
  const [refundReason, setRefundReason] = useState('')
  const [refunding, setRefunding] = useState(false)

  // Receipt preview dialog (for test printer mode)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null)

  const currency = store?.currency === 'INR' ? '₹' : store?.currency === 'USD' ? '$' : store?.currency === 'EUR' ? '€' : store?.currency === 'GBP' ? '£' : store?.currency || '₹'
  const formatPrice = (amount: number) => `${currency}${amount.toFixed(2)}`

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Fetch store config
  useEffect(() => {
    api.get('accounts/stores/my_store/')
      .then((res) => setStore(res.data))
      .catch(() => {})
  }, [])

  // Fetch today summary
  useEffect(() => {
    api.get('sales/sales/today_summary/')
      .then((res) => {
        const d = res.data
        setSummary({
          total_sales: parseFloat(d.total_sales) || 0,
          total_tax: parseFloat(d.total_tax) || 0,
          total_discount: parseFloat(d.total_discount) || 0,
          transaction_count: d.transaction_count || 0,
          date: d.date || '',
        })
      })
      .catch(() => {})
  }, [])

  // Fetch sales
  const fetchSales = useCallback(() => {
    setLoading(true)
    let url = `sales/sales/?ordering=${ordering}&page=${page}`
    if (search) url += `&search=${encodeURIComponent(search)}`
    if (statusFilter) url += `&status=${statusFilter}`
    if (paymentFilter) url += `&payment_method=${paymentFilter}`
    if (dateFrom) url += `&date_from=${dateFrom}`
    if (dateTo) url += `&date_to=${dateTo}`

    api.get(url)
      .then((res) => {
        setSales(res.data.results || [])
        setTotalCount(res.data.count || 0)
      })
      .catch(() => {
        toast({ title: 'Failed to load sales', variant: 'destructive' })
      })
      .finally(() => setLoading(false))
  }, [ordering, page, search, statusFilter, paymentFilter, dateFrom, dateTo, toast])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setPage(1)
    }, 350)
  }

  const resetFilters = () => {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setStatusFilter('')
    setPaymentFilter('')
    setOrdering('-created_at')
    setPage(1)
  }

  const hasActiveFilters = search || dateFrom || dateTo || statusFilter || paymentFilter

  // View detail
  const openDetail = (sale: SaleData) => {
    setSelectedSale(sale)
    setDetailOpen(true)
  }

  // Void sale
  const handleVoid = async () => {
    if (!voidTarget) return
    setVoiding(true)
    try {
      await api.post(`sales/sales/${voidTarget.id}/void/`)
      toast({ title: 'Sale voided', description: `Receipt ${voidTarget.receipt_number} has been voided.` })
      setVoidTarget(null)
      if (selectedSale?.id === voidTarget.id) {
        setDetailOpen(false)
        setSelectedSale(null)
      }
      fetchSales()
      // Refresh summary
      api.get('sales/sales/today_summary/')
        .then((res) => {
          const d = res.data
          setSummary({
            total_sales: parseFloat(d.total_sales) || 0,
            total_tax: parseFloat(d.total_tax) || 0,
            total_discount: parseFloat(d.total_discount) || 0,
            transaction_count: d.transaction_count || 0,
            date: d.date || '',
          })
        })
        .catch(() => {})
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to void sale'
          : 'Failed to void sale'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setVoiding(false)
    }
  }

  // Refund
  const openRefundDialog = (sale: SaleData) => {
    setRefundTarget(sale)
    setRefundReason('')
    const qtyMap: Record<number, number> = {}
    sale.items.forEach((_, idx) => { qtyMap[idx] = 0 })
    setRefundQuantities(qtyMap)
  }

  const getMaxRefundableQty = (sale: SaleData, itemIdx: number) => {
    const item = sale.items[itemIdx]
    const originalQty = item.quantity
    const alreadyRefunded = (sale.refunds || []).reduce((sum, r) => {
      return sum + r.items.reduce((s, ri) => {
        if (ri.product_name === item.product_name) return s + ri.quantity
        return s
      }, 0)
    }, 0)
    return Math.max(0, originalQty - alreadyRefunded)
  }

  const refundTotal = refundTarget
    ? refundTarget.items.reduce((sum, item, idx) => {
        const qty = refundQuantities[idx] || 0
        if (qty <= 0) return sum
        const unitPrice = parseFloat(item.unit_price) || 0
        const gstRate = parseFloat(item.gst_rate) || 0
        const lineSubtotal = unitPrice * qty
        const lineTax = lineSubtotal * (gstRate / 100)
        return sum + lineSubtotal + lineTax
      }, 0)
    : 0

  const handleRefund = async () => {
    if (!refundTarget) return
    const items = refundTarget.items
      .map((item, idx) => {
        const qty = refundQuantities[idx] || 0
        if (qty <= 0) return null
        // We need to extract product_id. The SaleItemData doesn't have it directly,
        // so we pass product_name and the backend resolves it. But the API expects product_id.
        // Since we don't have product ID in SaleItemData, let's use product_name as identifier.
        // Actually, we need to check if there's a product field. Let's cast to any to check.
        return { product_name: item.product_name, quantity: qty }
      })
      .filter(Boolean)

    if (items.length === 0) {
      toast({ title: 'Select at least one item to refund', variant: 'destructive' })
      return
    }

    if (store?.refund_require_reason && !refundReason.trim()) {
      toast({ title: 'Reason is required', variant: 'destructive' })
      return
    }

    setRefunding(true)
    try {
      await api.post(`sales/sales/${refundTarget.id}/refund/`, {
        items,
        reason: refundReason,
      })
      toast({ title: 'Refund processed', description: `Refund for receipt ${refundTarget.receipt_number} has been processed.` })
      setRefundTarget(null)
      if (selectedSale?.id === refundTarget.id) {
        setDetailOpen(false)
        setSelectedSale(null)
      }
      fetchSales()
      // Refresh summary
      api.get('sales/sales/today_summary/')
        .then((res) => {
          const d = res.data
          setSummary({
            total_sales: parseFloat(d.total_sales) || 0,
            total_tax: parseFloat(d.total_tax) || 0,
            total_discount: parseFloat(d.total_discount) || 0,
            transaction_count: d.transaction_count || 0,
            date: d.date || '',
          })
        })
        .catch(() => {})
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to process refund'
          : 'Failed to process refund'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setRefunding(false)
    }
  }

  // Print
  const handlePrint = useReactToPrint({ contentRef: receiptRef })

  const handlePrintReceipt = async (sale: SaleData) => {
    if (store?.printer_type === 'none' || !store?.printer_type) {
      setSelectedSale(sale)
      setTimeout(() => handlePrint(), 100)
      return
    }
    try {
      const res = await api.get(`sales/sales/${sale.id}/print_receipt/`)
      if (store.printer_type === 'test') {
        setReceiptPreview(res.data.receipt_text || '')
      } else if (res.data.printed) {
        toast({ title: 'Receipt printed' })
      } else {
        toast({ title: 'Print failed', description: res.data.printer_error || 'Unknown error', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Print failed', variant: 'destructive' })
    }
  }

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] font-medium">Completed</Badge>
      case 'voided':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[11px] font-medium">Voided</Badge>
      case 'refunded':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px] font-medium">Refunded</Badge>
      default:
        return <Badge variant="secondary" className="text-[11px]">{status}</Badge>
    }
  }

  const paymentBadge = (method: string) => {
    const Icon = method === 'cash' ? Banknote : method === 'card' ? CreditCard : Smartphone
    return (
      <Badge variant="secondary" className="capitalize text-[11px] font-medium gap-1">
        <Icon className="h-3 w-3" />
        {method}
      </Badge>
    )
  }

  // Prepare detail receipt data
  const detailItems = selectedSale?.items.map((i) => ({
    product_name: i.product_name,
    quantity: i.quantity,
    unit_price: parseFloat(i.unit_price) || 0,
    discount: parseFloat(i.discount) || 0,
    tax_amount: parseFloat(i.tax_amount) || 0,
    gst_rate: parseFloat(i.gst_rate) || 0,
    subtotal: parseFloat(i.subtotal) || 0,
  })) || []

  const detailSubtotal = detailItems.reduce((s, i) => s + i.subtotal, 0)
  const detailTax = selectedSale ? parseFloat(selectedSale.tax_amount) || 0 : 0
  const detailDiscount = selectedSale ? parseFloat(selectedSale.discount_amount) || 0 : 0
  const detailTotal = selectedSale ? parseFloat(selectedSale.total_amount) || 0 : 0

  const statsCards = [
    { label: "Today's Sales", value: summary ? formatPrice(summary.total_sales) : '...', icon: DollarSign, color: 'text-emerald-600' },
    { label: 'Transactions', value: summary ? summary.transaction_count.toString() : '...', icon: Hash, color: 'text-blue-600' },
    { label: 'Tax Collected', value: summary ? formatPrice(summary.total_tax) : '...', icon: ReceiptText, color: 'text-purple-600' },
    { label: 'Discounts Given', value: summary ? formatPrice(summary.total_discount) : '...', icon: TrendingDown, color: 'text-amber-600' },
  ]

  return (
    <motion.div
      variants={container}
      initial="initial"
      animate="animate"
      className="w-full"
    >
      {/* Page header */}
      <motion.div variants={item} className="mb-4">
        <h1 className="font-display text-[22px] font-bold text-foreground tracking-tight">
          Sales History
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          View and manage past transactions
        </p>
      </motion.div>

      {/* Stats row */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {statsCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3"
          >
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60', card.color)}>
              <card.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-muted-foreground font-medium">{card.label}</p>
              <p className="font-display text-[18px] font-bold text-foreground leading-tight truncate">{card.value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Filters bar */}
      <motion.div variants={item} className="rounded-xl border border-border/60 bg-card mb-4">
        <div className="p-4 space-y-3">
          {/* Search + Date range */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by receipt number..."
                className="h-10 w-full rounded-lg border border-border/60 bg-background pl-9 pr-4 text-[14px] text-foreground outline-none transition-all placeholder:text-muted-foreground/40 focus:border-foreground/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted-foreground shrink-0">From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                className="h-10 rounded-lg border border-border/60 bg-background px-3 text-[13px] text-foreground outline-none transition-all focus:border-foreground/20"
              />
              <span className="text-[12px] text-muted-foreground shrink-0">To</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                className="h-10 rounded-lg border border-border/60 bg-background px-3 text-[13px] text-foreground outline-none transition-all focus:border-foreground/20"
              />
            </div>
          </div>

          {/* Status + Payment pills + Reset */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Status pills */}
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] text-muted-foreground font-medium mr-1">Status</span>
              {(['', 'completed', 'voided', 'refunded'] as StatusFilter[]).map((s) => (
                <button
                  key={s || 'all'}
                  onClick={() => { setStatusFilter(s); setPage(1) }}
                  className={cn(
                    'shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all',
                    statusFilter === s
                      ? 'bg-[hsl(var(--primary))] text-white'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  )}
                >
                  {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* Payment pills */}
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] text-muted-foreground font-medium mr-1">Payment</span>
              {(['', 'cash', 'card', 'mobile'] as PaymentFilter[]).map((p) => (
                <button
                  key={p || 'all'}
                  onClick={() => { setPaymentFilter(p); setPage(1) }}
                  className={cn(
                    'shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all',
                    paymentFilter === p
                      ? 'bg-[hsl(var(--primary))] text-white'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  )}
                >
                  {p === '' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted transition-all"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Sales table */}
      <motion.div variants={item} className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 mb-5">
              <Receipt className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-[15px] font-medium text-foreground/70 mb-1">No sales found</p>
            <p className="text-[13px] text-muted-foreground text-center max-w-xs">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Sales will appear here once transactions are completed'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Receipt #</TableHead>
                    <TableHead>
                      <SortableHeader label="Date/Time" field="created_at" currentSort={ordering} onSort={(f) => { setOrdering(f || '-created_at'); setPage(1) }} />
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cashier</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">Items</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Payment</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Subtotal</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Tax</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Discount</TableHead>
                    <TableHead>
                      <SortableHeader label="Total" field="total_amount" currentSort={ordering} onSort={(f) => { setOrdering(f || '-created_at'); setPage(1) }} className="justify-end" />
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Refund</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => {
                    const total = parseFloat(sale.total_amount) || 0
                    const tax = parseFloat(sale.tax_amount) || 0
                    const discount = parseFloat(sale.discount_amount) || 0
                    const subtotalVal = total - tax + discount
                    const itemCount = sale.items?.length || 0

                    return (
                      <TableRow
                        key={sale.id}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => openDetail(sale)}
                      >
                        <TableCell>
                          <span className="font-mono text-[13px] font-medium text-foreground">
                            {sale.receipt_number}
                          </span>
                        </TableCell>
                        <TableCell className="text-[13px] text-foreground whitespace-nowrap">
                          {formatDateTime(sale.created_at)}
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">
                          {sale.cashier_name || '—'}
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground text-center">
                          {itemCount}
                        </TableCell>
                        <TableCell>{paymentBadge(sale.payment_method)}</TableCell>
                        <TableCell className="text-[13px] text-foreground text-right tabular-nums">
                          {formatPrice(subtotalVal)}
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground text-right tabular-nums">
                          {formatPrice(tax)}
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground text-right tabular-nums">
                          {discount > 0 ? `-${formatPrice(discount)}` : '—'}
                        </TableCell>
                        <TableCell className="text-[13px] font-bold text-foreground text-right tabular-nums">
                          {formatPrice(total)}
                        </TableCell>
                        <TableCell>
                          {statusBadge(sale.status)}
                          {sale.status === 'completed' && (sale.refunds || []).length > 0 && (
                            <Badge className="ml-1 bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-medium">Partial</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-[13px] text-right tabular-nums">
                          {(() => {
                            const refundSum = (sale.refunds || []).reduce((s, r) => s + parseFloat(String(r.refund_amount)), 0)
                            return refundSum > 0 ? <span className="text-red-500 font-medium">-{formatPrice(refundSum)}</span> : <span className="text-muted-foreground/40">&ndash;</span>
                          })()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(sale) }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {sale.status === 'completed' && store?.refund_enabled && (
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); openRefundDialog(sale) }}
                                  className="text-amber-600 focus:text-amber-600"
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Refund
                                </DropdownMenuItem>
                              )}
                              {sale.status === 'completed' && (
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); setVoidTarget(sale) }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Void Sale
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                handlePrintReceipt(sale)
                              }}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print Receipt
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <PaginationControls
              page={page}
              totalPages={totalPages}
              totalItems={totalCount}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </motion.div>

      {/* Sale Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              Sale Details
            </DialogTitle>
            <DialogDescription>
              Transaction details and itemized breakdown
            </DialogDescription>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4 py-2">
              {/* Receipt number */}
              <div className="text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Receipt</p>
                <p className="font-mono text-xl font-bold text-foreground">{selectedSale.receipt_number}</p>
              </div>

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Date & Time</p>
                  <p className="text-foreground font-medium">{formatDateTime(selectedSale.created_at)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Cashier</p>
                  <p className="text-foreground font-medium">{selectedSale.cashier_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Payment</p>
                  {paymentBadge(selectedSale.payment_method)}
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Status</p>
                  {statusBadge(selectedSale.status)}
                </div>
              </div>

              {/* Itemized table */}
              <div className="rounded-xl bg-muted/40 overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Product</th>
                      <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Qty</th>
                      <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Price</th>
                      {store?.gst_enabled && <th className="text-right px-2 py-2 font-semibold text-muted-foreground">GST</th>}
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailItems.map((itm, idx) => (
                      <tr key={idx} className="border-b border-border/30 last:border-0">
                        <td className="px-3 py-2 text-foreground">{itm.product_name}</td>
                        <td className="text-center px-2 py-2 text-muted-foreground">{itm.quantity}</td>
                        <td className="text-right px-2 py-2 text-muted-foreground">{formatPrice(itm.unit_price)}</td>
                        {store?.gst_enabled && <td className="text-right px-2 py-2 text-muted-foreground">{itm.gst_rate}%</td>}
                        <td className="text-right px-3 py-2 text-foreground font-medium">{formatPrice(itm.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="space-y-2 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground font-medium">{formatPrice(detailSubtotal)}</span>
                </div>
                {store?.gst_enabled && detailTax > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">CGST</span>
                      <span className="text-foreground font-medium">{formatPrice(detailTax / 2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">SGST</span>
                      <span className="text-foreground font-medium">{formatPrice(detailTax / 2)}</span>
                    </div>
                  </>
                )}
                {!store?.gst_enabled && detailTax > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-foreground font-medium">{formatPrice(detailTax)}</span>
                  </div>
                )}
                {detailDiscount > 0 && (
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {selectedSale?.discount_type === 'percent' ? 'Discount (%)' : 'Discount'}
                      </span>
                      <span className="text-foreground font-medium">-{formatPrice(detailDiscount)}</span>
                    </div>
                    {selectedSale?.discount_reason && (
                      <div className="text-[11px] text-muted-foreground/70 italic">
                        Reason: {selectedSale.discount_reason}
                      </div>
                    )}
                  </div>
                )}
                <div className="h-px bg-border/60" />
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-foreground">Total</span>
                  <span className="font-display text-xl font-bold text-foreground">{formatPrice(detailTotal)}</span>
                </div>
              </div>

              {/* Refunds section */}
              {(selectedSale.refunds || []).length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-foreground">Refunds</p>
                    <span className="text-[12px] text-red-500 font-medium">
                      Total refunded: {formatPrice((selectedSale.refunds || []).reduce((s, r) => s + parseFloat(String(r.refund_amount)), 0))}
                    </span>
                  </div>
                  {(selectedSale.refunds || []).map((refund) => (
                    <div key={refund.id} className="rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200/40 dark:border-red-800/30 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[12px] font-medium text-foreground">{refund.refund_number}</span>
                        <span className="text-[12px] text-muted-foreground">{formatDateTime(refund.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-muted-foreground">Amount: <span className="text-red-500 font-medium">{formatPrice(parseFloat(String(refund.refund_amount)))}</span></span>
                        <span className="text-muted-foreground">By: {refund.processed_by_name}</span>
                      </div>
                      {refund.reason && (
                        <p className="text-[11px] text-muted-foreground">Reason: {refund.reason}</p>
                      )}
                      <div className="space-y-0.5">
                        {refund.items.map((ri) => (
                          <div key={ri.id} className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{ri.product_name} x{ri.quantity}</span>
                            <span>{formatPrice(parseFloat(String(ri.subtotal)))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <DialogFooter className="flex gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePrintReceipt(selectedSale)}
                  className="flex-1 text-[13px] gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Receipt
                </Button>
                {selectedSale.status === 'completed' && store?.refund_enabled && (
                  <Button
                    variant="outline"
                    onClick={() => openRefundDialog(selectedSale)}
                    className="flex-1 text-[13px] gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/10"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Refund
                  </Button>
                )}
                {selectedSale.status === 'completed' && (
                  <Button
                    variant="destructive"
                    onClick={() => setVoidTarget(selectedSale)}
                    className="flex-1 text-[13px] gap-1.5"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Void Sale
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Void Confirmation Dialog */}
      <Dialog open={!!voidTarget} onOpenChange={(open) => { if (!open) setVoidTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Void Sale
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to void receipt <span className="font-mono font-bold">{voidTarget?.receipt_number}</span>? This will restore stock and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidTarget(null)} disabled={voiding}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleVoid} disabled={voiding}>
              {voiding && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Void Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={!!refundTarget} onOpenChange={(open) => { if (!open) setRefundTarget(null) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <RotateCcw className="h-5 w-5" />
              Process Refund
            </DialogTitle>
            <DialogDescription>
              Refund items from receipt <span className="font-mono font-bold">{refundTarget?.receipt_number}</span>
            </DialogDescription>
          </DialogHeader>
          {refundTarget && (
            <div className="space-y-4 py-2">
              {/* Items to refund */}
              <div className="rounded-xl bg-muted/40 overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Product</th>
                      <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Orig Qty</th>
                      <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Price</th>
                      <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Refund Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundTarget.items.map((itm, idx) => {
                      const maxQty = getMaxRefundableQty(refundTarget, idx)
                      return (
                        <tr key={idx} className="border-b border-border/30 last:border-0">
                          <td className="px-3 py-2 text-foreground">{itm.product_name}</td>
                          <td className="text-center px-2 py-2 text-muted-foreground">{itm.quantity}</td>
                          <td className="text-right px-2 py-2 text-muted-foreground">{formatPrice(parseFloat(itm.unit_price) || 0)}</td>
                          <td className="text-center px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              max={maxQty}
                              value={refundQuantities[idx] || 0}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(maxQty, parseInt(e.target.value) || 0))
                                setRefundQuantities(prev => ({ ...prev, [idx]: val }))
                              }}
                              className="h-8 w-16 rounded-md border border-border/60 bg-background text-center text-[12px] text-foreground outline-none focus:border-foreground/20"
                              disabled={maxQty === 0}
                            />
                            {maxQty === 0 && <p className="text-[10px] text-muted-foreground mt-0.5">Fully refunded</p>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Reason */}
              <div className="grid gap-2">
                <label className="text-[13px] font-medium text-foreground">
                  Reason {store?.refund_require_reason && <span className="text-destructive">*</span>}
                </label>
                <textarea
                  placeholder="Enter reason for refund..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="min-h-[60px] w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-[13px] text-foreground outline-none transition-all placeholder:text-muted-foreground/40 focus:border-foreground/20 resize-none"
                />
              </div>

              {/* Refund total */}
              <div className="flex items-center justify-between rounded-xl border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10 p-4">
                <span className="text-[14px] font-semibold text-foreground">Refund Total</span>
                <span className="font-display text-xl font-bold text-amber-600">{formatPrice(refundTotal)}</span>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setRefundTarget(null)} disabled={refunding}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRefund}
                  disabled={refunding || refundTotal === 0}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {refunding && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Process Refund
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Preview Dialog (test printer mode) */}
      <Dialog open={!!receiptPreview} onOpenChange={() => setReceiptPreview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Receipt Preview
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border border-border/60 bg-white p-4 overflow-auto max-h-[60vh]">
            <pre className="text-[11px] font-mono text-gray-900 whitespace-pre leading-relaxed">{receiptPreview}</pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptPreview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden printable receipt */}
      {selectedSale && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <PrintableReceipt
            ref={receiptRef}
            receiptNumber={selectedSale.receipt_number}
            items={detailItems}
            subtotal={detailSubtotal}
            taxAmount={detailTax}
            discountAmount={detailDiscount}
            total={detailTotal}
            paymentMethod={selectedSale.payment_method}
            store={store}
            date={selectedSale.created_at}
          />
        </div>
      )}
    </motion.div>
  )
}
