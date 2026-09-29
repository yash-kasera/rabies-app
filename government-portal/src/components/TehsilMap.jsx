// Jabalpur district's 10 tehsils as inline SVG (no map tiles). Data: src/data/jabalpur-tehsils.json,
// built by tools/geo/build-tehsils.js. Adhartal and Ranjhi borders are approximate.
import { useState } from 'react'
import { X } from 'lucide-react'
import geo from '../data/jabalpur-tehsils.json'
import { Badge } from './ui'

export const VIEWS = { district: geo.district, city: geo.city }
export const APPROX = new Set(geo.district.areas.filter(a => a.approx).map(a => a.name))

const BANDS = {
  light: [[0, '#F9D9C4', '#5A2305'], [8, '#F2BC98', '#4A1D04'], [12, '#EC9A6C', '#3D1703'], [20, '#B24E1A', '#FFFFFF'], [40, '#7E300A', '#FFFFFF']],
  dark: [[0, '#4A2814', '#FFDCC4'], [8, '#633016', '#FFDCC4'], [12, '#8A3F14', '#FFFFFF'], [20, '#D0703A', '#1A0A02'], [40, '#F5A06B', '#1A0A02']],
}
export const bandFor = (n, dark) => { const b = BANDS[dark ? 'dark' : 'light']; let r = b[0]; b.forEach(x => { if (n >= x[0]) r = x }); return r }
export const legendFor = (dark) => BANDS[dark ? 'dark' : 'light'].map((x, i, all) => ({ bg: x[1], label: i === all.length - 1 ? `${x[0]}+` : `${x[0]}–${all[i + 1][0] - 1}` }))

/** GPS → map units for a view. */
export const project = (view, lat, lng) => ({ x: view.proj.pad + (lng - view.proj.lng0) * view.proj.kx, y: view.proj.pad + (view.proj.lat0 - lat) * view.proj.ky })
/** Map units → GPS for a view. */
export const unproject = (view, x, y) => ({ lng: view.proj.lng0 + (x - view.proj.pad) / view.proj.kx, lat: view.proj.lat0 - (y - view.proj.pad) / view.proj.ky })

const STATUS_FILL = { Reported: 'var(--color-warning)', Accepted: 'var(--color-info)', UnderTreatment: 'var(--color-primary)', Completed: 'var(--color-success)', Cancelled: 'var(--color-neutral)' }

