import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard, X } from 'lucide-react'
import { useHotkey } from '@/hooks/use-hotkeys'

interface ShortcutGroup {
  title: string
  shortcuts: { keys: string[]; description: string }[]
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Alt', '1'], description: 'Dashboard' },
      { keys: ['Alt', '2'], description: 'Products' },
      { keys: ['Alt', '3'], description: 'Sales / POS' },
      { keys: ['Alt', '4'], description: 'Terminals' },
      { keys: ['Alt', '5'], description: 'Inventory' },
      { keys: ['Alt', '6'], description: 'Demand' },
      { keys: ['Alt', '7'], description: 'Sales History' },
      { keys: ['Alt', '8'], description: 'Settings' },
      { keys: ['Alt', 'S'], description: 'Focus search' },
    ],
  },
  {
    title: 'POS Terminal',
    shortcuts: [
      { keys: ['F2'], description: 'Focus barcode / search' },
      { keys: ['F4'], description: 'Clear cart' },
      { keys: ['F9'], description: 'Cash payment' },
      { keys: ['F10'], description: 'Card payment' },
      { keys: ['F11'], description: 'Mobile payment' },
      { keys: ['F12'], description: 'Charge / Checkout' },
      { keys: ['Esc'], description: 'Close dialog / New sale' },
    ],
  },
  {
    title: 'Products',
    shortcuts: [
      { keys: ['Alt', 'N'], description: 'Add new product' },
      { keys: ['F2'], description: 'Focus search' },
    ],
  },
  {
    title: 'Inventory',
    shortcuts: [
      { keys: ['F2'], description: 'Focus search' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Show / hide this panel' },
      { keys: ['Esc'], description: 'Close dialog' },
    ],
  },
]

export function ShortcutHelp() {
  const [open, setOpen] = useState(false)

  useHotkey('shift+/', () => setOpen((v) => !v), [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground/60 shadow-sm hover:text-foreground hover:border-foreground/20 transition-colors"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' as const }}
              className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-border/60 bg-card p-8 shadow-xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.1)]">
                  <Keyboard className="h-5 w-5 text-[hsl(var(--primary))]" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">Keyboard Shortcuts</h2>
                  <p className="text-[13px] text-muted-foreground">Speed up your workflow</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {shortcutGroups.map((group) => (
                  <div key={group.title}>
                    <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      {group.title}
                    </h3>
                    <div className="space-y-1.5">
                      {group.shortcuts.map((s) => (
                        <div
                          key={s.description}
                          className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors"
                        >
                          <span className="text-[13px] text-foreground">{s.description}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {s.keys.map((k, i) => (
                              <span key={i} className="inline-flex items-center">
                                {i > 0 && <span className="text-[10px] text-muted-foreground mx-0.5">+</span>}
                                <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md border border-border/80 bg-muted/40 px-1.5 text-[11px] font-medium text-muted-foreground font-mono">
                                  {k}
                                </kbd>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-border/40 text-center">
                <p className="text-[12px] text-muted-foreground">
                  Press <kbd className="inline-flex h-5 min-w-[18px] items-center justify-center rounded border border-border/80 bg-muted/40 px-1 text-[10px] font-mono font-medium text-muted-foreground mx-0.5">?</kbd> anytime to toggle this panel
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
