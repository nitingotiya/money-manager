import { Link } from 'react-router-dom'
import { Icon } from '../components/icons'

const ITEMS = [
  { to: '/budgets', label: 'Budgets', icon: 'wallet' },
  { to: '/goals', label: 'Savings goals', icon: 'target' },
  { to: '/bills', label: 'Bills & recurring payments', icon: 'calendar' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

export default function More() {
  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>More</h1>
      <div className="card more-list">
        {ITEMS.map((i) => (
          <Link key={i.to} to={i.to}>
            <Icon name={i.icon} />
            <span className="grow">{i.label}</span>
            <Icon name="right" />
          </Link>
        ))}
      </div>
    </div>
  )
}
