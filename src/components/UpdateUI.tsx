import { useUpdates } from '../lib/updates'
import { fmtDate } from '../lib/format'
import { Icon } from './icons'
import { Modal } from './ui'

/** Slim bar shown at the top of every screen when a newer version is ready. */
export function UpdateBanner() {
  const u = useUpdates()
  if (u.status !== 'ready' && u.status !== 'apk-available') return null
  return (
    <div className="alert info update-banner" role="status">
      <Icon name="download" />
      <span className="grow">
        {u.status === 'ready' ? 'A new version of the app is ready.' : `Version ${u.apk?.version} is available.`}
      </span>
      <button className="btn sm primary" onClick={() => u.apply()}>
        {u.status === 'ready' ? 'Update now' : 'Download'}
      </button>
    </div>
  )
}

/** Shown once after the app updates, listing what changed since the version the person last used. */
export function WhatsNew() {
  const u = useUpdates()
  if (!u.whatsNew.length) return null
  return (
    <Modal title="What's new" onClose={u.dismissWhatsNew}>
      <div className="stack">
        {u.whatsNew.map((r) => (
          <div key={r.version}>
            <div className="row between">
              <h3>Version {r.version}</h3>
              <span className="muted small">{fmtDate(r.date)}</span>
            </div>
            <ul className="notes">
              {r.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        ))}
        <div className="form-actions">
          <button className="btn primary" onClick={u.dismissWhatsNew}>
            Got it
          </button>
        </div>
      </div>
    </Modal>
  )
}
