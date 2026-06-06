import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Barcode from 'react-barcode'
import {
  Warehouse,
  ArrowDownUp,
  AlertTriangle,
  Search,
  Loader2,
  PackageMinus,
  PackagePlus,
  SlidersHorizontal,
  DollarSign,
  XCircle,
  Package,
} from 'lucide-react'
import api from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { useHotkey } from '@/hooks/use-hotkeys'
import { useBarcodeScan } from '@/hooks/use-barcode-scan'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { SortableHeader } from '@/components/ui/sortable-header'
import type { Stock, StockMovement, StockSummary, Product } from '@/types'

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

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function Inventory() {
  const { t } = useTranslation()
  const { toast } = useToast()

  // Data
  const [stocks, setStocks] = useState<Stock[]>([])
  const [lowStocks, setLowStocks] = useState<Stock[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [summary, setSummary] = useState<StockSummary | null>(null)

  // Loading
  const [loadingStocks, setLoadingStocks] = useState(true)
  const [loadingLow, setLoadingLow] = useState(true)
  const [loadingMovements, setLoadingMovements] = useState(true)
  const [loadingSummary, setLoadingSummary] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all')

  // Pagination & sorting — stocks
  const [stockPage, setStockPage] = useState(1)
  const [stockTotalCount, setStockTotalCount] = useState(0)
  const [stockOrdering, setStockOrdering] = useState('')

  // Pagination — low stock
  const [lowStockPage, setLowStockPage] = useState(1)
  const [lowStockTotalCount, setLowStockTotalCount] = useState(0)

  // Pagination & sorting — movements
  const [movementPage, setMovementPage] = useState(1)
  const [movementTotalCount, setMovementTotalCount] = useState(0)
  const [movementOrdering, setMovementOrdering] = useState('-created_at')

  // Adjust dialog
  const [adjustDialog, setAdjustDialog] = useState(false)
  const [adjustStock, setAdjustStock] = useState<Stock | null>(null)
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'adjustment'>('in')
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [adjustSaving, setAdjustSaving] = useState(false)

  // Stock detail dialog state
  const [detailStock, setDetailStock] = useState<Stock | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [detailProductLoading, setDetailProductLoading] = useState(false)
  const [detailMovements, setDetailMovements] = useState<StockMovement[]>([])
  const [detailMovementsLoading, setDetailMovementsLoading] = useState(false)

  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useHotkey('f2', () => searchInputRef.current?.focus(), [])

  useBarcodeScan({
    onScan: async (barcode) => {
      try {
        const res = await api.get(`products/products/?search=${barcode}`)
        const items = res.data.results || res.data || []
        const product = items.find((p: Product) => p.barcode === barcode)
        if (product) {
          const stock = stocks.find(s => s.product === product.id)
          if (stock) {
            openStockDetail(stock)
          } else {
            toast({ title: 'No stock record', description: `${product.name} has no stock entry.` })
          }
        } else {
          toast({ title: 'Product not found', description: `No product with barcode: ${barcode}` })
        }
      } catch {
        toast({ title: 'Scan error', variant: 'destructive' })
      }
    },
    enabled: !detailOpen && !adjustDialog,
  })

  // Fetchers
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true)
    try {
      const res = await api.get('inventory/stocks/summary/')
      setSummary(res.data)
    } catch {
      // silent
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  const fetchStocks = useCallback(async () => {
    setLoadingStocks(true)
    try {
      const params: Record<string, string | number> = { page: stockPage }
      if (search) params.search = search
      if (stockOrdering) params.ordering = stockOrdering
      const res = await api.get('inventory/stocks/', { params })
      const data = res.data
      const items = data.results || data
      setStocks(Array.isArray(items) ? items : [])
      setStockTotalCount(data.count ?? (Array.isArray(items) ? items.length : 0))
    } catch {
      toast({ title: 'Error', description: 'Failed to load stock data', variant: 'destructive' })
    } finally {
      setLoadingStocks(false)
    }
  }, [search, stockPage, stockOrdering, toast])

  const fetchLowStocks = useCallback(async () => {
    setLoadingLow(true)
    try {
      const params: Record<string, string | number> = { low_stock: 'true', page: lowStockPage }
      const res = await api.get('inventory/stocks/', { params })
      const data = res.data
      const items = data.results || data
      setLowStocks(Array.isArray(items) ? items : [])
      setLowStockTotalCount(data.count ?? (Array.isArray(items) ? items.length : 0))
    } catch {
      // silent
    } finally {
      setLoadingLow(false)
    }
  }, [lowStockPage])

  const fetchMovements = useCallback(async () => {
    setLoadingMovements(true)
    try {
      const params: Record<string, string | number> = { page: movementPage }
      if (movementTypeFilter !== 'all') params.movement_type = movementTypeFilter
      if (movementOrdering) params.ordering = movementOrdering
      const res = await api.get('inventory/stock-movements/', { params })
      const data = res.data
      const items = data.results || data
      setMovements(Array.isArray(items) ? items : [])
      setMovementTotalCount(data.count ?? (Array.isArray(items) ? items.length : 0))
    } catch {
      toast({ title: 'Error', description: 'Failed to load movements', variant: 'destructive' })
    } finally {
      setLoadingMovements(false)
    }
  }, [movementTypeFilter, movementPage, movementOrdering, toast])

  useEffect(() => {
    fetchSummary()
    fetchStocks()
    fetchLowStocks()
    fetchMovements()
  }, [fetchSummary, fetchStocks, fetchLowStocks, fetchMovements])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setStockPage(1)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      fetchStocks()
    }, 400)
  }

  const handleStockSort = (field: string) => {
    setStockOrdering(field)
    setStockPage(1)
  }

  const handleMovementSort = (field: string) => {
    setMovementOrdering(field)
    setMovementPage(1)
  }

  const handleMovementTypeChange = (v: string) => {
    setMovementTypeFilter(v)
    setMovementPage(1)
  }

  const stockTotalPages = Math.ceil(stockTotalCount / PAGE_SIZE)
  const lowStockTotalPages = Math.ceil(lowStockTotalCount / PAGE_SIZE)
  const movementTotalPages = Math.ceil(movementTotalCount / PAGE_SIZE)

  // Adjust actions
  const openAdjust = (stock: Stock, type: 'in' | 'out' | 'adjustment') => {
    setAdjustStock(stock)
    setAdjustType(type)
    setAdjustQty('')
    setAdjustNotes('')
    setAdjustDialog(true)
  }

  const handleAdjustSubmit = async () => {
    if (!adjustStock || !adjustQty) return
    const qty = parseInt(adjustQty, 10)
    if (isNaN(qty) || qty <= 0) {
      toast({ title: 'Invalid quantity', description: 'Enter a positive number', variant: 'destructive' })
      return
    }

    setAdjustSaving(true)
    try {
      const quantity = adjustType === 'out' ? -qty : qty
      await api.post(`inventory/stocks/${adjustStock.id}/adjust/`, {
        quantity,
        movement_type: adjustType,
        notes: adjustNotes,
      })
      toast({ title: 'Stock adjusted', description: `${adjustStock.product_name} updated successfully` })
      setAdjustDialog(false)
      // Refresh all data
      fetchSummary()
      fetchStocks()
      fetchLowStocks()
      fetchMovements()
    } catch {
      toast({ title: 'Error', description: 'Failed to adjust stock', variant: 'destructive' })
    } finally {
      setAdjustSaving(false)
    }
  }

  // Open stock detail
  const openStockDetail = async (stock: Stock) => {
    setDetailStock(stock)
    setDetailOpen(true)
    setDetailProduct(null)
    setDetailMovements([])

    // Fetch product detail for image
    setDetailProductLoading(true)
    try {
      const res = await api.get(`products/products/${stock.product}/`)
      setDetailProduct(res.data)
    } catch {
      // silent — image won't show
    } finally {
      setDetailProductLoading(false)
    }

    // Fetch recent movements for this product
    setDetailMovementsLoading(true)
    try {
      const res = await api.get('inventory/stock-movements/', { params: { product: stock.product, page_size: 5 } })
      const data = res.data
      const items = data.results || data
      setDetailMovements(Array.isArray(items) ? items.slice(0, 5) : [])
    } catch {
      // silent
    } finally {
      setDetailMovementsLoading(false)
    }
  }

  // Quantity badge color
  const qtyBadge = (stock: Stock) => {
    if (stock.quantity === 0) {
      return <Badge variant="destructive" className="font-mono">{stock.quantity}</Badge>
    }
    if (stock.is_low_stock) {
      return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 font-mono">{stock.quantity}</Badge>
    }
    return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-mono">{stock.quantity}</Badge>
  }

  // Movement type badge
  const movementBadge = (type: string) => {
    switch (type) {
      case 'in':
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">In</Badge>
      case 'out':
        return <Badge variant="destructive">Out</Badge>
      case 'adjustment':
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Adjust</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  // Stock table component (shared between overview and low stock tabs)
  const StockTable = ({
    data,
    loading: isLoading,
    showSort,
    currentOrdering,
    onSort,
    tablePage,
    tableTotalPages,
    tableTotalCount,
    onPageChange,
    onRowClick,
  }: {
    data: Stock[]
    loading: boolean
    showSort?: boolean
    currentOrdering?: string
    onSort?: (field: string) => void
    tablePage: number
    tableTotalPages: number
    tableTotalCount: number
    onPageChange: (page: number) => void
    onRowClick?: (stock: Stock) => void
  }) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )
    }
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 mb-4">
            <Warehouse className="h-5 w-5 text-muted-foreground/40" />
          </div>
          <p className="text-[14px] font-medium text-foreground/70 mb-1">
            {t('pages.inventory.noInventory')}
          </p>
          <p className="text-[13px] text-muted-foreground text-center max-w-sm">
            {t('pages.inventory.noInventoryDesc')}
          </p>
        </div>
      )
    }
    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[13px]">
                {showSort && onSort && currentOrdering !== undefined ? (
                  <SortableHeader label="Product" field="product__name" currentSort={currentOrdering} onSort={onSort} />
                ) : (
                  'Product'
                )}
              </TableHead>
              <TableHead className="text-[13px]">Category</TableHead>
              <TableHead className="text-[13px] text-right">GST</TableHead>
              <TableHead className="text-[13px]">HSN</TableHead>
              <TableHead className="text-[13px] text-right">
                {showSort && onSort && currentOrdering !== undefined ? (
                  <SortableHeader label="Qty" field="quantity" currentSort={currentOrdering} onSort={onSort} className="justify-end" />
                ) : (
                  'Qty'
                )}
              </TableHead>
              <TableHead className="text-[13px] text-right">
                {showSort && onSort && currentOrdering !== undefined ? (
                  <SortableHeader label="Threshold" field="low_stock_threshold" currentSort={currentOrdering} onSort={onSort} className="justify-end" />
                ) : (
                  'Threshold'
                )}
              </TableHead>
              <TableHead className="text-[13px]">Last Restocked</TableHead>
              <TableHead className="text-[13px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((stock) => (
              <TableRow key={stock.id} className="hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => onRowClick?.(stock)}>
                <TableCell>
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{stock.product_name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{stock.product_sku}</p>
                  </div>
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground">
                  {stock.product_category || '—'}
                </TableCell>
                <TableCell className="text-right text-[13px] text-muted-foreground tabular-nums">
                  {stock.product_gst_rate ? `${stock.product_gst_rate}%` : '--'}
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground">
                  {stock.product_hsn_code || '--'}
                </TableCell>
                <TableCell className="text-right">{qtyBadge(stock)}</TableCell>
                <TableCell className="text-right text-[13px] text-muted-foreground font-mono">
                  {stock.low_stock_threshold}
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground">
                  {formatRelativeTime(stock.last_restocked)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openAdjust(stock, 'in') }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                    >
                      <PackagePlus className="h-3.5 w-3.5" />
                      In
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openAdjust(stock, 'out') }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-red-600 hover:bg-red-500/10 transition-colors"
                    >
                      <PackageMinus className="h-3.5 w-3.5" />
                      Out
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openAdjust(stock, 'adjustment') }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-amber-600 hover:bg-amber-500/10 transition-colors"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Adjust
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PaginationControls
          page={tablePage}
          totalPages={tableTotalPages}
          totalItems={tableTotalCount}
          pageSize={PAGE_SIZE}
          onPageChange={onPageChange}
        />
      </>
    )
  }

  const summaryStats = [
    {
      label: t('pages.inventory.totalProducts'),
      value: loadingSummary ? '...' : String(summary?.total_products ?? 0),
      icon: Warehouse,
      color: '',
    },
    {
      label: t('pages.inventory.lowStock'),
      value: loadingSummary ? '...' : String(summary?.low_stock ?? 0),
      icon: AlertTriangle,
      color: (summary?.low_stock ?? 0) > 0 ? 'text-amber-500' : '',
    },
    {
      label: 'Out of Stock',
      value: loadingSummary ? '...' : String(summary?.out_of_stock ?? 0),
      icon: XCircle,
      color: (summary?.out_of_stock ?? 0) > 0 ? 'text-red-500' : '',
    },
    {
      label: 'Inventory Value',
      value: loadingSummary ? '...' : formatCurrency(summary?.total_value ?? 0),
      icon: DollarSign,
      color: '',
    },
  ]

  return (
    <motion.div
      variants={container}
      initial="initial"
      animate="animate"
      className="w-full space-y-6"
    >
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="font-display text-[22px] font-bold text-foreground tracking-tight">
          {t('pages.inventory.title')}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          {t('pages.inventory.subtitle')}
        </p>
      </motion.div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryStats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={item}
            className="rounded-xl border border-border/60 bg-card p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60">
                <stat.icon className={`h-4 w-4 ${stat.color || 'text-muted-foreground'}`} />
              </div>
              <span className="text-[13px] text-muted-foreground">
                {stat.label}
              </span>
            </div>
            <p className={`font-display text-xl font-bold ${stat.color || 'text-foreground'}`}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <motion.div variants={item}>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{t('pages.inventory.stockOverview')}</TabsTrigger>
            <TabsTrigger value="lowstock">
              {t('pages.inventory.lowStock')}
              {(summary?.low_stock ?? 0) > 0 && (
                <Badge className="ml-2 bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] px-1.5 py-0">
                  {summary?.low_stock}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="movements">{t('pages.inventory.stockMovements')}</TabsTrigger>
          </TabsList>

          {/* Stock Overview Tab */}
          <TabsContent value="overview">
            <div className="rounded-xl border border-border/60 bg-card">
              <div className="border-b border-border/60 px-6 py-4 flex items-center justify-between gap-4">
                <h3 className="text-[15px] font-semibold text-foreground">
                  {t('pages.inventory.stockOverview')}
                </h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 h-9 text-[13px]"
                  />
                </div>
              </div>
              <StockTable
                data={stocks}
                loading={loadingStocks}
                showSort
                currentOrdering={stockOrdering}
                onSort={handleStockSort}
                tablePage={stockPage}
                tableTotalPages={stockTotalPages}
                tableTotalCount={stockTotalCount}
                onPageChange={setStockPage}
                onRowClick={openStockDetail}
              />
            </div>
          </TabsContent>

          {/* Low Stock Tab */}
          <TabsContent value="lowstock">
            <div className="rounded-xl border border-border/60 bg-card">
              {(summary?.low_stock ?? 0) > 0 && (
                <div className="flex items-center gap-2 px-6 py-3 bg-amber-500/10 border-b border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-[13px] font-medium text-amber-700 dark:text-amber-400">
                    {summary?.low_stock} product{(summary?.low_stock ?? 0) !== 1 ? 's are' : ' is'} below the restock threshold
                  </span>
                </div>
              )}
              <StockTable
                data={lowStocks}
                loading={loadingLow}
                tablePage={lowStockPage}
                tableTotalPages={lowStockTotalPages}
                tableTotalCount={lowStockTotalCount}
                onPageChange={setLowStockPage}
                onRowClick={openStockDetail}
              />
            </div>
          </TabsContent>

          {/* Movements Tab */}
          <TabsContent value="movements">
            <div className="rounded-xl border border-border/60 bg-card">
              <div className="border-b border-border/60 px-6 py-4 flex items-center justify-between gap-4">
                <h3 className="text-[15px] font-semibold text-foreground">
                  Recent Movements
                </h3>
                <Select value={movementTypeFilter} onValueChange={handleMovementTypeChange}>
                  <SelectTrigger className="w-36 h-9 text-[13px]">
                    <SelectValue placeholder="Filter type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="in">Stock In</SelectItem>
                    <SelectItem value="out">Stock Out</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loadingMovements ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : movements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 mb-4">
                    <ArrowDownUp className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-[14px] font-medium text-foreground/70 mb-1">No movements found</p>
                  <p className="text-[13px] text-muted-foreground text-center max-w-sm">
                    Stock movements will appear here when inventory is adjusted.
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[13px]">
                          <SortableHeader label="Date/Time" field="created_at" currentSort={movementOrdering} onSort={handleMovementSort} />
                        </TableHead>
                        <TableHead className="text-[13px]">Product</TableHead>
                        <TableHead className="text-[13px]">Type</TableHead>
                        <TableHead className="text-[13px] text-right">Qty Change</TableHead>
                        <TableHead className="text-[13px]">Notes</TableHead>
                        <TableHead className="text-[13px]">By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((mv) => (
                        <TableRow key={mv.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="text-[13px] text-muted-foreground whitespace-nowrap">
                            {formatDateTime(mv.created_at)}
                          </TableCell>
                          <TableCell className="text-[13px] font-medium text-foreground">
                            {mv.product_name}
                          </TableCell>
                          <TableCell>{movementBadge(mv.movement_type)}</TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`font-mono text-[13px] font-medium ${
                                mv.quantity_change > 0
                                  ? 'text-emerald-600'
                                  : mv.quantity_change < 0
                                  ? 'text-red-600'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {mv.quantity_change > 0 ? '+' : ''}{mv.quantity_change}
                            </span>
                          </TableCell>
                          <TableCell className="text-[13px] text-muted-foreground max-w-[200px] truncate">
                            {mv.notes || '—'}
                          </TableCell>
                          <TableCell className="text-[13px] text-muted-foreground">
                            {mv.created_by_name || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationControls
                    page={movementPage}
                    totalPages={movementTotalPages}
                    totalItems={movementTotalCount}
                    pageSize={PAGE_SIZE}
                    onPageChange={setMovementPage}
                  />
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {adjustType === 'in' ? 'Stock In' : adjustType === 'out' ? 'Stock Out' : 'Adjust Stock'}
            </DialogTitle>
            <DialogDescription>
              {adjustStock?.product_name}
              {adjustStock && (
                <span className="ml-2 text-muted-foreground font-mono text-[11px]">
                  (Current qty: {adjustStock.quantity})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[13px]">Movement Type</Label>
              <Select value={adjustType} onValueChange={(v) => setAdjustType(v as 'in' | 'out' | 'adjustment')}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Stock In</SelectItem>
                  <SelectItem value="out">Stock Out</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Quantity</Label>
              <Input
                type="number"
                min="1"
                placeholder="Enter quantity"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                className="h-9 text-[13px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Notes</Label>
              <textarea
                placeholder="Optional notes..."
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setAdjustDialog(false)}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdjustSubmit}
              disabled={adjustSaving || !adjustQty}
              className="inline-flex items-center justify-center rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {adjustSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {adjustType === 'in' ? 'Add Stock' : adjustType === 'out' ? 'Remove Stock' : 'Adjust'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailStock && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{detailStock.product_name}</DialogTitle>
                <DialogDescription>Stock details for {detailStock.product_name}</DialogDescription>
              </DialogHeader>

              {/* Image area */}
              {detailProductLoading ? (
                <div className="w-full h-[200px] rounded-xl bg-muted/40 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
                </div>
              ) : detailProduct?.image ? (
                <div className="w-full h-[200px] rounded-xl overflow-hidden">
                  <img
                    src={detailProduct.image}
                    alt={detailStock.product_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-[200px] rounded-xl bg-muted/40 flex items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}

              {/* Title area */}
              <div className="space-y-1 pt-1">
                <h2 className="font-display text-xl font-bold text-foreground">{detailStock.product_name}</h2>
                {detailStock.product_sku && (
                  <p className="text-[13px] text-muted-foreground font-mono">{detailStock.product_sku}</p>
                )}
              </div>

              <Separator />

              {/* Stock info grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <div>
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-1">Current Quantity</p>
                  <p className={`text-[22px] font-bold ${
                    detailStock.quantity === 0
                      ? 'text-red-600'
                      : detailStock.is_low_stock
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                  }`}>
                    {detailStock.quantity}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-1">Low Stock Threshold</p>
                  <p className="text-[14px] font-medium text-foreground font-mono">{detailStock.low_stock_threshold}</p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-1">Last Restocked</p>
                  <p className="text-[14px] font-medium text-foreground">
                    {detailStock.last_restocked
                      ? new Date(detailStock.last_restocked).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                  <Badge
                    className={`text-[12px] ${
                      detailStock.quantity === 0
                        ? 'bg-red-500/10 text-red-600 border-red-500/20'
                        : detailStock.is_low_stock
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    }`}
                  >
                    {detailStock.quantity === 0
                      ? 'Out of Stock'
                      : detailStock.is_low_stock
                        ? 'Low Stock'
                        : 'Healthy'}
                  </Badge>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-1">GST Rate</p>
                  <div>
                    {detailStock.product_gst_rate ? (
                      <Badge variant="outline" className="text-[12px] font-mono">{detailStock.product_gst_rate}%</Badge>
                    ) : (
                      <span className="text-[14px] text-muted-foreground">--</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-1">HSN Code</p>
                  <p className="text-[14px] font-medium text-foreground font-mono">
                    {detailStock.product_hsn_code || '--'}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-1">Category</p>
                  <div>
                    {detailStock.product_category ? (
                      <Badge variant="secondary" className="text-[12px]">{detailStock.product_category}</Badge>
                    ) : (
                      <span className="text-[14px] text-muted-foreground">--</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-1">Price</p>
                  <p className="text-[14px] font-medium text-foreground">{formatCurrency(Number(detailStock.product_price))}</p>
                </div>
              </div>

              {detailProduct?.barcode && (
                <div className="flex justify-center py-3 border-t border-border/40 mt-3">
                  <Barcode value={detailProduct.barcode} width={1.5} height={40} fontSize={11} margin={0} displayValue={true} />
                </div>
              )}

              <Separator />

              {/* Recent movements */}
              <div>
                <h3 className="text-[14px] font-semibold text-foreground mb-3">Recent Movements</h3>
                {detailMovementsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : detailMovements.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground py-4 text-center">No movements recorded yet.</p>
                ) : (
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[12px]">Date</TableHead>
                          <TableHead className="text-[12px]">Type</TableHead>
                          <TableHead className="text-[12px] text-right">Qty</TableHead>
                          <TableHead className="text-[12px]">Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailMovements.map((mv) => (
                          <TableRow key={mv.id} className="hover:bg-muted/30">
                            <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap py-2">
                              {formatDateTime(mv.created_at)}
                            </TableCell>
                            <TableCell className="py-2">{movementBadge(mv.movement_type)}</TableCell>
                            <TableCell className="text-right py-2">
                              <span className={`font-mono text-[12px] font-medium ${
                                mv.quantity_change > 0 ? 'text-emerald-600' : mv.quantity_change < 0 ? 'text-red-600' : 'text-muted-foreground'
                              }`}>
                                {mv.quantity_change > 0 ? '+' : ''}{mv.quantity_change}
                              </span>
                            </TableCell>
                            <TableCell className="text-[12px] text-muted-foreground max-w-[150px] truncate py-2">
                              {mv.notes || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <Separator />

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setDetailOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
                >
                  Close
                </button>
                <button
                  onClick={() => { setDetailOpen(false); openAdjust(detailStock, 'in') }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors"
                >
                  <PackagePlus className="h-3.5 w-3.5" />
                  Stock In
                </button>
                <button
                  onClick={() => { setDetailOpen(false); openAdjust(detailStock, 'out') }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-red-600 border border-red-500/30 hover:bg-red-500/10 transition-colors"
                >
                  <PackageMinus className="h-3.5 w-3.5" />
                  Stock Out
                </button>
                <button
                  onClick={() => { setDetailOpen(false); openAdjust(detailStock, 'adjustment') }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-amber-600 border border-amber-500/30 hover:bg-amber-500/10 transition-colors"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Adjust
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
