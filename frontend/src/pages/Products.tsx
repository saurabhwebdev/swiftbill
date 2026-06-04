import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Barcode from 'react-barcode'
import {
  Package,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ToggleLeft,
  Loader2,
  ImageIcon,
  FolderOpen,
  X,
  Calendar,
} from 'lucide-react'
import api from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { useHotkey } from '@/hooks/use-hotkeys'
import { useBarcodeScan } from '@/hooks/use-barcode-scan'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { SortableHeader } from '@/components/ui/sortable-header'
import type { Product, Category, TaxSlab } from '@/types'

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

const FALLBACK_GST_RATES = ['0', '5', '12', '18', '28']

type TabValue = 'all' | 'categories' | number

interface ProductFormData {
  name: string
  sku: string
  barcode: string
  description: string
  category: string
  price: string
  cost_price: string
  gst_rate: string
  hsn_code: string
  is_active: boolean
  image: File | null
}

interface CategoryFormData {
  name: string
  description: string
}

const emptyProductForm: ProductFormData = {
  name: '',
  sku: '',
  barcode: '',
  description: '',
  category: '',
  price: '',
  cost_price: '',
  gst_rate: '',
  hsn_code: '',
  is_active: true,
  image: null,
}

const emptyCategoryForm: CategoryFormData = {
  name: '',
  description: '',
}

