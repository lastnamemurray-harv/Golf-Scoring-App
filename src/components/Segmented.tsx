interface Props<T extends string | number> {
  label: string
  value: T | '' | null
  options: readonly T[]
  onChange: (value: T) => void
}
export default function Segmented<T extends string | number>({ label, value, options, onChange }: Props<T>) {
  return (
    <fieldset className="segmented-field">
      <legend>{label}</legend>
      <div className="segmented">
        {options.map((option) => (
          <button
            type="button"
            key={String(option)}
            className={value === option ? 'active' : ''}
            onClick={() => onChange(option)}
          >{option}</button>
        ))}
      </div>
    </fieldset>
  )
}
