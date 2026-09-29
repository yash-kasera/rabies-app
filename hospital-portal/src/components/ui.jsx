// Rabies Response components for the portal, built on the design system's rr-* classes.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  CircleAlert, Check, Syringe, CircleCheck, CircleSlash, Info, TriangleAlert, Siren,
  Megaphone, Hospital, Wrench, X, ChevronDown, CircleX,
} from 'lucide-react'

// ---------------------------------------------------------------- status map (identical in all products)

const STATUS = {
  report: {
    Reported: ['warning', CircleAlert, 'Reported'],
    Accepted: ['info', Check, 'Accepted'],
    UnderTreatment: ['primary', Syringe, 'Under Treatment'],
    Completed: ['success', CircleCheck, 'Completed'],
    Cancelled: ['neutral', CircleSlash, 'Cancelled'],
  },
  severity: {
    MinorScratch: ['neutral', Info, 'Minor Scratch', 1],
    BleedingWound: ['warning', CircleAlert, 'Bleeding Wound', 2],
    DeepWound: ['orange', TriangleAlert, 'Deep Wound', 3],
    MultipleBites: ['danger-solid', Siren, 'Multiple Bites', 4],
  },
  hospital: {
    Active: ['success', CircleCheck, 'Active'],
    Inactive: ['neutral', CircleSlash, 'Inactive'],
  },
  notice: {
    OutbreakAlert: ['danger', Siren, 'Outbreak Alert'],
    GeneralAwareness: ['info', Megaphone, 'General Awareness'],
    NewHospital: ['success', Hospital, 'New Hospital'],
    MaintenanceNotice: ['warning', Wrench, 'Maintenance Notice'],
  },
}

export const statusLabel = (kind, value) => STATUS[kind]?.[value]?.[2] ?? value
export const NOTICE_CATEGORIES = Object.keys(STATUS.notice)

export function Badge({ kind, value, lg = false, pips = false }) {
  const [tone, Icon, text, level] = STATUS[kind]?.[value] ?? ['neutral', Info, value]
  return (
    <span className={`rr-badge rr-badge--${tone}${lg ? ' rr-badge--lg' : ''}`}>
      <Icon size={lg ? 16 : 14} aria-hidden />
      <span>{text}</span>
      {pips && level && (
        <span className="rr-pips" role="img" aria-label={`Level ${level} of 4`}>
          {[1, 2, 3, 4].map(i => <span key={i} className={`rr-pip${i <= level ? ' is-on' : ''}`} />)}
        </span>
      )}
    </span>
  )
}

// ---------------------------------------------------------------- layout bits

export function Spinner() {
  return <div className="flex justify-center py-12" aria-busy="true"><span className="rr-skel" style={{ width: 160, height: 12 }} /></div>
}

export function Skeleton({ w = '100%', h = 12, pill = false, style }) {
  return <span className="rr-skel" style={{ display: 'block', width: w, height: h, borderRadius: pill ? 999 : undefined, ...style }} />
}

export function StateView({ icon: Icon, title, body, error = false, action }) {
  return (
    <div className="rr-state" role={error ? 'alert' : undefined}>
      <span className={`rr-state__icon${error ? ' rr-state__icon--error' : ''}`}><Icon size={28} aria-hidden /></span>
      <h3 className="rr-state__title">{title}</h3>
      {body && <p className="rr-state__body">{body}</p>}
      {action && <div className="rr-state__actions">{action}</div>}
    </div>
  )
}

/** Tinted alert box (error / warning / emergency). */
export function Notice({ tone = 'danger', icon: Icon = TriangleAlert, title, children, action, strong = false }) {
  const map = {
    danger: ['var(--color-danger-container)', 'var(--color-on-danger-container)', 'var(--color-danger-border)'],
    warning: ['var(--color-warning-container)', 'var(--color-on-warning-container)', 'var(--color-warning-border)'],
    info: ['var(--color-info-container)', 'var(--color-on-info-container)', 'var(--color-info-border)'],
    emergency: ['var(--color-emergency-container)', 'var(--color-on-emergency-container)', 'var(--color-emergency)'],
  }
  const [bg, fg, bd] = map[tone]
  return (
    <div role="alert" className="flex items-center gap-2.5 flex-wrap"
      style={{ padding: '10px 14px', borderRadius: 12, background: bg, color: fg, border: `${strong ? 2 : 1}px solid ${bd}` }}>
      <Icon size={20} aria-hidden style={{ flex: 'none' }} />
      <span style={{ flex: '1 1 240px' }}>{title && <strong className="font-semibold">{title} </strong>}{children}</span>
      {action}
    </div>
  )
}

export function Field({ label, htmlFor, hint, error, count, children }) {
  return (
    <div className="rr-field">
      <label className="rr-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <span className="rr-errortext"><CircleAlert size={16} aria-hidden />{error}</span> : hint && <span className="rr-hint">{hint}</span>}
      {count}
    </div>
  )
}