export function Products() {
  const { t } = useTranslation()
  const { toast } = useToast()

  // Data state
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [taxSlabs, setTaxSlabs] = useState<TaxSlab[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useHotkey('alt+n', () => openNewProduct(), [])
  useHotkey('f2', () => searchRef.current?.focus(), [])

  const [activeTab, setActiveTab] = useState<TabValue>('all')

  // Pagination & sorting state
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [ordering, setOrdering] = useState('-created_at')

  // Product dialog state
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState<ProductFormData>(emptyProductForm)
  const [productSaving, setProductSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(emptyCategoryForm)
  const [categorySaving, setCategorySaving] = useState(false)

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    type: 'product' | 'category'
    id: number
    name: string
  }>({ open: false, type: 'product', id: 0, name: '' })
  const [deleting, setDeleting] = useState(false)

  // Product detail dialog state
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useBarcodeScan({
    onScan: (barcode) => {
      const product = products.find(p => p.barcode === barcode)
      if (product) {
        setDetailProduct(product)
        setDetailOpen(true)
      } else {
        toast({ title: 'Product not found', description: `No product with barcode: ${barcode}` })
      }
    },
    enabled: !productDialogOpen && !detailOpen,
  })

  const fetchProducts = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { page }
      if (search) params.search = search
      if (typeof activeTab === 'number') params.category = String(activeTab)
      if (ordering) params.ordering = ordering
      const res = await api.get('products/products/', { params })
      const data = res.data
      const items = data.results || data
      setProducts(Array.isArray(items) ? items : [])
      setTotalCount(data.count ?? (Array.isArray(items) ? items.length : 0))
    } catch {
      toast({ title: 'Error', description: 'Failed to load products', variant: 'destructive' })
    }
  }, [search, activeTab, page, ordering, toast])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('products/categories/')
      setCategories(Array.isArray(res.data) ? res.data : res.data.results ?? [])
    } catch {
      // silently fail for categories
    }
  }, [])

  const fetchTaxSlabs = useCallback(async () => {
    try {
      const res = await api.get('accounts/tax-slabs/')
      const data = res.data
      const items = data.results || data
      setTaxSlabs(Array.isArray(items) ? items.filter((s: TaxSlab) => s.is_active) : [])
    } catch {
      // silently fail — fallback rates will be used
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchProducts(), fetchCategories(), fetchTaxSlabs()])
      setLoading(false)
    }
    load()
  }, [fetchProducts, fetchCategories, fetchTaxSlabs])

  // Debounced search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      fetchProducts()
    }, 400)
  }

  // Reset page when category tab changes
  const handleTabChange = (tab: TabValue) => {
    setActiveTab(tab)
    setPage(1)
  }

  // Handle sort change
  const handleSort = (field: string) => {
    setOrdering(field)
    setPage(1)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Product CRUD
  const openNewProduct = () => {
    setEditingProduct(null)
    setProductForm(emptyProductForm)
    setImagePreview(null)
    setProductDialogOpen(true)
  }

  const openEditProduct = (product: Product) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      sku: product.sku || '',
      barcode: product.barcode || '',
      description: product.description || '',
      category: product.category ? String(product.category) : '',
      price: String(product.price),
      cost_price: String(product.cost_price),
      gst_rate: product.gst_rate ?? '',
      hsn_code: product.hsn_code || '',
      is_active: product.is_active,
      image: null,
    })
    setImagePreview(product.image || null)
    setProductDialogOpen(true)
  }

  const handleProductSubmit = async () => {
    if (!productForm.name.trim()) {
      toast({ title: 'Validation', description: 'Product name is required', variant: 'destructive' })
      return
    }
    setProductSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', productForm.name)
      formData.append('sku', productForm.sku)
      formData.append('barcode', productForm.barcode)
      formData.append('description', productForm.description)
      if (productForm.category) formData.append('category', productForm.category)
      else formData.append('category', '')
      formData.append('price', productForm.price || '0')
      formData.append('cost_price', productForm.cost_price || '0')
      if (productForm.gst_rate) formData.append('gst_rate', productForm.gst_rate)
      formData.append('hsn_code', productForm.hsn_code)
      formData.append('is_active', String(productForm.is_active))
      if (productForm.image) formData.append('image', productForm.image)

      if (editingProduct) {
        await api.patch(`products/products/${editingProduct.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        toast({ title: 'Success', description: 'Product updated successfully' })
      } else {
        await api.post('products/products/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        toast({ title: 'Success', description: 'Product created successfully' })
      }
      setProductDialogOpen(false)
      fetchProducts()
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, string[]> } }
      const msg = error.response?.data
        ? Object.values(error.response.data).flat().join(', ')
        : 'Failed to save product'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setProductSaving(false)
    }
  }

  const toggleProductActive = async (product: Product) => {
    try {
      await api.patch(`products/products/${product.id}/`, { is_active: !product.is_active })
      toast({ title: 'Success', description: `Product ${product.is_active ? 'deactivated' : 'activated'}` })
      fetchProducts()
    } catch {
      toast({ title: 'Error', description: 'Failed to update product', variant: 'destructive' })
    }
  }

  // Category CRUD
  const openNewCategory = () => {
    setEditingCategory(null)
    setCategoryForm(emptyCategoryForm)
    setCategoryDialogOpen(true)
  }

  const openEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryForm({ name: category.name, description: category.description || '' })
    setCategoryDialogOpen(true)
  }

  const handleCategorySubmit = async () => {
    if (!categoryForm.name.trim()) {
      toast({ title: 'Validation', description: 'Category name is required', variant: 'destructive' })
      return
    }
    setCategorySaving(true)
    try {
      if (editingCategory) {
        await api.patch(`products/categories/${editingCategory.id}/`, categoryForm)
        toast({ title: 'Success', description: 'Category updated' })
      } else {
        await api.post('products/categories/', categoryForm)
        toast({ title: 'Success', description: 'Category created' })
      }
      setCategoryDialogOpen(false)
      fetchCategories()
      fetchProducts()
    } catch {
      toast({ title: 'Error', description: 'Failed to save category', variant: 'destructive' })
    } finally {
      setCategorySaving(false)
    }
  }

  // Delete
  const confirmDelete = async () => {
    setDeleting(true)
    try {
      const endpoint = deleteDialog.type === 'product'
        ? `products/products/${deleteDialog.id}/`
        : `products/categories/${deleteDialog.id}/`
      await api.delete(endpoint)
      toast({ title: 'Deleted', description: `${deleteDialog.name} has been deleted` })
      setDeleteDialog({ ...deleteDialog, open: false })
      if (deleteDialog.type === 'product') fetchProducts()
      else { fetchCategories(); fetchProducts() }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProductForm({ ...productForm, image: file })
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatPrice = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '--'
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(num)
  }

  const showCategories = activeTab === 'categories'

  return (
    <motion.div
      variants={container}
      initial="initial"
      animate="animate"
      className="max-w-6xl space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[22px] font-bold text-foreground tracking-tight">
            {t('pages.products.title')}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {t('pages.products.subtitle')}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={showCategories ? openNewCategory : openNewProduct}
          className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {showCategories ? 'Add Category' : t('pages.products.addProduct')}
        </motion.button>
      </motion.div>

      {/* Tabs: All, each category, Categories */}
      <motion.div variants={item} className="flex items-center gap-1 overflow-x-auto pb-1">
        <button
          onClick={() => handleTabChange('all')}
          className={`shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-muted/60'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleTabChange(cat.id)}
            className={`shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              activeTab === cat.id
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted/60'
            }`}
          >
            {cat.name}
          </button>
        ))}
        <button
          onClick={() => handleTabChange('categories')}
          className={`shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            activeTab === 'categories'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-muted/60'
          }`}
        >
          Categories
        </button>
      </motion.div>

      {/* Search Bar (only for products view) */}
      {!showCategories && (
        <motion.div variants={item} className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('pages.products.searchPlaceholder')}
            className="h-11 w-full rounded-xl border border-border/60 bg-card pl-10 pr-4 text-[14px] text-foreground outline-none transition-all placeholder:text-muted-foreground/40 focus:border-foreground/20 focus:ring-1 focus:ring-foreground/5"
          />
        </motion.div>
      )}

      {/* Content */}
      {loading ? (
        <motion.div variants={item} className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </motion.div>
      ) : showCategories ? (
        /* Categories Grid */
        <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 rounded-xl border border-border/60 bg-card">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 mb-5">
                <FolderOpen className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-[15px] font-medium text-foreground/70 mb-1">No categories yet</p>
              <p className="text-[13px] text-muted-foreground text-center max-w-sm mb-6">
                Create categories to organize your products.
              </p>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={openNewCategory}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Category
              </motion.button>
            </div>
          ) : (
            categories.map((cat) => (
              <motion.div
                key={cat.id}
                variants={item}
                className="group rounded-xl border border-border/60 bg-card p-5 transition-colors hover:border-border"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-[15px] font-semibold text-foreground truncate">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">
                        {cat.description}
                      </p>
                    )}
                    <div className="mt-3">
                      <Badge variant="secondary" className="text-[11px]">
                        {cat.product_count ?? 0} products
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted/60">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => openEditCategory(cat)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteDialog({ open: true, type: 'category', id: cat.id, name: cat.name })}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      ) : products.length === 0 ? (
        /* Empty State */
        <motion.div variants={item} className="rounded-xl border border-border/60 bg-card">
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 mb-5">
              <Package className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-[15px] font-medium text-foreground/70 mb-1">
              {t('pages.products.noProducts')}
            </p>
            <p className="text-[13px] text-muted-foreground text-center max-w-sm mb-6">
              {t('pages.products.noProductsDesc')}
            </p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={openNewProduct}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('pages.products.addFirst')}
            </motion.button>
          </div>
        </motion.div>
      ) : (
        /* Products Table */
        <motion.div variants={item} className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="text-[13px] w-[60px]">Image</TableHead>
                <TableHead className="text-[13px]">
                  <SortableHeader label="Name" field="name" currentSort={ordering} onSort={handleSort} />
                </TableHead>
                <TableHead className="text-[13px]">Category</TableHead>
                <TableHead className="text-[13px] text-right">
                  <SortableHeader label="Price" field="price" currentSort={ordering} onSort={handleSort} className="justify-end" />
                </TableHead>
                <TableHead className="text-[13px] text-right">Cost</TableHead>
                <TableHead className="text-[13px] text-right">GST</TableHead>
                <TableHead className="text-[13px]">HSN</TableHead>
                <TableHead className="text-[13px]">Status</TableHead>
                <TableHead className="text-[13px] w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="border-border/60 cursor-pointer" onClick={() => { setDetailProduct(product); setDetailOpen(true) }}>
                  <TableCell className="py-2">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-10 w-10 rounded-lg object-cover border border-border/40"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/40 border border-border/40">
                        <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{product.name}</p>
                      {product.sku && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{product.sku}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    {product.category_name ? (
                      <Badge variant="secondary" className="text-[11px] font-normal">
                        {product.category_name}
                      </Badge>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-right text-[13px] font-medium tabular-nums">
                    {formatPrice(product.price)}
                  </TableCell>
                  <TableCell className="py-2 text-right text-[13px] text-muted-foreground tabular-nums">
                    {formatPrice(product.cost_price)}
                  </TableCell>
                  <TableCell className="py-2 text-right text-[13px] text-muted-foreground tabular-nums">
                    {product.gst_rate ? `${product.gst_rate}%` : '--'}
                  </TableCell>
                  <TableCell className="py-2 text-[13px] text-muted-foreground">
                    {product.hsn_code || '--'}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge
                      variant={product.is_active ? 'default' : 'secondary'}
                      className={`text-[11px] font-normal ${
                        product.is_active
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10'
                          : 'bg-muted text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded-md hover:bg-muted/60 transition-colors" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => openEditProduct(product)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleProductActive(product)}>
                          <ToggleLeft className="mr-2 h-3.5 w-3.5" />
                          {product.is_active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() =>
                            setDeleteDialog({ open: true, type: 'product', id: product.id, name: product.name })
                          }
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </motion.div>
      )}

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update the product details below.' : 'Fill in the details to create a new product.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-[13px]">Name *</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Product name"
                className="border-border/60"
              />
            </div>

            {/* SKU + Barcode */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px]">SKU</Label>
                <Input
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  placeholder="SKU code"
                  className="border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Barcode</Label>
                <Input
                  value={productForm.barcode}
                  onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                  placeholder="Barcode"
                  className="border-border/60"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-[13px]">Category</Label>
              <Select
                value={productForm.category}
                onValueChange={(val) => setProductForm({ ...productForm, category: val === '__none__' ? '' : val })}
              >
                <SelectTrigger className="border-border/60">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price + Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  placeholder="0.00"
                  className="border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Cost Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.cost_price}
                  onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                  placeholder="0.00"
                  className="border-border/60"
                />
              </div>
            </div>

            {/* GST Rate + HSN Code */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px]">GST Rate</Label>
                <Select
                  value={productForm.gst_rate}
                  onValueChange={(val) => setProductForm({ ...productForm, gst_rate: val === '__none__' ? '' : val })}
                >
                  <SelectTrigger className="border-border/60">
                    <SelectValue placeholder="Select GST rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No GST</SelectItem>
                    {taxSlabs.length > 0
                      ? taxSlabs.map((slab) => (
                          <SelectItem key={slab.id} value={String(parseFloat(slab.rate))}>
                            {parseFloat(slab.rate)}% — {slab.name}
                          </SelectItem>
                        ))
                      : FALLBACK_GST_RATES.map((rate) => (
                          <SelectItem key={rate} value={rate}>
                            {rate}%
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">HSN Code</Label>
                <Input
                  value={productForm.hsn_code}
                  onChange={(e) => setProductForm({ ...productForm, hsn_code: e.target.value })}
                  placeholder="HSN code"
                  className="border-border/60"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-[13px]">Description</Label>
              <textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Product description"
                rows={3}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/20 focus:ring-1 focus:ring-foreground/5 resize-none"
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-1.5">
              <Label className="text-[13px]">Image</Label>
              <div className="flex items-center gap-3">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-16 w-16 rounded-lg object-cover border border-border/40"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null)
                        setProductForm({ ...productForm, image: null })
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-white p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted/40 border border-dashed border-border/60">
                    <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="product-image"
                  />
                  <label
                    htmlFor="product-image"
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted/50"
                  >
                    Choose file
                  </label>
                </div>
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setProductForm({ ...productForm, is_active: !productForm.is_active })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  productForm.is_active ? 'bg-[hsl(var(--primary))]' : 'bg-muted'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    productForm.is_active ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <Label className="text-[13px]">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setProductDialogOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              onClick={handleProductSubmit}
              disabled={productSaving}
              className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {productSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingProduct ? 'Update' : 'Create'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update the category details.' : 'Create a new product category.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Name *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Category name"
                className="border-border/60"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Description</Label>
              <textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Category description"
                rows={3}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/20 focus:ring-1 focus:ring-foreground/5 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setCategoryDialogOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              onClick={handleCategorySubmit}
              disabled={categorySaving}
              className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {categorySaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingCategory ? 'Update' : 'Create'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Delete {deleteDialog.type === 'product' ? 'Product' : 'Category'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{deleteDialog.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteDialog({ ...deleteDialog, open: false })}
              className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailProduct && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{detailProduct.name}</DialogTitle>
                <DialogDescription>Product details for {detailProduct.name}</DialogDescription>
              </DialogHeader>

              {/* Image area */}
              {detailProduct.image ? (
                <div className="w-full h-[200px] rounded-xl overflow-hidden">
                  <img
                    src={detailProduct.image}
                    alt={detailProduct.name}
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
                <h2 className="font-display text-xl font-bold text-foreground">{detailProduct.name}</h2>
                {detailProduct.sku && (
                  <p className="text-[13px] text-muted-foreground font-mono">{detailProduct.sku}</p>
                )}
              </div>

              <Separator />

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <div>
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-1">Barcode</p>
                  <p className="text-[14px] font-medium text-foreground font-mono">
                    {detailProduct.barcode || '--'}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-1">Category</p>
                  <div>
                    {detailProduct.category_name ? (
                      <Badge variant="secondary" className="text-[12px]">{detailProduct.category_name}</Badge>
                    ) : (
                      <span className="text-[14px] text-muted-foreground">--</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-1">Price</p>
                  <p className="text-[18px] font-bold text-foreground">{formatPrice(detailProduct.price)}</p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-1">Cost Price</p>
                  <p className="text-[14px] font-medium text-foreground">{formatPrice(detailProduct.cost_price)}</p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-1">GST Rate</p>
                  <div>
                    {detailProduct.gst_rate ? (
                      <Badge variant="outline" className="text-[12px] font-mono">{detailProduct.gst_rate}%</Badge>
                    ) : (
                      <span className="text-[14px] text-muted-foreground">--</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-1">HSN Code</p>
                  <p className="text-[14px] font-medium text-foreground font-mono">
                    {detailProduct.hsn_code || '--'}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                  <Badge
                    variant={detailProduct.is_active ? 'default' : 'secondary'}
                    className={`text-[12px] ${
                      detailProduct.is_active
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10'
                        : 'bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/10'
                    }`}
                  >
                    {detailProduct.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-1">Created</p>
                  <p className="text-[14px] font-medium text-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatDate(detailProduct.created_at)}
                  </p>
                </div>
              </div>

              {detailProduct.updated_at && (
                <div className="pt-1">
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-1">Last Updated</p>
                  <p className="text-[14px] font-medium text-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatDate(detailProduct.updated_at)}
                  </p>
                </div>
              )}

              {detailProduct?.barcode && (
                <div className="flex justify-center py-4">
                  <Barcode
                    value={detailProduct.barcode}
                    width={1.5}
                    height={50}
                    fontSize={12}
                    margin={0}
                    displayValue={true}
                  />
                </div>
              )}

              {/* Description */}
              {detailProduct.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-2">Description</p>
                    <p className="text-[14px] text-foreground leading-relaxed">{detailProduct.description}</p>
                  </div>
                </>
              )}

              <Separator />

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={() => setDetailOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setDetailOpen(false)
                    openEditProduct(detailProduct)
                  }}
                  className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
