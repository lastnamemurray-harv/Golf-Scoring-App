interface Props {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  hint?: string
}
export default function NumberField({ label, value, onChange, min = 0, max = 999, step = 1, hint }: Props) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        inputMode="decimal"
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
      />
      {hint && <small>{hint}</small>}
    </label>
  )
}
