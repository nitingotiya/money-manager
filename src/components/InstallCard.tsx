import { useState } from 'react'
import { useInstall } from '../lib/native'
import { Icon } from './icons'

const KEY = 'mm:install-dismissed'

/** Suggests installing the app when it's open in a phone browser tab. */
export function InstallCard() {
  const inst = useInstall()
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  if (!inst.show || hidden) return null
  const dismiss = () => {
    setHidden(true)
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="install-card" role="note">
      <img src="./icon-192.png" alt="" />
      <div className="grow small">
        <b>Install Money Manager</b>
        <div className="muted">
          {inst.canPrompt
            ? 'Opens full screen from your home screen, like any other app.'
            : 'Tap the Share button in Safari, then "Add to Home Screen".'}
        </div>
      </div>
      {inst.canPrompt && (
        <button className="btn sm primary" onClick={() => inst.install()}>
          Install
        </button>
      )}
      <button className="icon-btn" onClick={dismiss} aria-label="Hide">
        <Icon name="x" />
      </button>
    </div>
  )
}
