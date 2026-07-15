interface Props {
  score: number | null
  relative: number | null
  compact?: boolean
}

export default function ScoreSymbol({ score, relative, compact = false }: Props) {
  if (score == null) return <span className="score-symbol score-empty">—</span>
  let result = 'par'
  if (relative != null) {
    if (relative <= -3) result = 'triple-under'
    else if (relative === -2) result = 'eagle'
    else if (relative === -1) result = 'birdie'
    else if (relative === 1) result = 'bogey'
    else if (relative === 2) result = 'double-bogey'
    else if (relative >= 3) result = 'triple-bogey'
  }
  return <span className={`score-symbol score-${result} ${compact ? 'score-symbol-compact' : ''}`}>{score}</span>
}
