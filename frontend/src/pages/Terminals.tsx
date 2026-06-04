import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Monitor,
  Plus,
  Power,
  MoreHorizontal,
  Pencil,
  Trash2,
  ToggleLeft,
  Loader2,
  Clock,
  User,
  DollarSign,
} from 'lucide-react'
import api from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/stores/authStore'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Terminal } from '@/types'

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

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function sessionDuration(openedAt: string): string {
  const now = Date.now()
  const then = new Date(openedAt).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hrs > 0) return `${hrs}h ${remMins}m`
  return `${mins}m`
}

interface TerminalFormData {
  name: string
  device_id: string
}

const emptyTerminalForm: TerminalFormData = {
  name: '',
  device_id: '',
}

export function Terminals() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)

  const [terminals, setTerminals] = useState<Terminal[]>([])
  const [loading, setLoading] = useState(true)
  const [storeId, setStoreId] = useState<number | null>(null)

  // Add/Edit dialog
  const [terminalDialogOpen, setTerminalDialogOpen] = useState(false)
  const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null)
  const [terminalForm, setTerminalForm] = useState<TerminalFormData>(emptyTerminalForm)
  const [saving, setSaving] = useState(false)

  // Open session dialog
  const [openSessionDialog, setOpenSessionDialog] = useState(false)
  const [openSessionTerminal, setOpenSessionTerminal] = useState<Terminal | null>(null)
  const [openingBalance, setOpeningBalance] = useState('')
  const [openingSession, setOpeningSession] = useState(false)

  // Close session dialog
  const [closeSessionDialog, setCloseSessionDialog] = useState(false)
  const [closeSessionTerminal, setCloseSessionTerminal] = useState<Terminal | null>(null)
  const [closingBalance, setClosingBalance] = useState('')
  const [closingSession, setClosingSession] = useState(false)

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    id: number
    name: string
  }>({ open: false, id: 0, name: '' })
  const [deleting, setDeleting] = useState(false)

  const fetchStore = useCallback(async () => {
    try {
      const res = await api.get('accounts/stores/my_store/')
      setStoreId(res.data.id)
    } catch {
      // store fetch failed
    }
  }, [])

  const fetchTerminals = useCallback(async () => {
    try {
      const res = await api.get('accounts/terminals/')
      setTerminals(Array.isArray(res.data) ? res.data : res.data.results ?? [])
    } catch {
      toast({ title: 'Failed to load terminals', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchStore()
    fetchTerminals()
  }, [fetchStore, fetchTerminals])

  // --- Add / Edit ---
  const openAddDialog = () => {
    setEditingTerminal(null)
    setTerminalForm(emptyTerminalForm)
    setTerminalDialogOpen(true)
  }

  const openEditDialog = (terminal: Terminal) => {
    setEditingTerminal(terminal)
    setTerminalForm({ name: terminal.name, device_id: terminal.device_id })
    setTerminalDialogOpen(true)
  }

  const handleSaveTerminal = async () => {
    if (!terminalForm.name.trim()) return
    setSaving(true)
    try {
      if (editingTerminal) {
        await api.patch(`accounts/terminals/${editingTerminal.id}/`, {
          name: terminalForm.name,
          device_id: terminalForm.device_id,
        })
        toast({ title: 'Terminal updated' })
      } else {
        await api.post('accounts/terminals/', {
          name: terminalForm.name,
          device_id: terminalForm.device_id,
          store: storeId,
        })
        toast({ title: 'Terminal created' })
      }
      setTerminalDialogOpen(false)
      fetchTerminals()
    } catch {
      toast({ title: 'Failed to save terminal', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // --- Toggle Active ---
  const handleToggleActive = async (terminal: Terminal) => {
    try {
      await api.patch(`accounts/terminals/${terminal.id}/`, {
        is_active: !terminal.is_active,
      })
      toast({ title: terminal.is_active ? 'Terminal deactivated' : 'Terminal activated' })
      fetchTerminals()
    } catch {
      toast({ title: 'Failed to update terminal', variant: 'destructive' })
    }
  }

  // --- Delete ---
  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`accounts/terminals/${deleteDialog.id}/`)
      toast({ title: 'Terminal deleted' })
      setDeleteDialog({ open: false, id: 0, name: '' })
      fetchTerminals()
    } catch {
      toast({ title: 'Failed to delete terminal', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  // --- Open Session ---
  const handleOpenSession = async () => {
    if (!openSessionTerminal) return
    setOpeningSession(true)
    try {
      await api.post(`accounts/terminals/${openSessionTerminal.id}/open_session/`, {
        opening_balance: parseFloat(openingBalance) || 0,
      })
      toast({ title: 'Session opened' })
      setOpenSessionDialog(false)
      setOpeningBalance('')
      fetchTerminals()
    } catch {
      toast({ title: 'Failed to open session', variant: 'destructive' })
    } finally {
      setOpeningSession(false)
    }
  }

  // --- Close Session ---
  const handleCloseSession = async () => {
    if (!closeSessionTerminal) return
    setClosingSession(true)
    try {
      await api.post(`accounts/terminals/${closeSessionTerminal.id}/close_session/`, {
        closing_balance: parseFloat(closingBalance) || 0,
      })
      toast({ title: 'Session closed' })
      setCloseSessionDialog(false)
      setClosingBalance('')
      fetchTerminals()
    } catch {
      toast({ title: 'Failed to close session', variant: 'destructive' })
    } finally {
      setClosingSession(false)
    }
  }

  const isActiveSession = (terminal: Terminal) => terminal.current_cashier !== null
  const isCurrentUserCashier = (terminal: Terminal) =>
    user && terminal.current_cashier === user.id

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

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
            {t('pages.terminals.title')}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {t('pages.terminals.subtitle')}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openAddDialog}
          className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t('pages.terminals.addTerminal')}
        </motion.button>
      </motion.div>

      {/* Grid or Empty State */}
      {terminals.length === 0 ? (
        <motion.div
          variants={item}
          className="rounded-xl border border-border/60 bg-card"
        >
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="relative mb-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
                <Monitor className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border/60">
                <Power className="h-3 w-3 text-muted-foreground/40" />
              </div>
            </div>
            <p className="text-[15px] font-medium text-foreground/70 mb-1">
              {t('pages.terminals.noTerminals')}
            </p>
            <p className="text-[13px] text-muted-foreground text-center max-w-sm mb-6">
              {t('pages.terminals.noTerminalsDesc')}
            </p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={openAddDialog}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('pages.terminals.createFirst')}
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          variants={item}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {terminals.map((terminal) => {
            const active = isActiveSession(terminal)
            const isMyCashier = isCurrentUserCashier(terminal)

            return (
              <motion.div
                key={terminal.id}
                variants={item}
                className="rounded-xl border border-border/60 bg-card p-5 flex flex-col gap-4"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-[15px] font-semibold text-foreground truncate">
                      {terminal.name}
                    </h3>
                    {terminal.device_id && (
                      <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                        {terminal.device_id}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => openEditDialog(terminal)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(terminal)}>
                        <ToggleLeft className="mr-2 h-3.5 w-3.5" />
                        {terminal.is_active ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() =>
                          setDeleteDialog({
                            open: true,
                            id: terminal.id,
                            name: terminal.name,
                          })
                        }
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      !terminal.is_active
                        ? 'bg-gray-400'
                        : active
                          ? 'bg-emerald-500'
                          : 'bg-gray-400'
                    }`}
                  />
                  <span
                    className={`text-[12px] font-medium ${
                      !terminal.is_active
                        ? 'text-gray-500'
                        : active
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {!terminal.is_active
                      ? 'Inactive'
                      : active
                        ? 'Active Session'
                        : 'Idle'}
                  </span>
                </div>

                {/* Session Info */}
                {active && (
                  <div className="space-y-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-800/30 p-3">
                    {terminal.current_cashier_name && (
                      <div className="flex items-center gap-2 text-[12px] text-foreground/80">
                        <User className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{terminal.current_cashier_name}</span>
                      </div>
                    )}
                    {terminal.opened_at && (
                      <div className="flex items-center gap-2 text-[12px] text-foreground/80">
                        <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Opened {relativeTime(terminal.opened_at)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[12px] text-foreground/80">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Opening: {parseFloat(terminal.opening_balance).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {!active && terminal.closed_at && (
                  <div className="space-y-2 rounded-lg bg-muted/40 border border-border/40 p-3">
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Closed {relativeTime(terminal.closed_at)}</span>
                    </div>
                    {terminal.closing_balance !== null && (
                      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>
                          Closing: {parseFloat(terminal.closing_balance).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-auto pt-1">
                  {terminal.is_active && !active && (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setOpenSessionTerminal(terminal)
                        setOpeningBalance('')
                        setOpenSessionDialog(true)
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-[13px] font-medium text-white transition-colors"
                    >
                      <Power className="h-3.5 w-3.5" />
                      Open Session
                    </motion.button>
                  )}
                  {active && isMyCashier && (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setCloseSessionTerminal(terminal)
                        setClosingBalance('')
                        setCloseSessionDialog(true)
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-2 text-[13px] font-medium text-white transition-colors"
                    >
                      <Power className="h-3.5 w-3.5" />
                      Close Session
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Add / Edit Terminal Dialog */}
      <Dialog open={terminalDialogOpen} onOpenChange={setTerminalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTerminal ? 'Edit Terminal' : 'Add Terminal'}
            </DialogTitle>
            <DialogDescription>
              {editingTerminal
                ? 'Update terminal details.'
                : 'Create a new terminal for your store.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="terminal-name">Name</Label>
              <Input
                id="terminal-name"
                value={terminalForm.name}
                onChange={(e) =>
                  setTerminalForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Register 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="terminal-device-id">Device ID (optional)</Label>
              <Input
                id="terminal-device-id"
                value={terminalForm.device_id}
                onChange={(e) =>
                  setTerminalForm((f) => ({ ...f, device_id: e.target.value }))
                }
                placeholder="Physical device identifier"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setTerminalDialogOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTerminal}
              disabled={saving || !terminalForm.name.trim()}
              className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingTerminal ? 'Update' : 'Create'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open Session Dialog */}
      <Dialog open={openSessionDialog} onOpenChange={setOpenSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Session</DialogTitle>
            <DialogDescription>
              Opening session for{' '}
              <span className="font-medium text-foreground">
                {openSessionTerminal?.name}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="opening-balance">Opening Balance (Cash Drawer)</Label>
              <Input
                id="opening-balance"
                type="number"
                min="0"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setOpenSessionDialog(false)}
              className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              onClick={handleOpenSession}
              disabled={openingSession}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {openingSession && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Open Session
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Session Dialog */}
      <Dialog open={closeSessionDialog} onOpenChange={setCloseSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Session</DialogTitle>
            <DialogDescription>
              Closing session for{' '}
              <span className="font-medium text-foreground">
                {closeSessionTerminal?.name}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {closeSessionTerminal?.current_cashier_name && (
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Cashier: {closeSessionTerminal.current_cashier_name}</span>
              </div>
            )}
            {closeSessionTerminal?.opened_at && (
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Session duration: {sessionDuration(closeSessionTerminal.opened_at)}
                </span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="closing-balance">Closing Balance</Label>
              <Input
                id="closing-balance"
                type="number"
                min="0"
                step="0.01"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setCloseSessionDialog(false)}
              className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              onClick={handleCloseSession}
              disabled={closingSession}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {closingSession && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Close Session
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((d) => ({ ...d, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Terminal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {deleteDialog.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteDialog({ open: false, id: 0, name: '' })}
              className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
