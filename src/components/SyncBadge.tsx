import type { SyncState } from '../types'

export default function SyncBadge({ state }: { state: SyncState }) {
  const labels: Record<SyncState, string> = {
    saved: 'Saved', saving: 'Saving…', offline: 'Saved offline', error: 'Sync issue', 'local-only': 'Local only',
  }
  return <span className={`sync-badge sync-${state}`}>{labels[state]}</span>
}