export function Select({ id, value, onChange, children, ...rest }) {
  return (
    <div className="rr-control">
      <select id={id} className="rr-input rr-select" value={value} onChange={onChange} {...rest}>{children}</select>
      <span className="rr-control__trail"><ChevronDown size={20} aria-hidden /></span>
    </div>
  )
}

export function Segmented({ label, value, onChange, options }) {
  return (
    <div className="rr-seg" role="group" aria-label={label}>
      {options.map(({ value: v, label: l, icon: Icon }) => (
        <button key={v} type="button" className="rr-seg__btn" aria-pressed={value === v} onClick={() => onChange(v)}>
          {Icon && <Icon size={16} aria-hidden />}{l}
        </button>
      ))}
    </div>
  )
}

export function Button({ kind = 'primary', size, block, icon: Icon, iconRight: IconRight, children, className = '', ...rest }) {
  const cls = ['rr-btn', `rr-btn--${kind}`, size && `rr-btn--${size}`, block && 'rr-btn--block', className].filter(Boolean).join(' ')
  const iconSize = size === 'sm' ? 16 : 20
  return (
    <button type="button" className={cls} {...rest}>
      {Icon && <Icon size={iconSize} aria-hidden />}
      <span className="rr-btn__label">{children}</span>
      {IconRight && <IconRight size={iconSize} aria-hidden />}
    </button>
  )
}

// ---------------------------------------------------------------- dialog

export function Dialog({ icon: Icon, tone, title, onClose, children, actions, maxWidth = 480, alert = false, dismissable = true }) {
  const ref = useRef(null)
  useEffect(() => {
    const prev = document.activeElement
    ref.current?.querySelector('input, select, textarea, button:not([aria-label="Close"])')?.focus()
    const onKey = (e) => { if (e.key === 'Escape' && dismissable) onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [onClose, dismissable])
  return (
    <div className="rr-scrim" onMouseDown={(e) => { if (dismissable && e.target === e.currentTarget) onClose?.() }}>
      <div ref={ref} className="rr-dialog" role={alert ? 'alertdialog' : 'dialog'} aria-modal="true" aria-label={title} style={{ maxWidth }}>
        <div className="rr-dialog__head">
          {Icon && <span className={`rr-dialog__icon${tone ? ` rr-dialog__icon--${tone}` : ''}`}><Icon size={20} aria-hidden /></span>}
          <h2 className="rr-dialog__title">{title}</h2>
          {dismissable && onClose && <button type="button" className="rr-iconbtn" aria-label="Close" onClick={onClose}><X size={20} aria-hidden /></button>}
        </div>
        <div className="rr-dialog__body">{children}</div>
        {actions && <div className="rr-dialog__actions">{actions}</div>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- toasts

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef()
  const show = useCallback((message, opts = {}) => {
    clearTimeout(timer.current)
    setToast({ message, ...opts })
    if (!opts.error) timer.current = setTimeout(() => setToast(null), 5000)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="rr-toast-region" aria-live={toast.error ? 'assertive' : 'polite'}>
          <div className="rr-toast" role={toast.error ? 'alert' : 'status'}>
            {toast.error
              ? <CircleX size={20} className="rr-toast__icon rr-toast__icon--error" aria-hidden />
              : <CircleCheck size={20} className="rr-toast__icon rr-toast__icon--success" aria-hidden />}
            <span className="rr-toast__msg">{toast.message}</span>
            {toast.action && <button type="button" className="rr-toast__action" onClick={() => { setToast(null); toast.action.onClick() }}>{toast.action.label}</button>}
            <button type="button" className="rr-toast__action" onClick={() => setToast(null)}>Dismiss</button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

// ---------------------------------------------------------------- formatting

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n) => String(n).padStart(2, '0')
/** "29 Sep, 10:04" */
export const fmtDateTime = (d) => { const x = new Date(d); return `${x.getDate()} ${MONTHS[x.getMonth()]}, ${pad(x.getHours())}:${pad(x.getMinutes())}` }
/** "29 Sep 2026" */
export const fmtDate = (d) => { const x = new Date(d); return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}` }
/** "29 Sep" */
export const fmtDay = (d) => { const x = new Date(d); return `${x.getDate()} ${MONTHS[x.getMonth()]}` }
export const fmtTime = (d) => { const x = new Date(d); return `${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}` }
/** "98260 12345" for 10-digit Indian mobiles */
export const fmtPhone = (p) => (p && /^[6-9]\d{9}$/.test(p) ? `${p.slice(0, 5)} ${p.slice(5)}` : p || '—')
export const reportNumber = (id) => `RR-${String(id).padStart(4, '0')}`
export const minutesAgo = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`)
