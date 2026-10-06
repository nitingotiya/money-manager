import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/data'
import { supabase } from '../lib/backend'
import { downloadFile } from '../lib/csv'
import { today } from '../lib/format'
import { TABLES, type Category, type TxType } from '../lib/types'
import { ConfirmButton, Field, Modal, Seg } from '../components/ui'
import { Icon } from '../components/icons'
import { useUpdates } from '../lib/updates'
import { APP_VERSION } from '../lib/version'
import { CHANGELOG } from '../changelog'

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY']
const COLORS = ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#264653', '#3a86ff', '#9b5de5', '#b5838d', '#e63946', '#52b788', '#8d99ae', '#adb5bd']

export default function Settings() {
  const { user, cloud, signOut } = useAuth()
  const d = useData()
  const [name, setName] = useState(d.settings.display_name)
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('mm:theme') as 'light' | 'dark') || 'system'
    } catch {
      return 'system'
    }
  })
  const [catType, setCatType] = useState<TxType>('expense')
  const [editCat, setEditCat] = useState<Category | 'new' | null>(null)
  const [pw, setPw] = useState(false)
  const [savedName, setSavedName] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [erased, setErased] = useState<'' | 'working' | 'done'>('')
  const up = useUpdates()

  function applyTheme(t: 'system' | 'light' | 'dark') {
    setTheme(t)
    try {
      if (t === 'system') {
        localStorage.removeItem('mm:theme')
        delete document.documentElement.dataset.theme
      } else {
        localStorage.setItem('mm:theme', t)
        document.documentElement.dataset.theme = t
      }
    } catch {
      /* ignore */
    }
  }

  function backup() {
    const data = Object.fromEntries(TABLES.map((t) => [t, d[t]]))
    downloadFile(`money-manager-backup-${today()}.json`, JSON.stringify(data, null, 2), 'application/json')
  }

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      <div className="card stack">
        <h2>Profile</h2>
        <form
          className="row wrap"
          style={{ alignItems: 'flex-end' }}
          onSubmit={async (e) => {
            e.preventDefault()
            await d.update('settings', d.settings.id, { display_name: name.trim() })
            setSavedName(true)
            setTimeout(() => setSavedName(false), 1500)
          }}
        >
          <div className="grow" style={{ minWidth: 200 }}>
            <Field label="Your name">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Shown on the home screen" />
            </Field>
          </div>
          <button className="btn">{savedName ? 'Saved' : 'Save'}</button>
        </form>
        <div className="form-row">
          <Field label="Currency">
            <select className="input" value={d.settings.currency} onChange={(e) => d.update('settings', d.settings.id, { currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Theme" group>
            <Seg
              full
              value={theme}
              onChange={applyTheme}
              options={[
                { value: 'system', label: 'Auto' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </Field>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Categories</h2>
          <button className="btn sm" onClick={() => setEditCat('new')}>
            <Icon name="plus" /> Add
          </button>
        </div>
        <Seg
          value={catType}
          onChange={setCatType}
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
        />
        <ul className="list" style={{ marginTop: 8 }}>
          {d.categories
            .filter((c) => c.type === catType)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((c) => (
              <li key={c.id} className="clickable" onClick={() => setEditCat(c)}>
                <span className="dot" style={{ background: c.color }} />
                <span className="grow">{c.name}</span>
                <span className="muted small">{d.transactions.filter((t) => t.category_id === c.id).length} transactions</span>
                <Icon name="right" className="inline-icon" />
              </li>
            ))}
        </ul>
      </div>

      <div className="card stack">
        <h2>Data</h2>
        <div className="row wrap">
          <button className="btn" onClick={backup}>
            <Icon name="download" /> Download full backup (JSON)
          </button>
          <button className="btn" onClick={() => d.loadSample()}>
            Load sample data
          </button>
        </div>
        <div className="erase-box stack">
          <div>
            <b>Start fresh</b>
            <div className="muted small">
              Deletes all transactions, budgets, goals, bills, lending entries and payments, and resets categories to the defaults.
              Your name, currency and theme stay. This can't be undone, so download a backup first if you might need it.
            </div>
          </div>
          <div className="row wrap">
            <ConfirmButton className="btn danger" armedLabel="Tap again to erase everything" onClick={async () => {
              setErased('working')
              await d.eraseAll()
              setErased('done')
            }}>
              <Icon name="trash" /> Erase all data
            </ConfirmButton>
            {erased === 'working' && <span className="muted small">Erasing…</span>}
            {erased === 'done' && <span className="small income">All data erased.</span>}
          </div>
        </div>
        <div className="muted small">
          {d.mode === 'cloud'
            ? 'Your data is stored in your account and syncs across your devices.'
            : 'Demo mode: data is saved in this browser only. Clearing browser data will erase it.'}
        </div>
      </div>

      <div className="card stack">
        <div className="row between">
          <h2>About this app</h2>
          <span className="badge neutral">Version {APP_VERSION}</span>
        </div>
        <div className="small muted">
          {up.status === 'checking'
            ? 'Checking for updates…'
            : up.status === 'up-to-date'
              ? 'You have the latest version.'
              : up.status === 'ready'
                ? 'A new version is ready to install.'
                : up.status === 'apk-available'
                  ? `Version ${up.apk?.version} is available to download.`
                  : up.status === 'unavailable'
                    ? 'Automatic updates are not available in this browser view. Open the app from its website or installed icon.'
                    : up.native
                      ? 'The app checks for new versions when it opens.'
                      : 'The app checks for new versions every hour while it is open.'}
        </div>
        <div className="row wrap">
          {up.status === 'ready' || up.status === 'apk-available' ? (
            <button className="btn primary" onClick={() => up.apply()}>
              <Icon name="download" /> {up.status === 'ready' ? 'Update now' : 'Download update'}
            </button>
          ) : (
            <button className="btn" onClick={() => up.check()} disabled={up.status === 'checking'}>
              Check for updates
            </button>
          )}
          <button className="btn ghost" onClick={() => setShowLog(true)}>
            What's new
          </button>
        </div>
      </div>

      <div className="card stack">
        <h2>Account</h2>
        <div className="muted small">Signed in as {user?.email}</div>
        <div className="row wrap">
          {cloud && (
            <button className="btn" onClick={() => setPw(true)}>
              Change password
            </button>
          )}
          <button className="btn danger" onClick={signOut}>
            <Icon name="logout" /> Sign out
          </button>
        </div>
      </div>

      {editCat && <CategoryForm cat={editCat === 'new' ? undefined : editCat} type={catType} onClose={() => setEditCat(null)} />}
      {pw && <PasswordForm onClose={() => setPw(false)} />}
      {showLog && (
        <Modal title="Version history" onClose={() => setShowLog(false)}>
          <div className="stack">
            {CHANGELOG.map((r) => (
              <div key={r.version}>
                <div className="row between">
                  <h3>Version {r.version}</h3>
                  <span className="muted small">{r.date}</span>
                </div>
                <ul className="notes">
                  {r.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

function CategoryForm({ cat, type, onClose }: { cat?: Category; type: TxType; onClose(): void }) {
  const d = useData()
  const [name, setName] = useState(cat?.name ?? '')
  const [color, setColor] = useState(cat?.color ?? COLORS[0])
  const [err, setErr] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setErr('Enter a name.')
    if (cat) await d.update('categories', cat.id, { name: name.trim(), color })
    else await d.add('categories', { name: name.trim(), color, type })
    onClose()
  }

  return (
    <Modal title={cat ? 'Edit category' : 'New category'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Colour" group>
          <div className="chip-row">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                aria-label={`Colour ${c}`}
                onClick={() => setColor(c)}
                style={{ width: 30, height: 30, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--text)' : '3px solid transparent', cursor: 'pointer' }}
              />
            ))}
          </div>
        </Field>
        {err && <div className="alert danger">{err}</div>}
        <div className="form-actions">
          {cat && (
            <ConfirmButton
              type="button"
              className="btn danger left"
              onClick={async () => {
                {
                  await d.remove('categories', cat.id)
                  onClose()
                }
              }}
            >
              Delete
            </ConfirmButton>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Save</button>
        </div>
      </form>
    </Modal>
  )
}

function PasswordForm({ onClose }: { onClose(): void }) {
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  return (
    <Modal title="Change password" onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault()
          setErr('')
          if (pw.length < 8) return setErr('Use at least 8 characters.')
          const { error } = await supabase!.auth.updateUser({ password: pw })
          if (error) setErr(error.message)
          else setMsg('Password updated.')
        }}
      >
        <Field label="New password">
          <input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        </Field>
        {err && <div className="alert danger">{err}</div>}
        {msg && <div className="alert info">{msg}</div>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          <button className="btn primary">Update</button>
        </div>
      </form>
    </Modal>
  )
}
