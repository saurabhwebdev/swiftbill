import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Store as StoreIcon,
  Users,
  CreditCard,
  Printer,
  Bell,
  Shield,
  Palette,
  Globe,
  Upload,
  ImageIcon,
  Banknote,
  Smartphone,
  Wallet,
  MoreHorizontal,
  SunMoon,
  Loader2,
  UserX,
  ShieldCheck,
  IndianRupee,
  Plus,
  Trash2,
  Copy,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { PaginationControls } from '@/components/ui/pagination-controls'
import type { Store, User, TaxSlab } from '@/types'

/* ─── nav section ids ─── */
const sectionIds = ['store', 'users', 'payments', 'receipts', 'tax', 'notifications', 'security', 'appearance', 'regional']

/* ─── shared helpers ─── */
function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 mb-6">
      <div>
        <h3 className="font-display text-[20px] font-bold text-foreground tracking-tight">{title}</h3>
        <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
      {action}
    </div>
  )
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle?: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn('relative h-6 w-11 rounded-full transition-colors shrink-0', enabled ? 'bg-[hsl(var(--primary))]' : 'bg-muted')}
    >
      <span className={cn('absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200', enabled && 'translate-x-5')} />
    </button>
  )
}

/* ─── custom hook to fetch store ─── */
function useStore() {
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchStore = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('accounts/stores/my_store/')
      setStore(res.data)
    } catch {
      toast({ title: 'Error', description: 'Failed to load store settings.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchStore() }, [fetchStore])

  const patchStore = useCallback(async (data: Partial<Store>) => {
    if (!store) return null
    try {
      const res = await api.patch(`accounts/stores/${store.id}/`, data)
      setStore(res.data)
      toast({ title: 'Saved', description: 'Store settings updated successfully.' })
      return res.data
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' })
      return null
    }
  }, [store, toast])

  return { store, loading, setStore, fetchStore, patchStore }
}

/* ─── Store Info ─── */
function StoreInfoSection({ store, loading, patchStore, fetchStore }: {
  store: Store | null; loading: boolean; patchStore: (d: Partial<Store>) => Promise<Store | null>; fetchStore: () => Promise<void>
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', city: '', state: '', zip_code: '', tax_rate: '', currency: '',
  })
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name || '',
        phone: store.phone || '',
        email: store.email || '',
        address: store.address || '',
        city: store.city || '',
        state: store.state || '',
        zip_code: store.zip_code || '',
        tax_rate: store.tax_rate?.toString() || '',
        currency: store.currency || '',
      })
    }
  }, [store])

  const handleSave = async () => {
    setSaving(true)
    await patchStore(form)
    setSaving(false)
  }

  const handleDiscard = () => {
    if (store) {
      setForm({
        name: store.name || '',
        phone: store.phone || '',
        email: store.email || '',
        address: store.address || '',
        city: store.city || '',
        state: store.state || '',
        zip_code: store.zip_code || '',
        tax_rate: store.tax_rate?.toString() || '',
        currency: store.currency || '',
      })
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !store) return
    const formData = new FormData()
    formData.append('logo', file)
    try {
      await api.patch(`accounts/stores/${store.id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast({ title: 'Logo Updated', description: 'Store logo uploaded successfully.' })
      await fetchStore()
    } catch {
      toast({ title: 'Error', description: 'Failed to upload logo.', variant: 'destructive' })
    }
  }

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <SectionHeader title={t('pages.settings.store.title')} description={t('pages.settings.store.desc')} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr,320px] gap-6">
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-[14px] font-semibold">{t('pages.settings.store.businessDetails')}</CardTitle>
            <CardDescription className="text-[12px]">{t('pages.settings.store.businessDetailsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="storeName" className="text-[13px]">{t('pages.settings.store.storeName')}</Label>
              <Input id="storeName" placeholder={t('pages.settings.store.storeNamePlaceholder')} className="h-10" value={form.name} onChange={e => update('name', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone" className="text-[13px]">{t('pages.settings.store.phone')}</Label>
                <Input id="phone" placeholder="+1 (555) 000-0000" className="h-10" value={form.phone} onChange={e => update('phone', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="storeEmail" className="text-[13px]">{t('pages.settings.store.emailAddress')}</Label>
                <Input id="storeEmail" type="email" placeholder="hello@mystore.com" className="h-10" value={form.email} onChange={e => update('email', e.target.value)} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address" className="text-[13px]">{t('pages.settings.store.streetAddress')}</Label>
              <Input id="address" placeholder="123 Main Street, Suite 100" className="h-10" value={form.address} onChange={e => update('address', e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city" className="text-[13px]">{t('pages.settings.store.city')}</Label>
                <Input id="city" placeholder="San Francisco" className="h-10" value={form.city} onChange={e => update('city', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state" className="text-[13px]">{t('pages.settings.store.state')}</Label>
                <Input id="state" placeholder="CA" className="h-10" value={form.state} onChange={e => update('state', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="zip" className="text-[13px]">{t('pages.settings.store.zip')}</Label>
                <Input id="zip" placeholder="94102" className="h-10" value={form.zip_code} onChange={e => update('zip_code', e.target.value)} />
              </div>
            </div>

            <Separator className="my-1" />

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="taxRate" className="text-[13px]">{t('pages.settings.store.taxRate')}</Label>
                <Input id="taxRate" type="number" placeholder="8.875" step="0.001" className="h-10" value={form.tax_rate} onChange={e => update('tax_rate', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">{t('pages.settings.store.currency')}</Label>
                <Select value={form.currency} onValueChange={v => update('currency', v)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder={t('pages.settings.store.currency')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD — US Dollar ($)</SelectItem>
                    <SelectItem value="eur">EUR — Euro (€)</SelectItem>
                    <SelectItem value="gbp">GBP — British Pound (£)</SelectItem>
                    <SelectItem value="inr">INR — Indian Rupee (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <Button onClick={handleSave} disabled={saving} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white text-[13px]">
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {t('pages.settings.saveChanges')}
              </Button>
              <Button variant="outline" className="text-[13px]" onClick={handleDiscard}>{t('pages.settings.discard')}</Button>
            </div>
          </CardContent>
        </Card>

        {/* Logo upload */}
        <Card className="border-border/60 shadow-none h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-[14px] font-semibold">{t('pages.settings.store.storeLogo')}</CardTitle>
            <CardDescription className="text-[12px]">{t('pages.settings.store.logoDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoUpload} />
            <div
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/20 py-10 px-6 hover:border-[hsl(var(--primary)/0.3)] hover:bg-[hsl(var(--primary)/0.02)] transition-colors cursor-pointer group"
            >
              {store?.logo ? (
                <img src={store.logo} alt="Store logo" className="h-20 w-20 object-contain rounded-xl mb-4" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 mb-4 group-hover:bg-[hsl(var(--primary)/0.08)] transition-colors">
                  <ImageIcon className="h-6 w-6 text-muted-foreground/40 group-hover:text-[hsl(var(--primary)/0.6)] transition-colors" />
                </div>
              )}
              <p className="text-[13px] font-medium text-foreground/70 mb-1">{store?.logo ? t('pages.settings.store.changeLogo') : t('pages.settings.store.uploadLogo')}</p>
              <p className="text-[12px] text-muted-foreground text-center">{t('pages.settings.store.logoHint')}<br />{t('pages.settings.store.logoRecommend')}</p>
              <Button variant="outline" size="sm" className="mt-4 text-[12px] gap-1.5" onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>
                <Upload className="h-3.5 w-3.5" /> {t('pages.settings.store.chooseFile')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ─── Users & Roles ─── */
function UsersSection() {
  const { t } = useTranslation()
  const currentUser = useAuthStore((s) => s.user)
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [usersPage, setUsersPage] = useState(1)
  const [usersTotalCount, setUsersTotalCount] = useState(0)
  const usersPageSize = 20
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    first_name: '', last_name: '', email: '', username: '', password: '', role: 'cashier' as 'owner' | 'manager' | 'cashier',
  })

  const fetchUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const res = await api.get('accounts/users/', { params: { page } })
      const data = res.data
      if (Array.isArray(data)) {
        setUsers(data)
        setUsersTotalCount(data.length)
      } else {
        setUsers(data.results || [])
        setUsersTotalCount(data.count ?? (data.results || []).length)
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load users.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchUsers(usersPage) }, [fetchUsers, usersPage])

  const handleInvite = async () => {
    setInviting(true)
    try {
      await api.post('accounts/users/invite/', {
        ...inviteForm,
        phone: '',
      })
      toast({ title: 'User Invited', description: `${inviteForm.first_name} ${inviteForm.last_name} has been added.` })
      setInviteOpen(false)
      setInviteForm({ first_name: '', last_name: '', email: '', username: '', password: '', role: 'cashier' })
      await fetchUsers(usersPage)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: Record<string, string[]> } })?.response?.data
      const detail = msg ? Object.values(msg).flat().join(' ') : 'Failed to invite user.'
      toast({ title: 'Error', description: detail, variant: 'destructive' })
    } finally {
      setInviting(false)
    }
  }

  const handleChangeRole = async (userId: number, role: string) => {
    try {
      await api.post(`accounts/users/${userId}/update_role/`, { role })
      toast({ title: 'Role Updated', description: `User role changed to ${role}.` })
      await fetchUsers(usersPage)
    } catch {
      toast({ title: 'Error', description: 'Failed to update role.', variant: 'destructive' })
    }
  }

  const handleDeactivate = async (userId: number) => {
    try {
      await api.post(`accounts/users/${userId}/deactivate/`)
      toast({ title: 'User Deactivated', description: 'The user has been deactivated.' })
      await fetchUsers(usersPage)
    } catch {
      toast({ title: 'Error', description: 'Failed to deactivate user.', variant: 'destructive' })
    }
  }

  const roleCounts = {
    owner: users.filter(u => u.role === 'owner').length,
    manager: users.filter(u => u.role === 'manager').length,
    cashier: users.filter(u => u.role === 'cashier').length,
  }

  const roles = [
    { name: t('pages.settings.users.owner'), key: 'owner' as const, desc: t('pages.settings.users.ownerDesc') },
    { name: t('pages.settings.users.manager'), key: 'manager' as const, desc: t('pages.settings.users.managerDesc') },
    { name: t('pages.settings.users.cashier'), key: 'cashier' as const, desc: t('pages.settings.users.cashierDesc') },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <SectionHeader
        title={t('pages.settings.users.title')}
        description={t('pages.settings.users.desc')}
        action={
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white text-[13px] shrink-0">
                <Users className="h-3.5 w-3.5 mr-1.5" /> {t('pages.settings.users.inviteUser')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('pages.settings.users.inviteTitle')}</DialogTitle>
                <DialogDescription>{t('pages.settings.users.inviteDesc')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-[13px]">{t('pages.settings.users.firstName')}</Label>
                    <Input className="h-10" value={inviteForm.first_name} onChange={e => setInviteForm(p => ({ ...p, first_name: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[13px]">{t('pages.settings.users.lastName')}</Label>
                    <Input className="h-10" value={inviteForm.last_name} onChange={e => setInviteForm(p => ({ ...p, last_name: e.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[13px]">{t('pages.settings.users.email')}</Label>
                  <Input type="email" className="h-10" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[13px]">{t('pages.settings.users.username')}</Label>
                  <Input className="h-10" value={inviteForm.username} onChange={e => setInviteForm(p => ({ ...p, username: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[13px]">{t('pages.settings.users.password')}</Label>
                  <Input type="password" className="h-10" value={inviteForm.password} onChange={e => setInviteForm(p => ({ ...p, password: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[13px]">{t('pages.settings.users.role')}</Label>
                  <Select value={inviteForm.role} onValueChange={v => setInviteForm(p => ({ ...p, role: v as 'owner' | 'manager' | 'cashier' }))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">{t('pages.settings.users.owner')}</SelectItem>
                      <SelectItem value="manager">{t('pages.settings.users.manager')}</SelectItem>
                      <SelectItem value="cashier">{t('pages.settings.users.cashier')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>{t('pages.settings.users.cancel')}</Button>
                <Button onClick={handleInvite} disabled={inviting} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white">
                  {inviting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  {t('pages.settings.users.invite')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr,300px] gap-6">
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] font-semibold">{t('pages.settings.users.teamMembers')}</CardTitle>
            <CardDescription className="text-[12px]">{t('pages.settings.users.teamMembersDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-[1fr,110px,90px,60px] gap-4 px-6 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40 bg-muted/20">
              <span>{t('pages.settings.users.member')}</span>
              <span>{t('pages.settings.users.role')}</span>
              <span>{t('pages.settings.users.status')}</span>
              <span></span>
            </div>
            {users.map((u) => {
              const initial = u.first_name?.[0] || u.username?.[0]?.toUpperCase() || '?'
              const displayName = u.first_name ? `${u.first_name} ${u.last_name}` : u.username
              const isMe = currentUser?.id === u.id
              return (
                <div key={u.id} className="grid grid-cols-[1fr,110px,90px,60px] gap-4 px-6 py-4 items-center border-b border-border/20 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.1)] text-[12px] font-bold text-[hsl(var(--primary))]">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {displayName}
                        {isMe && <span className="ml-2 text-[11px] text-muted-foreground font-normal">({t('pages.settings.users.you')})</span>}
                      </p>
                      <p className="text-[12px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="w-fit capitalize text-[11px] font-medium">{u.role}</Badge>
                  <Badge className={cn(
                    'w-fit text-[11px] border-0 font-medium',
                    u.is_active
                      ? 'bg-[hsl(var(--color-success)/0.1)] text-[hsl(var(--color-success))] hover:bg-[hsl(var(--color-success)/0.1)]'
                      : 'bg-muted text-muted-foreground hover:bg-muted'
                  )}>
                    {u.is_active ? t('pages.settings.users.active') : t('pages.settings.users.inactive')}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/50 hover:bg-muted/60 hover:text-foreground transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel className="text-[12px]">{t('pages.settings.users.actions')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-[13px] gap-2" onClick={() => handleChangeRole(u.id, 'owner')}>
                        <ShieldCheck className="h-3.5 w-3.5" /> {t('pages.settings.users.setAsOwner')}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-[13px] gap-2" onClick={() => handleChangeRole(u.id, 'manager')}>
                        <ShieldCheck className="h-3.5 w-3.5" /> {t('pages.settings.users.setAsManager')}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-[13px] gap-2" onClick={() => handleChangeRole(u.id, 'cashier')}>
                        <ShieldCheck className="h-3.5 w-3.5" /> {t('pages.settings.users.setAsCashier')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-[13px] gap-2 text-destructive focus:text-destructive" onClick={() => handleDeactivate(u.id)}>
                        <UserX className="h-3.5 w-3.5" /> {t('pages.settings.users.deactivate')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
            {users.length === 0 && (
              <div className="px-6 py-8 text-center text-[13px] text-muted-foreground">{t('pages.settings.users.noUsers')}</div>
            )}
            <PaginationControls
              page={usersPage}
              totalPages={Math.ceil(usersTotalCount / usersPageSize)}
              totalItems={usersTotalCount}
              pageSize={usersPageSize}
              onPageChange={setUsersPage}
            />
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-none h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] font-semibold">{t('pages.settings.users.roles')}</CardTitle>
            <CardDescription className="text-[12px]">{t('pages.settings.users.permissionGroups')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {roles.map((role) => (
              <div key={role.name} className="flex items-center gap-3 rounded-lg border border-border/50 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground">{role.name}</p>
                  <p className="text-[11px] text-muted-foreground">{role.desc}</p>
                </div>
                <span className="text-[12px] font-medium text-muted-foreground tabular-nums">{roleCounts[role.key]}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ─── Payments ─── */
function PaymentsSection({ store, loading, patchStore }: {
  store: Store | null; loading: boolean; patchStore: (d: Partial<Store>) => Promise<Store | null>
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [form, setForm] = useState({
    payment_cash: true,
    payment_card: false,
    payment_mobile: false,
    payment_store_credit: false,
  })
  const [refundForm, setRefundForm] = useState({
    refund_enabled: false,
    refund_time_limit_days: 0,
    refund_require_reason: false,
  })
  const [upiForm, setUpiForm] = useState({
    upi_id: '',
    upi_payee_name: '',
    upi_verification_mode: 'manual' as 'manual' | 'oneupi',
    oneupi_api_key: '',
    oneupi_api_secret: '',
  })
  const [upiSaving, setUpiSaving] = useState(false)

  useEffect(() => {
    if (store) {
      setForm({
        payment_cash: store.payment_cash ?? true,
        payment_card: store.payment_card ?? false,
        payment_mobile: store.payment_mobile ?? false,
        payment_store_credit: store.payment_store_credit ?? false,
      })
      setRefundForm({
        refund_enabled: store.refund_enabled ?? false,
        refund_time_limit_days: store.refund_time_limit_days ?? 0,
        refund_require_reason: store.refund_require_reason ?? false,
      })
      setUpiForm({
        upi_id: store.upi_id || '',
        upi_payee_name: store.upi_payee_name || '',
        upi_verification_mode: store.upi_verification_mode || 'manual',
        oneupi_api_key: store.oneupi_api_key || '',
        oneupi_api_secret: store.oneupi_api_secret || '',
      })
    }
  }, [store])

  const handleToggle = async (key: keyof typeof form) => {
    const newVal = !form[key]
    setForm(prev => ({ ...prev, [key]: newVal }))
    await patchStore({ [key]: newVal })
  }

  const handleRefundToggle = async (key: 'refund_enabled' | 'refund_require_reason') => {
    const newVal = !refundForm[key]
    setRefundForm(prev => ({ ...prev, [key]: newVal }))
    await patchStore({ [key]: newVal })
  }

  const handleRefundDaysChange = async (days: number) => {
    setRefundForm(prev => ({ ...prev, refund_time_limit_days: days }))
    await patchStore({ refund_time_limit_days: days })
  }

  const methods: { name: string; description: string; icon: LucideIcon; key: keyof typeof form; badge?: string }[] = [
    { name: t('pages.settings.payments.cash'), description: t('pages.settings.payments.cashDesc'), icon: Banknote, key: 'payment_cash' },
    { name: t('pages.settings.payments.card'), description: t('pages.settings.payments.cardDesc'), icon: CreditCard, key: 'payment_card' },
    { name: t('pages.settings.payments.mobilePay'), description: t('pages.settings.payments.mobilePayDesc'), icon: Smartphone, key: 'payment_mobile' },
    { name: t('pages.settings.payments.storeCredit'), description: t('pages.settings.payments.storeCreditDesc'), icon: Wallet, key: 'payment_store_credit' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <SectionHeader title={t('pages.settings.payments.title')} description={t('pages.settings.payments.desc')} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {methods.map((m) => {
          const enabled = form[m.key]
          return (
            <Card key={m.name} className={cn('border-border/60 shadow-none transition-colors', enabled && 'border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.02)]')}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors', enabled ? 'bg-[hsl(var(--primary)/0.1)]' : 'bg-muted/60')}>
                    <m.icon className={cn('h-5 w-5', enabled ? 'text-[hsl(var(--primary))]' : 'text-muted-foreground/50')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[14px] font-semibold text-foreground">{m.name}</p>
                      {m.badge && <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 h-[18px] text-muted-foreground">{m.badge}</Badge>}
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{m.description}</p>
                  </div>
                  <Toggle enabled={enabled} onToggle={() => handleToggle(m.key)} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Refund Policy */}
      <Card className="border-border/60 shadow-none mt-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-[14px] font-semibold">Refund Policy</CardTitle>
          <CardDescription className="text-[12px]">Configure how refunds are handled at your store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
            <div>
              <p className="text-[14px] font-medium text-foreground">Enable Refunds</p>
              <p className="text-[12px] text-muted-foreground">Allow processing refunds for completed sales</p>
            </div>
            <Toggle enabled={refundForm.refund_enabled} onToggle={() => handleRefundToggle('refund_enabled')} />
          </div>

          {refundForm.refund_enabled && (
            <>
              <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                <div>
                  <p className="text-[14px] font-medium text-foreground">Refund Time Limit</p>
                  <p className="text-[12px] text-muted-foreground">Maximum days after sale to allow refunds (0 = unlimited)</p>
                </div>
                <Input
                  type="number"
                  min={0}
                  className="h-9 w-20 text-center text-[13px]"
                  value={refundForm.refund_time_limit_days}
                  onChange={(e) => handleRefundDaysChange(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                <div>
                  <p className="text-[14px] font-medium text-foreground">Require Reason</p>
                  <p className="text-[12px] text-muted-foreground">Require a reason when processing refunds</p>
                </div>
                <Toggle enabled={refundForm.refund_require_reason} onToggle={() => handleRefundToggle('refund_require_reason')} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* UPI Configuration — only when mobile payment enabled */}
      {form.payment_mobile && <Card className="border-border/60 shadow-none mt-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-[14px] font-semibold">UPI Configuration</CardTitle>
          <CardDescription className="text-[12px]">Configure UPI payments for mobile/QR code checkout</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-[13px]">UPI ID</Label>
              <Input
                className="h-10 font-mono"
                placeholder="yourstore@upi"
                value={upiForm.upi_id}
                onChange={(e) => setUpiForm(p => ({ ...p, upi_id: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[13px]">Payee Name</Label>
              <Input
                className="h-10"
                placeholder="Your Store Name"
                value={upiForm.upi_payee_name}
                onChange={(e) => setUpiForm(p => ({ ...p, upi_payee_name: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-[13px]">Verification Mode</Label>
            <Select
              value={upiForm.upi_verification_mode}
              onValueChange={(v) => setUpiForm(p => ({ ...p, upi_verification_mode: v as 'manual' | 'oneupi' }))}
            >
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Confirmation</SelectItem>
                <SelectItem value="oneupi">OneUPI (Auto-verify)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {upiForm.upi_verification_mode === 'oneupi' && (
            <>
              <div className="grid gap-2">
                <Label className="text-[13px]">API Key</Label>
                <Input
                  className="h-10 font-mono"
                  placeholder="Enter OneUPI API key"
                  value={upiForm.oneupi_api_key}
                  onChange={(e) => setUpiForm(p => ({ ...p, oneupi_api_key: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">API Secret</Label>
                <Input
                  type="password"
                  className="h-10 font-mono"
                  placeholder="Enter OneUPI API secret"
                  value={upiForm.oneupi_api_secret}
                  onChange={(e) => setUpiForm(p => ({ ...p, oneupi_api_secret: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    className="h-10 font-mono text-[12px] bg-muted/30"
                    value="https://pos.103.145.37.138.sslip.io/api/webhooks/oneupi/"
                    readOnly
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-3 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText('https://pos.103.145.37.138.sslip.io/api/webhooks/oneupi/')
                      toast({ title: 'Copied', description: 'Webhook URL copied to clipboard.' })
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}

          <Button
            onClick={async () => {
              setUpiSaving(true)
              await patchStore(upiForm)
              setUpiSaving(false)
            }}
            disabled={upiSaving}
            className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white text-[13px]"
          >
            {upiSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Save UPI Settings
          </Button>
        </CardContent>
      </Card>}

      {/* ── Discount Settings ── */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-[15px] font-semibold">Discount Settings</CardTitle>
          <CardDescription className="text-[13px]">Configure discount rules and limits per role</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-foreground">Enable Discounts</p>
              <p className="text-[12px] text-muted-foreground">Allow discounts to be applied on sales</p>
            </div>
            <button
              onClick={() => patchStore({ discount_enabled: !store?.discount_enabled })}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                store?.discount_enabled ? 'bg-[hsl(var(--primary))]' : 'bg-foreground/15'
              )}
            >
              <span className={cn(
                'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm',
                store?.discount_enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
              )} />
            </button>
          </div>

          {store?.discount_enabled && (
            <>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Max Discount % (Cashier)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={store?.discount_max_percent_cashier ?? 10}
                    onChange={(e) => patchStore({ discount_max_percent_cashier: e.target.value })}
                    className="h-9 text-[13px]"
                  />
                  <p className="text-[11px] text-muted-foreground">Maximum discount a cashier can apply</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Max Discount % (Manager)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={store?.discount_max_percent_manager ?? 50}
                    onChange={(e) => patchStore({ discount_max_percent_manager: e.target.value })}
                    className="h-9 text-[13px]"
                  />
                  <p className="text-[11px] text-muted-foreground">Maximum discount a manager can apply</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-foreground">Require Reason</p>
                  <p className="text-[12px] text-muted-foreground">Require staff to provide a reason for discounts</p>
                </div>
                <button
                  onClick={() => patchStore({ discount_require_reason: !store?.discount_require_reason })}
                  className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                    store?.discount_require_reason ? 'bg-[hsl(var(--primary))]' : 'bg-foreground/15'
                  )}
                >
                  <span className={cn(
                    'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm',
                    store?.discount_require_reason ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-foreground">Require Approval</p>
                  <p className="text-[12px] text-muted-foreground">Cashier discounts need manager/owner approval</p>
                </div>
                <button
                  onClick={() => patchStore({ discount_require_approval: !store?.discount_require_approval })}
                  className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                    store?.discount_require_approval ? 'bg-[hsl(var(--primary))]' : 'bg-foreground/15'
                  )}
                >
                  <span className={cn(
                    'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm',
                    store?.discount_require_approval ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  )} />
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ─── Receipts ─── */
function ReceiptsSection({ store, loading, patchStore }: {
  store: Store | null; loading: boolean; patchStore: (d: Partial<Store>) => Promise<Store | null>
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [form, setForm] = useState({
    receipt_header: '',
    receipt_footer: '',
    receipt_paper_size: '80mm',
    receipt_copies: 1,
    receipt_show_logo: true,
    receipt_show_tax_breakdown: true,
    printer_type: 'none' as 'none' | 'test' | 'usb' | 'network' | 'serial',
    printer_address: '',
    printer_auto_print: false,
    printer_paper_width: 48,
  })
  const [saving, setSaving] = useState(false)
  const [testPrinting, setTestPrinting] = useState(false)
  const [testPrintPreview, setTestPrintPreview] = useState<{ receipt_text: string; printed: boolean; printer_type: string; printer_error?: string } | null>(null)

  useEffect(() => {
    if (store) {
      setForm({
        receipt_header: store.receipt_header || '',
        receipt_footer: store.receipt_footer || '',
        receipt_paper_size: store.receipt_paper_size || '80mm',
        receipt_copies: store.receipt_copies ?? 1,
        receipt_show_logo: store.receipt_show_logo ?? true,
        receipt_show_tax_breakdown: store.receipt_show_tax_breakdown ?? true,
        printer_type: store.printer_type || 'none',
        printer_address: store.printer_address || '',
        printer_auto_print: store.printer_auto_print ?? false,
        printer_paper_width: store.printer_paper_width ?? 48,
      })
    }
  }, [store])

  const handleSave = async () => {
    setSaving(true)
    await patchStore(form)
    setSaving(false)
  }

  const handleDiscard = () => {
    if (store) {
      setForm({
        receipt_header: store.receipt_header || '',
        receipt_footer: store.receipt_footer || '',
        receipt_paper_size: store.receipt_paper_size || '80mm',
        receipt_copies: store.receipt_copies ?? 1,
        receipt_show_logo: store.receipt_show_logo ?? true,
        receipt_show_tax_breakdown: store.receipt_show_tax_breakdown ?? true,
        printer_type: store.printer_type || 'none',
        printer_address: store.printer_address || '',
        printer_auto_print: store.printer_auto_print ?? false,
        printer_paper_width: store.printer_paper_width ?? 48,
      })
    }
  }

  const handleTestPrint = async () => {
    setTestPrinting(true)
    try {
      const res = await api.get('sales/sales/test_print/')
      setTestPrintPreview({
        receipt_text: res.data.receipt_text || '',
        printed: res.data.printed ?? false,
        printer_type: res.data.printer_type || form.printer_type,
        printer_error: res.data.printer_error,
      })
    } catch {
      toast({ title: 'Error', description: 'Failed to generate test print.', variant: 'destructive' })
    } finally {
      setTestPrinting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <SectionHeader title={t('pages.settings.receipts.title')} description={t('pages.settings.receipts.desc')} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr,320px] gap-6">
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-[14px] font-semibold">{t('pages.settings.receipts.receiptContent')}</CardTitle>
            <CardDescription className="text-[12px]">{t('pages.settings.receipts.receiptContentDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <Label className="text-[13px]">{t('pages.settings.receipts.headerText')}</Label>
              <Input placeholder={t('pages.settings.receipts.headerPlaceholder')} className="h-10" value={form.receipt_header} onChange={e => setForm(p => ({ ...p, receipt_header: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label className="text-[13px]">{t('pages.settings.receipts.footerText')}</Label>
              <Input placeholder={t('pages.settings.receipts.footerPlaceholder')} className="h-10" value={form.receipt_footer} onChange={e => setForm(p => ({ ...p, receipt_footer: e.target.value }))} />
            </div>

            <Separator className="my-1" />

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[13px]">{t('pages.settings.receipts.paperSize')}</Label>
                <Select value={form.receipt_paper_size} onValueChange={v => setForm(p => ({ ...p, receipt_paper_size: v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80mm">80mm — Standard</SelectItem>
                    <SelectItem value="58mm">58mm — Compact</SelectItem>
                    <SelectItem value="a4">A4 — Full Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">{t('pages.settings.receipts.copiesPerTransaction')}</Label>
                <Input type="number" min="1" max="5" className="h-10" value={form.receipt_copies} onChange={e => setForm(p => ({ ...p, receipt_copies: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium text-foreground">{t('pages.settings.receipts.showLogo')}</p>
                  <p className="text-[11px] text-muted-foreground">{t('pages.settings.receipts.showLogoDesc')}</p>
                </div>
                <Toggle enabled={form.receipt_show_logo} onToggle={() => setForm(p => ({ ...p, receipt_show_logo: !p.receipt_show_logo }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium text-foreground">{t('pages.settings.receipts.showTaxBreakdown')}</p>
                  <p className="text-[11px] text-muted-foreground">{t('pages.settings.receipts.showTaxBreakdownDesc')}</p>
                </div>
                <Toggle enabled={form.receipt_show_tax_breakdown} onToggle={() => setForm(p => ({ ...p, receipt_show_tax_breakdown: !p.receipt_show_tax_breakdown }))} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white text-[13px]">
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {t('pages.settings.saveChanges')}
              </Button>
              <Button variant="outline" className="text-[13px]" onClick={handleDiscard}>{t('pages.settings.discard')}</Button>
            </div>
          </CardContent>
        </Card>

        {/* Printer Configuration */}
        <Card className="border-border/60 shadow-none h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-[14px] font-semibold">Printer Configuration</CardTitle>
            <CardDescription className="text-[12px]">Configure thermal printer for automatic receipt printing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <Label className="text-[13px]">Printer Type</Label>
              <Select value={form.printer_type} onValueChange={v => setForm(p => ({ ...p, printer_type: v as typeof p.printer_type }))}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select printer type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Browser Print)</SelectItem>
                  <SelectItem value="test">Test (Dummy Printer)</SelectItem>
                  <SelectItem value="usb">USB</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="serial">Serial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.printer_type === 'network' && (
              <div className="grid gap-2">
                <Label className="text-[13px]">IP Address</Label>
                <Input className="h-10 font-mono" placeholder="192.168.1.100:9100" value={form.printer_address} onChange={e => setForm(p => ({ ...p, printer_address: e.target.value }))} />
              </div>
            )}

            {form.printer_type === 'usb' && (
              <div className="grid gap-2">
                <Label className="text-[13px]">Vendor:Product</Label>
                <Input className="h-10 font-mono" placeholder="0x04b8:0x0202" value={form.printer_address} onChange={e => setForm(p => ({ ...p, printer_address: e.target.value }))} />
              </div>
            )}

            {form.printer_type === 'serial' && (
              <div className="grid gap-2">
                <Label className="text-[13px]">Port</Label>
                <Input className="h-10 font-mono" placeholder="/dev/ttyUSB0" value={form.printer_address} onChange={e => setForm(p => ({ ...p, printer_address: e.target.value }))} />
              </div>
            )}

            <div className="grid gap-2">
              <Label className="text-[13px]">Paper Width</Label>
              <Select value={String(form.printer_paper_width)} onValueChange={v => setForm(p => ({ ...p, printer_paper_width: parseInt(v) }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="32">32 chars (58mm)</SelectItem>
                  <SelectItem value="48">48 chars (80mm)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
              <div>
                <p className="text-[13px] font-medium text-foreground">Auto-Print</p>
                <p className="text-[11px] text-muted-foreground">Print receipt automatically after every sale</p>
              </div>
              <Toggle enabled={form.printer_auto_print} onToggle={() => setForm(p => ({ ...p, printer_auto_print: !p.printer_auto_print }))} />
            </div>

            <Button
              variant="outline"
              className="w-full text-[13px] gap-1.5"
              onClick={handleTestPrint}
              disabled={testPrinting}
            >
              {testPrinting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
              Test Print
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Print Preview Dialog */}
      <Dialog open={!!testPrintPreview} onOpenChange={() => setTestPrintPreview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Test Print Preview
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border border-border/60 bg-white p-4 overflow-auto max-h-[60vh]">
            <pre className="text-[11px] font-mono text-gray-900 whitespace-pre leading-relaxed">{testPrintPreview?.receipt_text}</pre>
          </div>
          <div className="flex items-center gap-4 text-[13px]">
            <span className="text-muted-foreground">Printed: <span className={testPrintPreview?.printed ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>{testPrintPreview?.printed ? 'Yes' : 'No'}</span></span>
            <span className="text-muted-foreground">Printer: <span className="font-medium text-foreground">{testPrintPreview?.printer_type}</span></span>
          </div>
          {testPrintPreview?.printer_error && (
            <p className="text-[13px] text-red-500 font-medium">{testPrintPreview.printer_error}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestPrintPreview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── Tax / GST ─── */
function TaxGstSection({ store, loading, patchStore }: {
  store: Store | null; loading: boolean; patchStore: (d: Partial<Store>) => Promise<Store | null>
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [form, setForm] = useState({
    gst_enabled: false,
    gstin: '',
    gst_state_code: '',
    gst_state_name: '',
    gst_business_name: '',
    gst_composition_scheme: false,
    gst_default_slab: '18',
    gst_inclusive_pricing: false,
  })
  const [saving, setSaving] = useState(false)
  const [slabs, setSlabs] = useState<TaxSlab[]>([])
  const [slabsLoading, setSlabsLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', rate: '', hsn_code: '', description: '' })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (store) {
      setForm({
        gst_enabled: store.gst_enabled ?? false,
        gstin: store.gstin || '',
        gst_state_code: store.gst_state_code || '',
        gst_state_name: store.gst_state_name || '',
        gst_business_name: store.gst_business_name || '',
        gst_composition_scheme: store.gst_composition_scheme ?? false,
        gst_default_slab: store.gst_default_slab || '18',
        gst_inclusive_pricing: store.gst_inclusive_pricing ?? false,
      })
    }
  }, [store])

  const fetchSlabs = useCallback(async () => {
    try {
      setSlabsLoading(true)
      const res = await api.get('accounts/tax-slabs/')
      setSlabs(Array.isArray(res.data) ? res.data : res.data.results || [])
    } catch { /* ignore */ } finally {
      setSlabsLoading(false)
    }
  }, [])

  useEffect(() => { fetchSlabs() }, [fetchSlabs])

  const handleSave = async () => {
    setSaving(true)
    await patchStore(form)
    setSaving(false)
  }

  const handleAddSlab = async () => {
    if (!form.gst_enabled) return
    setAdding(true)
    try {
      await api.post('accounts/tax-slabs/', {
        name: addForm.name,
        rate: addForm.rate,
        hsn_code: addForm.hsn_code,
        description: addForm.description,
        store: store?.id,
      })
      toast({ title: t('pages.settings.saved'), description: 'Tax slab added.' })
      setAddOpen(false)
      setAddForm({ name: '', rate: '', hsn_code: '', description: '' })
      await fetchSlabs()
    } catch {
      toast({ title: t('pages.settings.error'), description: 'Failed to add tax slab.', variant: 'destructive' })
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteSlab = async (id: number) => {
    try {
      await api.delete(`accounts/tax-slabs/${id}/`)
      toast({ title: t('pages.settings.saved'), description: 'Tax slab removed.' })
      await fetchSlabs()
    } catch {
      toast({ title: t('pages.settings.error'), description: 'Failed to delete slab.', variant: 'destructive' })
    }
  }

  const gstinValid = !form.gstin || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin)

  const indianStates = [
    { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
    { code: '03', name: 'Punjab' }, { code: '04', name: 'Chandigarh' },
    { code: '05', name: 'Uttarakhand' }, { code: '06', name: 'Haryana' },
    { code: '07', name: 'Delhi' }, { code: '08', name: 'Rajasthan' },
    { code: '09', name: 'Uttar Pradesh' }, { code: '10', name: 'Bihar' },
    { code: '11', name: 'Sikkim' }, { code: '12', name: 'Arunachal Pradesh' },
    { code: '13', name: 'Nagaland' }, { code: '14', name: 'Manipur' },
    { code: '15', name: 'Mizoram' }, { code: '16', name: 'Tripura' },
    { code: '17', name: 'Meghalaya' }, { code: '18', name: 'Assam' },
    { code: '19', name: 'West Bengal' }, { code: '20', name: 'Jharkhand' },
    { code: '21', name: 'Odisha' }, { code: '22', name: 'Chhattisgarh' },
    { code: '23', name: 'Madhya Pradesh' }, { code: '24', name: 'Gujarat' },
    { code: '25', name: 'Daman & Diu' }, { code: '26', name: 'Dadra & Nagar Haveli' },
    { code: '27', name: 'Maharashtra' }, { code: '29', name: 'Karnataka' },
    { code: '30', name: 'Goa' }, { code: '31', name: 'Lakshadweep' },
    { code: '32', name: 'Kerala' }, { code: '33', name: 'Tamil Nadu' },
    { code: '34', name: 'Puducherry' }, { code: '35', name: 'Andaman & Nicobar' },
    { code: '36', name: 'Telangana' }, { code: '37', name: 'Andhra Pradesh' },
  ]

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  return (
    <div>
      <SectionHeader title={t('pages.settings.tax.title')} description={t('pages.settings.tax.desc')} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr,380px] gap-6">
        {/* Main GST config */}
        <div className="space-y-6">
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-[14px] font-semibold">{t('pages.settings.tax.gstConfig')}</CardTitle>
              <CardDescription className="text-[12px]">{t('pages.settings.tax.gstConfigDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                <div>
                  <p className="text-[14px] font-medium text-foreground">{t('pages.settings.tax.enableGst')}</p>
                  <p className="text-[12px] text-muted-foreground">{t('pages.settings.tax.enableGstDesc')}</p>
                </div>
                <Toggle enabled={form.gst_enabled} onToggle={() => setForm(p => ({ ...p, gst_enabled: !p.gst_enabled }))} />
              </div>

              {form.gst_enabled && (
                <>
                  <div className="grid gap-2">
                    <Label className="text-[13px]">{t('pages.settings.tax.gstin')}</Label>
                    <Input
                      className={cn('h-10 font-mono uppercase', !gstinValid && 'border-destructive')}
                      placeholder={t('pages.settings.tax.gstinPlaceholder')}
                      maxLength={15}
                      value={form.gstin}
                      onChange={e => setForm(p => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                    />
                    <p className="text-[11px] text-muted-foreground">{t('pages.settings.tax.gstinHelp')}</p>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-[13px]">{t('pages.settings.tax.businessName')}</Label>
                    <Input className="h-10" placeholder={t('pages.settings.tax.businessNamePlaceholder')} value={form.gst_business_name} onChange={e => setForm(p => ({ ...p, gst_business_name: e.target.value }))} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-[13px]">{t('pages.settings.tax.stateCode')} / {t('pages.settings.tax.stateName')}</Label>
                      <Select value={form.gst_state_code} onValueChange={v => {
                        const st = indianStates.find(s => s.code === v)
                        setForm(p => ({ ...p, gst_state_code: v, gst_state_name: st?.name || '' }))
                      }}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>
                          {indianStates.map(s => (
                            <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[13px]">{t('pages.settings.tax.defaultSlab')}</Label>
                      <Select value={form.gst_default_slab} onValueChange={v => setForm(p => ({ ...p, gst_default_slab: v }))}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">{t('pages.settings.tax.exempt')}</SelectItem>
                          <SelectItem value="5">{t('pages.settings.tax.gst5')}</SelectItem>
                          <SelectItem value="12">{t('pages.settings.tax.gst12')}</SelectItem>
                          <SelectItem value="18">{t('pages.settings.tax.gst18')}</SelectItem>
                          <SelectItem value="28">{t('pages.settings.tax.gst28')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white text-[13px]">
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  {t('pages.settings.saveChanges')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tax Options */}
          {form.gst_enabled && (
            <Card className="border-border/60 shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-[14px] font-semibold">{t('pages.settings.tax.options')}</CardTitle>
                <CardDescription className="text-[12px]">{t('pages.settings.tax.optionsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                  <div>
                    <p className="text-[14px] font-medium text-foreground">{t('pages.settings.tax.compositionScheme')}</p>
                    <p className="text-[12px] text-muted-foreground">{t('pages.settings.tax.compositionSchemeDesc')}</p>
                  </div>
                  <Toggle enabled={form.gst_composition_scheme} onToggle={() => setForm(p => ({ ...p, gst_composition_scheme: !p.gst_composition_scheme }))} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                  <div>
                    <p className="text-[14px] font-medium text-foreground">{t('pages.settings.tax.inclusivePricing')}</p>
                    <p className="text-[12px] text-muted-foreground">{t('pages.settings.tax.inclusivePricingDesc')}</p>
                  </div>
                  <Toggle enabled={form.gst_inclusive_pricing} onToggle={() => setForm(p => ({ ...p, gst_inclusive_pricing: !p.gst_inclusive_pricing }))} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tax Slabs panel */}
        <div className="space-y-6">
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[14px] font-semibold">{t('pages.settings.tax.taxSlabs')}</CardTitle>
                  <CardDescription className="text-[12px]">{t('pages.settings.tax.taxSlabsDesc')}</CardDescription>
                </div>
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white text-[12px] h-8">
                      <Plus className="h-3.5 w-3.5 mr-1" /> {t('pages.settings.tax.addSlab')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('pages.settings.tax.addSlabTitle')}</DialogTitle>
                      <DialogDescription>{t('pages.settings.tax.addSlabDesc')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label className="text-[13px]">{t('pages.settings.tax.slabNameLabel')}</Label>
                          <Input className="h-10" placeholder={t('pages.settings.tax.slabNamePlaceholder')} value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-[13px]">{t('pages.settings.tax.rate')}</Label>
                          <Input type="number" step="0.01" className="h-10" placeholder={t('pages.settings.tax.ratePlaceholder')} value={addForm.rate} onChange={e => setAddForm(p => ({ ...p, rate: e.target.value }))} />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[13px]">{t('pages.settings.tax.hsnCode')}</Label>
                        <Input className="h-10" placeholder={t('pages.settings.tax.hsnPlaceholder')} value={addForm.hsn_code} onChange={e => setAddForm(p => ({ ...p, hsn_code: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[13px]">{t('pages.settings.tax.descriptionLabel')}</Label>
                        <Input className="h-10" placeholder={t('pages.settings.tax.descriptionPlaceholder')} value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddOpen(false)}>{t('pages.settings.cancel')}</Button>
                      <Button onClick={handleAddSlab} disabled={adding || !addForm.name || !addForm.rate} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white">
                        {adding && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        {t('pages.settings.tax.add')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {slabsLoading ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : slabs.length === 0 ? (
                <div className="px-6 py-10 text-center text-[13px] text-muted-foreground">{t('pages.settings.tax.noSlabs')}</div>
              ) : (
                <div className="divide-y divide-border/40">
                  {slabs.map((slab) => {
                    const rate = parseFloat(slab.rate)
                    const half = (rate / 2).toFixed(2)
                    return (
                      <div key={slab.id} className="flex items-center gap-4 px-5 py-3.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.08)]">
                          <span className="text-[12px] font-bold text-[hsl(var(--primary))]">{slab.rate}%</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-foreground truncate">{slab.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {rate > 0 ? `${t('pages.settings.tax.cgst')} ${half}% + ${t('pages.settings.tax.sgst')} ${half}%` : slab.description}
                            {slab.hsn_code && ` · HSN ${slab.hsn_code}`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteSlab(slab.id)}
                          className="rounded-md p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tax breakdown preview */}
          {form.gst_enabled && form.gst_state_code && (
            <Card className="border-border/60 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-[14px] font-semibold">{t('pages.settings.receipts.preview')}</CardTitle>
                <CardDescription className="text-[12px]">{t('pages.settings.tax.intraState')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-border/60 bg-muted/20 divide-y divide-border/40">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[12px] text-muted-foreground">{t('pages.settings.tax.cgst')} ({(parseFloat(form.gst_default_slab) / 2).toFixed(1)}%)</span>
                    <span className="text-[13px] font-medium font-mono text-foreground">₹{(1000 * parseFloat(form.gst_default_slab) / 200).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[12px] text-muted-foreground">{t('pages.settings.tax.sgst')} ({(parseFloat(form.gst_default_slab) / 2).toFixed(1)}%)</span>
                    <span className="text-[13px] font-medium font-mono text-foreground">₹{(1000 * parseFloat(form.gst_default_slab) / 200).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                    <span className="text-[12px] font-medium text-foreground">{t('pages.sales.total')} GST ({form.gst_default_slab}%)</span>
                    <span className="text-[13px] font-bold font-mono text-foreground">₹{(1000 * parseFloat(form.gst_default_slab) / 100).toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {t('pages.settings.tax.intraState')}: {form.gst_state_name || form.gst_state_code} · ₹1,000 {t('pages.sales.subtotal').toLowerCase()}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Notifications ─── */
function NotificationsSection({ store, loading, patchStore }: {
  store: Store | null; loading: boolean; patchStore: (d: Partial<Store>) => Promise<Store | null>
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    notify_low_stock: true,
    notify_daily_summary: false,
    notify_new_sale: false,
    notify_refund: true,
    demand_tracking_enabled: false,
    notify_demand_fulfilled: false,
    low_stock_threshold_default: 10,
    notification_email: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (store) {
      setForm({
        notify_low_stock: store.notify_low_stock ?? true,
        notify_daily_summary: store.notify_daily_summary ?? false,
        notify_new_sale: store.notify_new_sale ?? false,
        notify_refund: store.notify_refund ?? true,
        demand_tracking_enabled: store.demand_tracking_enabled ?? false,
        notify_demand_fulfilled: store.notify_demand_fulfilled ?? false,
        low_stock_threshold_default: store.low_stock_threshold_default ?? 10,
        notification_email: store.notification_email || '',
      })
    }
  }, [store])

  const handleSave = async () => {
    setSaving(true)
    await patchStore(form)
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  const alerts = [
    { key: 'notify_low_stock' as const, title: t('pages.settings.notifications.lowStockAlert'), desc: t('pages.settings.notifications.lowStockAlertDesc') },
    { key: 'notify_daily_summary' as const, title: t('pages.settings.notifications.dailySummary'), desc: t('pages.settings.notifications.dailySummaryDesc') },
    { key: 'notify_new_sale' as const, title: t('pages.settings.notifications.newSale'), desc: t('pages.settings.notifications.newSaleDesc') },
    { key: 'notify_refund' as const, title: t('pages.settings.notifications.refundProcessed'), desc: t('pages.settings.notifications.refundProcessedDesc') },
    { key: 'demand_tracking_enabled' as const, title: 'Demand Tracking', desc: 'Track customer requests for items not in stock' },
    { key: 'notify_demand_fulfilled' as const, title: 'Product Arrival Notifications', desc: 'Email customers when their requested products become available' },
  ]

  return (
    <div>
      <SectionHeader title={t('pages.settings.notifications.title')} description={t('pages.settings.notifications.desc')} />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr,340px] gap-6">
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-[14px] font-semibold">{t('pages.settings.notifications.alertPreferences')}</CardTitle>
            <CardDescription className="text-[12px]">{t('pages.settings.notifications.alertPreferencesDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((a) => (
              <div key={a.key} className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                <div>
                  <p className="text-[14px] font-medium text-foreground">{a.title}</p>
                  <p className="text-[12px] text-muted-foreground">{a.desc}</p>
                </div>
                <Toggle enabled={form[a.key]} onToggle={() => setForm(p => ({ ...p, [a.key]: !p[a.key] }))} />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-[14px] font-semibold">{t('pages.settings.notifications.notificationEmail')}</CardTitle>
              <CardDescription className="text-[12px]">{t('pages.settings.notifications.notificationEmailDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-[13px]">{t('pages.settings.notifications.emailAddress')}</Label>
                <Input type="email" placeholder="alerts@mystore.com" className="h-10" value={form.notification_email} onChange={e => setForm(p => ({ ...p, notification_email: e.target.value }))} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-[14px] font-semibold">{t('pages.settings.notifications.lowStockThreshold')}</CardTitle>
              <CardDescription className="text-[12px]">{t('pages.settings.notifications.lowStockThresholdDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-[13px]">{t('pages.settings.notifications.defaultThreshold')}</Label>
                <Input type="number" min="1" className="h-10" value={form.low_stock_threshold_default} onChange={e => setForm(p => ({ ...p, low_stock_threshold_default: parseInt(e.target.value) || 1 }))} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-[14px] font-semibold">Email Configuration</CardTitle>
              <CardDescription className="text-[12px]">SMTP settings for outgoing notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  Email notifications are sent from the email configured in your server environment. Contact your administrator to set up SMTP.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white text-[13px]">
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {t('pages.settings.saveChanges')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Security ─── */
function SecuritySection() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [pinForm, setPinForm] = useState({ pin: '' })
  const [changingPw, setChangingPw] = useState(false)
  const [changingPin, setChangingPin] = useState(false)
  const [sessions, setSessions] = useState<{ current: boolean; device: string; ip: string; last_active: string | null }[]>([])

  useEffect(() => {
    api.get('accounts/users/active_sessions/').then(res => setSessions(res.data.sessions || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (user?.pin) setPinForm({ pin: user.pin })
  }, [user])

  const handleChangePassword = async () => {
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast({ title: 'Error', description: 'New passwords do not match.', variant: 'destructive' })
      return
    }
    setChangingPw(true)
    try {
      await api.post('accounts/users/change_password/', { old_password: pwForm.old_password, new_password: pwForm.new_password })
      toast({ title: 'Password Changed', description: 'Your password has been updated successfully.' })
      setPwForm({ old_password: '', new_password: '', confirm_password: '' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to change password.'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setChangingPw(false)
    }
  }

  const handleUpdatePin = async () => {
    setChangingPin(true)
    try {
      await api.post('accounts/users/update_pin/', { pin: pinForm.pin })
      toast({ title: 'PIN Updated', description: pinForm.pin ? 'Your terminal PIN has been set.' : 'Terminal PIN has been removed.' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update PIN.'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setChangingPin(false)
    }
  }

  return (
    <div>
      <SectionHeader title={t('pages.settings.security.title')} description={t('pages.settings.security.desc')} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-[14px] font-semibold">{t('pages.settings.security.changePassword')}</CardTitle>
            <CardDescription className="text-[12px]">{t('pages.settings.security.changePasswordDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-[13px]">{t('pages.settings.security.currentPassword')}</Label>
              <Input type="password" className="h-10" value={pwForm.old_password} onChange={e => setPwForm(p => ({ ...p, old_password: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label className="text-[13px]">{t('pages.settings.security.newPassword')}</Label>
              <Input type="password" className="h-10" placeholder={t('pages.settings.security.newPasswordPlaceholder')} value={pwForm.new_password} onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label className="text-[13px]">{t('pages.settings.security.confirmNewPassword')}</Label>
              <Input type="password" className="h-10" value={pwForm.confirm_password} onChange={e => setPwForm(p => ({ ...p, confirm_password: e.target.value }))} />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPw || !pwForm.old_password || !pwForm.new_password} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white text-[13px]">
              {changingPw && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {t('pages.settings.security.updatePassword')}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-[14px] font-semibold">{t('pages.settings.security.terminalPin')}</CardTitle>
              <CardDescription className="text-[12px]">{t('pages.settings.security.terminalPinDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-[13px]">{t('pages.settings.security.pinCode')}</Label>
                <Input type="password" maxLength={6} placeholder="e.g. 1234" className="h-10 font-mono tracking-[0.5em] text-center" value={pinForm.pin} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setPinForm({ pin: v }) }} />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleUpdatePin} disabled={changingPin} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white text-[13px]">
                  {changingPin && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  {t('pages.settings.security.savePin')}
                </Button>
                {pinForm.pin && (
                  <Button variant="outline" className="text-[13px]" onClick={() => { setPinForm({ pin: '' }); api.post('accounts/users/update_pin/', { pin: '' }).then(() => toast({ title: 'PIN Removed' })) }}>
                    {t('pages.settings.security.removePin')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-[14px] font-semibold">{t('pages.settings.security.activeSessions')}</CardTitle>
              <CardDescription className="text-[12px]">{t('pages.settings.security.activeSessionsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">{t('pages.settings.security.noSessions')}</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-border/50 px-4 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.1)] mt-0.5">
                        <Shield className="h-4 w-4 text-[hsl(var(--primary))]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium text-foreground truncate">
                            {s.device.length > 60 ? s.device.slice(0, 60) + '...' : s.device}
                          </p>
                          {s.current && <Badge className="bg-[hsl(var(--color-success)/0.1)] text-[hsl(var(--color-success))] hover:bg-[hsl(var(--color-success)/0.1)] text-[10px] border-0">{t('pages.settings.security.current')}</Badge>}
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-0.5">IP: {s.ip}{s.last_active ? ` · Last active: ${new Date(s.last_active).toLocaleDateString()}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ─── Appearance ─── */
function AppearanceSection({ store, loading, patchStore }: {
  store: Store | null; loading: boolean; patchStore: (d: Partial<Store>) => Promise<Store | null>
}) {
  const { t } = useTranslation()
  const { setTheme, setAccentColor, setCompactMode, setSidebarCollapsed } = useThemeStore()
  const [form, setForm] = useState({
    appearance_theme: 'light' as 'light' | 'dark' | 'system',
    appearance_accent_color: 'indigo' as string,
    appearance_compact_mode: false,
    appearance_sidebar_collapsed: false,
  })
  const [saving, setSaving] = useState(false)
  const [hexInput, setHexInput] = useState('')

  const storeId = store?.id
  useEffect(() => {
    if (store) {
      const theme = (store.appearance_theme || 'light') as 'light' | 'dark' | 'system'
      const accent = store.appearance_accent_color || 'indigo'
      setForm({
        appearance_theme: theme,
        appearance_accent_color: accent,
        appearance_compact_mode: store.appearance_compact_mode ?? false,
        appearance_sidebar_collapsed: store.appearance_sidebar_collapsed ?? false,
      })
      setTheme(theme)
      setAccentColor(accent)
      setCompactMode(store.appearance_compact_mode ?? false)
      setSidebarCollapsed(store.appearance_sidebar_collapsed ?? false)
      if (accent.startsWith('#')) setHexInput(accent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  const handleThemeChange = (value: 'light' | 'dark' | 'system') => {
    setForm(p => ({ ...p, appearance_theme: value }))
    setTheme(value)
  }

  const handleColorChange = (value: string) => {
    setForm(p => ({ ...p, appearance_accent_color: value }))
    setAccentColor(value)
    setHexInput('')
  }

  const handleCompactToggle = () => {
    const v = !form.appearance_compact_mode
    setForm(p => ({ ...p, appearance_compact_mode: v }))
    setCompactMode(v)
  }

  const handleCollapsedToggle = () => {
    const v = !form.appearance_sidebar_collapsed
    setForm(p => ({ ...p, appearance_sidebar_collapsed: v }))
    setSidebarCollapsed(v)
  }

  const handleSave = async () => {
    setSaving(true)
    await patchStore(form)
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  const themes = [
    { value: 'light', label: t('pages.settings.appearance.light'), desc: t('pages.settings.appearance.lightDesc') },
    { value: 'dark', label: t('pages.settings.appearance.dark'), desc: t('pages.settings.appearance.darkDesc') },
    { value: 'system', label: t('pages.settings.appearance.system'), desc: t('pages.settings.appearance.systemDesc') },
  ]

  const colors = [
    { value: 'indigo', label: 'Indigo', swatch: 'bg-indigo-500' },
    { value: 'blue', label: 'Blue', swatch: 'bg-blue-500' },
    { value: 'violet', label: 'Violet', swatch: 'bg-violet-500' },
    { value: 'emerald', label: 'Emerald', swatch: 'bg-emerald-500' },
    { value: 'rose', label: 'Rose', swatch: 'bg-rose-500' },
    { value: 'amber', label: 'Amber', swatch: 'bg-amber-500' },
    { value: 'slate', label: 'Slate', swatch: 'bg-slate-500' },
  ]

  const isCustomHex = form.appearance_accent_color.startsWith('#')

  return (
    <div>
      <SectionHeader title={t('pages.settings.appearance.title')} description={t('pages.settings.appearance.desc')} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-[14px] font-semibold">{t('pages.settings.appearance.theme')}</CardTitle>
            <CardDescription className="text-[12px]">{t('pages.settings.appearance.themeDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => handleThemeChange(t.value as 'light' | 'dark' | 'system')}
                className={cn(
                  'flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors',
                  form.appearance_theme === t.value
                    ? 'border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.03)]'
                    : 'border-border/60 hover:border-border'
                )}
              >
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
                  t.value === 'light' ? 'bg-white border-gray-200' : t.value === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-gradient-to-br from-white to-slate-900 border-gray-300'
                )}>
                  <SunMoon className={cn('h-4 w-4', t.value === 'dark' ? 'text-slate-400' : 'text-slate-600')} />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-foreground">{t.label}</p>
                  <p className="text-[12px] text-muted-foreground">{t.desc}</p>
                </div>
                <div className={cn(
                  'h-5 w-5 rounded-full border-2 flex items-center justify-center',
                  form.appearance_theme === t.value ? 'border-[hsl(var(--primary))]' : 'border-border'
                )}>
                  {form.appearance_theme === t.value && <div className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))]" />}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-[14px] font-semibold">{t('pages.settings.appearance.accentColor')}</CardTitle>
              <CardDescription className="text-[12px]">{t('pages.settings.appearance.accentColorDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => handleColorChange(c.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors',
                      !isCustomHex && form.appearance_accent_color === c.value
                        ? 'border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.03)]'
                        : 'border-border/60 hover:border-border'
                    )}
                  >
                    <div className={cn('h-8 w-8 rounded-full', c.swatch)} />
                    <span className="text-[11px] font-medium text-foreground">{c.label}</span>
                  </button>
                ))}
              </div>

              <Separator />

              <div>
                <Label className="text-[13px] mb-2 block">{t('pages.settings.appearance.customColor')}</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground font-mono">#</span>
                    <Input
                      className="h-10 pl-7 font-mono uppercase"
                      placeholder="5B4FD6"
                      maxLength={6}
                      value={hexInput.replace('#', '')}
                      onChange={e => {
                        const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
                        setHexInput(v)
                        if (v.length === 6) {
                          const hex = `#${v}`
                          setForm(p => ({ ...p, appearance_accent_color: hex }))
                          setAccentColor(hex)
                        }
                      }}
                    />
                  </div>
                  <div
                    className="h-10 w-10 rounded-lg border border-border/60 shrink-0"
                    style={{ backgroundColor: hexInput.length === 6 ? `#${hexInput}` : isCustomHex ? form.appearance_accent_color : 'hsl(var(--primary))' }}
                  />
                  <input
                    type="color"
                    className="h-10 w-10 rounded-lg border border-border/60 cursor-pointer shrink-0 p-0.5"
                    value={hexInput.length === 6 ? `#${hexInput}` : isCustomHex ? form.appearance_accent_color : '#5B4FD6'}
                    onChange={e => {
                      const hex = e.target.value
                      setHexInput(hex.replace('#', ''))
                      setForm(p => ({ ...p, appearance_accent_color: hex }))
                      setAccentColor(hex)
                    }}
                  />
                </div>
                {isCustomHex && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {t('pages.settings.appearance.usingCustomColor')}: <span className="font-mono font-medium text-foreground">{form.appearance_accent_color}</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-[14px] font-semibold">{t('pages.settings.appearance.layout')}</CardTitle>
              <CardDescription className="text-[12px]">{t('pages.settings.appearance.layoutDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                <div>
                  <p className="text-[14px] font-medium text-foreground">{t('pages.settings.appearance.compactMode')}</p>
                  <p className="text-[12px] text-muted-foreground">{t('pages.settings.appearance.compactModeDesc')}</p>
                </div>
                <Toggle enabled={form.appearance_compact_mode} onToggle={handleCompactToggle} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                <div>
                  <p className="text-[14px] font-medium text-foreground">{t('pages.settings.appearance.collapsedSidebar')}</p>
                  <p className="text-[12px] text-muted-foreground">{t('pages.settings.appearance.collapsedSidebarDesc')}</p>
                </div>
                <Toggle enabled={form.appearance_sidebar_collapsed} onToggle={handleCollapsedToggle} />
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white text-[13px]">
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {t('pages.settings.saveChanges')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Regional ─── */
function RegionalSection({ store, loading, patchStore }: {
  store: Store | null; loading: boolean; patchStore: (d: Partial<Store>) => Promise<Store | null>
}) {
  const { t, i18n } = useTranslation()
  const { setLanguage } = useThemeStore()
  const [form, setForm] = useState({
    locale_language: 'en',
    locale_timezone: 'UTC',
    locale_date_format: 'MM/DD/YYYY',
    locale_time_format: '12h',
    locale_number_format: '1,234.56',
    currency: 'USD',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (store) {
      const lang = store.locale_language || 'en'
      setForm({
        locale_language: lang,
        locale_timezone: store.locale_timezone || 'UTC',
        locale_date_format: store.locale_date_format || 'MM/DD/YYYY',
        locale_time_format: store.locale_time_format || '12h',
        locale_number_format: store.locale_number_format || '1,234.56',
        currency: store.currency || 'USD',
      })
      setLanguage(lang)
      i18n.changeLanguage(lang)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id])

  const handleLanguageChange = (lang: string) => {
    setForm(p => ({ ...p, locale_language: lang }))
    setLanguage(lang)
    i18n.changeLanguage(lang)
  }

  const handleSave = async () => {
    setSaving(true)
    await patchStore(form)
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  const now = new Date()
  const previewDate = form.locale_date_format === 'DD/MM/YYYY'
    ? `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
    : form.locale_date_format === 'YYYY-MM-DD'
      ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      : `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`
  const previewTime = form.locale_time_format === '24h'
    ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    : `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`
  const previewNumber = form.locale_number_format === '1.234,56' ? '1.234,56' : form.locale_number_format === '1 234.56' ? '1 234.56' : '1,234.56'
  const currencySymbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CNY: '¥', AUD: 'A$', CAD: 'C$', CHF: 'Fr', MXN: 'Mex$', BRL: 'R$', AED: 'د.إ', SAR: '﷼' }
  const currSymbol = currencySymbols[form.currency] || form.currency

  return (
    <div>
      <SectionHeader title={t('pages.settings.regional.title')} description={t('pages.settings.regional.desc')} />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr,320px] gap-6">
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-[14px] font-semibold">{t('pages.settings.regional.localeFormatting')}</CardTitle>
            <CardDescription className="text-[12px]">{t('pages.settings.regional.localeFormattingDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[13px]">{t('pages.settings.regional.language')}</Label>
                <Select value={form.locale_language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="hi">हिन्दी</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">{t('pages.settings.regional.timezone')}</Label>
                <Select value={form.locale_timezone} onValueChange={v => setForm(p => ({ ...p, locale_timezone: v }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Europe/Berlin">Berlin (CET)</SelectItem>
                    <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                    <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-[13px]">{t('pages.settings.regional.currency')}</Label>
              <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD — US Dollar ($)</SelectItem>
                  <SelectItem value="EUR">EUR — Euro (€)</SelectItem>
                  <SelectItem value="GBP">GBP — British Pound (£)</SelectItem>
                  <SelectItem value="INR">INR — Indian Rupee (₹)</SelectItem>
                  <SelectItem value="JPY">JPY — Japanese Yen (¥)</SelectItem>
                  <SelectItem value="CNY">CNY — Chinese Yuan (¥)</SelectItem>
                  <SelectItem value="AUD">AUD — Australian Dollar (A$)</SelectItem>
                  <SelectItem value="CAD">CAD — Canadian Dollar (C$)</SelectItem>
                  <SelectItem value="CHF">CHF — Swiss Franc (Fr)</SelectItem>
                  <SelectItem value="MXN">MXN — Mexican Peso (Mex$)</SelectItem>
                  <SelectItem value="BRL">BRL — Brazilian Real (R$)</SelectItem>
                  <SelectItem value="AED">AED — UAE Dirham (د.إ)</SelectItem>
                  <SelectItem value="SAR">SAR — Saudi Riyal (﷼)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-1" />

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label className="text-[13px]">{t('pages.settings.regional.dateFormat')}</Label>
                <Select value={form.locale_date_format} onValueChange={v => setForm(p => ({ ...p, locale_date_format: v }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">{t('pages.settings.regional.timeFormat')}</Label>
                <Select value={form.locale_time_format} onValueChange={v => setForm(p => ({ ...p, locale_time_format: v }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                    <SelectItem value="24h">24-hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-[13px]">{t('pages.settings.regional.numberFormat')}</Label>
                <Select value={form.locale_number_format} onValueChange={v => setForm(p => ({ ...p, locale_number_format: v }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1,234.56">1,234.56</SelectItem>
                    <SelectItem value="1.234,56">1.234,56</SelectItem>
                    <SelectItem value="1 234.56">1 234.56</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <Button onClick={handleSave} disabled={saving} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white text-[13px]">
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {t('pages.settings.saveChanges')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-none h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] font-semibold">{t('pages.settings.regional.formatPreview')}</CardTitle>
            <CardDescription className="text-[12px]">{t('pages.settings.regional.formatPreviewDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border/60 bg-muted/20 divide-y divide-border/40">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[12px] text-muted-foreground">{t('pages.settings.regional.date')}</span>
                <span className="text-[13px] font-medium font-mono text-foreground">{previewDate}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[12px] text-muted-foreground">{t('pages.settings.regional.time')}</span>
                <span className="text-[13px] font-medium font-mono text-foreground">{previewTime}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[12px] text-muted-foreground">{t('pages.settings.regional.currency')}</span>
                <span className="text-[13px] font-medium font-mono text-foreground">{currSymbol}{previewNumber}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[12px] text-muted-foreground">{t('pages.settings.regional.timezone')}</span>
                <span className="text-[13px] font-medium font-mono text-foreground">{form.locale_timezone}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ─── Settings Page ─── */
export function SettingsPage() {
  const { t } = useTranslation()

  const sections = [
    { id: 'store', label: t('pages.settings.tabs.store'), icon: StoreIcon },
    { id: 'users', label: t('pages.settings.tabs.users'), icon: Users },
    { id: 'payments', label: t('pages.settings.tabs.payments'), icon: CreditCard },
    { id: 'receipts', label: t('pages.settings.tabs.receipts'), icon: Printer },
    { id: 'tax', label: t('pages.settings.tabs.tax'), icon: IndianRupee },
    { id: 'notifications', label: t('pages.settings.tabs.notifications'), icon: Bell },
    { id: 'security', label: t('pages.settings.tabs.security'), icon: Shield },
    { id: 'appearance', label: t('pages.settings.tabs.appearance'), icon: Palette },
    { id: 'regional', label: t('pages.settings.tabs.regional'), icon: Globe },
  ]

  const getTabFromHash = () => {
    const hash = window.location.hash.replace('#', '')
    return sectionIds.includes(hash) ? hash : 'store'
  }
  const [active, setActiveState] = useState(getTabFromHash)
  const { store, loading, patchStore, fetchStore } = useStore()

  const setActive = (tab: string) => {
    setActiveState(tab)
    window.history.replaceState(null, '', `#${tab}`)
  }

  useEffect(() => {
    const handler = () => setActiveState(getTabFromHash())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  /* ─── content map ─── */
  const sectionContent: Record<string, React.ReactNode> = {
    store: <StoreInfoSection store={store} loading={loading} patchStore={patchStore} fetchStore={fetchStore} />,
    users: <UsersSection />,
    payments: <PaymentsSection store={store} loading={loading} patchStore={patchStore} />,
    receipts: <ReceiptsSection store={store} loading={loading} patchStore={patchStore} />,
    tax: <TaxGstSection store={store} loading={loading} patchStore={patchStore} />,
    notifications: <NotificationsSection store={store} loading={loading} patchStore={patchStore} />,
    security: <SecuritySection />,
    appearance: <AppearanceSection store={store} loading={loading} patchStore={patchStore} />,
    regional: <RegionalSection store={store} loading={loading} patchStore={patchStore} />,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' as const }}
      className="flex h-[calc(100vh-3.5rem-3rem)] gap-0 -m-6 lg:-m-8"
    >
      {/* Settings Sidebar */}
      <div className="w-[240px] shrink-0 border-r border-border/60 bg-[hsl(var(--color-surface-raised))] py-5 px-3 overflow-y-auto">
        <p className="px-3 mb-4 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
          {t('pages.settings.title')}
        </p>
        <nav className="space-y-0.5">
          {sections.map((section) => (
            <motion.button
              key={section.id}
              onClick={() => setActive(section.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 text-left',
                active === section.id
                  ? 'bg-[hsl(var(--primary))] text-white'
                  : 'text-muted-foreground hover:bg-[hsl(var(--primary)/0.06)] hover:text-foreground'
              )}
              whileTap={{ scale: 0.98 }}
            >
              <section.icon
                className={cn('h-[16px] w-[16px]', active === section.id ? 'text-white/80' : '')}
                strokeWidth={active === section.id ? 2 : 1.75}
              />
              {section.label}
            </motion.button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: 'easeOut' as const }}
            className="p-8 lg:p-10"
          >
            {sectionContent[active]}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
