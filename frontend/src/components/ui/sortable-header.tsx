import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SortableHeaderProps {
  label: string
  field: string
  currentSort: string
  onSort: (field: string) => void
  className?: string
}

export function SortableHeader({ label, field, currentSort, onSort, className }: SortableHeaderProps) {
  const isActive = currentSort === field || currentSort === `-${field}`
  const isDesc = currentSort === `-${field}`

  return (
    <button
      onClick={() => {
        if (currentSort === field) onSort(`-${field}`)
        else if (currentSort === `-${field}`) onSort('')
        else onSort(field)
      }}
      className={cn('flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider hover:text-foreground transition-colors', isActive ? 'text-foreground' : 'text-muted-foreground', className)}
    >
      {label}
      {isActive ? (
        isDesc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  )
}
