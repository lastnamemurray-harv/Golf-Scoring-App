interface Props {
  value: string
  onChange: (value: string) => void
}

const OPTIONS = [
  { value: 'Long Left', label: 'Long left', icon: '↖', tone: 'miss' },
  { value: 'Long', label: 'Long', icon: '↑', tone: 'miss' },
  { value: 'Long Right', label: 'Long right', icon: '↗', tone: 'miss' },
  { value: 'Miss L', label: 'Left', icon: '←', tone: 'miss' },
  { value: 'FIR', label: 'Fairway', icon: '◆', tone: 'good' },
  { value: 'Miss R', label: 'Right', icon: '→', tone: 'miss' },
  { value: 'Bunker', label: 'Bunker', icon: '◌', tone: 'hazard' },
  { value: 'Green', label: 'Green', icon: '●', tone: 'good' },
  { value: 'Water', label: 'Water', icon: '≈', tone: 'hazard' },
  { value: 'Trouble', label: 'Trouble', icon: '!', tone: 'hazard' },
  { value: 'Short', label: 'Short', icon: '↓', tone: 'miss' },
  { value: 'Penalty', label: 'Penalty', icon: '+1', tone: 'hazard' },
] as const

export default function TeeResultGrid({ value, onChange }: Props) {
  return <fieldset className="tee-result-field">
    <legend>Tee result</legend>
    <p className="muted compact">Tap the area where the tee shot finished.</p>
    <div className="tee-result-grid" role="group" aria-label="Tee-shot result location">
      {OPTIONS.map((option) => <button
        type="button"
        key={option.value}
        className={`tee-result-cell tee-result-${option.tone} ${value === option.value ? 'active' : ''}`}
        aria-pressed={value === option.value}
        onClick={() => onChange(value === option.value ? '' : option.value)}
      >
        <span aria-hidden="true">{option.icon}</span>
        <strong>{option.label}</strong>
      </button>)}
    </div>
    <div className="tee-result-grid-actions">
      <button type="button" className={value === 'N/A' ? 'active' : ''} onClick={() => onChange(value === 'N/A' ? '' : 'N/A')}>N/A</button>
      {value && <button type="button" onClick={() => onChange('')}>Clear</button>}
    </div>
  </fieldset>
}