export default function TehsilMap({ view = VIEWS.district, counts = {}, selected, onSelect, mode = 'density', points = [], dark }) {
  const [popup, setPopup] = useState(null)
  const pct = (x, y) => ({ left: `${(x / view.W) * 100}%`, top: `${(y / view.H) * 100}%` })
  const inView = (p) => p.x >= 0 && p.y >= 0 && p.x <= view.W && p.y <= view.H

  const markers = mode === 'markers'
    ? points.map(p => ({ ...p, ...project(view, p.latitude, p.longitude) })).filter(inView)
    : []
  const city = { x: view.city[0], y: view.city[1] }

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${view.W} ${view.H}`} role="group" aria-label="Jabalpur district tehsil map. Choose a tehsil to see its cases."
        style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 320, overflow: 'visible' }}>
        {view.areas.map(a => {
          const n = counts[a.name]?.count ?? 0
          const dim = selected && a.name !== selected
          return (
            <path key={a.name} className="rr-tehsil" d={a.d} fillRule="evenodd" fill={bandFor(n, dark)[1]}
              fillOpacity={dim ? 0.35 : 1} stroke="var(--color-surface)" strokeWidth="1.5" strokeLinejoin="round"
              role="button" tabIndex={0} aria-pressed={a.name === selected} aria-label={`${a.name} tehsil: ${n} cases`}
              onClick={() => onSelect?.(a.name === selected ? null : a.name)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(a.name === selected ? null : a.name) } }}
              style={{ cursor: 'pointer', transition: 'fill-opacity 120ms' }} />
          )
        })}
        {/* Selected tehsil: a thin brand-colour outline on top (the others fade back). */}
        {view.areas.filter(a => a.name === selected).map(a => (
          <path key="sel" d={a.d} fillRule="evenodd" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />
        ))}
        <circle cx={city.x} cy={city.y} r="5" fill="var(--color-surface)" stroke="var(--color-text-primary)" strokeWidth="2" style={{ pointerEvents: 'none' }} />
        {markers.map(m => (
          <circle key={m.id} cx={m.x} cy={m.y} r="5" fill={STATUS_FILL[m.status]} stroke={m.status === 'Reported' ? 'var(--color-emergency)' : 'var(--color-surface)'} strokeWidth="2"
            role="button" tabIndex={0} aria-label={`${m.victimName}, ${m.animalType}, ${m.status}`} style={{ cursor: 'pointer' }}
            onClick={() => setPopup(m)} onKeyDown={(e) => { if (e.key === 'Enter') setPopup(m) }} />
        ))}
      </svg>

      {mode === 'density' && view.areas.filter(a => a.label).map(a => {
        const sel = a.name === selected
        return (
          <span key={a.name} aria-hidden="true" style={{
            position: 'absolute', ...pct(a.lx, a.ly), transform: 'translate(-50%,-50%)', pointerEvents: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1px 6px', borderRadius: 7, whiteSpace: 'nowrap',
            background: sel ? 'var(--color-primary-container)' : 'var(--color-surface)', color: sel ? 'var(--color-on-primary-container)' : 'var(--color-text-primary)',
            boxShadow: sel ? 'inset 0 0 0 1px var(--color-primary-border)' : 'none', opacity: selected && !sel ? 0.7 : 1,
          }}>
            <span style={{ fontSize: 12, lineHeight: '14px', fontWeight: 600 }}>{a.name}{a.approx ? '*' : ''}</span>
            <span className="rr-tabular" style={{ fontSize: 16, lineHeight: '18px', fontWeight: 600 }}>{counts[a.name]?.count ?? 0}</span>
          </span>
        )
      })}

      {popup && (
        <div role="dialog" aria-label="Report details" style={{
          position: 'absolute', ...pct(popup.x, popup.y), transform: 'translate(-50%, calc(-100% - 12px))', minWidth: 180, padding: '10px 12px',
          borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', boxShadow: 'var(--shadow-1)', fontSize: 13, lineHeight: '18px', zIndex: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <strong style={{ flex: 1, fontWeight: 600 }}>{popup.victimName}</strong>
            <button type="button" aria-label="Close" onClick={() => setPopup(null)}
              style={{ display: 'inline-flex', width: 24, height: 24, margin: '-4px -6px 0 0', alignItems: 'center', justifyContent: 'center', border: 0, borderRadius: 999, background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              <X size={14} aria-hidden />
            </button>
          </div>
          <div style={{ color: 'var(--color-text-secondary)' }}>{popup.animalType} · {popup.tehsil || 'Outside district'}</div>
          <div style={{ marginTop: 6 }}><Badge kind="report" value={popup.status} /></div>
        </div>
      )}
    </div>
  )
}

/** Plain outline map for picking a location (hospital form). */
export function PinPicker({ lat, lng, onPick }) {
  const view = VIEWS.district
  const pin = lat != null && lng != null ? project(view, lat, lng) : null
  const pick = (e) => {
    const svg = e.currentTarget
    const r = svg.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * view.W
    const y = ((e.clientY - r.top) / r.height) * view.H
    const p = unproject(view, x, y)
    onPick(+p.lat.toFixed(5), +p.lng.toFixed(5))
  }
  return (
    <div style={{ position: 'relative', padding: 8, border: '1px solid var(--color-border-strong)', borderRadius: 12, background: 'var(--color-surface-alt)' }}>
      <svg viewBox={`0 0 ${view.W} ${view.H}`} onClick={pick} role="img" aria-label="Click the map to place the hospital"
        style={{ display: 'block', width: '100%', height: 'auto', cursor: 'crosshair' }}>
        {view.areas.map(a => <path key={a.name} d={a.d} fillRule="evenodd" fill="var(--color-surface)" stroke="var(--color-border-strong)" strokeWidth="1.5" strokeLinejoin="round" />)}
        <circle cx={view.city[0]} cy={view.city[1]} r="4" fill="var(--color-surface)" stroke="var(--color-text-primary)" strokeWidth="2" />
        {pin && (
          <g transform={`translate(${pin.x} ${pin.y})`} style={{ pointerEvents: 'none' }}>
            <path d="M0 0 C -6 -8 -7 -11 -7 -14 A 7 7 0 1 1 7 -14 C 7 -11 6 -8 0 0 Z" fill="var(--color-emergency)" stroke="var(--color-surface)" strokeWidth="1.5" />
            <circle cx="0" cy="-14" r="2.5" fill="var(--color-surface)" />
          </g>
        )}
      </svg>
    </div>
  )
}
