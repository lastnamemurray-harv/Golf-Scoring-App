interface Props {
  compact?: boolean
  inverse?: boolean
}

export default function BrandMark({ compact = false, inverse = false }: Props) {
  return (
    <div className={`roundwise-brand ${compact ? 'compact-brand' : ''} ${inverse ? 'inverse-brand' : ''}`}>
      <img src="/brand/roundwise-mark.png" alt="" aria-hidden="true" />
      <div>
        <strong>ROUNDWISE</strong>
        {!compact && <span>GOLF PERFORMANCE TRACKER</span>}
      </div>
    </div>
  )
}
