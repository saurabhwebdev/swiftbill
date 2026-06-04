import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationControlsProps {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function PaginationControls({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationControlsProps) {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  return (
    <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
      <p className="text-[12px] text-muted-foreground">
        {from}–{to} of {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors', page <= 1 ? 'opacity-30' : 'hover:bg-muted/60 hover:text-foreground')}
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors', page <= 1 ? 'opacity-30' : 'hover:bg-muted/60 hover:text-foreground')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let p: number
          if (totalPages <= 5) {
            p = i + 1
          } else if (page <= 3) {
            p = i + 1
          } else if (page >= totalPages - 2) {
            p = totalPages - 4 + i
          } else {
            p = page - 2 + i
          }
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-medium transition-colors',
                p === page
                  ? 'bg-[hsl(var(--primary))] text-white'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              {p}
            </button>
          )
        })}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors', page >= totalPages ? 'opacity-30' : 'hover:bg-muted/60 hover:text-foreground')}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors', page >= totalPages ? 'opacity-30' : 'hover:bg-muted/60 hover:text-foreground')}
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
