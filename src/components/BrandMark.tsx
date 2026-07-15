interface Props {
  compact?: boolean
  inverse?: boolean
  iconOnly?: boolean
}

export default function BrandMark({ compact = false, inverse = false, iconOnly = false }: Props) {
  return (
    <div className={`roundwise-brand ${compact ? 'compact-brand' : ''} ${inverse ? 'inverse-brand' : ''} ${iconOnly ? 'icon-only-brand' : ''}`}>
      <img src="/brand/roundwise-mark.png" alt={iconOnly ? 'RoundWise' : ''} aria-hidden={!iconOnly} />
      {!iconOnly && <div>
        <strong>ROUNDWISE</strong>
        {!compact && <span>GOLF PERFORMANCE TRACKER</span>}
      </div>}
    </div>
  )
}
