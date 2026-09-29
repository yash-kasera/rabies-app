import { useState, useEffect } from 'react'
import api from '../services/api'

// Wound photos are only served to logged-in staff, so they're fetched with the
// session token and shown from a temporary object URL (never a public link).
export default function ReportPhoto({ reportId }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || url) return
    let objectUrl
    api.get(`/reports/${reportId}/photo`, { responseType: 'blob' })
      .then(res => { objectUrl = URL.createObjectURL(res.data); setUrl(objectUrl) })
      .catch(() => setError('Could not load the photo'))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [open, reportId, url])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="text-sm text-primary dark:text-primary-dark font-medium hover:underline">
        📷 View wound photo
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
          <div className="bg-surface dark:bg-surface-dark rounded-xl p-3 max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            {error ? (
              <p className="p-8 text-center text-danger dark:text-danger-dark">{error}</p>
            ) : url ? (
              <img src={url} alt="Wound photo" className="w-full max-h-[75vh] object-contain rounded-lg" />
            ) : (
              <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
            )}
            <button type="button" onClick={() => setOpen(false)} className="btn-primary w-full mt-3">Close</button>
          </div>
        </div>
      )}
    </>
  )
}
