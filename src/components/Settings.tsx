import type { MetricConfig, SyncState } from '../types'
import { DEFAULT_METRICS } from '../types'
import SyncBadge from './SyncBadge'

type ToggleMetricKey = Exclude<keyof MetricConfig, 'targetZoneYards' | 'roundFocus'>

const ITEMS: Array<{ key: ToggleMetricKey; title: string; description: string }> = [
  { key: 'courseDetails', title: 'Yardage and hole handicap', description: 'Show course reference information at the top of each hole.' },
  { key: 'scoringZone', title: 'Scoring-zone points', description: 'Entering the target zone and getting down from inside the target zone.' },
  { key: 'teeClub', title: 'Club used off the tee', description: 'Track the club selected for each tee shot.' },
  { key: 'teeResult', title: 'Tee-shot result', description: 'Fairway, left, right, trouble, penalty, and other outcomes.' },
  { key: 'gir', title: 'Green in regulation', description: 'Calculated from score, putts, and par.' },
  { key: 'putting', title: 'Total putts', description: 'Track the total number of putts per hole.' },
  { key: 'inside4ft', title: 'Putts inside four feet', description: 'Made, missed, or not applicable.' },
  { key: 'madePuttLength', title: 'Made-putt length', description: 'Record the length of the made putt on each hole.' },
  { key: 'penalties', title: 'Penalty strokes', description: 'Track penalty strokes separately.' },
  { key: 'shortGame', title: 'Short-game details', description: 'Track chips and pitches; up-and-down is calculated automatically.' },
  { key: 'methodScore', title: 'Method score', description: 'Plan, routine, commitment, smart decision, and reset.' },
  { key: 'notes', title: 'Hole notes', description: 'Record miss patterns and context.' },
]

interface Props {
  settings: MetricConfig
  sync: SyncState
  onChange: (settings: MetricConfig) => void
  onSave: () => void
}

export default function Settings({ settings, sync, onChange, onSave }: Props) {
  const updateTargetZone = (value: string) => {
    const parsed = Number(value)
    onChange({
      ...settings,
      targetZoneYards: Number.isFinite(parsed) ? Math.min(300, Math.max(25, parsed)) : DEFAULT_METRICS.targetZoneYards,
    })
  }

  return <main className="page stack">
    <header className="hole-header">
      <div><p className="eyebrow">Preferences</p><h1>Metrics to track</h1></div>
      <SyncBadge state={sync} />
    </header>
    <p className="lead">Score and par remain available. Everything else can be hidden from the on-course screen.</p>

    <section className="card stack focus-setting-card">
      <div>
        <p className="eyebrow">On-course reminder</p>
        <h2>Default round focus</h2>
        <p className="muted compact">This is prefilled when you start a round and appears at the bottom of every hole.</p>
      </div>
      <label className="field">
        <span>Focus</span>
        <input
          value={settings.roundFocus}
          maxLength={140}
          placeholder="Example: Pick conservative targets after a miss"
          onChange={(event) => onChange({ ...settings, roundFocus: event.target.value })}
        />
      </label>
    </section>

    <section className="card stack target-zone-setting">
      <div>
        <p className="eyebrow">Scoring zone</p>
        <h2>Target-zone distance</h2>
        <p className="muted compact">RoundWise will describe the scoring zone as the area within this distance of the green.</p>
      </div>
      <label className="field">
        <span>Target zone (yards)</span>
        <input
          type="number"
          inputMode="numeric"
          min={25}
          max={300}
          step={5}
          value={settings.targetZoneYards}
          onChange={(event) => updateTargetZone(event.target.value)}
        />
      </label>
      <small className="target-zone-example">Example: “Strokes to get within {settings.targetZoneYards} yards of green.”</small>
    </section>

    <section className="settings-list">
      {ITEMS.map((item) => <label className="toggle-row" key={item.key}>
        <span><strong>{item.title}</strong><small>{item.description}</small></span>
        <input
          type="checkbox"
          checked={settings[item.key]}
          onChange={(event) => onChange({ ...settings, [item.key]: event.target.checked })}
        />
      </label>)}
    </section>

    <div className="two-col">
      <button type="button" className="secondary" onClick={() => onChange({ ...DEFAULT_METRICS })}>Reset defaults</button>
      <button type="button" className="primary" onClick={onSave}>Save settings</button>
    </div>
  </main>
}
