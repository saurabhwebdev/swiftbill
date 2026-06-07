import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ShoppingCart,
  Search,
  CreditCard,
  Receipt,
  Plus,
  Minus,
  X,
  Loader2,
  Package,
  CheckCircle2,
  Banknote,
  Smartphone,
  ImageIcon,
  Trash2,
  MessageSquarePlus,
  ChevronDown,
  Printer,
  ScanBarcode,
  Camera,
  Monitor,
  Clock,
  LogOut,
  Percent,
  Tag,
  Mail,
  User,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Html5Qrcode } from 'html5-qrcode'
import { useReactToPrint } from 'react-to-print'
import api from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { useBarcodeScan } from '@/hooks/use-barcode-scan'
import { useAuthStore } from '@/stores/authStore'
import { PrintableReceipt } from '@/components/receipt/PrintableReceipt'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Product, Category, Store, Terminal } from '@/types'

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

const cartItemVariant = {
  initial: { opacity: 0, x: 20, height: 0 },
  animate: {
    opacity: 1,
    x: 0,
    height: 'auto' as const,
    transition: { duration: 0.25, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    x: -20,
    height: 0,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  },
}

interface CartItem {
  product_id: number
  name: string
  price: number
  quantity: number
  discount: number
  gst_rate: number
  image: string | null
}

type PaymentMethod = 'cash' | 'card' | 'mobile'

export function Sales() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)

  // Store config
  const [store, setStore] = useState<Store | null>(null)

  // Products & categories
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cart
  const [cart, setCart] = useState<CartItem[]>([])
  const [overallDiscount, setOverallDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat')
  const [discountReason, setDiscountReason] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [checkingOut, setCheckingOut] = useState(false)

  // Success dialog
  const [successData, setSuccessData] = useState<{
    receipt_number: string
    total: number
    payment_method: string
    discount_amount: number
    tax_amount: number
    items: {
      product_name: string
      quantity: number
      unit_price: number
      discount: number
      tax_amount: number
      gst_rate: number
      subtotal: number
    }[]
  } | null>(null)

  // Receipt preview dialog (for test printer mode)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [lastSaleId, setLastSaleId] = useState<number | null>(null)

  // Demand request dialog
  const [demandOpen, setDemandOpen] = useState(false)
  const [demandForm, setDemandForm] = useState({
    query: '', notes: '',
    customer_name: '', customer_phone: '', customer_email: '', notify_customer: false,
  })
  const [demandSubmitting, setDemandSubmitting] = useState(false)
  const [demandCustomerExpanded, setDemandCustomerExpanded] = useState(false)

  // Barcode scan
  const [simulateScanOpen, setSimulateScanOpen] = useState(false)
  const [simulateBarcode, setSimulateBarcode] = useState('8901234567890')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [scanFlash, setScanFlash] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  // UPI payment
  const [upiDialog, setUpiDialog] = useState(false)
  const [upiData, setUpiData] = useState<{
    upi_link: string
    transaction_ref: string
    amount: string
    upi_id: string
    payee_name: string
    verification_mode: string
    expires_at: string
  } | null>(null)
  const [upiStatus, setUpiStatus] = useState<'pending' | 'confirmed' | 'failed' | 'expired'>('pending')
  const [upiConfirming, setUpiConfirming] = useState(false)
  const [upiTimeLeft, setUpiTimeLeft] = useState(0)

  // Terminal state
  const [activeTerminal, setActiveTerminal] = useState<Terminal | null>(null)
  const [terminalLoading, setTerminalLoading] = useState(true)
  const [showTerminalSelect, setShowTerminalSelect] = useState(false)
  const [terminals, setTerminals] = useState<Terminal[]>([])
  const [openingBalance, setOpeningBalance] = useState('')
  const [openingTerminalId, setOpeningTerminalId] = useState<number | null>(null)
  const [closingDialog, setClosingDialog] = useState(false)
  const [closingCount, setClosingCount] = useState('')
  const [closingResult, setClosingResult] = useState<{expected_balance: string, discrepancy: string} | null>(null)
  const [sessionSummary, setSessionSummary] = useState<any>(null)
  const [sessionDuration, setSessionDuration] = useState('')

  const searchInputRef = useRef<HTMLInputElement>(null)
  const discountInputRef = useRef<HTMLInputElement>(null)
  const receiptRef = useRef<HTMLDivElement>(null)
  const currency = store?.currency === 'INR' ? '₹' : store?.currency === 'USD' ? '$' : store?.currency === 'EUR' ? '€' : store?.currency === 'GBP' ? '£' : store?.currency || '₹'

  // Fetch store config
  useEffect(() => {
    api
      .get('accounts/stores/my_store/')
      .then((res) => {
        setStore(res.data)
        const s = res.data
        if (s.payment_cash) setPaymentMethod('cash')
        else if (s.payment_card) setPaymentMethod('card')
        else if (s.payment_mobile) setPaymentMethod('mobile')
      })
      .catch(() => {})
  }, [])

  // WebSocket for real-time stock sync between terminals
  useEffect(() => {
    if (!store?.id) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/stock/${store.id}/`
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      ws = new WebSocket(wsUrl)
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'stock_update' && Array.isArray(data.products)) {
            setProducts((prev) =>
              prev.map((p) => {
                const updated = data.products.find(
                  (u: { product_id: number; quantity: number }) => u.product_id === p.id,
                )
                return updated ? { ...p, current_stock: updated.quantity } : p
              }),
            )
          }
        } catch {}
      }
      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) {
        ws.onclose = null
        ws.close()
      }
    }
  }, [store?.id])

  // Check for active terminal on mount
  useEffect(() => {
    const checkTerminal = async () => {
      setTerminalLoading(true)
      try {
        const res = await api.get('accounts/terminals/my_terminal/')
        setActiveTerminal(res.data)
        localStorage.setItem('swiftbill_terminal_id', String(res.data.id))
      } catch {
        localStorage.removeItem('swiftbill_terminal_id')
        setActiveTerminal(null)
        try {
          const res = await api.get('accounts/terminals/')
          const items = res.data.results || res.data || []
          setTerminals(items)
        } catch {}
        setShowTerminalSelect(true)
      } finally {
        setTerminalLoading(false)
      }
    }
    checkTerminal()
  }, [])

  // Session duration timer
  useEffect(() => {
    if (!activeTerminal?.opened_at) return
    const update = () => {
      const mins = Math.floor((Date.now() - new Date(activeTerminal.opened_at!).getTime()) / 60000)
      const h = Math.floor(mins / 60)
      const m = mins % 60
      setSessionDuration(h > 0 ? `${h}h ${m}m` : `${m}m`)
    }
    update()
    const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [activeTerminal?.opened_at])

  // Open terminal session
  const handleOpenSession = async () => {
    if (!openingTerminalId) return
    try {
      const res = await api.post(`accounts/terminals/${openingTerminalId}/open_session/`, {
        opening_balance: parseFloat(openingBalance) || 0,
      })
      setActiveTerminal(res.data)
      localStorage.setItem('swiftbill_terminal_id', String(res.data.id))
      setShowTerminalSelect(false)
      setOpeningTerminalId(null)
      setOpeningBalance('')
      toast({ title: `Terminal "${res.data.name}" opened` })
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to open terminal'
          : 'Failed to open terminal'
      toast({ title: message, variant: 'destructive' })
    }
  }

  // Close terminal session
  const handleCloseSession = async () => {
    if (!activeTerminal) return
    try {
      const res = await api.post(`accounts/terminals/${activeTerminal.id}/close_session/`, {
        closing_count: parseFloat(closingCount) || 0,
      })
      setClosingResult({
        expected_balance: String(res.data.expected_balance),
        discrepancy: String(res.data.discrepancy),
      })
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to close terminal'
          : 'Failed to close terminal'
      toast({ title: message, variant: 'destructive' })
    }
  }

  // Open close dialog with summary
  const handleOpenCloseDialog = async () => {
    if (!activeTerminal) return
    try {
      const res = await api.get(`accounts/terminals/${activeTerminal.id}/session_summary/`)
      setSessionSummary(res.data)
    } catch {
      setSessionSummary(null)
    }
    setClosingCount('')
    setClosingResult(null)
    setClosingDialog(true)
  }

  // Done after close: reset terminal state
  const handleCloseDone = () => {
    setClosingDialog(false)
    setClosingResult(null)
    setSessionSummary(null)
    setClosingCount('')
    setActiveTerminal(null)
    localStorage.removeItem('swiftbill_terminal_id')
    // Refresh terminal list
    api.get('accounts/terminals/').then(res => {
      const items = res.data.results || res.data || []
      setTerminals(items)
    }).catch(() => {})
    setShowTerminalSelect(true)
  }

  // Fetch categories
  useEffect(() => {
    api
      .get('products/categories/')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data.results || []
        setCategories(data.filter((c: Category) => c.is_active))
      })
      .catch(() => {})
  }, [])

  // Fetch products
  const fetchProducts = useCallback(
    (search = '', categoryId: number | null = null) => {
      setLoading(true)
      let url = 'products/products/?is_active=true'
      if (search) url += `&search=${encodeURIComponent(search)}`
      if (categoryId) url += `&category=${categoryId}`
      api
        .get(url)
        .then((res) => {
          const data = Array.isArray(res.data)
            ? res.data
            : res.data.results || []
          setProducts(data)
        })
        .catch(() => {
          toast({ title: 'Failed to load products', variant: 'destructive' })
        })
        .finally(() => setLoading(false))
    },
    [toast]
  )

  // Initial load
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Debounced search
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      fetchProducts(value, activeCategory)
    }, 350)
  }

  // Category filter
  const handleCategoryFilter = (categoryId: number | null) => {
    setActiveCategory(categoryId)
    fetchProducts(searchQuery, categoryId)
  }

  // Cart operations
  const addToCart = (product: Product) => {
    const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price
    const gstRate = product.gst_rate ? parseFloat(product.gst_rate) : (store?.gst_enabled ? parseFloat(store.gst_default_slab || '0') : 0)

    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === product.id)
      if (existing) {
        return prev.map((c) =>
          c.product_id === product.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        )
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price,
          quantity: 1,
          discount: 0,
          gst_rate: gstRate,
          image: product.image,
        },
      ]
    })
  }

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.product_id === productId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c
        )
        .filter((c) => c.quantity > 0)
    )
  }

  const updateItemDiscount = (productId: number, discount: number) => {
    setCart((prev) =>
      prev.map((c) =>
        c.product_id === productId ? { ...c, discount: Math.max(0, discount) } : c
      )
    )
  }

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((c) => c.product_id !== productId))
  }

  const clearCart = () => {
    setCart([])
    setOverallDiscount(0)
    setDiscountType('flat')
    setDiscountReason('')
    setCustomerName('')
    setCustomerEmail('')
  }

  // Cart calculations
  const gstInclusive = store?.gst_inclusive_pricing ?? false

  const subtotal = cart.reduce((sum, c) => {
    const lineTotal = c.price * c.quantity - c.discount
    if (gstInclusive && store?.gst_enabled && c.gst_rate > 0) {
      // Back-calculate base price from inclusive price
      return sum + lineTotal / (1 + c.gst_rate / 100)
    }
    return sum + lineTotal
  }, 0)

  const totalGst = store?.gst_enabled
    ? cart.reduce((sum, c) => {
        const lineTotal = c.price * c.quantity - c.discount
        if (gstInclusive && c.gst_rate > 0) {
          // Tax already included: tax = lineTotal - lineTotal / (1 + rate/100)
          return sum + (lineTotal - lineTotal / (1 + c.gst_rate / 100))
        }
        return sum + (lineTotal * c.gst_rate) / 100
      }, 0)
    : 0

  const cgst = totalGst / 2
  const sgst = totalGst / 2

  const baseForDiscount = gstInclusive
    ? cart.reduce((sum, c) => sum + c.price * c.quantity - c.discount, 0)
    : subtotal + totalGst

  const actualDiscount = discountType === 'percent'
    ? baseForDiscount * overallDiscount / 100
    : overallDiscount

  const grandTotal = Math.max(0, baseForDiscount - actualDiscount)

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return
    setCheckingOut(true)
    try {
      const payload = {
        items: cart.map((c) => ({
          product_id: c.product_id,
          quantity: c.quantity,
          discount: c.discount,
          gst_rate: c.gst_rate,
        })),
        payment_method: paymentMethod,
        discount_amount: overallDiscount,
        discount_type: discountType,
        discount_reason: discountReason,
        customer_name: customerName,
        customer_email: customerEmail,
        notes: '',
        terminal: activeTerminal?.id || null,
      }
      const res = await api.post('sales/sales/checkout/', payload)
      const d = res.data
      const saleId = d.id || d.sale_id || null
      setLastSaleId(saleId)
      setSuccessData({
        receipt_number: d.receipt_number,
        total: parseFloat(d.total_amount) || grandTotal,
        payment_method: paymentMethod,
        discount_amount: parseFloat(d.discount_amount) || overallDiscount,
        tax_amount: parseFloat(d.tax_amount) || totalGst,
        items: (d.items || []).map((item: Record<string, unknown>) => ({
          product_name: item.product_name as string,
          quantity: Number(item.quantity),
          unit_price: parseFloat(item.unit_price as string) || 0,
          discount: parseFloat(item.discount as string) || 0,
          tax_amount: parseFloat(item.tax_amount as string) || 0,
          gst_rate: parseFloat(item.gst_rate as string) || 0,
          subtotal: parseFloat(item.subtotal as string) || 0,
        })),
      })
      // UPI payment flow: generate QR instead of showing success dialog
      if (paymentMethod === 'mobile' && store?.upi_id) {
        try {
          const upiRes = await api.post('sales/sales/generate_upi_qr/', {
            amount: grandTotal,
            receipt_number: d.receipt_number,
            sale_id: saleId,
          })
          setUpiData(upiRes.data)
          setUpiStatus('pending')
          setUpiDialog(true)
          // Store success data for later, don't show success dialog yet
          pendingSuccessRef.current = {
            receipt_number: d.receipt_number,
            total: parseFloat(d.total_amount) || grandTotal,
            payment_method: paymentMethod,
            discount_amount: parseFloat(d.discount_amount) || overallDiscount,
            tax_amount: parseFloat(d.tax_amount) || totalGst,
            items: (d.items || []).map((item: Record<string, unknown>) => ({
              product_name: item.product_name as string,
              quantity: Number(item.quantity),
              unit_price: parseFloat(item.unit_price as string) || 0,
              discount: parseFloat(item.discount as string) || 0,
              tax_amount: parseFloat(item.tax_amount as string) || 0,
              gst_rate: parseFloat(item.gst_rate as string) || 0,
              subtotal: parseFloat(item.subtotal as string) || 0,
            })),
          }
          setSuccessData(null)
          return
        } catch {
          toast({ title: 'UPI QR generation failed', description: 'Showing receipt instead.', variant: 'destructive' })
        }
      }

      // Auto-print if enabled
      if (saleId && store?.printer_auto_print && store?.printer_type !== 'none') {
        try {
          const printRes = await api.get(`sales/sales/${saleId}/print_receipt/`)
          if (store.printer_type === 'test') {
            setReceiptPreview(printRes.data.receipt_text || '')
          } else if (printRes.data.printed) {
            toast({ title: 'Receipt printed automatically' })
          } else if (printRes.data.printer_error) {
            toast({ title: 'Auto-print failed', description: printRes.data.printer_error, variant: 'destructive' })
          }
        } catch {
          // Silent fail for auto-print
        }
      }

      // Refresh terminal cash balance after checkout
      if (activeTerminal) {
        api.get(`accounts/terminals/${activeTerminal.id}/`).then(res => setActiveTerminal(res.data)).catch(() => {})
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Checkout failed'
          : 'Checkout failed'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setCheckingOut(false)
    }
  }

  const handleNewSale = () => {
    setSuccessData(null)
    clearCart()
  }

  // Store success data for after UPI confirmation
  const pendingSuccessRef = useRef<typeof successData>(null)

  // UPI: restore success dialog after confirmation
  const handleUpiSuccess = () => {
    setUpiDialog(false)
    setUpiData(null)
    if (pendingSuccessRef.current) {
      setSuccessData(pendingSuccessRef.current)
      pendingSuccessRef.current = null
    }
  }

  // UPI: manual confirm
  const handleUpiConfirm = async () => {
    if (!upiData) return
    setUpiConfirming(true)
    try {
      await api.post('sales/sales/confirm_upi/', { transaction_ref: upiData.transaction_ref })
      setUpiStatus('confirmed')
      handleUpiSuccess()
      toast({ title: 'Payment confirmed' })
    } catch {
      toast({ title: 'Confirmation failed', variant: 'destructive' })
    } finally {
      setUpiConfirming(false)
    }
  }

  // UPI: cancel
  const handleUpiCancel = () => {
    setUpiDialog(false)
    setUpiData(null)
    setUpiStatus('pending')
    pendingSuccessRef.current = null
    // Show success dialog anyway (sale already recorded)
    // User can handle payment offline
  }

  // UPI: generate new QR
  const handleUpiRetry = async () => {
    if (!lastSaleId) return
    try {
      const upiRes = await api.post('sales/sales/generate_upi_qr/', {
        amount: grandTotal,
        receipt_number: '',
        sale_id: lastSaleId,
      })
      setUpiData(upiRes.data)
      setUpiStatus('pending')
    } catch {
      toast({ title: 'Failed to generate new QR', variant: 'destructive' })
    }
  }

  // UPI: countdown timer
  useEffect(() => {
    if (!upiDialog || !upiData?.expires_at) return
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((new Date(upiData.expires_at).getTime() - Date.now()) / 1000))
      setUpiTimeLeft(remaining)
      if (remaining <= 0) {
        setUpiStatus('expired')
      }
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [upiDialog, upiData?.expires_at])

  // UPI: auto-poll for oneupi mode
  useEffect(() => {
    if (!upiDialog || !upiData || upiData.verification_mode !== 'oneupi' || upiStatus !== 'pending') return
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`sales/sales/check_upi_status/?transaction_ref=${upiData.transaction_ref}`)
        const status = res.data.status
        if (status === 'confirmed') {
          setUpiStatus('confirmed')
          handleUpiSuccess()
          toast({ title: 'Payment received!' })
        } else if (status === 'failed' || status === 'expired') {
          setUpiStatus(status)
        }
      } catch {
        // silent
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [upiDialog, upiData, upiStatus])

  const handlePrint = useReactToPrint({ contentRef: receiptRef })

  const handleDemandSubmit = async () => {
    if (!demandForm.query.trim()) return
    setDemandSubmitting(true)
    try {
      await api.post('demand/requests/', {
        query: demandForm.query,
        notes: demandForm.notes,
        customer_name: demandForm.customer_name || '',
        customer_phone: demandForm.customer_phone || '',
        customer_email: demandForm.customer_email || '',
        notify_customer: demandForm.notify_customer,
      })
      toast({ title: 'Request logged', description: `"${demandForm.query}" has been recorded.` })
      setDemandOpen(false)
      setDemandForm({
        query: '', notes: '',
        customer_name: '', customer_phone: '', customer_email: '', notify_customer: false,
      })
      setDemandCustomerExpanded(false)
    } catch {
      toast({ title: 'Error', description: 'Failed to log request.', variant: 'destructive' })
    } finally {
      setDemandSubmitting(false)
    }
  }

  const formatPrice = (amount: number) => `${currency}${Number(amount).toFixed(2)}`

  // Barcode scan handler
  const handleBarcodeScan = useCallback(async (barcode: string) => {
    try {
      const res = await api.get('products/products/?search=' + encodeURIComponent(barcode))
      const data: Product[] = Array.isArray(res.data) ? res.data : res.data.results || []
      const match = data.find((p) => p.barcode === barcode)
      if (match) {
        addToCart(match)
        setScanFlash(true)
        setTimeout(() => setScanFlash(false), 500)
        toast({ title: `✓ ${match.name} added` })
      } else {
        toast({ title: `Product not found: ${barcode}`, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Barcode lookup failed', variant: 'destructive' })
    }
  }, [toast])

  useBarcodeScan({
    onScan: (barcode) => handleBarcodeScan(barcode),
    enabled: !successData && !demandOpen && !simulateScanOpen && !cameraOpen,
  })

  // Camera scanner lifecycle
  useEffect(() => {
    if (!cameraOpen) return
    let cancelled = false
    const timer = setTimeout(() => {
      if (cancelled) return
      const scanner = new Html5Qrcode('camera-reader')
      scannerRef.current = scanner
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          handleBarcodeScan(decodedText)
          scanner.stop().catch(() => {})
          setCameraOpen(false)
        },
        () => {} // ignore scan errors
      ).catch(() => {
        toast({ title: 'Could not access camera', variant: 'destructive' })
        setCameraOpen(false)
      })
    }, 300) // delay to let dialog render the div
    return () => {
      cancelled = true
      clearTimeout(timer)
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [cameraOpen, handleBarcodeScan, toast])

  // POS keyboard shortcuts
  useHotkeys({
    'f2': () => searchInputRef.current?.focus(),
    'f3': () => discountInputRef.current?.focus(),
    'f4': () => clearCart(),
    'f9': () => { if (store?.payment_cash !== false) setPaymentMethod('cash') },
    'f10': () => { if (store?.payment_card) setPaymentMethod('card') },
    'f11': () => { if (store?.payment_mobile) setPaymentMethod('mobile') },
    'f12': () => { if (cart.length > 0 && !checkingOut) handleCheckout() },
    'escape': () => { if (successData) handleNewSale(); if (demandOpen) setDemandOpen(false) },
  }, [cart, checkingOut, successData, demandOpen, paymentMethod])

  // Terminal loading spinner
  if (terminalLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40 mb-4" />
        <p className="text-[14px] text-muted-foreground">Loading terminal...</p>
      </div>
    )
  }

  // Terminal selection screen
  if (showTerminalSelect && !activeTerminal) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' as const }}
        className="flex flex-col items-center justify-center h-[calc(100vh-100px)] px-4"
      >
        <div className="w-full max-w-3xl">
          <div className="text-center mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 mx-auto mb-4">
              <Monitor className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <h1 className="font-display text-[22px] font-bold text-foreground tracking-tight mb-1">
              Select Your Terminal
            </h1>
            <p className="text-[13px] text-muted-foreground">
              Choose an available terminal to start your session
            </p>
          </div>

          {terminals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[14px] text-muted-foreground">No terminals configured.</p>
              <p className="text-[12px] text-muted-foreground/70 mt-1">Ask your manager to set up terminals.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {terminals.map((t) => {
                const isOccupied = t.current_cashier !== null
                return (
                  <motion.button
                    key={t.id}
                    whileTap={!isOccupied ? { scale: 0.97 } : undefined}
                    onClick={() => {
                      if (!isOccupied) {
                        setOpeningTerminalId(t.id)
                        setOpeningBalance('')
                      }
                    }}
                    disabled={isOccupied}
                    className={`relative flex flex-col items-center rounded-xl border p-6 text-center transition-all ${
                      isOccupied
                        ? 'border-border/40 bg-muted/20 opacity-60 cursor-not-allowed'
                        : 'border-border/60 bg-card hover:border-foreground/20 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl mb-3 ${
                      isOccupied ? 'bg-green-500/10' : 'bg-muted/60'
                    }`}>
                      <Monitor className={`h-6 w-6 ${isOccupied ? 'text-green-500' : 'text-muted-foreground/60'}`} />
                    </div>
                    <p className="text-[14px] font-semibold text-foreground mb-1">{t.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${isOccupied ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-[12px] text-muted-foreground">
                        {isOccupied ? 'Active' : 'Idle'}
                      </span>
                    </div>
                    {isOccupied && t.current_cashier_name && (
                      <p className="text-[11px] text-muted-foreground/70 mt-1">({t.current_cashier_name})</p>
                    )}
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>

        {/* Opening balance dialog */}
        <Dialog open={openingTerminalId !== null} onOpenChange={(open) => { if (!open) setOpeningTerminalId(null) }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Start Session</DialogTitle>
              <DialogDescription>
                Enter the opening cash balance for {terminals.find(t => t.id === openingTerminalId)?.name || 'this terminal'}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label className="text-[13px]">Opening Balance ({currency})</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-10"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleOpenSession() }}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpeningTerminalId(null)}>Cancel</Button>
              <Button
                onClick={handleOpenSession}
                className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white"
              >
                Start Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={container}
      initial="initial"
      animate="animate"
      className="w-full"
    >
      {/* Title hidden — terminal bar provides context. Maximizes selling space. */}

      {/* Terminal header bar */}
      {activeTerminal && (
        <motion.div
          variants={item}
          className="mb-3 flex h-11 items-center justify-between rounded-xl bg-[hsl(var(--primary)/0.06)] border border-[hsl(var(--primary)/0.12)] px-5"
        >
          <div className="flex items-center gap-5 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--color-success))] opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--color-success))]" />
              </span>
              <span className="font-semibold text-foreground">{activeTerminal.name}</span>
              {activeTerminal.device_id && (
                <span className="text-[10px] text-muted-foreground/50 font-mono">{activeTerminal.device_id}</span>
              )}
            </div>
            <div className="h-4 w-px bg-border/40" />
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Banknote className="h-3.5 w-3.5" />
              <span className="font-medium">{currency}{parseFloat(activeTerminal.cash_balance || '0').toFixed(2)}</span>
            </div>
            <div className="h-4 w-px bg-border/40" />
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{sessionDuration || '0m'}</span>
            </div>
          </div>
          <button
            onClick={handleOpenCloseDialog}
            className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/80 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-all"
          >
            <LogOut className="h-3 w-3" />
            Close Terminal
          </button>
        </motion.div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr,400px] h-[calc(100vh-120px)]">
        {/* LEFT PANEL — Product Browser */}
        <motion.div
          variants={item}
          className="rounded-xl border border-border/60 bg-card flex flex-col overflow-hidden"
        >
          {/* Search toolbar */}
          <div className="border-b border-border/60 px-3 py-2.5">
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={t('pages.sales.searchPlaceholder')}
                  className="h-10 w-full rounded-lg border border-border/60 bg-background pl-9 pr-3 text-[14px] text-foreground outline-none transition-all placeholder:text-muted-foreground/40 focus:border-[hsl(var(--primary)/0.4)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.08)]"
                />
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-muted-foreground/30 bg-muted/40 px-1.5 py-0.5 rounded hidden sm:inline">F2</kbd>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setSimulateScanOpen(true)}
                  title="Simulate barcode scan"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-background text-muted-foreground/60 hover:text-[hsl(var(--primary))] hover:border-[hsl(var(--primary)/0.3)] hover:bg-[hsl(var(--primary)/0.04)] transition-all"
                >
                  <ScanBarcode className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCameraOpen(true)}
                  title="Scan barcode with camera"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-background text-muted-foreground/60 hover:text-[hsl(var(--primary))] hover:border-[hsl(var(--primary)/0.3)] hover:bg-[hsl(var(--primary)/0.04)] transition-all"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDemandOpen(true)}
                  title="Log a customer request"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-background text-muted-foreground/60 hover:text-foreground hover:border-foreground/20 transition-all"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Demand request dialog */}
          <Dialog open={demandOpen} onOpenChange={setDemandOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Customer Request</DialogTitle>
                <DialogDescription>Record what the customer asked for.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid gap-2">
                  <Label className="text-[13px]">What did the customer ask for?</Label>
                  <Input
                    className="h-10"
                    placeholder="e.g. Almond Milk Latte..."
                    value={demandForm.query}
                    onChange={(e) => setDemandForm((p) => ({ ...p, query: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[13px]">Notes (optional)</Label>
                  <textarea
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Any additional context..."
                    value={demandForm.notes}
                    onChange={(e) => setDemandForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>

                <Separator />

                {/* Collapsible customer details */}
                <button
                  type="button"
                  onClick={() => setDemandCustomerExpanded((p) => !p)}
                  className="flex w-full items-center justify-between text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Customer Details (optional)</span>
                  <motion.span
                    animate={{ rotate: demandCustomerExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' as const }}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.span>
                </button>

                <AnimatePresence>
                  {demandCustomerExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto' as const, opacity: 1, transition: { duration: 0.25, ease: 'easeOut' as const } }}
                      exit={{ height: 0, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' as const } }}
                      className="overflow-hidden space-y-4"
                    >
                      <div className="grid gap-2">
                        <Label className="text-[13px]">Customer Name</Label>
                        <Input
                          className="h-10"
                          placeholder="John Doe"
                          value={demandForm.customer_name}
                          onChange={(e) => setDemandForm((p) => ({ ...p, customer_name: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label className="text-[13px]">Phone</Label>
                          <Input
                            className="h-10"
                            placeholder="+91 98765 43210"
                            value={demandForm.customer_phone}
                            onChange={(e) => setDemandForm((p) => ({ ...p, customer_phone: e.target.value }))}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-[13px]">Email</Label>
                          <Input
                            type="email"
                            className="h-10"
                            placeholder="customer@email.com"
                            value={demandForm.customer_email}
                            onChange={(e) => setDemandForm((p) => ({ ...p, customer_email: e.target.value }))}
                          />
                        </div>
                      </div>
                      {demandForm.customer_email.trim() && (
                        <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
                          <div>
                            <p className="text-[12px] font-medium text-foreground">Notify when available</p>
                            <p className="text-[10px] text-muted-foreground">Email when product arrives</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDemandForm((p) => ({ ...p, notify_customer: !p.notify_customer }))}
                            className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${demandForm.notify_customer ? 'bg-[hsl(var(--primary))]' : 'bg-muted'}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${demandForm.notify_customer ? 'translate-x-4' : ''}`} />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDemandOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleDemandSubmit}
                  disabled={demandSubmitting || !demandForm.query.trim()}
                  className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white"
                >
                  {demandSubmitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Log Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Category pills */}
          <div className="border-b border-border/60 px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => handleCategoryFilter(null)}
              className={`shrink-0 rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
                activeCategory === null
                  ? 'bg-[hsl(var(--primary))] text-white shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryFilter(cat.id)}
                className={`shrink-0 rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
                  activeCategory === cat.id
                    ? 'bg-[hsl(var(--primary))] text-white shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {cat.name}
              </button>
            ))}
            <span className="shrink-0 text-[11px] text-muted-foreground/40 pl-2">
              {products.length} items
            </span>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 px-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 mb-5">
                  <ShoppingCart className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-[15px] font-medium text-foreground/70 mb-1">
                  {t('pages.sales.readyToSell')}
                </p>
                <p className="text-[13px] text-muted-foreground text-center max-w-xs">
                  {t('pages.sales.readyToSellDesc')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {products.map((product) => {
                  const price =
                    typeof product.price === 'string'
                      ? parseFloat(product.price)
                      : product.price
                  const inCart = cart.find((c) => c.product_id === product.id)
                  const stock = product.current_stock
                  const outOfStock = stock !== undefined && stock <= 0
                  const lowStock = stock !== undefined && stock > 0 && stock <= 5
                  const cartQty = inCart?.quantity ?? 0
                  const wouldExceed = stock !== undefined && cartQty >= stock
                  return (
                    <motion.button
                      key={product.id}
                      whileTap={outOfStock || wouldExceed ? undefined : { scale: 0.96 }}
                      onClick={() => {
                        if (outOfStock) return
                        if (wouldExceed) {
                          toast({ title: `Only ${stock} in stock`, variant: 'destructive' })
                          return
                        }
                        addToCart(product)
                      }}
                      className={`relative flex flex-col rounded-xl border-2 transition-all text-left group active:scale-[0.97] ${
                        outOfStock
                          ? 'border-transparent bg-muted/30 opacity-50 cursor-not-allowed'
                          : inCart
                            ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.04)] shadow-[0_0_0_1px_hsl(var(--primary)/0.1)]'
                            : 'border-transparent bg-background hover:border-border hover:shadow-md'
                      }`}
                      style={{ boxShadow: inCart || outOfStock ? undefined : '0 1px 3px hsl(var(--foreground) / 0.04)' }}
                    >
                      {/* Product image */}
                      <div className="relative aspect-square w-full rounded-t-[10px] overflow-hidden bg-muted/30 flex items-center justify-center">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Package className="h-8 w-8 text-muted-foreground/20" />
                          </div>
                        )}
                        {inCart && (
                          <div className="absolute top-1.5 right-1.5 bg-[hsl(var(--primary))] text-white text-[11px] font-bold rounded-full h-6 min-w-[24px] px-1 flex items-center justify-center shadow-lg">
                            {inCart.quantity}
                          </div>
                        )}
                        {outOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                            <span className="text-[11px] font-bold text-red-500 bg-background/90 rounded-full px-2.5 py-1">Out of Stock</span>
                          </div>
                        )}
                        {store?.gst_enabled && product.gst_rate && (
                          <div className="absolute bottom-1.5 left-1.5 bg-background/90 backdrop-blur-sm text-[9px] font-semibold text-muted-foreground rounded px-1.5 py-0.5">
                            GST {product.gst_rate}%
                          </div>
                        )}
                      </div>
                      {/* Product info */}
                      <div className="p-2.5">
                        <span className="text-[12px] font-medium text-foreground leading-tight line-clamp-1 block">
                          {product.name}
                        </span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[16px] font-bold text-foreground">
                            {formatPrice(price)}
                          </span>
                          {stock !== undefined && !outOfStock && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              lowStock
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {stock}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* RIGHT PANEL — Cart & Checkout */}
        <motion.div
          variants={item}
          className="rounded-xl border border-border/60 bg-card flex flex-col overflow-hidden"
        >
          {/* Cart header */}
          <div className={`border-b border-border/60 px-4 py-2.5 flex items-center justify-between transition-colors duration-500 ${scanFlash ? 'bg-[hsl(var(--color-success)/0.1)]' : ''}`}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.08)]">
                <Receipt className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <span className="text-[13px] font-semibold text-foreground block leading-tight">
                  {t('pages.sales.currentSale')}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {cart.reduce((s, c) => s + c.quantity, 0)} {t('pages.sales.items')}
                </span>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                title="Clear cart (F4)"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
              >
                <Trash2 className="h-3 w-3" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 px-6">
                <p className="text-[13px] text-muted-foreground text-center">
                  {t('pages.sales.cartEmpty')}
                </p>
              </div>
            ) : (
              <div className="p-3 space-y-0">
                <AnimatePresence initial={false}>
                  {cart.map((cartItem) => (
                    <motion.div
                      key={cartItem.product_id}
                      variants={cartItemVariant}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      layout
                      className="border-b border-border/40 last:border-0 py-3 px-1"
                    >
                      <div className="flex items-start gap-3">
                        {/* Thumbnail */}
                        <div className="h-10 w-10 rounded-lg bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
                          {cartItem.image ? (
                            <img
                              src={cartItem.image}
                              alt={cartItem.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                          )}
                        </div>
                        {/* Name & price */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-foreground leading-tight truncate">
                            {cartItem.name}
                          </p>
                          <p className="text-[12px] text-muted-foreground mt-0.5">
                            {formatPrice(cartItem.price)} each
                          </p>
                          {store?.gst_enabled && cartItem.gst_rate > 0 && (
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                              {gstInclusive
                                ? `incl. ${formatPrice((cartItem.price * cartItem.quantity - cartItem.discount) - (cartItem.price * cartItem.quantity - cartItem.discount) / (1 + cartItem.gst_rate / 100))} GST`
                                : `+ ${formatPrice((cartItem.price * cartItem.quantity - cartItem.discount) * cartItem.gst_rate / 100)} GST`
                              }
                            </p>
                          )}
                        </div>
                        {/* Line total & remove */}
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <span className="text-[13px] font-semibold text-foreground">
                            {formatPrice(
                              cartItem.price * cartItem.quantity - cartItem.discount
                            )}
                          </span>
                          <button
                            onClick={() => removeFromCart(cartItem.product_id)}
                            className="text-muted-foreground/40 hover:text-destructive transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {/* Quantity controls & discount */}
                      <div className="flex items-center gap-3 mt-2 ml-[52px]">
                        <div className="flex items-center rounded-lg border border-border/60 overflow-hidden">
                          <button
                            onClick={() =>
                              updateQuantity(cartItem.product_id, -1)
                            }
                            className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="h-7 w-8 flex items-center justify-center text-[13px] font-medium text-foreground border-x border-border/60 bg-background">
                            {cartItem.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(cartItem.product_id, 1)
                            }
                            className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground">Disc:</span>
                          <input
                            type="number"
                            min="0"
                            value={cartItem.discount || ''}
                            onChange={(e) =>
                              updateItemDiscount(
                                cartItem.product_id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            className="h-7 w-16 rounded border border-border/60 bg-background px-2 text-[12px] text-foreground outline-none focus:border-foreground/20"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Cart footer — receipt style */}
          <div className="border-t-2 border-border/60 bg-[hsl(var(--color-surface-raised))]">
            {/* Totals section */}
            <div className="px-4 pt-3 pb-2 space-y-1.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">{t('pages.sales.subtotal')}</span>
                <span className="text-foreground font-medium tabular-nums">{formatPrice(subtotal)}</span>
              </div>

              {store?.gst_enabled && totalGst > 0 && (
                <>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground">CGST</span>
                    <span className="text-foreground font-medium tabular-nums">{formatPrice(cgst)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground">SGST</span>
                    <span className="text-foreground font-medium tabular-nums">{formatPrice(sgst)}</span>
                  </div>
                </>
              )}

              {store?.discount_enabled !== false && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{t('pages.sales.discount', 'Discount')}</span>
                      <kbd className="text-[8px] font-mono text-muted-foreground/40">F3</kbd>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="flex rounded-md border border-border/50 overflow-hidden">
                        <button
                          onClick={() => setDiscountType('flat')}
                          className={`px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                            discountType === 'flat'
                              ? 'bg-[hsl(var(--primary))] text-white'
                              : 'bg-background text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          {currency}
                        </button>
                        <button
                          onClick={() => setDiscountType('percent')}
                          className={`px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                            discountType === 'percent'
                              ? 'bg-[hsl(var(--primary))] text-white'
                              : 'bg-background text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          <Percent className="h-3 w-3" />
                        </button>
                      </div>
                      <input
                        ref={discountInputRef}
                        type="number"
                        min="0"
                        max={discountType === 'percent' ? 100 : undefined}
                        value={overallDiscount || ''}
                        onChange={(e) => {
                          let val = parseFloat(e.target.value) || 0
                          if (discountType === 'percent') val = Math.min(100, val)
                          const userRole = user?.role || 'cashier'
                          if (store && discountType === 'percent' && (userRole === 'cashier' || userRole === 'manager')) {
                            const maxPct = userRole === 'cashier'
                              ? parseFloat(String(store.discount_max_percent_cashier))
                              : parseFloat(String(store.discount_max_percent_manager))
                            if (val > maxPct) {
                              toast({ title: `Max discount for ${userRole}: ${maxPct}%`, variant: 'destructive' })
                              val = maxPct
                            }
                          }
                          if (store && discountType === 'flat' && baseForDiscount > 0 && (userRole === 'cashier' || userRole === 'manager')) {
                            const pct = (val / baseForDiscount) * 100
                            const maxPct = userRole === 'cashier'
                              ? parseFloat(String(store.discount_max_percent_cashier))
                              : parseFloat(String(store.discount_max_percent_manager))
                            if (pct > maxPct) {
                              toast({ title: `Max discount for ${userRole}: ${maxPct}%`, variant: 'destructive' })
                              val = baseForDiscount * maxPct / 100
                            }
                          }
                          setOverallDiscount(val)
                        }}
                        placeholder="0"
                        className="h-6 w-16 rounded border border-border/50 bg-background px-1.5 text-[12px] text-foreground text-right outline-none focus:border-[hsl(var(--primary)/0.4)] tabular-nums"
                      />
                    </div>
                  </div>

                  {discountType === 'percent' && (
                    <div className="flex items-center gap-1 justify-end">
                      {[5, 10, 15, 20].map((pct) => {
                        const userRole = user?.role || 'cashier'
                        const maxPct = (userRole === 'cashier' || userRole === 'manager') && store
                          ? parseFloat(String(userRole === 'cashier' ? store.discount_max_percent_cashier : store.discount_max_percent_manager))
                          : 100
                        const disabled = pct > maxPct
                        return (
                          <button
                            key={pct}
                            disabled={disabled}
                            onClick={() => setOverallDiscount(pct)}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                              overallDiscount === pct
                                ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
                                : disabled
                                  ? 'border-border/30 text-muted-foreground/30 cursor-not-allowed'
                                  : 'border-border/50 text-muted-foreground hover:border-border hover:bg-muted/30'
                            }`}
                          >
                            {pct}%
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {store?.discount_require_reason && overallDiscount > 0 && (
                    <input
                      type="text"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      placeholder={t('pages.sales.discountReasonPlaceholder', 'Reason for discount...')}
                      className="h-6 w-full rounded border border-border/50 bg-background px-2 text-[11px] text-foreground outline-none focus:border-[hsl(var(--primary)/0.4)]"
                    />
                  )}

                  {actualDiscount > 0 && discountType === 'percent' && (
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
                      <span>{overallDiscount}% off</span>
                      <span>-{formatPrice(actualDiscount)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="h-px bg-border/80 my-1" />

              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-foreground">{t('pages.sales.total')}</span>
                <span className="font-display text-2xl font-bold text-foreground tabular-nums">
                  {formatPrice(grandTotal)}
                </span>
              </div>
            </div>

            {/* Customer Details (optional) */}
            <div className="px-3 pb-2">
              <div className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('pos-customer-section')
                    if (el) el.classList.toggle('hidden')
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    customerEmail ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-muted/60'
                  }`}>
                    {customerEmail ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-foreground">
                      {customerName || t('pages.sales.customerName', 'Customer Details')}
                      <span className="ml-1.5 text-[10px] font-normal text-muted-foreground/70">({t('common.optional', 'optional')})</span>
                    </p>
                    {customerEmail ? (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 truncate">
                        <Mail className="h-2.5 w-2.5 shrink-0" />
                        Receipt will be emailed to {customerEmail}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/60">
                        Add email to send receipt automatically
                      </p>
                    )}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
                <div id="pos-customer-section" className={customerName || customerEmail ? '' : 'hidden'}>
                  <div className="px-3 pb-3 space-y-1.5 border-t border-border/30 pt-2">
                    <div className="relative">
                      <User className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder={t('pages.sales.customerName', 'Customer name')}
                        className="h-8 w-full rounded-md border border-border/50 bg-background pl-7 pr-2 text-[12px] text-foreground outline-none focus:border-[hsl(var(--primary)/0.5)] focus:ring-1 focus:ring-[hsl(var(--primary)/0.2)] transition-all"
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder={t('pages.sales.customerEmail', 'customer@email.com')}
                        className="h-8 w-full rounded-md border border-border/50 bg-background pl-7 pr-2 text-[12px] text-foreground outline-none focus:border-[hsl(var(--primary)/0.5)] focus:ring-1 focus:ring-[hsl(var(--primary)/0.2)] transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment + Charge */}
            <div className="px-3 pb-3 space-y-2">
              {/* Payment method */}
              <div className={`grid gap-1.5 ${
                [store?.payment_cash !== false, store?.payment_card, store?.payment_mobile].filter(Boolean).length === 2
                  ? 'grid-cols-2'
                  : [store?.payment_cash !== false, store?.payment_card, store?.payment_mobile].filter(Boolean).length === 1
                    ? 'grid-cols-1'
                    : 'grid-cols-3'
              }`}>
                {(
                  [
                    { key: 'cash' as const, icon: Banknote, label: 'Cash', hint: 'F9', enabled: store?.payment_cash !== false },
                    { key: 'card' as const, icon: CreditCard, label: 'Card', hint: 'F10', enabled: !!store?.payment_card },
                    { key: 'mobile' as const, icon: Smartphone, label: 'UPI', hint: 'F11', enabled: !!store?.payment_mobile },
                  ] as const
                ).filter(m => m.enabled).map(({ key, icon: Icon, label, hint }) => (
                  <button
                    key={key}
                    onClick={() => setPaymentMethod(key)}
                    className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 py-2.5 text-[12px] font-semibold transition-all ${
                      paymentMethod === key
                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]'
                        : 'border-border/40 text-muted-foreground hover:border-border hover:bg-muted/30'
                    }`}
                  >
                    <Icon className="h-4 w-4 mb-0.5" />
                    <span>{label}</span>
                    <kbd className="text-[8px] font-mono opacity-40">{hint}</kbd>
                  </button>
                ))}
              </div>

              {/* CHARGE BUTTON — the hero */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={cart.length === 0 || checkingOut}
                onClick={handleCheckout}
                className={`relative flex h-14 w-full items-center justify-center gap-2.5 rounded-xl text-[17px] font-bold text-white transition-all ${
                  cart.length > 0 && !checkingOut
                    ? 'bg-[hsl(var(--primary))] shadow-[0_4px_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_6px_28px_hsl(var(--primary)/0.4)]'
                    : 'bg-[hsl(var(--primary))] opacity-25'
                }`}
              >
                {checkingOut ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {t('pages.sales.charge')} {formatPrice(grandTotal)}
                    <kbd className="absolute right-3 text-[10px] font-mono opacity-40 bg-white/10 px-2 py-0.5 rounded-md">F12</kbd>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Success Dialog */}
      <Dialog
        open={!!successData}
        onOpenChange={(open) => {
          if (!open) handleNewSale()
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Sale Complete
            </DialogTitle>
            <DialogDescription className="text-center">
              {customerEmail
                ? `Receipt emailed to ${customerEmail}`
                : 'Transaction processed successfully'}
            </DialogDescription>
          </DialogHeader>
          {successData && (
            <div className="space-y-4 py-4">
              {/* Receipt number large */}
              <div className="text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Receipt</p>
                <p className="font-mono text-xl font-bold text-foreground">{successData.receipt_number}</p>
              </div>

              <div className="rounded-xl bg-muted/40 p-4 space-y-3">
                {/* Itemized list */}
                <div className="space-y-1.5">
                  {successData.items.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between text-[12px]">
                      <div className="flex-1 min-w-0">
                        <span className="text-foreground">{item.product_name}</span>
                        <span className="text-muted-foreground ml-1">x{item.quantity}</span>
                        <span className="text-muted-foreground ml-1">@ {formatPrice(item.unit_price)}</span>
                      </div>
                      <span className="text-foreground font-medium shrink-0 ml-2">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-border/60" />

                {/* Subtotal */}
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground font-medium">
                    {formatPrice(successData.items.reduce((s, i) => s + i.subtotal, 0))}
                  </span>
                </div>

                {/* CGST / SGST */}
                {store?.gst_enabled && successData.tax_amount > 0 && (
                  <>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-muted-foreground">CGST</span>
                      <span className="text-foreground font-medium">
                        {formatPrice(successData.tax_amount / 2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-muted-foreground">SGST</span>
                      <span className="text-foreground font-medium">
                        {formatPrice(successData.tax_amount / 2)}
                      </span>
                    </div>
                  </>
                )}

                {/* Discount */}
                {successData.discount_amount > 0 && (
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {discountType === 'percent' ? `Discount (${overallDiscount}%)` : 'Discount'}
                      </span>
                      <span className="text-foreground font-medium">
                        -{formatPrice(successData.discount_amount)}
                      </span>
                    </div>
                    {discountReason && (
                      <div className="text-[11px] text-muted-foreground/70 pl-4">
                        {discountReason}
                      </div>
                    )}
                  </div>
                )}

                <div className="h-px bg-border/60" />

                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-foreground">
                    Total Paid
                  </span>
                  <span className="font-display text-2xl font-bold text-foreground">
                    {formatPrice(successData.total)}
                  </span>
                </div>

                {/* Payment method badge */}
                <div className="flex items-center justify-center">
                  <Badge variant="secondary" className="capitalize text-[11px] font-medium gap-1.5">
                    {successData.payment_method === 'cash' && <Banknote className="h-3 w-3" />}
                    {successData.payment_method === 'card' && <CreditCard className="h-3 w-3" />}
                    {successData.payment_method === 'mobile' && <Smartphone className="h-3 w-3" />}
                    {successData.payment_method}
                  </Badge>
                </div>
              </div>

              {/* Hidden printable receipt */}
              <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                <PrintableReceipt
                  ref={receiptRef}
                  receiptNumber={successData.receipt_number}
                  items={successData.items}
                  subtotal={successData.items.reduce((s, i) => s + i.subtotal, 0)}
                  taxAmount={successData.tax_amount}
                  discountAmount={successData.discount_amount}
                  discountType={discountType}
                  discountReason={discountReason}
                  total={successData.total}
                  paymentMethod={successData.payment_method}
                  store={store}
                  date={new Date().toISOString()}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!lastSaleId || store?.printer_type === 'none' || !store?.printer_type) {
                      handlePrint()
                      return
                    }
                    try {
                      const res = await api.get(`sales/sales/${lastSaleId}/print_receipt/`)
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
                  }}
                  className="flex-1 text-[13px] gap-1.5"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  Print Receipt
                </Button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNewSale}
                  className="flex-1 flex h-10 items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] text-[13px] font-medium text-white transition-opacity"
                >
                  <Plus className="h-4 w-4" />
                  New Sale
                </motion.button>
              </div>
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

      {/* Simulate Barcode Scan Dialog */}
      <Dialog open={simulateScanOpen} onOpenChange={setSimulateScanOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5" />
              Simulate Barcode Scan
            </DialogTitle>
            <DialogDescription>Enter a barcode to simulate a hardware scan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-2">
              <Label className="text-[13px]">Barcode</Label>
              <Input
                className="h-10 font-mono"
                placeholder="Enter barcode..."
                value={simulateBarcode}
                onChange={(e) => setSimulateBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && simulateBarcode.trim()) {
                    handleBarcodeScan(simulateBarcode.trim())
                    setSimulateScanOpen(false)
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSimulateScanOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (simulateBarcode.trim()) {
                  handleBarcodeScan(simulateBarcode.trim())
                  setSimulateScanOpen(false)
                }
              }}
              className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white gap-1.5"
            >
              <ScanBarcode className="h-3.5 w-3.5" />
              Scan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Barcode Scan Dialog */}
      <Dialog open={cameraOpen} onOpenChange={(open) => {
        if (!open) {
          if (scannerRef.current) {
            scannerRef.current.stop().catch(() => {})
            scannerRef.current = null
          }
          setCameraOpen(false)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scan Barcode
            </DialogTitle>
            <DialogDescription>Point your camera at a barcode.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div id="camera-reader" className="w-full rounded-lg overflow-hidden" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCameraOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Terminal Dialog */}
      <Dialog open={closingDialog} onOpenChange={(open) => { if (!open && !closingResult) setClosingDialog(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              {closingResult ? 'Session Closed' : 'Close Terminal'}
            </DialogTitle>
            <DialogDescription>
              {closingResult ? 'Cash reconciliation summary' : `Close session for ${activeTerminal?.name || 'terminal'}`}
            </DialogDescription>
          </DialogHeader>

          {!closingResult ? (
            <div className="space-y-4 py-2">
              {/* Session summary */}
              {sessionSummary && (
                <div className="rounded-xl bg-muted/40 p-4 space-y-2">
                  <p className="text-[12px] font-semibold text-foreground mb-2">Session Summary</p>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sales</span>
                      <span className="font-medium text-foreground">{sessionSummary.sales_count ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Sales</span>
                      <span className="font-medium text-foreground">{currency}{parseFloat(sessionSummary.total_sales || '0').toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cash Sales</span>
                      <span className="font-medium text-foreground">{currency}{parseFloat(sessionSummary.cash_total || '0').toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Refunds</span>
                      <span className="font-medium text-foreground">{currency}{parseFloat(sessionSummary.refund_total || '0').toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="h-px bg-border/60 my-2" />
                  <div className="flex justify-between text-[12px]">
                    <span className="text-muted-foreground">Session Duration</span>
                    <span className="font-medium text-foreground">{sessionDuration || '0m'}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-muted-foreground">Opening Balance</span>
                    <span className="font-medium text-foreground">{currency}{parseFloat(activeTerminal?.opening_balance || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-muted-foreground">Expected Cash</span>
                    <span className="font-bold text-foreground">{currency}{parseFloat(activeTerminal?.cash_balance || '0').toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label className="text-[13px]">Closing Cash Count ({currency})</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-10"
                  placeholder="Count the cash in the drawer..."
                  value={closingCount}
                  onChange={(e) => setClosingCount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCloseSession() }}
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">Enter the actual amount of cash in the drawer.</p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setClosingDialog(false)}>Cancel</Button>
                <Button
                  onClick={handleCloseSession}
                  className="bg-destructive hover:bg-destructive/90 text-white"
                >
                  Close Session
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-muted/40 p-4 space-y-3">
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Expected Cash</span>
                  <span className="font-semibold text-foreground">{currency}{parseFloat(closingResult.expected_balance).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Counted Cash</span>
                  <span className="font-semibold text-foreground">{currency}{parseFloat(closingCount || '0').toFixed(2)}</span>
                </div>
                <div className="h-px bg-border/60" />
                <div className="flex justify-between text-[14px]">
                  <span className="font-semibold text-foreground">Discrepancy</span>
                  <span className={`font-bold ${parseFloat(closingResult.discrepancy) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {parseFloat(closingResult.discrepancy) === 0
                      ? 'None - Perfect!'
                      : `${currency}${parseFloat(closingResult.discrepancy).toFixed(2)}`
                    }
                  </span>
                </div>
              </div>

              {parseFloat(closingResult.discrepancy) === 0 ? (
                <div className="flex items-center gap-2 justify-center text-green-600 text-[13px]">
                  <CheckCircle2 className="h-4 w-4" />
                  Cash drawer balanced perfectly
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground text-center">
                  Please report this discrepancy to your manager.
                </p>
              )}

              <DialogFooter>
                <Button onClick={handleCloseDone} className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white">
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* UPI Payment Dialog */}
      <Dialog open={upiDialog} onOpenChange={(open) => { if (!open) handleUpiCancel() }}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-2">
            {/* Amount */}
            <p className="text-[13px] text-muted-foreground mb-1">Amount to Pay</p>
            <p className="font-display text-3xl font-bold text-foreground mb-4">
              {currency}{upiData ? parseFloat(upiData.amount).toFixed(2) : '0.00'}
            </p>

            {/* Timer badge */}
            {upiStatus === 'pending' && upiTimeLeft > 0 && (
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[12px] font-medium text-amber-600">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                {Math.floor(upiTimeLeft / 60)}:{String(upiTimeLeft % 60).padStart(2, '0')} remaining
              </div>
            )}

            {/* QR Code */}
            {upiData && upiStatus === 'pending' && upiTimeLeft > 0 && (
              <div className="rounded-2xl border-2 border-border/60 bg-white p-4 mb-4">
                <QRCodeSVG value={upiData.upi_link} size={300} />
              </div>
            )}

            {/* Expired state */}
            {upiStatus === 'expired' && (
              <div className="rounded-2xl border-2 border-destructive/20 bg-destructive/5 p-8 mb-4 text-center">
                <p className="text-[16px] font-semibold text-destructive mb-1">Payment Expired</p>
                <p className="text-[13px] text-muted-foreground">The QR code has expired</p>
              </div>
            )}

            {/* Failed state */}
            {upiStatus === 'failed' && (
              <div className="rounded-2xl border-2 border-destructive/20 bg-destructive/5 p-8 mb-4 text-center">
                <p className="text-[16px] font-semibold text-destructive mb-1">Payment Failed</p>
                <p className="text-[13px] text-muted-foreground">The payment could not be processed</p>
              </div>
            )}

            {/* Scan instruction */}
            {upiStatus === 'pending' && upiTimeLeft > 0 && (
              <>
                <p className="text-[14px] font-medium text-foreground mb-1">Scan with any UPI app</p>
                <p className="text-[12px] text-muted-foreground mb-3">
                  GPay / PhonePe / Paytm / BHIM
                </p>
              </>
            )}

            {/* Status indicator */}
            {upiStatus === 'pending' && upiTimeLeft > 0 && upiData?.verification_mode === 'oneupi' && (
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground mb-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Waiting for payment...
              </div>
            )}

            {/* Payee info */}
            {upiData && (
              <div className="w-full rounded-lg bg-muted/40 px-4 py-2.5 mb-4 space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Payee</span>
                  <span className="font-medium text-foreground">{upiData.payee_name}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">UPI ID</span>
                  <span className="font-mono text-foreground">{upiData.upi_id}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Ref</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{upiData.transaction_ref}</span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex w-full gap-3">
              {upiStatus === 'pending' && upiTimeLeft > 0 && upiData?.verification_mode === 'manual' && (
                <Button
                  onClick={handleUpiConfirm}
                  disabled={upiConfirming}
                  className="flex-1 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white text-[13px]"
                >
                  {upiConfirming ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Confirm Payment Received
                </Button>
              )}

              {(upiStatus === 'expired' || upiStatus === 'failed') && (
                <Button
                  onClick={handleUpiRetry}
                  className="flex-1 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white text-[13px]"
                >
                  Generate New QR
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleUpiCancel}
                className="flex-1 text-[13px]"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
