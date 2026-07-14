import type { MetricConfig, SyncState } from '../types'
import { DEFAULT_METRICS } from '../types'
import SyncBadge from './SyncBadge'

const ITEMS: Array<{ key: keyof MetricConfig; title: string; description: string }> = [
  { key: 'courseDetails', title: 'Yardage and hole handicap', description: 'Show course reference information at the top of each hole.' },
  { key: 'scoringZone', title: 'Scoring-zone points', description: 'Entering the scoring zone and down in the scoring zone.' },
  { key: 'teeClub', title: 'Club used off the tee', description: 'Track the club selected for each tee shot.' },
  { key: 'teeResult', title: 'Tee-shot result', description: 'Fairway, left, right, trouble, penalty, and other outcomes.' },
  { key: 'gir', title: 'Green in regulation', description: 'Track GIR by hole.' },
  { key: 'putting', title: 'Total putts', description: 'Track the total number of putts per hole.' },
  { key: 'inside4ft', title: 'Putts inside four feet', description: 'Made, missed, or not applicable.' },
  { key: 'madePuttLength', title: 'Made-putt length', description: 'Record the length of the made putt on each hole.' },
  { key: 'penalties', title: 'Penalty strokes', description: 'Track penalty strokes separately.' },
  { key: 'shortGame', title: 'Short-game details', description: 'Chips, pitches, and up-and-down result.' },
  { key: 'methodScore', title: 'Method score', description: 'Plan, routine, commitment, smart decision, and reset.' },
  { key: 'notes', title: 'Hole notes', description: 'Record miss patterns and context.' },
]

interface Props { settings: MetricConfig; sync: SyncState; onChange: (settings: MetricConfig) => void; onSave: () => void }
export default function Settings({ settings, sync, onChange, onSave }: Props) {
  return <main className="page stack"><header className="hole-header"><div><p className="eyebrow">Preferences</p><h1>Metrics to track</h1></div><SyncBadge state={sync} /></header><p className="lead">Score and par remain available. Everything else can be hidden from the on-course screen.</p><section className="settings-list">{ITEMS.map((item) => <label className="toggle-row" key={item.key}><span><strong>{item.title}</strong><small>{item.description}</small></span><input type="checkbox" checked={settings[item.key]} onChange={(e) => onChange({ ...settings, [item.key]: e.target.checked })} /></label>)}</section><div className="two-col"><button type="button" className="secondary" onClick={() => onChange({ ...DEFAULT_METRICS })}>Reset defaults</button><button type="button" className="primary" onClick={onSave}>Save settings</button></div></main>
}
