import { useEffect, useRef } from 'react'

function isInputFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable
}

interface ParsedKey {
  ctrl: boolean
  alt: boolean
  shift: boolean
  key: string
}

function parseKey(combo: string): ParsedKey {
  const parts = combo.toLowerCase().split('+').map(p => p.trim())
  return {
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    key: parts.filter(p => !['ctrl', 'control', 'alt', 'shift'].includes(p))[0] || '',
  }
}

function matchesEvent(e: KeyboardEvent, parsed: ParsedKey): boolean {
  const eventKey = e.key.toLowerCase()
  const keyMatch =
    eventKey === parsed.key ||
    e.code.toLowerCase() === parsed.key ||
    e.code.toLowerCase() === `key${parsed.key}` ||
    e.code.toLowerCase() === `digit${parsed.key}`

  return (
    keyMatch &&
    e.ctrlKey === parsed.ctrl &&
    e.altKey === parsed.alt &&
    e.shiftKey === parsed.shift
  )
}

export function useHotkey(combo: string, callback: () => void, deps: unknown[] = []) {
  const cbRef = useRef(callback)
  cbRef.current = callback
  const parsed = parseKey(combo)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (parsed.key === '/' && !parsed.shift && isInputFocused()) return
      if (matchesEvent(e, parsed)) {
        e.preventDefault()
        e.stopPropagation()
        cbRef.current()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combo, ...deps])
}

export function useHotkeys(bindings: Record<string, () => void>, deps: unknown[] = []) {
  const bindingsRef = useRef(bindings)
  bindingsRef.current = bindings

  const parsedRef = useRef<{ parsed: ParsedKey; key: string }[]>([])
  parsedRef.current = Object.keys(bindings).map(k => ({ parsed: parseKey(k), key: k }))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const { parsed, key } of parsedRef.current) {
        // Skip '?' (shift+/) when typing in inputs
        if (key === 'shift+/' && isInputFocused()) continue
        // Skip F-keys check — always allow F-keys even in inputs
        // Skip other shortcuts when in inputs (unless it's F-key or has modifier)
        if (!parsed.ctrl && !parsed.alt && !parsed.key.startsWith('f') && isInputFocused()) continue

        if (matchesEvent(e, parsed)) {
          e.preventDefault()
          e.stopPropagation()
          bindingsRef.current[key]()
          return
        }
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps])
}
