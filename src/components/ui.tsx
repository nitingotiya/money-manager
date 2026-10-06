import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './icons'
import { fmtMonth, shiftMonth } from '../lib/format'

/** A short vibration on Android, like the tap feedback of native apps. Does nothing where unsupported. */
export function haptic(ms = 10) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* not supported */
  }
}

// Open sheets, newest last. Each one adds a history entry, so the phone's back button or
// back gesture closes the sheet instead of leaving the screen.
const sheetStack: { id: number; close(): void }[] = []
let sheetSeq = 0
let ignorePops = 0
if (typeof window !== 'undefined')
  window.addEventListener('popstate', () => {
    if (ignorePops > 0) return void ignorePops--
    sheetStack[sheetStack.length - 1]?.close()
  })

export function Modal({ title, onClose, children }: { title: string; onClose(): void; children: ReactNode }) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const [drag, setDrag] = useState(0)
  const start = useRef<number | null>(null)

  useEffect(() => {
    const id = ++sheetSeq
    let closedByBack = false
    sheetStack.push({
      id,
      close: () => {
        closedByBack = true
        closeRef.current()
      },
    })
    history.pushState({ ...(history.state ?? {}), sheet: id }, '')
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      const i = sheetStack.findIndex((x) => x.id === id)
      if (i >= 0) sheetStack.splice(i, 1)
      // Closed with a button: remove the history entry this sheet added.
      if (!closedByBack && history.state?.sheet === id) {
        ignorePops++
        history.back()
      }
    }
  }, [])

  // Swipe the sheet down by its top bar to close it (phones).
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' || (e.target as HTMLElement).closest('button')) return
    start.current = e.clientY
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current))
  }
  const onPointerUp = () => {
    if (start.current === null) return
    start.current = null
    if (drag > 90) closeRef.current()
    else setDrag(0)
  }

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={'modal' + (drag ? ' dragging' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={drag ? { transform: `translateY(${drag}px)` } : undefined}
      >
        <div className="sheet-grip" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <span className="grip-bar" aria-hidden="true" />
          <div className="modal-head">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="x" />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

/** App-bar back arrow: goes back in history like a phone's back gesture, or to `fallback` when opened directly. */
export function BackButton({ fallback, label }: { fallback: string; label: string }) {
  const nav = useNavigate()
  const loc = useLocation()
  return (
    <button className="icon-btn back-btn" aria-label={`Back to ${label}`} onClick={() => (loc.key !== 'default' ? nav(-1) : nav(fallback))}>
      <Icon name="left" />
    </button>
  )
}

export function Field({ label, hint, group, children }: { label: string; hint?: string; group?: boolean; children: ReactNode }) {
  const head = (
    <span>
      {label} {hint && <span className="hint">· {hint}</span>}
    </span>
  )
  // A group of buttons must not sit inside a <label>, or the label text leaks into the first button's name.
  if (group)
    return (
      <div className="field" role="group" aria-label={label}>
        {head}
        {children}
      </div>
    )
  return (
    <label className="field">
      {head}
      {children}
    </label>
  )
}

export function MonthPicker({ value, onChange }: { value: string; onChange(v: string): void }) {
  return (
    <div className="month-picker">
      <button className="icon-btn" onClick={() => onChange(shiftMonth(value, -1))} aria-label="Previous month">
        <Icon name="left" />
      </button>
      <span>{fmtMonth(value)}</span>
      <button className="icon-btn" onClick={() => onChange(shiftMonth(value, 1))} aria-label="Next month">
        <Icon name="right" />
      </button>
    </div>
  )
}

export function Progress({ value, max, warnAt = 0.8 }: { value: number; max: number; warnAt?: number }) {
  const pct = max > 0 ? value / max : 0
  const cls = pct > 1 ? 'bar over' : pct >= warnAt ? 'bar warn' : 'bar'
  return (
    <div className={cls} role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${Math.min(100, pct * 100)}%` }} />
    </div>
  )
}

export function Empty({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  )
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
  full,
}: {
  value: T
  options: { value: NoInfer<T>; label: string }[]
  onChange(v: NoInfer<T>): void
  full?: boolean
}) {
  return (
    <div className={full ? 'seg full' : 'seg'} role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function initials(name: string) {
  return (
    name
      .replace(/\(.*\)/, '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

/** Two-step button for destructive actions: the first tap arms it, the second within 4 seconds runs it. */
export function ConfirmButton({
  onClick,
  className,
  children,
  armedLabel = 'Tap again to confirm',
  type = 'button',
}: {
  onClick(): void | Promise<void>
  className?: string
  children: ReactNode
  armedLabel?: string
  type?: 'button'
}) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      type={type}
      className={(className ?? 'btn') + (armed ? ' armed' : '')}
      onClick={() => {
        if (!armed) {
          haptic()
          return setArmed(true)
        }
        setArmed(false)
        onClick()
      }}
    >
      {armed ? armedLabel : children}
    </button>
  )
}
