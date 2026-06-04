import { useEffect, useRef, useCallback } from 'react'

interface UseBarcodeScanOptions {
  onScan: (barcode: string) => void
  minLength?: number
  maxDelay?: number
  enabled?: boolean
}

export function useBarcodeScan({
  onScan,
  minLength = 4,
  maxDelay = 50,
  enabled = true,
}: UseBarcodeScanOptions) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const reset = useCallback(() => {
    bufferRef.current = ''
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      const now = Date.now()
      const timeSinceLastKey = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      // If too much time passed, start fresh
      if (timeSinceLastKey > maxDelay && bufferRef.current.length > 0) {
        bufferRef.current = ''
      }

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          const barcode = bufferRef.current.trim()
          // Prevent the Enter from doing anything else
          e.preventDefault()
          e.stopPropagation()
          onScanRef.current(barcode)
        }
        reset()
        return
      }

      // Only accept printable characters (single char keys)
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Check if this is rapid input (scanner speed)
        if (bufferRef.current.length === 0 || timeSinceLastKey <= maxDelay) {
          bufferRef.current += e.key
        } else {
          // Too slow — this is human typing, reset
          bufferRef.current = e.key
        }

        // Set a timeout to clear buffer if no more keys come
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(reset, maxDelay * 3)
      }
    }

    document.addEventListener('keydown', handler, true)
    return () => {
      document.removeEventListener('keydown', handler, true)
      reset()
    }
  }, [enabled, minLength, maxDelay, reset])
}
